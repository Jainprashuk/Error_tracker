# BugTrace: Lifecycle & Engagement Email Architecture

This document outlines the implementation strategy for the new user lifecycle email workflows, focusing on immediate Welcome Emails and timed Integration Reminders, along with strategic recommendations for future improvements.

---

## 1. Welcome Email (Immediate Onboarding)

**Objective:** Engage the user the moment they sign up and provide them with immediate next steps to get started with BugTrace.

### Implementation Steps
1. **Trigger Point**: Modify `auth_routes.py` inside the `/signup` endpoint.
2. **Action**: After successfully inserting the new user into the database and verifying them (if required), queue an asynchronous background task.
3. **Payload**:
   - Subject: "Welcome to BugTrace - Let's crush some bugs!"
   - Body: A clean HTML template introducing them to the platform, suggesting they create their first project (or organization, if applicable), and pointing to documentation.
4. **Service**: Utilize the existing `alerts_service` or email utility to dispatch this via SMTP/SendGrid.

---

## 2. The 2-Hour Integration Reminder (Delayed Action)

**Objective:** Prevent "Ghost Signups" where a user creates a project but forgets or fails to install the SDK.

### The Challenge
Because this requires a 2-hour delay, we cannot just use a `time.sleep()` in a fast API background task (which would die if the server resets and consumes memory). We need a persistent scheduler.

### Proposed Architecture: The Cron Worker
1. **Database Update**: Add a new field to the `projects` schema called `integration_reminder_sent` (Boolean, default `False`).
2. **Scheduler Setup**: Introduce `APScheduler` (Advanced Python Scheduler) to run directly alongside your FastAPI app, OR create a standalone dockerized Python cron script.
3. **The Logic Loop (Runs every 15 minutes)**:
   - Query the `projects` collection where:
     - `is_integrated` == False
     - `created_at` < (Current Time - 2 hours)
     - `integration_reminder_sent` == False (or doesn't exist)
   - For every matched project, find the `user_id` of the creator (or the Organization Admins).
   - Dispatch the "Integration Pending" email.
   - Update `integration_reminder_sent = True` to ensure idempotency (we don't spam them every 15 minutes).

### Notification Content
- Subject: "Your BugTrace Project is Waiting for Data"
- Body: Provide exact SDK initialization snippets and API keys. Make it as frictionless as possible for them to copy-paste the integration code constraint.

---

## 3. Recommended Additions & Improvements

To build a truly production-grade lifecycle system, I recommend adding the following features alongside this work:


* **3-Day "Hail Mary" Follow-up**: If 72 hours pass and the project is *still* not integrated, send a final email asking if they ran into technical issues (with a link to open a support ticket or Discord).
* **Weekly 'Bug Digest'**: Once they *do* integrate, schedule a weekly cron job every Monday morning summarizing their project's health ("You had 43 new errors this week, down 10% from last week"). in complete pdf downloadable format 

---

*Let me know if you approve of this architecture, and we can begin coding the scheduler and email routes!*
