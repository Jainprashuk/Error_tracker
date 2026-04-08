# BugTrace: Error Tracking & Monitoring System - Comprehensive Analysis

## 🚀 Core Features Developed
- **Multi-Step Onboarding**: Smooth project creation wizard with optional ticketing and alert configuration.
- **Real-Time Error Ingestion**: High-performance backend designed for immediate error capturing from production environments.
- **Intelligent Fingerprinting**: Automatic deduplication of identical error occurrences into single manageable issues.
- **Deep Trace Analysis**: Interactive stack trace visualization and occurrence history for every captured error.
- **Active Alerting System**: Configurable SMTP-based email notifications triggered by new errors or traffic spikes.
- **Automated Ticketing Integration**: One-click or automatic creation of OpenProject tickets from production issues.
- **Multi-Layer Tracker SDK**: 
    - Automatic capture of `window.onerror` and `unhandledrejection` events.
    - Interceptors for `Axios` and `Fetch` to monitor API failures.
    - Page performance metrics and load time tracking.
    - Visual context through automated screenshot capturing on error.
- **Interactive Monitoring Dashboard**: 
    - Visual trend analysis using heatmaps and bar charts.
    - Live "Alert Center" feed for real-time situational awareness.
    - Secure API key management with client-side and server-side encryption.
- **Secure Authentication**: Robust JWT-based user authentication and session management.

---

## 🏗 System Architecture

The system follows a classic client-server monitoring pattern:
1. **SDK**: Integrated into the user's web app, captures errors/performance and sends them to the Collector.
2. **Collector**: Ingests data, deduplicates errors (fingerprinting), stores them in MongoDB, and triggers alerts.
3. **Dashboard**: Allows developers to view statistics, manage projects, and configure integrations.

---

## 1. `bug-tracker` (Frontend Dashboard)
A premium, modern React-based application for monitoring and configuration.

### 🛠 Tech Stack
- **Framework**: React 18+ with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Premium developer theme with dark mode/glassmorphism)
- **State Management**: Zustand (implied by `store` directory)
- **Charts**: Recharts for error trend visualization
- **Icons**: Lucide React

### 📂 Folder Structure
- `src/pages/`: Core application views
    - `DashboardPage.tsx`: Overview of all projects and error trends.
    - `ProjectPage.tsx`: Detailed view of a specific project and its issues.
    - `ErrorDetailPage.tsx`: Deep trace of a specific error fingerprint.
    - `SettingsPage.tsx`: Project settings and integration configs.
- `src/components/`:
    - `CreateProjectModal.tsx`: Multi-step wizard for project onboarding.
    - `ui.tsx`: Reusable design system tokens (Buttons, Cards, Badges, etc.).
    - `Sidebar.tsx`: Main navigation.
- `src/store/`: `auth.ts` for session management.
- `src/utils/`: `crypto.ts` for client-side API key encryption.

---

## 2. `collector` (Backend API)
The central data processing hub built for high-performance ingestion.

### 🛠 Tech Stack
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (via `pymongo`)
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Pydantic
- **Deployment**: Vercel ready (`vercel.json`, `Procfile`)

### 📂 Folder Structure
- `app/main.py`: Entry point and middleware configuration.
- `app/routes/`: Modular API endpoints
- `app/models/`: MongoDB document schemas (Alerts, Projects, Users, Errors).
- `app/services/`: Core business logic
- `app/utils/`: Encryption, fingerprinting, and helper logic.

---

## 3. `sdk` (Client Library)
A lightweight JavaScript library for automatic and manual error capturing.

---

## � Authentication & Session Management

The system uses a **Hybrid Authentication Model** designed for maximum security and ease of use:

### 1. Identity Provider (Clerk)
- **Use Case**: Handles the frontend UI for Google/GitHub OAuth logins and user state management.
- **Frontend**: The `LoginPage` and `ProtectedRoute` use `@clerk/clerk-react` to ensure only authenticated users can access the dashboard.

### 2. Synchronization Bridge (`ClerkSync.tsx`)
Because the backend needs its own record of users (to associate projects/errors), a background component handles the bridge:
1. **Detect**: `ClerkSync` waits for a successful Clerk OAuth login.
2. **Ping**: It calls the `/auth/clerk-sync` endpoint with the Clerk user ID and metadata.
3. **Register**: The Backend upserts this user into the MongoDB `users` collection.

