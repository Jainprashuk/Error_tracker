"""
ONE-TIME RE-ENGAGEMENT BLAST SCRIPT  (Idempotent — safe to run multiple times)
================================================================================
Run this ONCE on your production server to:

  1. Send a premium Welcome email to every existing user (skips if already sent).
  2. Send an SDK integration reminder to every unintegrated project
     (skips if already sent), then backfills the flags.

IDEMPOTENCY GUARANTEE:
  - Uses 'welcome_blast_sent: True' flag on users to prevent repeat welcome emails.
  - Uses 'integration_reminder_sent: True' flag on projects to prevent repeat reminders.
  - Safe to run multiple times — already-processed records are always skipped.
  - Server restart / redeployment does NOT re-trigger anything (flags live in MongoDB).

Usage:
    cd collector
    source venv/bin/activate
    python3 migrate_email_flags.py
"""

import asyncio
from datetime import datetime


async def run_blast():
    print("=" * 65)
    print("  🚀 BugTrace — Production Re-Engagement Blast (Idempotent)")
    print("=" * 65)

    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    print("\n📡 Connecting to database...")
    from app.services.db import init_db, users_collection, projects_collection
    from app.services.email_service import send_lifecycle_email

    await init_db()

    # ─────────────────────────────────────────────────────────────
    # STEP 1: Welcome blast — only to users who haven't received it
    # ─────────────────────────────────────────────────────────────
    print("\n─────────────────────────────────────────────────────────────")
    print("  STEP 1: Welcome emails → users without 'welcome_blast_sent'")
    print("─────────────────────────────────────────────────────────────")

    # IDEMPOTENCY: Only fetch users who have NOT been blasted yet
    users = await users_collection.find({
        "welcome_blast_sent": {"$ne": True}
    }).to_list(length=None)

    print(f"  Found {len(users)} user(s) pending welcome email.\n")

    welcome_sent = 0
    welcome_skipped = 0
    welcome_failed = 0

    for user in users:
        email = user.get("email")
        name = user.get("name") or (email.split("@")[0] if email else "there")

        if not email:
            welcome_skipped += 1
            continue

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
                        BugTrace helps you catch, diagnose, and resolve errors in real-time — before your users ever notice. Here's how to get started:
                    </p>

                    <div style="margin: 30px 0;">
                        <div style="margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6;">
                            <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px;">1. Create a Project</p>
                            <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Each app or service you monitor gets its own isolated project workspace.</p>
                        </div>
                        <div style="margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6;">
                            <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px;">2. Install the SDK</p>
                            <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">One line of code. Works with Node.js, Python, React, and more.</p>
                        </div>
                        <div style="padding: 16px; background: #f8fafc; border-radius: 10px; border-left: 3px solid #3b82f6;">
                            <p style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px;">3. Watch Errors Stream In</p>
                            <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Real-time error feeds, stack traces, and user context — all in one place.</p>
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
                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2025 BugTrace. You signed up at bugtrace.jainprashuk.in</p>
                </div>
            </div>
        </body>
        </html>
        """

        try:
            success = await send_lifecycle_email(
                [email],
                "🚀 Welcome to BugTrace — Let's crush some bugs!",
                welcome_html
            )
            if success:
                # IDEMPOTENCY: Mark this user so re-running the script skips them
                await users_collection.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"welcome_blast_sent": True}}
                )
                welcome_sent += 1
                print(f"  ✅ Sent    → {email}")
            else:
                welcome_failed += 1
                print(f"  ❌ Failed  → {email}")
        except Exception as e:
            welcome_failed += 1
            print(f"  ❌ Error   → {email}: {e}")

    print(f"\n  Result: {welcome_sent} sent, {welcome_failed} failed, {welcome_skipped} skipped (no email).")

    # ─────────────────────────────────────────────────────────────
    # STEP 2: SDK reminder — only unintegrated projects, not yet flagged
    # ─────────────────────────────────────────────────────────────
    print("\n─────────────────────────────────────────────────────────────")
    print("  STEP 2: SDK reminders → unintegrated projects not yet sent")
    print("─────────────────────────────────────────────────────────────")

    # IDEMPOTENCY: Only fetch projects that are BOTH unintegrated AND flag not yet set
    unintegrated = await projects_collection.find({
        "is_integrated": {"$ne": True},
        "integration_reminder_sent": {"$ne": True}  # <-- skip already-processed
    }).to_list(length=None)

    print(f"  Found {len(unintegrated)} project(s) pending reminder.\n")

    reminder_sent = 0
    reminder_failed = 0

    for project in unintegrated:
        user_id = project.get("user_id")
        if not user_id:
            continue

        from bson import ObjectId
        try:
            uid = ObjectId(str(user_id)) if not isinstance(user_id, ObjectId) else user_id
            user = await users_collection.find_one({"_id": uid})
        except Exception:
            continue

        if not user or not user.get("email"):
            # No owner found — still backfill flags to suppress scheduler
            await projects_collection.update_one(
                {"_id": project["_id"]},
                {"$set": {"integration_reminder_sent": True, "hail_mary_sent": True}}
            )
            continue

        email = user["email"]
        name = user.get("name") or email.split("@")[0]
        project_name = project.get("name", "your project")

        reminder_html = f"""
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 40px; text-align: center;">
                    <span style="font-size: 40px;">⏳</span>
                    <h1 style="color: #ffffff; margin: 16px 0 8px; font-size: 26px; font-weight: 800;">Still waiting on<br><span style="color: #60a5fa;">{project_name}</span></h1>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">Your project is set up — the SDK just needs to be connected.</p>
                </div>

                <div style="padding: 36px 40px;">
                    <p style="color: #475569; font-size: 15px; line-height: 1.7; margin-top: 0;">
                        Hi {name}, your BugTrace workspace for <strong>{project_name}</strong> is ready, but we haven't received any telemetry data yet.
                        This usually means the SDK hasn't been initialized in your app.
                    </p>

                    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin: 24px 0;">
                        <p style="margin: 0 0 10px; font-weight: 700; color: #0369a1; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Quick Install</p>
                        <code style="display: block; background: #0f172a; color: #7dd3fc; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-family: 'Courier New', monospace;">npm install @bugtrace/sdk</code>
                    </div>

                    <div style="text-align: center; margin: 36px 0 8px;">
                        <a href="https://bugtrace.jainprashuk.in/" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 14px 36px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(59,130,246,0.4);">Open Dashboard & Integrate →</a>
                    </div>

                    <p style="text-align: center; color: #94a3b8; font-size: 13px; margin-top: 28px;">
                        Need help? Just reply to this email.<br>
                        <strong style="color: #64748b;">The BugTrace Team</strong>
                    </p>
                </div>

                <div style="background: #f8fafc; padding: 16px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">© 2025 BugTrace. You have an active unintegrated workspace.</p>
                </div>
            </div>
        </body>
        </html>
        """

        try:
            success = await send_lifecycle_email(
                [email],
                f"⏳ Your project '{project_name}' is waiting for the SDK",
                reminder_html
            )
            if success:
                # IDEMPOTENCY: Set BOTH flags — scheduler will never touch this project again
                await projects_collection.update_one(
                    {"_id": project["_id"]},
                    {"$set": {
                        "integration_reminder_sent": True,
                        "hail_mary_sent": True
                    }}
                )
                reminder_sent += 1
                print(f"  ✅ Sent    → {email} | Project: {project_name}")
            else:
                reminder_failed += 1
                print(f"  ❌ Failed  → {email} | Project: {project_name}")
        except Exception as e:
            reminder_failed += 1
            print(f"  ❌ Error   → {email}: {e}")

    print(f"\n  Result: {reminder_sent} sent, {reminder_failed} failed.")

    print("\n" + "=" * 65)
    print("  🎉 Blast complete! Summary of guarantees:")
    print()
    print("  ✅ Welcome email   → won't resend (welcome_blast_sent flag)")
    print("  ✅ SDK reminders   → won't resend (integration_reminder_sent flag)")
    print("  ✅ Scheduler       → will skip all flagged projects on restart")
    print("  ✅ New signups     → still get the full lifecycle automatically")
    print("  ✅ Run this again  → safely skips already-processed records")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    asyncio.run(run_blast())
