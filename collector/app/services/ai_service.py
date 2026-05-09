import os
from google import genai
import structlog
from typing import List, Dict, Any
import json

logger = structlog.get_logger()

class AIService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("gemini_api_key_not_found", message="AI features will be disabled")
            self.client = None
        else:
            try:
                self.client = genai.Client(api_key=api_key)
                self.model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
                logger.info("ai_service_initialized", model=self.model_name)
            except Exception as e:
                logger.error("ai_service_init_failed", error=str(e))
                self.client = None

    async def analyze_error(self, error_data: Dict[str, Any], breadcrumbs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Phase 1: Neural Root Cause Analysis
        """
        if not self.client:
            return {"error": "AI Service not configured"}

        # 💡 P0 FIX: Data is nested in the 'error' object within the payload. Use 'or {}' to handle nulls.
        error_obj = error_data.get('error') or {}
        message = error_obj.get('message') or error_data.get('message')
        stack = error_obj.get('stack') or error_data.get('stack')
        client_url = (error_data.get('request') or {}).get('url') or error_data.get('client_url')

        try:
            # 💡 P0 FIX: String formatting with json.dumps can fail if breadcrumbs contain non-serializable types (like Dates/ObjectIDs)
            # Move it inside the try block to catch these failures.
            safe_breadcrumbs = json.loads(json.dumps(breadcrumbs, default=str))
            
            prompt = f"""
            You are a Principal Software Engineer specialized in Post-Mortem Debugging.
            
            CONTEXT:
            - Error Message: {message}
            - Stack Trace: {stack}
            - App URL: {client_url}
            - User Navigation (Breadcrumbs): {json.dumps(safe_breadcrumbs)}
            
            CRITICAL RULES:
            1. Analyze the SPECIFIC stack trace provided. Do not give generic advice. IF STACK IS EMPTY, identify that you lack context.
            2. Look for patterns in breadcrumbs leading to the crash.
            3. If the error is 'Failed to fetch', focus on Network, CORS, or Server availability.
            
            TASK:
            1. "problem": Explain exactly why this specific error happened based on the stack.
            2. "solution": Provide a concrete, actionable code or config fix.
            
            FORMAT (JSON ONLY):
            {{
                "problem": "...",
                "solution": "..."
            }}
            """
            
            response = self.client.models.generate_content(model=self.model_name, contents=prompt)
            text = response.text.replace('```json', '').replace('```', '').strip()
            result = json.loads(text)
            return {"result": result, "prompt": prompt, "response": response.text}
        except Exception as e:
            logger.error("ai_error_analysis_failed", error=str(e))
            return {
                "result": {"problem": "Neural link failed to parse this incident.", "solution": "Proceed with manual stack inspection."},
                "prompt": prompt,
                "response": str(e)
            }

    async def get_project_summary(self, project_name: str, errors_summary: List[Dict[str, Any]], perf_summary: Dict[str, Any]) -> Dict[str, Any]:
        """
        Phase 2: Project Health Summary
        """
        if not self.client:
            return {"result": "Intelligence offline.", "prompt": "", "response": ""}

        try:
            safe_errors = json.loads(json.dumps(errors_summary, default=str))
            safe_perf = json.loads(json.dumps(perf_summary, default=str))
            
            prompt = f"""
            You are an SRE Manager reviewing Project: {project_name}
            
            DATA PROVIDED:
            - Top Error Signatures (JSON): {json.dumps(safe_errors)}
            - Performance Samples (Top 5 Routes): {json.dumps(safe_perf)}
            
            GUARDRAILS:
            - Be brutally honest. If there are recurring error signatures, health is NOT "excellent".
            - Identify the most frequent error by its message and recommend a fix.
            - If 'total_errors' or individual signature counts are high, prioritize reliability as the biggest risk.
            - If DATA IS EMPTY, state that monitoring is initialized but no data has been received yet.
            
            TASK:
            Provide a 3-sentence health report. 1st sentence: Status based on specific signatures and latency numbers. 2nd sentence: Biggest threat (mention the top error message). 3rd sentence: Immediate next step.
            """
            
            response = self.client.models.generate_content(model=self.model_name, contents=prompt)
            return {"result": response.text.strip(), "prompt": prompt, "response": response.text}
        except Exception as e:
            logger.error("ai_project_summary_failed", error=str(e))
            return {"result": "Project summary generation failed.", "prompt": prompt, "response": str(e)}

    async def get_global_overview(self, org_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Phase 3: Organization Executive Summary
        """
        if not self.client:
            return {"result": "Global intelligence offline.", "prompt": "", "response": ""}

        total_errors = sum(p.get('error_count', 0) for p in org_data)
        
        try:
            safe_org_data = json.loads(json.dumps(org_data, default=str))
            
            prompt = f"""
            You are a CTO reviewing Organization-Wide Telemetry.
            
            INVENTORY BY PROJECT:
            {json.dumps(safe_org_data)}
            
            RULES:
            1. Analyze the 'most_frequent_signature' for each project.
            2. If errors exist, identifying the "Bad Actor" project and its primary crashing signature is mandatory.
            3. Keep it under 80 words. Professional, data-driven, and technical.
            
            TASK:
            Summarize the organizational state. Mention the bad actor by name and its most frequent error message.
            """
            
            response = self.client.models.generate_content(model=self.model_name, contents=prompt)
            return {"result": response.text.strip(), "prompt": prompt, "response": response.text}
        except Exception as e:
            logger.error("ai_global_overview_failed", error=str(e))
            return {"result": "Executive analysis failed.", "prompt": prompt, "response": str(e)}

    async def get_performance_insights(self, performance_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Phase 4: Proactive Performance Insights
        """
        if not self.client:
            return {"result": "Intelligence offline.", "prompt": "", "response": ""}

        if not performance_data:
            return {"result": "No performance telemetry has been collected for this project yet...", "prompt": "", "response": ""}

        try:
            safe_perf = json.loads(json.dumps(performance_data, default=str))
            
            prompt = f"""
            Analyze these Performance Metrics:
            {json.dumps(safe_perf)}
            
            TASK:
            1. Identify the route with the highest 'page_load' time.
            2. Provide 2 specific optimizations for that route.
            
            STRICTURE: Do not discuss hypothetical routes. Stick ONLY to the data provided.
            """
            
            response = self.client.models.generate_content(model=self.model_name, contents=prompt)
            return {"result": response.text.strip(), "prompt": prompt, "response": response.text}
        except Exception as e:
            logger.error("ai_perf_insights_failed", error=str(e))
            return {"result": "Performance intelligence failed.", "prompt": prompt, "response": str(e)}

ai_service = AIService()
