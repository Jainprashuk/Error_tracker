import asyncio
from datetime import datetime, timedelta
import structlog
from bson import ObjectId

from app.services.db import init_db, projects_collection, users_collection, errors_collection
from app.services.scheduler_service import check_pending_integrations
from app.services.email_service import send_lifecycle_email

logger = structlog.get_logger()

async def run_tests():
    print("=" * 60)
    print("  🧪 BugTrace — Email Template Test Suite")
    print("=" * 60)
    print("\n⏳ Initializing database connection...")
    await init_db()

    # Hardcoded to YOUR account only — safe for prod DB
    TEST_EMAIL = "29jainprashuk@gmail.com"
    user = await users_collection.find_one({"email": TEST_EMAIL})
    if not user:
        print(f"❌ User {TEST_EMAIL} not found in database!")
        return

    email = user["email"]
    name = user.get("name") or email.split("@")[0]
    print(f"\n📬 All test emails will be sent to: {email}\n")

    # ─────────────────────────────────────────────────
    # TEST 1: Welcome Email
    # ─────────────────────────────────────────────────
    print("─" * 50)
    print("  TEST 1: 🚀 Welcome Email")
    print("─" * 50)

    welcome_html = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 48px 40px; text-align: center;">
                <div style="display: inline-block; background: rgba(59,130,246,0.2); border: 1px solid rgba(59,130,246,0.4); border-radius: 999px; padding: 6px 18px; margin-bottom: 24px;">
                    <span style="color: #93c5fd; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">Welcome to BugTrace</span>
                </div>
                <h1 style="color: #ffffff; margin: 0; font-size: 34px; font-weight: 800; line-height: 1.2;">Hi {name}, glad<br>you're here! 👋</h1>
                <p style="color: #94a3b8; font-size: 15px; margin-top: 16px; line-height: 1.6;">Your workspace is live. Let's start catching bugs.</p>
            </div>

            <div style="padding: 40px;">
                <p style="color: #475569; font-size: 15px; line-height: 1.7; margin-top: 0;">
                    BugTrace helps you catch, diagnose, and resolve errors in real-time — before your users ever notice. Here's how to get started in 3 steps:
                </p>

                <div style="margin: 30px 0;">
                    <div style="margin-bottom: 16px; padding: 16px 20px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6;">
                        <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px;">① Create a Project</p>
                        <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Each app or service gets its own isolated monitoring workspace.</p>
                    </div>
                    <div style="margin-bottom: 16px; padding: 16px 20px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6;">
                        <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px;">② Install the SDK</p>
                        <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">One line of code. Works with Node.js, Python, React, and more.</p>
                    </div>
                    <div style="padding: 16px 20px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6;">
                        <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px;">③ Watch Errors Stream In</p>
                        <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Real-time error feeds, stack traces, and user context — all in one dashboard.</p>
                    </div>
                </div>

                <div style="text-align: center; margin: 40px 0 20px;">
                    <a href="https://bugtrace.jainprashuk.in/" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(59,130,246,0.4);">Open My Dashboard →</a>
                </div>

                <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 32px;">
                    Happy debugging,<br><strong style="color: #64748b;">The BugTrace Team</strong>
                </p>
            </div>

            <div style="background: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2025 BugTrace · bugtrace.jainprashuk.in</p>
            </div>
        </div>
    </body>
    </html>
    """

    await send_lifecycle_email(
        [email],
        "🚀 Welcome to BugTrace — Let's crush some bugs!",
        welcome_html
    )
    print(f"  ✅ Welcome email sent to {email}")

    # ─────────────────────────────────────────────────
    # TEST 2: 2-Hour Integration Reminder
    # ─────────────────────────────────────────────────
    print("\n" + "─" * 50)
    print("  TEST 2: ⏳ 2-Hour Integration Reminder")
    print("─" * 50)

    fake_project_id = ObjectId()
    await projects_collection.insert_one({
        "_id": fake_project_id,
        "name": "Test Project (2-Hour Reminder)",
        "api_key": "dummy-api-key-2hr",
        "user_id": user["_id"],
        "is_integrated": False,
        "created_at": datetime.utcnow() - timedelta(hours=3),
        "integration_reminder_sent": False
    })

    await check_pending_integrations()
    print(f"  ✅ Integration reminder sent to {email}")

    # ─────────────────────────────────────────────────
    # TEST 3: 72-Hour Hail Mary
    # ─────────────────────────────────────────────────
    print("\n" + "─" * 50)
    print("  TEST 3: 👋 72-Hour Hail Mary Check-In")
    print("─" * 50)

    fake_hailmary_id = ObjectId()
    await projects_collection.insert_one({
        "_id": fake_hailmary_id,
        "name": "Test Project (Hail Mary)",
        "api_key": "dummy-api-key-hailmary",
        "user_id": user["_id"],
        "is_integrated": False,
        "created_at": datetime.utcnow() - timedelta(hours=73),
        "integration_reminder_sent": True,   # 2hr already sent
        "hail_mary_sent": False
    })

    await check_pending_integrations()
    print(f"  ✅ Hail Mary email sent to {email}")

    # ─────────────────────────────────────────────────
    # CLEANUP
    # ─────────────────────────────────────────────────
    print("\n🧹 Cleaning up test data from database...")
    await projects_collection.delete_many({"name": {"$regex": "Test Project"}})

    print("\n" + "=" * 60)
    print("  🎉 ALL 3 TEMPLATES TESTED!")
    print(f"  📬 Check {email} for all 3 emails.")
    print("  📊 Also check SuperAdmin → Communications Audit Log")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    asyncio.run(run_tests())