### 3. Local Authorization (JWT)
- **Protocol**: Backend uses **JSON Web Tokens (JWT)** for independent session authorization.
- **Verification**: Once a user is synced, the collector issues a local JWT. This token is stored in the browser's `localStorage` and sent in the `Authorization: Bearer <token>` header for all project and error-related API calls.
- **Security**: The backend checks the signature of this token using a private `JWT_SECRET_KEY` on every request.

---

## 🔔 Alert Notification Engine

### 🧠 Decision Logic (`should_send_alert`)
For every incoming error report, the engine evaluates whether to trigger an alert based on the following sequential checks:

1.  **Cooldown Period**:
    *   The engine checks the `lastNotifiedAt` timestamp for that specific error fingerprint.
    *   If the time elapsed since the last notification is less than the project's configured **Cooldown** (default: 60 minutes), the alert is suppressed.
2.  **Trigger Evaluation**:
    *   **`NEW_ERROR`**: Triggered only on the very first occurrence of a unique fingerprint (`occurrences == 1`).
    *   **`SPIKE` Detection**: Triggered when the frequency of an existing error increases significantly. Calculates `new_since_last_alert = total_occurrences - notified_count_at_last_alert`.

### 💾 Alert State Persistence
To manage these rules locally, the system persists state within the MongoDB issue document:
-   **`lastNotifiedAt`**: Updated to current UTC time whenever an alert is successfully sent.
-   **`notifiedCount`**: Updated to the total `occurrences` count at the moment of alerting.

### 📝 Observability & Logs
Every alert decision is recorded in the `alert_logs` collection. These logs power the "Live Alert Center" in the Dashboard UI.

### 📧 Delivery Mechanism (Email/Resend)
-   **Provider**: Integrated with **Resend API**.
-   **Recipients**: Dynamically fetched from `alert_config`.
-   **Premium HTML Template**: Dark-themed, branded email with branded color-coded severity (Blue for New, Red for Spike).
-   **Snapshot**: If captured, screenshots are embedded directly.

---

## 🖥 Configuration Management & UI

Users can manage project-specific integrations and alerts through two primary interfaces:

### 1. Project Creation Wizard (`CreateProjectModal.tsx`)
During initial onboarding, a 3-step wizard guides the user:
-   **Step 1: General**: Mandatory project naming.
-   **Step 2: Ticketing**: Optional configuration for OpenProject.
-   **Step 3: Alerts**: Optional setup for email recipients, thresholds, and cooldowns.

### 2. Project Settings (`SettingsPage.tsx`)
For existing projects, configurations can be updated at any time, including OpenProject sync details and fine-grained notification triggers.

---

## ⚙️ Technical Logic & Core Flows

### 🧬 Error Fingerprinting (Deduplication)
1.  **Endpoint Redaction**: Replaces unique resource paths (e.g., `/user/123-abc`) with generic placeholders (e.g., `/user/:uuid`).
2.  **Message Normalization**: Strips dynamic data like numbers and quoted strings.
3.  **Intelligent Stack Extraction**: Specifically extracts the top-most relevant frame from the stack trace.
4.  **SHA-256 Hashing**: Generates a unique hash by combining event type, status code, normalized data, and project ID.

---

## 🛠 SDK Configuration Options

```javascript
initBugTracker({
  apiKey: 'YOUR_PROJECT_API_KEY',
  collectorUrl: 'https://api.yourdomain.in',
  axios: axiosInstance,
  features: {
    capturePerformance: true,
    captureScreenshots: {
       fetchErrors: true,
       axiosErrors: true,
       consoleErrors: true,
    }
  }
});
```

---

## 🔑 Environment configurations

### Backend (`collector/.env`)
- `mongo_uri`, `JWT_SECRET_KEY`, `CF_ACCOUNT_ID/KEY` (Cloudflare R2), `ENCRYPTION_KEY`, `RESEND_API_KEY`.

### Frontend (`bug-tracker/.env`)
- `VITE_API_BASE_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_ENCRYPTION_KEY`.

---

## 📝 Development Guidelines for AI Agents
- **Security**: Always use the `encryption` utility when handling API keys.
- **Consistency**: Maintain the glassmorphism aesthetic in the frontend.
- **SDK Stability**: Ensure the SDK remains dependency-light.

