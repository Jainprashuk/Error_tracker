# BugTracker SDK

A lightweight JavaScript SDK for automatically tracking frontend errors, API failures, and console issues in your applications. The SDK works seamlessly with both Axios and Fetch APIs.

## Features

- ✅ **Automatic Error Tracking** - Captures JavaScript runtime errors and unhandled promise rejections
- ✅ **API Monitoring** - Tracks Axios and Fetch API failures with full request/response data
- ✅ **Stack Trace Parsing** - Extracts file, line, and column information from error stacks
- ✅ **Smart Fingerprinting** - Groups similar errors automatically
- ✅ **Lightweight** - Minimal overhead on your application
- ✅ **Zero Configuration** - Works out of the box with sensible defaults

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

### For React Applications

```typescript
import React from 'react';
import { initBugTracker } from 'bug-tracker-sdk';
import axios from 'axios';

// Initialize early in your application
initBugTracker({
  project: 'my-react-app',
  collectorUrl: 'http://127.0.0.1:8000',
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

## Configuration Options

```typescript
interface BugTrackerConfig {
  project: string;              // Your project identifier (required)
  collectorUrl: string;         // URL to your BugTracker collector (required)
  apiKey?: string;              // API key for authentication (optional)
  axios?: AxiosInstance;        // Axios instance to intercept (optional)
  environment?: string;         // 'development' | 'production' (default: 'production')
  releaseVersion?: string;      // Your app version (default: '1.0.0')
}
```

### Example with All Options

```javascript
import { initBugTracker } from "bug-tracker-sdk";
import axios from "axios";

initBugTracker({
  project: "my-app",
  collectorUrl: "http://127.0.0.1:8000",
  apiKey: "sk_live_xxxxx",
  axios,
  environment: "production",
  releaseVersion: "1.2.0"
});
```

---

## Error Payload Format

When an error occurs, the SDK sends a payload like this:

```json
{
  "project": "my-app",
  "timestamp": "2026-03-07T10:27:17.508Z",
  "fingerprint": "6766af4e3f68dead430616a63337c9f151b414b4643bce9be8b790e896b48770",
  "error": {
    "message": "TypeError: Cannot read property 'name' of null",
    "type": "unhandled_exception",
    "stack": "Error: Cannot read property 'name' of null\n    at Object.<anonymous> (app.js:42:15)\n    at processTicksAndRejections (internal/timers.js:1294:10)"
  },
  "request": {
    "url": "/api/users",
    "method": "GET",
    "headers": {
      "Content-Type": "application/json"
    }
  },
  "response": {
    "status": 500,
    "statusText": "Internal Server Error"
  },
  "location": {
    "file": "app.js",
    "line": 42,
    "column": 15
  }
}
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
  collectorUrl: 'http://127.0.0.1:8000',
  axios
});

// Rest of your app initialization...
```

### 2. Set Appropriate Environment

Use environment-specific configurations:

```javascript
initBugTracker({
  project: 'my-app',
  collectorUrl: process.env.REACT_APP_COLLECTOR_URL,
  environment: process.env.NODE_ENV,
  releaseVersion: process.env.REACT_APP_VERSION
});
```

### 3. Handle Sensitive Data

The SDK automatically excludes sensitive data from being sent:
- Passwords
- API keys in request bodies
- Authentication tokens (in most cases)

---

## Troubleshooting

### Errors not appearing in dashboard?

1. Check that `collectorUrl` is correct and accessible
2. Verify your `project` name matches your BugTracker project
3. Check browser console for any SDK initialization errors
4. Ensure Axios instance is passed to the SDK configuration

### High error volume?

- Filter to specific error types in the dashboard
- Use the timeline to focus on recent errors
- Check if errors are duplicates (grouped by fingerprint)

---

## Supported Browsers

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+

---

## License

MIT

---

## Support

For issues, questions, or feature requests, visit our [documentation](https://docs.bugtracker.jainprashuk.in) or create an issue on [GitHub](https://github.com/jainprashuk/error-tracker).
