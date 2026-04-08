<p align="center">
  <img src="https://img.shields.io/badge/BugTrace-Error%20Monitoring-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxsaW5lIHgxPSIxMiIgeTE9IjgiIHgyPSIxMiIgeTI9IjEyIi8+PGxpbmUgeDE9IjEyIiB5MT0iMTYiIHgyPSIxMi4wMSIgeTI9IjE2Ii8+PC9zdmc+" alt="BugTrace" />
</p>

<h1 align="center">BugTrace</h1>

<p align="center">
  <strong>Open-source error tracking & monitoring platform for modern web applications</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/bug-tracker-sdk"><img src="https://img.shields.io/npm/v/bug-tracker-sdk?color=blue&label=SDK" alt="npm" /></a>
  <a href="https://bugtrace.jainprashuk.in"><img src="https://img.shields.io/badge/Dashboard-Live-brightgreen" alt="Dashboard" /></a>
  <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-sdk-reference">SDK Reference</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-deployment">Deployment</a>
</p>

---

## 📖 Overview

**BugTrace** is a self-hosted error tracking and monitoring platform — similar to Sentry — built from scratch. It captures JavaScript runtime errors, API failures, performance metrics, and user-reported bugs from production web applications, groups them using intelligent fingerprinting, and surfaces them through a real-time analytics dashboard.

### What makes it different?

| Capability | Detail |
|-----------|--------|
| **SHA-256 Fingerprinting** | Errors are deduplicated by normalizing endpoints, messages, and stack frames before hashing — identical to how Sentry groups issues |
| **Cooldown-Aware Alerting** | Alert engine with spike detection, per-fingerprint cooldowns, and state persistence — prevents notification fatigue |
| **Visual Context** | Automatic screenshot capture at the moment of error using `html2canvas` — stored on Cloudflare R2 |
| **Ticketing Integration** | One-click OpenProject ticket creation with encrypted API credential management |
| **Published SDK** | Lightweight npm package with zero-config setup — just `initBugTracker({ apiKey })` |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT APPLICATION                            │
│                                                                         │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│   │ window.onerror│  │Fetch Intercept│  │Axios Intercept│  │ Manual    │  │
│   │ + unhandled   │  │(monkey-patch) │  │(response hook)│  │ Reporter  │  │
│   │  rejection    │  │              │  │              │  │ (Shadow   │  │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │  DOM)     │  │
│          │                 │                 │          └─────┬─────┘  │
│          └─────────────────┼─────────────────┼────────────────┘        │
│                            ▼                                           │
│                   ┌─────────────────┐                                  │
│                   │  bug-tracker-sdk │ ◀── npm package (v1.0.18)       │
│                   │  + html2canvas   │                                  │
│                   └────────┬────────┘                                  │
└────────────────────────────┼────────────────────────────────────────────┘
                             │
                    POST /report (x-api-key)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        COLLECTOR (FastAPI)                               │
│                                                                         │
│   ┌────────────┐    ┌──────────────────┐    ┌────────────────────────┐  │
│   │ API Key    │    │  Error Processing │    │  Alert Engine          │  │
│   │ Validation │───▶│                  │───▶│                        │  │
│   └────────────┘    │ • Fingerprinting │    │ • Cooldown check       │  │
│                     │ • Deduplication   │    │ • New error trigger    │  │
│                     │ • Stack parsing   │    │ • Spike detection      │  │
│                     │ • Screenshot → R2 │    │ • Email via Resend     │  │
│                     └────────┬─────────┘    └──────────┬─────────────┘  │
│                              │                         │                │
│                              ▼                         ▼                │
│                     ┌──────────────┐          ┌──────────────────┐      │
│                     │  MongoDB     │          │  Alert Logs      │      │
│                     │  Atlas       │          │  (Observable)    │      │
│                     └──────────────┘          └──────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                             │
                    REST API (JWT Auth)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DASHBOARD (React + Vite)                              │
│                                                                         │
│   ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌───────────────────┐  │
│   │ Project    │  │ Error      │  │ Ticket   │  │ Settings          │  │
│   │ Overview   │  │ Deep Trace │  │ Manager  │  │ (Alerts, Integr.) │  │
│   │ + Charts   │  │ + Timeline │  │          │  │                   │  │
│   └────────────┘  └────────────┘  └──────────┘  └───────────────────┘  │
│                                                                         │
│   Auth: Clerk OAuth (Google/GitHub) ──bridge──▶ Local JWT               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🔍 Error Ingestion & Processing

