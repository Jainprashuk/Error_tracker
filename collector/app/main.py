"""
Main FastAPI application file for the Error Tracker Collector service.
This file initializes the FastAPI app, configures CORS middleware, and includes routers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.error_routes import router as error_router

# Initialize FastAPI application instance
app = FastAPI()

# Add CORS (Cross-Origin Resource Sharing) middleware
# This allows the frontend/SDK running on different domains to send error reports to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for development - should be restricted in production)
    allow_credentials=True,  # Allow cookies and credentials
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Include the error routes from the routes module
# This adds all endpoints defined in error_routes.py to the application
app.include_router(error_router)


@app.get("/")
def root():
    """
    Root endpoint - basic health check for the service.
    Returns: Basic message indicating the service is running
    """
    return {"message": "Bug tracker collector running"}