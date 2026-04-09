import pytest
import httpx
import asyncio
import time

BASE_URL = "http://localhost:8000"
TEST_API_KEY = "test-api-key-123" # Replace with a real key from your DB if needed

@pytest.mark.asyncio
async def test_health_check():
    """Verify that the health check verifies DB connectivity"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["db"] == "connected"

@pytest.mark.asyncio
async def test_rate_limiting():
    """Verify server-side rate limiting (Target: 100 req/min)"""
    async with httpx.AsyncClient() as client:
        # Send 101 requests rapidly
        for i in range(101):
            response = await client.post(
                f"{BASE_URL}/report",
                headers={"x-api-key": TEST_API_KEY},
                json={"event_type": "test_error", "error": {"message": "Rate limit test"}}
            )
            # If we hit the limit, it should be 429
            if i == 100:
                assert response.status_code == 429
                assert "Rate limit exceeded" in response.json()["detail"]

@pytest.mark.asyncio
async def test_payload_size_limit():
    """Verify server rejects payloads > 500KB"""
    # Create a large payload (~600KB)
    large_string = "A" * (600 * 1024)
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/report",
            headers={"x-api-key": TEST_API_KEY},
            json={"event_type": "bomb", "metadata": {"data": large_string}}
        )
        assert response.status_code == 413
        assert "Payload too large" in response.json()["detail"]

@pytest.mark.asyncio
async def test_cors_restriction():
    """Verify that unauthorized origins are rejected"""
    async with httpx.AsyncClient() as client:
        response = await client.options(
            f"{BASE_URL}/report",
            headers={
                "Origin": "https://evil-hacker.com",
                "Access-Control-Request-Method": "POST"
            }
        )
        # Should NOT have the Access-Control-Allow-Origin header matching evil-hacker
        assert response.headers.get("access-control-allow-origin") != "https://evil-hacker.com"

@pytest.mark.asyncio
async def test_ingestion_latency():
    """Verify ingestion is fast (decoupled from I/O)"""
    async with httpx.AsyncClient() as client:
        start_time = time.time()
        response = await client.post(
            f"{BASE_URL}/report",
            headers={"x-api-key": TEST_API_KEY},
            json={
                "event_type": "latency_test",
                "error": {"message": "Fast response test"},
                "screenshot": "data:image/jpeg;base64,/9j/4AAQSkZJRg==" # Small base64
            }
        )
        end_time = time.time()
        duration = (end_time - start_time) * 1000
        
        assert response.status_code == 200
        # Ingestion should be < 50ms locally (usually ~5-15ms)
        assert duration < 100 
