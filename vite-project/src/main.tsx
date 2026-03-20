import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initBugTracker } from "bug-tracker-sdk"
import axios from "axios"

initBugTracker({
  apiKey: "proj_fa7846173b34f75dc02f36e3",
  collectorUrl: 'http://127.0.0.1:8000',
  features: {
    manualBugReport: {
      captureScreenshot: false,

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
        title: "Send Feedback",
        fields: [
          { name: "description", label: "Your feedback", type: "textarea" },
          {
            name: "email",
            label: "Your email (optional)",
            type: "text",
          },
          {
            name: "category",
            label: "Category",
            type: "select",
            options: ["Bug", "UI Issue", "Suggestion"]
          }
        ]
      }
    },
    captureScreenshots: {
      fetchErrors: true,
      axiosErrors: true,
      consoleErrors: true,
    },
    capturePerformance: true,
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
