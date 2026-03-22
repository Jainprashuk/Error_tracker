# BugTracker SDK 👉 [Read on Medium](https://medium.com/@29jainprashuk/stop-guessing-production-bugs-track-javascript-errors-with-screenshots-api-logs-user-feedback-aaec659877dd)

A lightweight JavaScript SDK for automatically tracking frontend errors, API failures, and console issues in your applications. The SDK works seamlessly with both Axios and Fetch APIs.

## Features

- ✅ **Automatic Error Tracking** - Captures JavaScript runtime errors and unhandled promise rejections
- ✅ **API Monitoring** - Tracks Axios and Fetch API failures with full request/response data
- ✅ **Stack Trace Parsing** - Extracts file, line, and column information from error stacks
- ✅ **Smart Fingerprinting** - Groups similar errors automatically
- ✅ **Lightweight** - Minimal overhead on your application
- ✅ **Image Capture** - Capture Image At the time Of bug
---

## Installation

```bash
npm install bug-tracker-sdk
```

---

## Quick Start

### Basic Setup

```javascript
import { initBugTracker } from "bug-tracker-sdk";
import axios from "axios";

initBugTracker({
  apiKey: "your-api-key",
  axios
});

// That's it! Your app is now tracking errors.
```

<!-- TO GET APIKEY -->

## 🔑 How to Generate an API Key

To start using , you first need to generate a project API key from the dashboard.

### Step 1: Open the Dashboard
Go to the dashboard and Login:

👉 [bugtrace.jainprashuk.in](https://bugtrace.jainprashuk.in/)

### Step 2: Create a Project
1. Click the **"Create Project"** button.
2. Enter your **Project Name**.
3. Click **Create Project**.

### Step 3: Copy Your API Key
After creating the project:

- An **API Key will be automatically generated**.
- Copy the API key from the dashboard.

## ⚙️ Feature Configuration

BugTracker SDK allows you to enable or customize features based on your needs.

### Basic Configuration

```javascript
initBugTracker({
  apiKey: "your-api-key",
  axios,

  features: {
    captureScreenshots: {
      fetchErrors: true,
      axiosErrors: true,
      consoleErrors: true,
    },

    manualBugReport: {
      captureScreenshot: true,
      floatingButton: () => {
        const btn = document.createElement("button");
        btn.textContent = "💬 Feedback";
        btn.style.background = "#6366f1";
        btn.style.color = "white";
        btn.style.padding = "10px 14px";
        btn.style.borderRadius = "8px";
        return btn;
      },
      modalSchema: {
        title: "Report an Issue",
        fields: [
          { name: "description", label: "Description", type: "textarea" },
          { name: "email", label: "Email", type: "text" },
        ],
      },
    },

    capturePerformance: true,
  },
});
```

---

### 🧩 Available Feature Options

#### 📸 Screenshot Capture

| Option          | Description                           |
| --------------- | ------------------------------------- |
| `fetchErrors`   | Capture screenshots on fetch failures |
| `axiosErrors`   | Capture screenshots on axios failures |
| `consoleErrors` | Capture screenshots on console errors |

---

#### 📝 Manual Bug Reporting

Customize feedback UI:

```javascript
manualBugReport: {
  captureScreenshot: true,
  modalSchema: {
    title: "Send Feedback",
    fields: [
      { name: "description", type: "textarea" },
      { name: "email", type: "text" },
      {
        name: "category",
        type: "select",
        options: ["Bug", "UI Issue", "Suggestion"],
      },
    ],
  },
}
```

---

#### ⚡ Performance Tracking

| Option               | Description                   |
| -------------------- | ----------------------------- |
| `capturePerformance` | Enable performance monitoring |

---

### 💡 Tips

* Disable screenshot capture in **high-performance apps** if not needed
* Use **manualBugReport** to collect user feedback directly
* Enable all tracking in **production** for maximum visibility

---


### For React Applications

```typescript
import React from 'react';
import { initBugTracker } from 'bug-tracker-sdk';
import axios from 'axios';

// Initialize early in your application
initBugTracker({
  project: 'my-react-app',
  axios
});

function App() {
  return <div>Your app here</div>;
}

export default App;
```

---

## What It Captures

### 1. JavaScript Errors & Crashes

Automatically catches uncaught exceptions:

```javascript
// This error is automatically reported
const user = null;
console.log(user.name); // TypeError: Cannot read property 'name' of null
```

### 2. Unhandled Promise Rejections

```javascript
// This rejection is automatically tracked
fetch('/api/data').catch(error => {
  throw error; // Unhandled rejection caught
});
```

### 3. Axios API Failures

```javascript
// Failed requests are automatically tracked
const response = await axios.get('/api/users');
// 4xx and 5xx responses are reported
```

### 4. Fetch API Failures

```javascript
// Fetch errors and non-200 responses are tracked
const response = await fetch('/api/data');
if (!response.ok) {
  // Non-200 responses are reported
}
```

---



### Example with All Options

```javascript
import { initBugTracker } from "bug-tracker-sdk";
import axios from "axios";

initBugTracker({
  apiKey: "sk_live_xxxxx",
  axios,
});
```

---



## Integration with BugTracker Dashboard

Once errors are reported to your BugTracker collector, they appear in the dashboard at:

- **View all errors** - See every error across your application
- **Group by type** - Similar errors are automatically grouped
- **Track occurrences** - See how many times an error has happened
- **Full stack traces** - Click into errors to see complete details
- **Timeline** - View first seen and last seen timestamps

---

## Best Practices

### 1. Initialize Early

Initialize the SDK as early as possible in your application, preferably before any other code:

```javascript
// app.js or main.tsx
import { initBugTracker } from 'bug-tracker-sdk';
import axios from 'axios';

initBugTracker({
  project: 'my-app',
  axios
});

// Rest of your app initialization...
```
