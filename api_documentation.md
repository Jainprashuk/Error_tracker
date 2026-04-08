# BugTrace: API Documentation

This document provides a comprehensive reference for all internal and external APIs used by the BugTrace system.

---

## 🔐 Internal APIs (Collector)

### 1. System & Health
#### `GET /`
- **Use**: Basic health check to verify the collector service is running.
- **Response**: `{"message": "Bug tracker collector running"}`

---

### 2. Authentication (`/auth`)

#### `POST /auth/clerk-sync`
- **Use**: Synchronizes a Clerk OAuth user into the local database and returns a local session token.
- **Payload**:
  ```json
  {
    "clerk_id": "user_2test...",
    "email": "user@example.com",
    "name": "John Doe"
  }
  ```
- **Response**:
  ```json
  {
    "user_id": "64f...",
    "email": "user@example.com",
    "name": "John Doe",
    "token": "user_2test..."
  }
  ```

#### `GET /auth/verify`
- **Headers**: `Authorization: Bearer <token>`
- **Use**: Verifies the current session and returns user profile info.
- **Response**:
  ```json
  {
    "id": "64f...",
    "email": "user@example.com",
    "name": "John Doe"
  }
  ```

---

### 3. Error Management (`/report` & `/errors`)

#### `POST /report`
- **Headers**: `x-api-key: <project_api_key>`
- **Use**: The primary ingestion endpoint for the SDK to report errors.
- **Payload (Partial)**:
  ```json
  {
    "event_type": "api_error",
    "error": {
      "message": "Failed to fetch",
      "stack": "Error: Failed to fetch\n at..."
    },
    "request": {
       "url": "https://api.myapp.com/data",
       "method": "GET"
    },
    "screenshot": "base64_string_data..."
  }
  ```
- **Response**: `{"status": "received"}`

#### `GET /projects/{project_id}/errors`
- **Use**: Lists all error issues for a specific project.
- **Response**:
  ```json
  [
    {
      "fingerprint": "a3f5...",
      "event_type": "unhandled_exception",
      "occurrences": 12,
      "location": {"file": "app.js", "line": 42},
      "is_ticket_generated": false
    }
  ]
  ```

#### `GET /errors/{fingerprint}`
- **Use**: Returns full details and occurrences for a specific error fingerprint.
- **Response**: Includes full payload, screenshot URLs, and first/last seen timestamps.

---

### 4. Project Management (`/projects`)

#### `POST /projects`
- **Use**: Creates a new project for a user.
- **Payload**: `{"name": "My Web App", "user_id": "64f..."}`
- **Response**: `{"project_id": "651...", "api_key": "bt_..."}`

#### `GET /projects/{user_id}`
- **Use**: Retrieves all projects owned by a specific user.

#### `GET /projects`
- **Use**: Lists all projects in the system (Administrative overview).
- **Response**: `[{"_id": "...", "name": "...", "api_key": "..."}]`

---

### 5. Integrations & Ticketing (`/tickets` & `/integrations`)

#### `POST /projects/{project_id}/integrations/openproject`
- **Use**: Saves OpenProject connection settings.
- **Payload**:
  ```json
  {
    "base_url": "https://bugs.mycorp.com",
    "api_key": "encrypted_bt_token...",
    "project_id": 4
  }
  ```

#### `POST /integrations/openproject/test`
- **Use**: Tests a connection to OpenProject without saving.
- **Payload**: Same as above.
- **Response**: `{"status": "success"}` or `{"status": "failed", "detail": "..."}`

#### `POST /tickets/openproject/{fingerprint}`
- **Use**: Manually triggers the creation of an OpenProject ticket for a specific error.
- **Response**: `{"status": "success", "ticket_url": "..."}`

#### `GET /projects/{project_id}/tickets`
- **Use**: Lists all historical tickets generated for a specific project.
- **Response**: `[{"fingerprint": "...", "ticket_url": "...", "event_type": "...", "last_seen": "..."}]`

---

### 6. Alert Configuration (`/alert-config`)

#### `GET /projects/{project_id}/alert-config`
- **Use**: Fetches the alerting rules (email recipients, thresholds).

#### `PUT /projects/{project_id}/alert-config`
- **Use**: Updates the rules and triggers for email notifications.

#### `GET /projects/{project_id}/alerts/logs`
- **Use**: Returns the history of alerts sent (Live Alert Center feed).

---

## 🌍 External APIs & Services

### 1. Resend API (Internal Usage)
- **Base URL**: `https://api.resend.com`
- **Use**: Used by the Collector to send SMTP/HTML alerts to developers.
- **Endpoint**: `POST /emails`

### 2. OpenProject API v3 (Outgoing)
- **Base URL**: `<user_provided_url>/api/v3`
- **Endpoints used**:
    - `GET /projects/{id}`: Validation of project existence.
    - `POST /projects/{id}/work_packages`: Creation of new tickets.

### 3. Cloudflare R2 (Storage)
- **S3-Compatible API**: Used to store and serve screenshots uploaded by the SDK.
- **Base URL**: `<R2_PUBLIC_URL>`

### 4. Clerk Auth (Identity)
- **Use**: Managed auth provider used in the Dashboard to handle Google/Github logins.
- **Dashboard Hooks**: Synchronization of user state to MongoDB on login.