- **Multi-vector capture** — `window.onerror`, `unhandledrejection`, Axios interceptor, Fetch monkey-patch
- **SHA-256 Fingerprinting** — Normalizes URLs (strips `/123`, `/:uuid`), error messages (strips dynamic values), and extracts the top relevant stack frame (skips `node_modules`) before generating a composite hash
- **Deduplication** — Identical errors are grouped into issue groups with `occurrence` counters and `first_seen`/`last_seen` timestamps
- **Screenshot Capture** — `html2canvas` captures the DOM at the moment of error, uploaded to Cloudflare R2

### 🔔 Intelligent Alert Engine

- **Trigger Types**: `NEW_ERROR` (first occurrence of a unique fingerprint) and `SPIKE` (error frequency exceeds configurable threshold)
- **Cooldown System** — Per-fingerprint cooldown prevents notification storms (default: 60 min, user-configurable)
- **State Persistence** — `lastNotifiedAt` and `notifiedCount` are tracked per error group for accurate spike detection
- **Email Delivery** — Premium HTML email via Resend API with dark theme, color-coded severity, embedded screenshots

### 🎫 Ticketing Integration

- **OpenProject** — One-click ticket creation from any error, with auto-generated markdown descriptions
- **Encrypted Credentials** — AES-256-CBC encryption for stored API keys, with Fernet backward compatibility
- **Test Connection** — Validate OpenProject setup before saving

### 📊 Dashboard

- **Error Trend Visualization** — Recharts-powered heatmaps and bar charts
- **Live Alert Center** — Real-time feed of alert decisions and delivery status
- **Project Management** — Multi-project support with per-project API keys
- **Deep Error Trace** — Full payload inspection, stack traces, screenshots, occurrence history
- **Premium UI** — Glassmorphism dark theme with micro-animations (Tailwind CSS)

### 🔐 Authentication

- **Clerk OAuth** — Google/GitHub login with managed UI
- **JWT Bridge** — `ClerkSync` component bridges Clerk sessions to local JWT tokens
- **Session Management** — Zustand store with `localStorage` persistence

### 📦 SDK (`bug-tracker-sdk`)

- **Zero-config** — `initBugTracker({ apiKey })` and everything works
- **Modular Capture** — Enable/disable screenshots, performance monitoring, manual reporting independently
- **Manual Bug Reporter** — Shadow DOM-isolated floating button with customizable modal schema (textarea, select, radio, checkbox fields)
- **Performance Tracking** — Page load time, DOM content loaded, First Paint, First Contentful Paint via `Performance API`
- **Self-protection** — Fetch interceptor skips `/report` URLs to prevent infinite recursion

---

## 🚀 Quick Start

### 1. Install the SDK

```bash
npm install bug-tracker-sdk
```

### 2. Get an API Key

