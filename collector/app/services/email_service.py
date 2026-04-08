import os
import httpx
from typing import List, Dict, Any

RESEND_API_KEY = os.getenv("RESEND_API_KEY")

async def send_email_alert(recipients: List[str], payload: Dict[str, Any]):
    """
    Sends email alert using Resend API.
    """
    if not RESEND_API_KEY:
        print("❌ RESEND_API_KEY not found in environment")
        return False
    
    if not recipients:
        print("ℹ️ No recipients found for alert")
        return False

    alert_type = payload.get("alert_type")
    error_message = payload.get("error_message")
    project_name = payload.get("project_name")
    dashboard_link = payload.get("dashboard_link")
    
    # --- Premium Dark Theme Template ---
    brand_color = "#3b82f6" if alert_type != 'SPIKE' else "#ef4444"
    bg_color = "#0f172a"
    card_bg = "#1e293b"
    text_main = "#f8fafc"
    text_muted = "#94a3b8"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            .container {{
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                background-color: {bg_color};
                color: {text_main};
                border-radius: 16px;
                overflow: hidden;
            }}
            .header {{
                padding: 40px 30px;
                background-image: linear-gradient(to bottom right, {brand_color}22, transparent);
                text-align: center;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }}
            .badge {{
                display: inline-block;
                padding: 6px 12px;
                border-radius: 99px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                background-color: {brand_color}22;
                color: {brand_color};
                border: 1px solid {brand_color}44;
                margin-bottom: 15px;
            }}
            .project-tag {{
                font-size: 14px;
                color: {text_muted};
                margin-bottom: 5px;
            }}
            .title {{
                font-size: 24px;
                font-weight: 800;
                margin: 0;
                color: white;
            }}
            .content {{
                padding: 30px;
            }}
            .error-card {{
                background-color: {card_bg};
                border-radius: 12px;
                padding: 20px;
                border: 1px solid rgba(255,255,255,0.05);
                margin-bottom: 25px;
            }}
            .error-message {{
                font-family: 'Monaco', 'Consolas', monospace;
                font-size: 14px;
                color: #fda4af;
                background: #450a0a22;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #ef4444;
                margin: 0;
                word-break: break-all;
            }}
            .stats-grid {{
                display: table;
                width: 100%;
                margin-top: 20px;
            }}
            .stat-item {{
                display: table-cell;
                width: 50%;
            }}
            .stat-label {{
                font-size: 11px;
                color: {text_muted};
                text-transform: uppercase;
                font-weight: 700;
                letter-spacing: 0.05em;
            }}
            .stat-value {{
                font-size: 18px;
                font-weight: 700;
                color: white;
            }}
            .button {{
                display: block;
                background-color: {brand_color};
                color: white !important;
                text-align: center;
                padding: 16px;
                border-radius: 10px;
                font-weight: 700;
                text-decoration: none;
                font-size: 15px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }}
            .footer {{
                padding: 30px;
                text-align: center;
                font-size: 12px;
                color: {text_muted};
                border-top: 1px solid rgba(255,255,255,0.05);
            }}
        </style>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #f1f5f9;">
        <div class="container">
            <div class="header">
                <div class="badge">{alert_type} DETECTED</div>
                <div class="project-tag">{project_name}</div>
                <h1 class="title">Production Exception</h1>
            </div>
            
            <div class="content">
                <div class="error-card">
                    <p style="margin-top:0; font-size: 12px; color: {text_muted}; text-transform: uppercase; font-weight: 700;">Issue Detail</p>
                    <pre class="error-message">{error_message}</pre>
                    
                    <div class="stats-grid">
                        <div class="stat-item">
                            <p class="stat-label">New Occurrences</p>
                            <p class="stat-value">{payload.get('new_errors_count', 1)}</p>
                        </div>
                        <div class="stat-item">
                            <p class="stat-label">Total Impact</p>
                            <p class="stat-value">{payload.get('total_count', 1)}</p>
                        </div>
                    </div>
                </div>

                {f'<div><p class="stat-label" style="margin-bottom: 8px;">Snapshot</p><a href="{payload.get("screenshot_url")}"><img src="{payload.get("screenshot_url")}" style="width: 100%; border-radius: 10px; border: 2px solid rgba(255,255,255,0.05);" /></a></div>' if payload.get("screenshot_url") else ""}

                <div style="margin-top: 30px;">
                    <a href="{dashboard_link}" class="button">View in Dashboard</a>
                </div>
            </div>

            <div class="footer">
                This automated alert was sent to the configured recipients of <b>{project_name}</b>.<br>
                &copy; 2024 BugTracker Monitoring Engine
            </div>
        </div>
    </body>
    </html>
    """

    data = {
        "from": "BugTracker Alerts <onboarding@resend.dev>", # Default sender
        "to": recipients,
        "subject": f"⚠️ [{alert_type}] {project_name}: {error_message[:40]}...",
        "html": html_content
    }

    async with httpx.AsyncClient() as client:
        try:
            print(f"📧 [EMAIL SERVICE] Sending {alert_type} to: {recipients}")
            # Ensure key is masked for security but shown in logs to verify it exists
            masked_key = f"{RESEND_API_KEY[:4]}...{RESEND_API_KEY[-4:]}" if RESEND_API_KEY else "MISSING"
            print(f"   API Key: {masked_key}")
            
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json=data
            )
            
            if response.status_code in [200, 201]:
                print(f"✅ Alert email sent to {len(recipients)} recipients")
                return True
            else:
                print(f"❌ Failed to send email via Resend: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error sending email: {str(e)}")
            return False
