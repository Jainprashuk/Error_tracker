import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { DOCS_SECTIONS } from "../types/docsSections";
import { Sidebar } from "../components/Sidebar";


export function DocsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<string>(searchParams.get('section') || DOCS_SECTIONS[0].id);
  const [copiedCode, setCopiedCode] = useState<string>("");

  // Sync activeSection with URL query param
  useEffect(() => {
    const section = searchParams.get('section') || DOCS_SECTIONS[0].id;
    setActiveSection(section);
    setSearchParams({ section });
  }, [searchParams]);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const sections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: "🚀",
      subsections: [
        {
          title: "Introduction",
          content: `BugTracker is a lightweight error monitoring platform that automatically captures JavaScript errors, API failures, and unhandled promise rejections from your frontend applications.

With BugTracker, you get:
• Real-time error notifications
• Full stack trace information
• Automatic error grouping
• Developer-friendly dashboard
• Simple SDK integration

Let's get you started in just a few minutes.`,
        },
        {
          title: "Step 1: Create an Account & Login",
          content: `Before you can use BugTracker, you need to:

1. Visit the BugTracker website
2. Click "Sign In" or "Get Started"
3. Create your account with email and password
4. Log in to your dashboard

Once logged in, you'll have access to create projects and generate API keys.`,
        },
        {
          title: "Step 2: Create Your First Project",
          content: `After logging in to your dashboard:

1. Click the "Create Project" button
2. Enter your project name (e.g., "my-react-app")
3. Click "Create"
4. Your project is now ready to receive errors!

You'll see your project dashboard with statistics and error tracking.`,
        },
        {
          title: "Installation",
          content: "Install the BugTracker SDK via npm:",
          code: `npm install bug-tracker-sdk`,
        },
      ],
    },
    {
      id: "api-key",
      title: "API Key Generation",
      icon: "🔐",
      subsections: [
        {
          title: "Understanding API Keys",
          content: `An API Key is a unique identifier that allows your application to communicate with BugTracker's collector service. Each project has its own API key.

Never share your API key with untrusted sources. It's safe to include in your frontend code since it only allows error reporting, not data access.`,
        },
        {
          title: "How to Generate an API Key",
          content: `When you create a new project in your BugTracker dashboard:

1. Click "Create Project" button
2. Enter your project name
3. Click "Create"
4. Your API key is automatically generated and displayed
5. Copy the API key - you'll need it in your SDK setup

The API key will look something like: "sk_live_a1b2c3d4e5f6g7h8i9j0"`,
        },
        {
          title: "Where to Find Your API Key",
          content: `To view your API key later:

1. Go to your Dashboard
2. Find your project in the projects list
3. Click on the project name
4. Your API key is displayed at the top
5. Click the copy button to copy it to clipboard

Each project has a unique API key. If you have multiple projects, each will have its own key.`,
        },
        {
          title: "Using Your API Key",
          content: `Once you have your API key, use it to initialize the SDK:`,
          code: `import { initBugTracker } from "bug-tracker-sdk";
import axios from "axios";

initBugTracker({
  apiKey: "sk_live_a1b2c3d4e5f6g7h8i9j0", // Your actual API key
  axios
});

// Your app code here...`,
        },
      ],
    },
    {
      id: "sdk-setup",
      title: "SDK Setup Guide",
      icon: "⚙️",
      subsections: [
        {
          title: "Basic Setup",
          content:
            "Initialize BugTracker in your application as early as possible:",
          code: `import { initBugTracker } from "bug-tracker-sdk";
import axios from "axios";

initBugTracker({
  apiKey: "YOUR_API_KEY",
  axios
});

// Your app code here...`,
        },
        {
          title: "React Setup",
          content:
            "For React applications, initialize the SDK in your main.tsx or index.tsx:",
          code: `// main.tsx
import { initBugTracker } from 'bug-tracker-sdk'
import axios from 'axios'
import App from './App'

// Initialize BugTracker first, before any other code
initBugTracker({
  apiKey: "sk_live_YOUR_API_KEY",
  axios
})

import React from 'react'
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
        },
        {
          title: "Environment Variables",
          content: "Store sensitive information in environment variables:",
          code: `// .env.local
VITE_API_KEY=sk_live_your_api_key_here

// In your code:
import { initBugTracker } from "bug-tracker-sdk";
import axios from "axios";

initBugTracker({
  apiKey: import.meta.env.VITE_API_KEY,
  axios
})`,
        },
      ],
    },
    {
      id: "error-tracking",
      title: "Error Tracking",
      icon: "🎯",
      subsections: [
        {
          title: "Automatic Error Capturing",
          content:
            "BugTracker automatically captures these errors without any additional code:",
          code: `// 1. JavaScript Crashes
const user = null;
console.log(user.name); // Automatically tracked

// 2. Unhandled Promise Rejections
fetch('/api/data')
  .then(res => res.json())
  .catch(error => {
    throw error; // Automatically tracked
  })

// 3. Async Errors
async function fetchUser() {
  const response = await fetch('/api/user');
  // Errors are automatically tracked
}

// 4. API Failures
axios.get('/api/users')
  .catch(error => {
    // Axios errors are automatically tracked
  })`,
        },
        {
          title: "Error Information Captured",
          content: "Each error report includes:",
          code: `{
  "error": {
    "message": "TypeError: Cannot read property 'name' of null",
    "type": "unhandled_exception",
    "stack": "Error at Object.<anonymous> (app.js:42:15)"
  },
  "location": {
    "file": "app.js",
    "line": 42,
    "column": 15
  },
  "request": {
    "url": "/api/users",
    "method": "GET"
  },
  "response": {
    "status": 500
  },
  "timestamp": "2026-03-07T10:27:17.508Z",
  "fingerprint": "6766af4e3f68..."
}`,
        },
      ],
    },
    {
      id: "dashboard",
      title: "Using the Dashboard",
      icon: "📊",
      subsections: [
        {
          title: "Dashboard Overview",
          content: `The BugTracker dashboard gives you complete visibility into your application's errors:

• Total Errors - Count of all errors in your app
• Projects - Organize errors by project
• Last 24 Hours - Focus on recent errors
• Error Details - Click any error to see full details

All statistics update in real-time as errors are reported.`,
        },
        {
          title: "Project Dashboard",
          content: `When you click on a project:

1. See a list of all errors in this project
2. View error message and occurrence count
3. Check error type and last seen time
4. Click on any error for detailed information

Each project displays:
• Total errors count
• Errors breakdown by type
• Error timeline
• Real-time updates`,
        },
        {
          title: "Viewing Error Details",
          content: `When you click on an error, you'll see:

• Error Message - The main error text
• Error Type - Category (TypeError, API Error, etc.)
• Stack Trace - Full call stack showing where error occurred
• Location - Exact file, line, and column number
• First/Last Seen - When the error first and last occurred
• Occurrences - Total count of this error
• Request Data - API call details if applicable
• Response Data - Server response information
• Fingerprint - Unique identifier for error grouping`,
        },
        {
          title: "Finding Your API Key in Dashboard",
          content: `Your API key is displayed on the project page:

1. Log in to BugTracker
2. Click on your project name
3. Your API key is shown in a card at the top
4. Click the copy button to copy it
5. Use this key in your SDK setup

Each time you create a new project, a unique API key is automatically generated.`,
        },
      ],
    },
    {
      id: "best-practices",
      title: "Best Practices",
      icon: "💡",
      subsections: [
        {
          title: "Initialize Early",
          content:
            "Initialize BugTracker as the very first thing in your application:",
          code: `// ✅ Good - Initialize first
import { initBugTracker } from 'bug-tracker-sdk'
initBugTracker({ ... })

import App from './App'
// Then import your app

// ❌ Bad - Initialize after other code
import axios from 'axios'
import App from './App'
initBugTracker({ ... }) // Errors before this won't be tracked`,
        },
        {
          title: "Secure Your API Key",
          content: "Protect your API key with best practices:",
          code: `// ✅ Good - Use environment variables
const apiKey = import.meta.env.VITE_API_KEY
initBugTracker({
  apiKey: apiKey,
  axios
})

// ❌ Bad - Hardcoding in source code
initBugTracker({
  apiKey: 'sk_live_a1b2c3d4e5f6g7h8i9j0',
  axios
})`,
        },
        {
          title: "Handle Errors Gracefully",
          content: "Catch and log errors appropriately:",
          code: `// ✅ Good - Let errors be tracked
async function fetchUser(id: string) {
  try {
    const response = await axios.get(\`/api/users/\${id}\`)
    return response.data
  } catch (error) {
    // Error is automatically tracked
    console.error('Failed to fetch user:', error)
    throw error // Or handle gracefully
  }
}

// ❌ Bad - Swallowing errors
async function fetchUser(id: string) {
  try {
    const response = await axios.get(\`/api/users/\${id}\`)
    return response.data
  } catch (error) {
    console.log('error') // Silent failure, not tracked
  }
}`,
        },
      ],
    },
  ];

  // Filter to show only the active section
  const displaySections = sections.filter((s) => s.id === activeSection);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <Sidebar />
      <main className="flex-1 w-full md:ml-64">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 md:pt-12">
          <div className="space-y-8">
            {/* Main Content */}
            <div className="space-y-8">
              {displaySections.map((section) => (
                <div key={section.id} className="space-y-6">
                  <div className="flex items-center gap-3 mb-8">
                    <span className="text-4xl">{section.icon}</span>
                    <h2 className="text-3xl font-bold">{section.title}</h2>
                  </div>

                  {section.subsections.map((subsection, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/30 transition-all"
                    >
                      <h3 className="text-xl font-semibold mb-4 text-blue-400">
                        {subsection.title}
                      </h3>

                      <p className="text-slate-300 mb-4 leading-relaxed whitespace-pre-wrap">
                        {subsection.content}
                      </p>

                      {subsection.code && (
                        <div className="relative">
                          <pre className="bg-slate-950 rounded-lg p-4 overflow-x-auto border border-slate-600/50">
                            <code className="text-sm text-slate-200 font-mono">
                              {subsection.code}
                            </code>
                          </pre>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                subsection.code!,
                                `${section.id}-${idx}`,
                              )
                            }
                            className="absolute top-3 right-3 p-2 bg-slate-700/50 hover:bg-slate-600 rounded transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedCode === `${section.id}-${idx}` ? (
                              <Check size={18} className="text-green-400" />
                            ) : (
                              <Copy size={18} className="text-slate-300" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Footer CTA */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-8 text-center mt-12">
                <h3 className="text-2xl font-bold mb-3">Ready to get started?</h3>
                <p className="text-slate-300 mb-6">
                  Create an account and start monitoring your application errors
                  in minutes.
                </p>
                <a
                  href="/login"
                  className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-semibold transition-all duration-200 active:scale-95"
                >
                  Create Your Account
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