1. Go to [bugtrace.jainprashuk.in](https://bugtrace.jainprashuk.in/)
2. Sign in with Google or GitHub
3. Click **Create Project** → copy the generated API key

### 3. Initialize in Your App

```javascript
import { initBugTracker } from "bug-tracker-sdk";
import axios from "axios";

initBugTracker({
  apiKey: "proj_your_api_key_here",
  axios, // optional — enables Axios error interception
});

// Done. Errors are now tracked automatically.
```

---

## 📚 SDK Reference

### Configuration Options

```javascript
initBugTracker({
  // Required
  apiKey: "proj_xxxxx",

  // Optional — defaults to hosted collector
  collectorUrl: "https://bugtracker.jainprashuk.in",

  // Optional — pass your Axios instance to intercept API failures
  axios: axiosInstance,

  // Optional — granular feature control
  features: {
    captureScreenshots: {
      fetchErrors: true,      // Screenshot on fetch failures
      axiosErrors: true,      // Screenshot on Axios failures
      consoleErrors: true,    // Screenshot on console errors
    },

    capturePerformance: true,  // Track page load metrics

    manualBugReport: {         // Floating feedback button
      captureScreenshot: true,
      floatingButton: () => {  // Custom button factory (optional)
        const btn = document.createElement("button");
        btn.textContent = "🐞 Report Bug";
        return btn;
      },
      modalSchema: {           // Custom form fields
        title: "Report an Issue",
        fields: [
          { name: "description", label: "Description", type: "textarea" },
          { name: "email", label: "Email", type: "text" },
          { name: "category", label: "Category", type: "select",
            options: ["Bug", "UI Issue", "Suggestion"] },
        ],
      },
    },
  },
});
```

### What Gets Captured Automatically

| Event Type | Trigger | Data Collected |
|-----------|---------|---------------|
| `unhandled_exception` | `window.onerror` | Error message, stack trace, source file/line/column, page URL, user agent |
| `api_error` (Axios) | Axios response interceptor (non-2xx) | Request URL/method/payload, response status/data, error stack |
| `api_error` (Fetch) | Fetch monkey-patch (non-`ok` or exception) | Request URL/method/body, response status, error stack |
| `performance` | `window.load` event | Page load time, DOM content loaded, First Paint, FCP |
| `manual` | User clicks floating button | Custom form data, optional screenshot |

### React Integration

```tsx
// main.tsx — initialize BEFORE React renders
import { initBugTracker } from "bug-tracker-sdk";
import axios from "axios";

initBugTracker({ apiKey: "proj_xxxxx", axios });

// Then render your app
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
```

---

## 🔌 API Reference

### Error Ingestion (SDK → Collector)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/report` | `x-api-key` header | Primary ingestion endpoint — receives error payloads from SDK |

### Error Management (Dashboard → Collector)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/projects/{project_id}/errors` | JWT Bearer | List all error groups for a project |
| `GET` | `/errors/{fingerprint}` | JWT Bearer | Full error detail with payload, screenshots, timestamps |

### Project Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/projects` | JWT Bearer | Create a new project (returns `project_id` + `api_key`) |
| `GET` | `/projects/{user_id}` | JWT Bearer | Get all projects for a user |
| `GET` | `/projects` | JWT Bearer | List all projects (admin) |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/clerk-sync` | — | Sync Clerk OAuth user into local DB, returns JWT token |
| `GET` | `/auth/verify` | JWT Bearer | Verify current session |

### Ticketing & Integrations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/tickets/openproject/{fingerprint}` | JWT Bearer | Create OpenProject ticket from error |
| `GET` | `/projects/{project_id}/tickets` | JWT Bearer | List tickets for a project |
| `POST` | `/projects/{project_id}/integrations/openproject` | JWT Bearer | Save OpenProject connection settings |
| `POST` | `/integrations/openproject/test` | JWT Bearer | Test OpenProject connection |

### Alert Configuration

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/projects/{project_id}/alert-config` | JWT Bearer | Get alerting rules |
| `PUT` | `/projects/{project_id}/alert-config` | JWT Bearer | Update alert triggers, recipients, cooldown |
| `GET` | `/projects/{project_id}/alerts/logs` | JWT Bearer | Alert history (powers Live Alert Center) |

---

## 🛠 Tech Stack

### Collector (Backend)

| Technology | Purpose |
|-----------|---------|
| **FastAPI** (Python 3.11) | High-performance async API framework |
| **MongoDB Atlas** (`pymongo`) | Document store for errors, projects, users, alerts |
| **Pydantic v2** | Request/response validation with strict typing |
| **PyJWT** | JSON Web Token generation and verification |
| **Cryptography** (AES-256-CBC + Fernet) | Encryption for stored API keys and credentials |
| **httpx** | Async HTTP client for Resend API and OpenProject calls |
| **boto3** | S3-compatible client for Cloudflare R2 screenshot storage |

### Dashboard (Frontend)

| Technology | Purpose |
|-----------|---------|
| **React 19** + **Vite 7** | UI framework with fast HMR dev server |
| **TypeScript** | Type safety across all components |
| **Tailwind CSS 3** | Utility-first styling with custom dark theme |
| **Clerk React** | OAuth login (Google/GitHub) |
| **TanStack React Query** | Server state management with caching |
| **Zustand** | Lightweight client state management |
| **Recharts** | Error trend charts and heatmaps |
| **Lucide React** | Icon system |

### SDK

| Technology | Purpose |
|-----------|---------|
| **Vanilla JavaScript** (ESM + CJS) | Zero-dependency error capture |
| **html2canvas** | DOM screenshot capture |
| **tsup** | Build tooling (ESM + CJS dual output) |

### Infrastructure

| Service | Purpose |
|---------|---------|
| **MongoDB Atlas** | Managed database cluster |
| **Cloudflare R2** | S3-compatible object storage for screenshots |
| **Resend** | Transactional email delivery |
| **Clerk** | Managed OAuth identity provider |
| **Vercel** | Frontend + backend deployment |

---

## ⚙️ Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudflare R2 bucket (for screenshots)
- Clerk account (for OAuth)
- Resend account (for alert emails)

### 1. Clone the Repository

```bash
git clone https://github.com/Jainprashuk/Error_tracker.git
cd Error_tracker
```

### 2. Backend (Collector)

```bash
cd collector

# Create virtual environment
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials (see Environment Variables below)

# Run the server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend (Dashboard)

```bash
cd bug-tracker

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Clerk + API keys

# Run dev server
npm run dev
```

### 4. SDK (for local development)

```bash
cd sdk

# Install dependencies
npm install

# Build
npm run build
```

### Environment Variables

#### Collector (`collector/.env`)

```env
# MongoDB
mongo_uri=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
db_name=error_tracker_db

# JWT
JWT_SECRET_KEY=<random-256-bit-secret>
ACCESS_TOKEN_EXPIRE_HOURS=24

# Cloudflare R2
CF_ACCOUNT_ID=<cloudflare-account-id>
CF_ACCESS_KEY_ID=<r2-access-key>
CF_SECRET_ACCESS_KEY=<r2-secret-key>
R2_PUBLIC_URL=https://<your-r2-public-url>.r2.dev

# Encryption
ENCRYPTION_KEY=<base64-encoded-32-byte-key>

# Resend (Email)
RESEND_API_KEY=re_<your-resend-key>
```

#### Dashboard (`bug-tracker/.env.local`)

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_<your-clerk-key>
VITE_ENCRYPTION_KEY=<same-key-as-backend>
```

---

## 📂 Project Structure

```
Error_tracker/
│
├── collector/                    # Backend API (FastAPI)
│   ├── app/
│   │   ├── main.py              # App entry point, CORS, router registration
│   │   ├── models/              # Pydantic request/response schemas
│   │   │   ├── error_model.py   # ErrorPayload, RequestData, ResponseData
│   │   │   ├── project_model.py # CreateProject
│   │   │   ├── user_model.py    # OAuthUser
│   │   │   └── alert_model.py   # AlertConfigSchema, Triggers, SpikeTrigger
│   │   ├── routes/              # API endpoint handlers
│   │   │   ├── error_routes.py  # POST /report, GET /errors
│   │   │   ├── project_routes.py
│   │   │   ├── auth_routes.py   # Clerk sync, JWT verify
│   │   │   ├── ticket_routes.py # OpenProject ticket creation
│   │   │   ├── integration_routes.py
│   │   │   └── alert_routes.py  # Alert config CRUD + logs
│   │   ├── services/            # Business logic layer
│   │   │   ├── db.py            # MongoDB connection + indexes
│   │   │   ├── ticket_service.py # ParseError — core ingestion pipeline
│   │   │   ├── alert_service.py # should_send_alert, cooldown logic
│   │   │   ├── email_service.py # Resend API + HTML template
│   │   │   ├── openproject_service.py
│   │   │   └── r2.py           # Cloudflare R2 client
│   │   └── utils/               # Shared utilities
│   │       ├── fingerprint.py   # SHA-256 fingerprinting with normalization
│   │       ├── stack_parser.py  # Regex-based stack trace extraction
│   │       ├── encryption.py    # AES-256-CBC + Fernet encryption
│   │       ├── s3upload.py      # Screenshot upload to R2
│   │       ├── api_key.py       # Secure API key generation
│   │       └── ticket_generate.py # OpenProject ticket formatting
│   ├── requirements.txt
│   └── vercel.json
│
├── bug-tracker/                  # Frontend Dashboard (React)
│   ├── src/
│   │   ├── App.tsx              # Routes, auth guards, ClerkSync bridge
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx    # Project overview + error trends
│   │   │   ├── ProjectPage.tsx      # Error list for a specific project
│   │   │   ├── ErrorDetailPage.tsx  # Deep trace + occurrence history
│   │   │   ├── SettingsPage.tsx     # Alert + integration configuration
│   │   │   ├── TicketsPage.tsx      # OpenProject ticket list
│   │   │   ├── LandingPage.tsx      # Public marketing page
│   │   │   ├── LoginPage.tsx        # Clerk OAuth login
│   │   │   └── DocsPage.tsx         # SDK documentation
│   │   ├── components/
│   │   │   ├── CreateProjectModal.tsx # Multi-step project wizard
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ClerkSync.tsx        # Clerk → local JWT bridge
│   │   │   └── ui.tsx               # Design system (Button, Card, Badge)
│   │   ├── services/api.ts          # Axios API client with interceptors
│   │   ├── store/auth.ts            # Zustand auth state
│   │   └── utils/crypto.ts          # Client-side AES encryption
│   ├── package.json
│   └── tailwind.config.js
│
├── sdk/                          # Client SDK (npm package)
│   ├── src/
│   │   ├── index.js             # initBugTracker entry point
│   │   ├── tracker.js           # window.onerror + unhandledrejection
│   │   ├── axiosInterceptor.js  # Axios response error interceptor
│   │   ├── fetchInterceptor.js  # Fetch monkey-patch with self-protection
│   │   ├── sender.js            # HTTP transport to collector
│   │   ├── takeScreenshot.js    # html2canvas wrapper
│   │   ├── performanceTracker.js # Performance API metrics
│   │   ├── manualBugReporter.js # Shadow DOM feedback widget
│   │   └── utils/normalizer.js  # Base payload factory
│   └── package.json
│
├── api_documentation.md          # Full API reference
└── project_analysis.md           # Technical system analysis
```

---

## 🔬 Technical Deep Dives

### Error Fingerprinting Algorithm

The fingerprinting pipeline ensures identical errors are grouped into a single issue:

```
Input Error
    │
    ├── Endpoint: "/api/users/123-abc-456/orders"
    │   └── Normalized: "/api/users/:uuid/orders"  (UUIDs → :uuid, numbers → :id)
    │
    ├── Message: "Cannot read property 'name' of null at line 42"
    │   └── Normalized: "Cannot read property '' of null at line "  (strip numbers + quotes)
    │
    ├── Stack: "Error: ...\n  at UserComponent (app.js:42:15)\n  at node_modules/react..."
    │   └── Top Frame: "at UserComponent (app.js:42:15)"  (skip node_modules)
    │
    └── Composite Hash:
        SHA-256("api_error|no_status|/api/users/:uuid/orders|Cannot read...|at UserComponent...|project_id")
                 └──────── Fingerprint: "a3f5e2..." ────────┘
```

### Alert Engine Flow

```
New Error Arrives
    │
    ▼
┌──────────────────────────┐
│  1. Cooldown Check       │
│  Is (now - lastNotified) │──── < cooldown ────▶ SUPPRESS
│    < cooldown_minutes?   │
└────────────┬─────────────┘
             │ expired / never notified
             ▼
┌──────────────────────────┐
│  2. New Error?           │
│  occurrences == 1 AND    │──── match ────────▶ ALERT: NEW_ERROR
│  triggers.newError?      │
└────────────┬─────────────┘
             │ not new
             ▼
┌──────────────────────────┐
│  3. Spike Detection      │
│  (total - notifiedCount) │──── ≥ threshold ──▶ ALERT: SPIKE
│    ≥ spike.threshold?    │
└────────────┬─────────────┘
             │ below threshold
             ▼
         NO ALERT
```

### Authentication Bridge

```
Clerk OAuth (Google/GitHub)
    │
    ▼
┌─────────┐      POST /auth/clerk-sync      ┌──────────┐
│  Clerk   │ ───────────────────────────────▶ │ Collector │
│  React   │  { clerk_id, email, name }      │ (FastAPI) │
└─────────┘                                  └─────┬────┘
    ▲                                              │
    │           { user_id, token (clerk_id) }       │
    └──────────────────────────────────────────────┘
                                                    │
                                              Upsert into
                                              MongoDB users
```

---

## 🗄️ Database Schema

### `errors` Collection

```javascript
{
  _id: ObjectId,
  project_id: ObjectId,           // FK → projects
  fingerprint: "sha256_hash",     // Unique error group identifier
  event_type: "api_error" | "unhandled_exception" | "manual" | "performance",
  payload: { ... },               // Full error payload from SDK
  location: {                     // Parsed from stack trace
    file: "https://app.com/main.js",
    line: 42,
    column: 15
  },
  screenshot_url: "https://r2.dev/screenshots/uuid.png",
  occurrences: 127,               // Deduplicated count
  first_seen: ISODate,
  last_seen: ISODate,
  is_ticket_generated: false,
  ticket_url: "https://openproject.com/work_packages/123",
  lastNotifiedAt: ISODate,        // Alert engine state
  notifiedCount: 100              // Alert engine state
}
```

### `alert_configs` Collection

```javascript
{
  _id: ObjectId,
  projectId: ObjectId,
  channels: {
    email: {
      enabled: true,
      recipients: ["dev@company.com", "oncall@company.com"]
    }
  },
  triggers: {
    newError: true,
    spike: { enabled: true, threshold: 10 }
  },
  cooldown: 60  // minutes
}
```

### Indexes

```javascript
// Compound index for primary query pattern
errors: { project_id: 1, fingerprint: 1 }  // "idx_project_fingerprint"
```

---

## 🚢 Deployment

### Vercel (Current Setup)

Both the collector and dashboard are configured for Vercel deployment:

**Backend** (`collector/vercel.json`):
```json
{
  "functions": {
    "api/index.py": { "runtime": "python3.11" }
  },
  "routes": [
    { "src": "/(.*)", "dest": "api/index.py" }
  ]
}
```

**Frontend** (`bug-tracker/vercel.json`):
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Live Instances

| Service | URL |
|---------|-----|
| Dashboard | [bugtrace.jainprashuk.in](https://bugtrace.jainprashuk.in) |
| Collector API | [bugtracker.jainprashuk.in](https://bugtracker.jainprashuk.in) |
| SDK (npm) | [npmjs.com/package/bug-tracker-sdk](https://www.npmjs.com/package/bug-tracker-sdk) |

---

## 🧪 System Design Analysis

A comprehensive system design analysis is available at [`project_analysis.md`](./project_analysis.md), covering:

- **Current architecture** maturity assessment
- **Critical gaps** vs production-grade systems (Sentry, Datadog)
- **Upgrade roadmap** with 3 prioritized phases
- **Key engineering decisions** and their trade-offs

### Summary Metrics

| Dimension | Current State |
|-----------|--------------|
| Ingestion | Synchronous direct DB write |
| Deduplication | ✅ SHA-256 fingerprinting |
| Alerting | ✅ Cooldown + spike detection |
| Caching | ❌ No Redis / in-memory caching |
| Rate Limiting | ❌ Not implemented |
| Real-time | ❌ Polling only (no WebSocket) |
| Observability | ⚠️ `print()` logging — no structured logs |
| Horizontal Scaling | ❌ Single-instance design |

---

## 🗺️ Roadmap

- [ ] **Event store** — Store each error occurrence separately (currently only latest payload is kept)
- [ ] **Redis caching** — Cache API key lookups and alert configs
- [ ] **Background processing** — Async ingestion with FastAPI `BackgroundTasks`
- [ ] **Rate limiting** — Per-API-key request throttling
- [ ] **SDK batching** — Buffer errors and flush periodically
- [ ] **WebSocket push** — Real-time error feed to dashboard
- [ ] **Source map support** — Server-side deobfuscation of minified stacks
- [ ] **Issue lifecycle** — Resolved / Ignored / Regressed states
- [ ] **Environment tagging** — Filter by staging vs production
- [ ] **Kafka ingestion** — Message queue for horizontal scalability

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Prashuk Jain**

- GitHub: [@Jainprashuk](https://github.com/Jainprashuk)
- Dashboard: [bugtrace.jainprashuk.in](https://bugtrace.jainprashuk.in)

---

<p align="center">
  <sub>Built with ☕ and a deep appreciation for <code>try...catch</code> blocks</sub>
</p>
