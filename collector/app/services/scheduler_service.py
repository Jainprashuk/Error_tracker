import os
import io
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.db import projects_collection, errors_collection, users_collection
from app.services.email_service import send_lifecycle_email
import structlog


logger = structlog.get_logger()
scheduler = AsyncIOScheduler()

async def check_pending_integrations():
    """
    Job 1: Checks for projects created > 2 hours ago that are NOT integrated.
    Job 2: Checks for projects created > 72 hours ago that are still NOT integrated (Hail Mary).
    """
    now = datetime.utcnow()
    two_hours_ago = now - timedelta(hours=2)
    seventy_two_hours_ago = now - timedelta(hours=72)
    
    # Needs 2-hour reminder
    cursor = projects_collection.find({
        "is_integrated": {"$ne": True},
        "created_at": {"$lt": two_hours_ago, "$gt": seventy_two_hours_ago},
        "integration_reminder_sent": {"$ne": True}
    })
    
    async for project in cursor:
        org_id = project.get("org_id")
        
        # Get org owner or first admin to email
        # For simplicity, finding the first user in the system or we should lookup via org
        # Here we'll fallback to a generic lookup if org_members are complex, or just use the project creator.
        # Often projects store 'user_id' or we lookup the organization owner.
        
        # Let's try finding the organization owner via the user_id if it exists on project, or we just notify an admin.
        # In BugTrace, project usually has user_id or we look up the org.
        # Fallback to the first user found for that org_id in org_members_collection (skipping full lookup to save time in this example, assuming project has user_id)
        user_id = project.get("user_id")
        
        user = await users_collection.find_one({"_id": user_id}) if user_id else None
        user_email = user.get("email") if user else None
        
        if user_email:
            html = f"""
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px 20px; text-align: center;">
                        <span style="display: inline-block; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.4); border-radius: 999px; padding: 5px 14px; margin-bottom: 14px;">
                            <span style="color: #93c5fd; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">Action Required</span>
                        </span>
                        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800;">Integrate the BugTrace SDK</h1>
                        <p style="color: #94a3b8; font-size: 13px; margin-top: 10px; margin-bottom: 0;">Your project <strong style="color: #e2e8f0;">{project.get('name')}</strong> is ready — the SDK just needs to be connected.</p>
                    </div>
                    <div style="padding: 24px 20px; color: #334155;">
                        <p style="margin-top: 0; font-size: 14px; line-height: 1.7;">Hi there,<br><br>Your workspace was provisioned successfully, but we haven't received any telemetry data yet. This usually means the SDK hasn't been initialized in your app.</p>

                        <div style="margin: 24px 0; text-align: center;">
                            <a href="https://bugtrace.jainprashuk.in/" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 13px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(59,130,246,0.35);">Open Dashboard →</a>
                        </div>

                        <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0; text-align: center;">Need help getting started? <a href="https://bugtrace.jainprashuk.in/docs" style="color: #3b82f6; text-decoration: none; font-weight: 600;">View our docs →</a></p>
                    </div>
                    <div style="background: #f8fafc; padding: 14px 20px; border-top: 1px solid #e2e8f0; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2025 BugTrace · bugtrace.jainprashuk.in</p>
                    </div>
                </div>
            </body>
            </html>
            """
            await send_lifecycle_email([user_email], "⏳ Action Required: Integrate your BugTrace SDK", html)
            
        await projects_collection.update_one(
            {"_id": project["_id"]},
            {"$set": {"integration_reminder_sent": True}}
        )

    # Needs 72-hour Hail Mary
    cursor_hail_mary = projects_collection.find({
        "is_integrated": {"$ne": True},
        "created_at": {"$lt": seventy_two_hours_ago},
        "hail_mary_sent": {"$ne": True}
    })
    
    async for project in cursor_hail_mary:
        user_id = project.get("user_id")
        user = await users_collection.find_one({"_id": user_id}) if user_id else None
        user_email = user.get("email") if user else None
        
        if user_email:
            html = f"""
            <!DOCTYPE html>
            <html>
            <body style="margin: 0; padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 20px; text-align: center;">
                        <span style="font-size: 32px;">👋</span>
                        <h1 style="color: white; margin: 12px 0 6px; font-size: 22px; font-weight: 800;">Still working on the setup?</h1>
                        <p style="color: #94a3b8; font-size: 13px; margin: 0;">We're here to help you get <strong style="color: #e2e8f0;">{project.get('name')}</strong> connected.</p>
                    </div>
                    <div style="padding: 24px 20px; color: #334155;">
                        <p style="margin-top: 0; font-size: 14px; line-height: 1.7;">Hi there,<br><br>We noticed you haven't been able to send data from <strong>{project.get('name')}</strong> to BugTrace yet. Setting up monitoring can sometimes hit snags depending on your stack — that's completely normal.</p>

                        <div style="text-align: center; margin: 24px 0 8px;">
                            <a href="https://bugtrace.jainprashuk.in/" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 13px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(59,130,246,0.35);">Open Dashboard →</a>
                        </div>

                        <p style="font-size: 13px; color: #94a3b8; margin: 20px 0 0; text-align: center;">Check our docs for integration guides: <a href="https://bugtrace.jainprashuk.in/docs" style="color: #3b82f6; text-decoration: none; font-weight: 600;">bugtrace.jainprashuk.in/docs →</a></p>

                        <p style="margin-top: 20px; margin-bottom: 0; font-size: 13px; color: #94a3b8; text-align: center;">Happy debugging,<br><strong style="color: #64748b;">The BugTrace Team</strong></p>
                    </div>
                    <div style="background: #f8fafc; padding: 14px 20px; border-top: 1px solid #e2e8f0; text-align: center;">
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2025 BugTrace · bugtrace.jainprashuk.in</p>
                    </div>
                </div>
            </body>
            </html>
            """
            await send_lifecycle_email([user_email], "👋 Checking in on your BugTrace setup", html)
            
        await projects_collection.update_one(
            {"_id": project["_id"]},
            {"$set": {"hail_mary_sent": True}}
        )




def start_scheduler():
    # Run integration checks every 15 minutes
    scheduler.add_job(check_pending_integrations, 'interval', minutes=15)
    
    scheduler.start()
    logger.info("scheduler_started")

def stop_scheduler():
    scheduler.shutdown()
    logger.info("scheduler_stopped")
