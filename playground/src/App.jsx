import React from 'react';
import { initBugTracker, captureError } from 'bug-tracker-sdk';

const BUGTRACE_API_KEY = "YOUR_API_KEY_HERE";

export default function App() {


  initBugTracker({
    apiKey: "proj_b26bd3d05c2564f1b79c55cb",
    collectorUrl: "http://localhost:8000",
    features: {
      captureScreenshots: {
        fetchErrors: true,
        axiosErrors: true,
        consoleErrors: true,
      },
      capturePerformance: true, // ⚡️ Enable performance monitoring
      manualBugReport: {       // 🐞 Enable the floating bug reporter
        captureScreenshot: true,
        modalSchema: {
          title: "Got a bug? Let us know!",
          fields: [
            { name: "title", type: "text", label: "Issue Summary" },
            { name: "description", type: "textarea", label: "What happened?" },
            { name: "priority", type: "select", label: "How bad is it?", options: ["Low", "Medium", "High"] }
          ]
        }
      }
    }
  });


  const triggerUnhandled = () => {
    // This will be caught by your initGlobalErrorTracking
    throw new Error("🔥 Unhandled Exception: Something went wrong!");
  };

  const triggerReference = () => {
    // This will be caught by your global tracker
    // @ts-ignore
    console.log(nonExistentVariable);
  };

  const triggerManual = () => {
    // Using the captureError helper we added to the SDK
    captureError(new Error("🛠️ Manual Log: This was captured manually"), {
      tags: ["testing", "manual"],
      user: "prashuk_dev"
    });
    alert("Manual error captured!");
  };

  const triggerFailedFetch = async () => {
    try {
      // 💡 The SDK's fetchInterceptor will catch this automatically!
      await fetch("https://non-existent-api.com/v1/data");
    } catch (err) {
      alert("Failed fetch triggered! (Check dashboard - SDK caught it automatically)");
    }
  };


  return (
    <div style={{ padding: '40px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ color: '#ec4899' }}>BugTrace Playground</h1>
      <p style={{ color: '#666', marginBottom: '40px' }}>Testing your SDK locally with <code>initBugTracker()</code></p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <button onClick={triggerUnhandled} style={buttonStyle("#ef4444")}>Unhandled Exception</button>
        <button onClick={triggerReference} style={buttonStyle("#f59e0b")}>Reference Error</button>
        <button onClick={triggerManual} style={buttonStyle("#3b82f6")}>Capture Manual Log</button>
        <button onClick={triggerFailedFetch} style={buttonStyle("#8b5cf6")}>Failed API Call</button>
      </div>
    </div>
  );
}

const buttonStyle = (color) => ({
  backgroundColor: color,
  color: 'white',
  border: 'none',
  padding: '16px 24px',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'transform 0.1s',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
});
