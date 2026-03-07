import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initBugTracker } from "bug-tracker-sdk"
import axios from "axios"

initBugTracker({
  apiKey: "proj_52173d1cd4e6a0250eef54b1",
  axios
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
