import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initBugTracker, captureError } from 'bug-tracker-sdk';

const BUGTRACE_API_KEY = "proj_bad82f413a7735da944b2ff8"; // Your active API key

// Initialize at module level
initBugTracker({
  apiKey: BUGTRACE_API_KEY,
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

function Home() {
  const triggerUnhandled = () => {
    throw new Error("🔥 Unhandled Exception: Something went wrong!");
  };

  const triggerReference = () => {
    // @ts-ignore
    console.log(nonExistentVariable);
  };

  const triggerManual = () => {
    captureError(new Error("🛠️ Manual Log: This was captured manually"), {
      tags: ["testing", "manual"],
      user: "prashuk_dev"
    });
    alert("Manual error captured!");
  };

  const simulateCheckoutFlow = () => {
    alert("Starting checkout simulation! Do not touch the mouse. Watch the console or wait 3 seconds.");

    // Simulate Step 1: User adds item to cart
    const btn1 = document.createElement('button');
    btn1.innerText = "Add Premium Plan to Cart";
    btn1.id = "add-cart-btn";
    btn1.className = "btn-primary";
    btn1.onclick = () => console.log('Item added');
    document.body.appendChild(btn1);

    setTimeout(() => {
      btn1.click(); // SDK captures ui.click

      // Simulate Step 2: User navigates dynamically to payment page
      setTimeout(() => {
        window.history.pushState(null, '', '/checkout/payment_processing'); // SDK captures Navigation!
        window.dispatchEvent(new PopStateEvent('popstate'));

        // Simulate Step 3: Submitting payment
        const btn2 = document.createElement('button');
        btn2.innerText = "Submit Payment ($19.99)";
        btn2.id = "submit-btn";
        document.body.appendChild(btn2);

        setTimeout(() => {
          btn2.click(); // SDK captures ui.click

          // Clean up DOM objects silently
          document.body.removeChild(btn1);
          document.body.removeChild(btn2);

          setTimeout(() => {
            window.history.pushState(null, '', '/'); // SDK captures Navigation back home
            window.dispatchEvent(new PopStateEvent('popstate'));

            // Step 4: The massive unhandled exception during server processing!
            setTimeout(() => {
              const stripeProcessor = null;
              stripeProcessor.charge(19.99); // BOOM. This triggers the error payload.
            }, 500);
          }, 400);

        }, 400);

      }, 400);
    }, 400);
  };

  const triggerFailedFetch = async () => {
    try {
      await fetch("https://non-existent-api.com/v1/data");
    } catch (err) {
      alert("Failed fetch triggered! (Check dashboard - SDK caught it automatically)");
    }
  };

  const triggerSuccessfulGet = async () => {
    try {
      const res = await fetch("https://jsonplaceholder.typicode.com/posts/1");
      const data = await res.json();
      console.log("Fetched Data:", data);
      alert("Successful GET call completed!");
    } catch (err) {
      console.error(err);
    }
  };

  const triggerSuccessfulPost = async () => {
    try {
      const res = await fetch("https://dummyjson.com/products/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "BugTrace T-Shirt", price: 19.99 })
      });
      const data = await res.json();
      console.log("Posted Data:", data);
      alert("Successful POST call completed!");
    } catch (err) {
      console.error(err);
    }
  };

  // ---- Failed GET scenarios (server responds, but with an error status) ----

  const triggerGet404 = async () => {
    try {
      const res = await fetch("https://jsonplaceholder.typicode.com/posts/99999999");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(`GET failed with ${res.status}: ${JSON.stringify(data)}`);
      }
      console.log("Fetched Data:", data);
    } catch (err) {
      captureError(err, {
        tags: ["api", "get", "404"],
        context: { endpoint: "/posts/99999999", method: "GET" }
      });
      alert("GET 404 captured! (Resource not found)");
    }
  };

  const triggerGet500 = async () => {
    try {
      // httpstat.us reliably returns the status code you ask for
      const res = await fetch("https://httpstat.us/500", {
        headers: { Accept: "application/json" }
      });
      const body = await res.text();
      if (!res.ok) {
        throw new Error(`GET failed with ${res.status}: ${body}`);
      }
    } catch (err) {
      captureError(err, {
        tags: ["api", "get", "500"],
        context: { endpoint: "https://httpstat.us/500", method: "GET" }
      });
      alert("GET 500 captured! (Server error)");
    }
  };

  const triggerGet401 = async () => {
    try {
      const res = await fetch("https://httpstat.us/401", {
        headers: { Accept: "application/json" }
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Unauthorized (${res.status}): ${body}`);
      }
    } catch (err) {
      captureError(err, {
        tags: ["api", "get", "auth"],
        context: { endpoint: "https://httpstat.us/401", method: "GET", reason: "missing/invalid token" }
      });
      alert("GET 401 captured! (Unauthorized)");
    }
  };

  const triggerGetTimeout = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
      // Delays 5s but we abort after 2s -> AbortError
      const res = await fetch("https://httpstat.us/200?sleep=5000", {
        signal: controller.signal
      });
      await res.text();
    } catch (err) {
      captureError(err, {
        tags: ["api", "get", "timeout"],
        context: { endpoint: "https://httpstat.us/200?sleep=5000", timeoutMs: 2000 }
      });
      alert("GET timeout captured! (Request aborted after 2s)");
    } finally {
      clearTimeout(timeout);
    }
  };

  const triggerBadJson = async () => {
    try {
      // Returns HTML, not JSON -> res.json() throws a SyntaxError
      const res = await fetch("https://example.com/");
      const data = await res.json();
      console.log(data);
    } catch (err) {
      captureError(err, {
        tags: ["api", "get", "parse-error"],
        context: { endpoint: "https://example.com/", expected: "application/json" }
      });
      alert("Bad JSON parse captured! (Response was not valid JSON)");
    }
  };

  // ---- Failed POST scenarios ----

  const triggerPost400 = async () => {
    try {
      const res = await fetch("https://httpstat.us/400", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: "not-an-email" }) // pretend invalid payload
      });
      const body = await res.text();
      if (!res.ok) {
        throw new Error(`POST rejected (${res.status}): ${body}`);
      }
    } catch (err) {
      captureError(err, {
        tags: ["api", "post", "validation"],
        context: { endpoint: "https://httpstat.us/400", method: "POST", payload: { email: "not-an-email" } }
      });
      alert("POST 400 captured! (Validation failed)");
    }
  };

  const triggerPost403 = async () => {
    try {
      const res = await fetch("https://httpstat.us/403", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "delete-account", userId: 42 })
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Forbidden (${res.status}): ${body}`);
      }
    } catch (err) {
      captureError(err, {
        tags: ["api", "post", "forbidden"],
        context: { endpoint: "https://httpstat.us/403", method: "POST", reason: "insufficient permissions" }
      });
      alert("POST 403 captured! (Forbidden)");
    }
  };

  const triggerPostNetworkError = async () => {
    try {
      // Unresolvable host -> fetch rejects with a TypeError (network failure)
      await fetch("https://non-existent-api.invalid/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "ORD-1001", total: 49.99 })
      });
    } catch (err) {
      captureError(err, {
        tags: ["api", "post", "network"],
        context: { endpoint: "https://non-existent-api.invalid/v1/orders", method: "POST" }
      });
      alert("POST network error captured! (Host unreachable)");
    }
  };

  const triggerPost500 = async () => {
    try {
      const res = await fetch("https://httpstat.us/503", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ report: "monthly", format: "pdf" })
      });
      const body = await res.text();
      if (!res.ok) {
        throw new Error(`Service unavailable (${res.status}): ${body}`);
      }
    } catch (err) {
      captureError(err, {
        tags: ["api", "post", "503"],
        context: { endpoint: "https://httpstat.us/503", method: "POST", retryable: true }
      });
      alert("POST 503 captured! (Service unavailable)");
    }
  };

  const triggerTypeError = () => {
    const obj = null;
    console.log(obj.property); // Throws TypeError
  };

  const triggerPromiseRejection = () => {
    Promise.reject(new Error("unhandled promise rejection error!!"));
  };

  return (
    <div>
      <h2 style={{ color: '#ec4899', margin: '30px 0 10px 0' }}>Testing your SDK Locally</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <button onClick={simulateCheckoutFlow} style={{ ...buttonStyle("#ffffff"), color: '#1e293b', gridColumn: 'span 2', fontWeight: 'bold' }}>
          🛒 Simulate Complex Checkout Crash (Tests Breadcrumbs!)
        </button>
        <button onClick={triggerUnhandled} style={buttonStyle("#ef4444")}>Unhandled Exception</button>
        <button onClick={triggerReference} style={buttonStyle("#f59e0b")}>Reference Error</button>
        <button onClick={triggerManual} style={buttonStyle("#3b82f6")}>Capture Manual Log</button>
        <button onClick={triggerFailedFetch} style={buttonStyle("#8b5cf6")}>Failed API Call</button>
        <button onClick={triggerSuccessfulGet} style={buttonStyle("#10b981")}>Successful GET API</button>
        <button onClick={triggerSuccessfulPost} style={buttonStyle("#059669")}>Successful POST API</button>
        <button onClick={triggerTypeError} style={buttonStyle("#f43f5e")}>Type Error (Null prop)</button>
        <button onClick={triggerPromiseRejection} style={buttonStyle("#6366f1")}>Unhandled Promise Rejection</button>
      </div>

      <h3 style={{ color: '#ec4899', margin: '30px 0 10px 0' }}>Failed GET APIs (with response)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <button onClick={triggerGet404} style={buttonStyle("#dc2626")}>GET 404 — Not Found</button>
        <button onClick={triggerGet500} style={buttonStyle("#b91c1c")}>GET 500 — Server Error</button>
        <button onClick={triggerGet401} style={buttonStyle("#ea580c")}>GET 401 — Unauthorized</button>
        <button onClick={triggerGetTimeout} style={buttonStyle("#7c3aed")}>GET Timeout (Abort)</button>
        <button onClick={triggerBadJson} style={{ ...buttonStyle("#9333ea"), gridColumn: 'span 2' }}>GET — Malformed JSON Response</button>
      </div>

      <h3 style={{ color: '#ec4899', margin: '30px 0 10px 0' }}>Failed POST APIs (different scenarios)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <button onClick={triggerPost400} style={buttonStyle("#e11d48")}>POST 400 — Validation Error</button>
        <button onClick={triggerPost403} style={buttonStyle("#be123c")}>POST 403 — Forbidden</button>
        <button onClick={triggerPost500} style={buttonStyle("#a21caf")}>POST 503 — Service Unavailable</button>
        <button onClick={triggerPostNetworkError} style={buttonStyle("#0f766e")}>POST — Network Failure</button>
      </div>
    </div>
  );
}

function HeavyPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Simulate heavy synchronous blocking task (blocks main thread for ~1.5s)
    // This will degrade DOMContentLoaded and LCP vitals artificially
    const end = Date.now() + 1500;
    while (Date.now() < end) { }
    setDone(true);
  }, []);

  return (
    <div style={{ marginTop: '30px' }}>
      <h2 style={{ color: '#ec4899' }}>Heavy Performance Page</h2>
      <p style={{ color: '#666' }}>This page artificially blocks the main thread for 1.5s on mount to simulate bad performance, which delays FCP & DOMContentLoaded.</p>

      {done && <p style={{ color: 'green', fontWeight: 'bold' }}>Main thread unblocked!</p>}

      {/* Large images from unsplash to slow down page load time and LCP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
        <img src="https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=2000" width="100%" alt="heavy image 1" />
        <img src="https://images.unsplash.com/photo-1682687220063-4742bd7fd538?q=80&w=2000" width="100%" alt="heavy image 2" />
      </div>
    </div>
  );
}

function GenericPage() {
  return (
    <div style={{ marginTop: '30px' }}>
      <h2 style={{ color: '#ec4899' }}>Lightning Fast Generic Page</h2>
      <p style={{ color: '#666' }}>This page does very little, so its metrics should automatically log an extremely fast pageLoad and LCP/FCP.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: '40px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ color: '#ec4899', margin: '0 0 10px 0' }}>BugTrace Playground</h1>
        <p style={{ color: '#666', marginBottom: '40px' }}>
          Explore routes via full-reloads to trigger window loading events.
        </p>

        {/* Using standard <a> tags so the native window.load event is triggered for SDK performance capturing */}
        <nav style={{ marginBottom: '30px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <a href="/" style={navStyle}>Home (Errors)</a>
          <a href="/heavy" style={navStyle}>Heavy Page (Bad Vitals)</a>
          <a href="/fast" style={navStyle}>Fast Page (Good Vitals)</a>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/heavy" element={<HeavyPage />} />
          <Route path="/fast" element={<GenericPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

const navStyle = {
  backgroundColor: '#1f2937',
  color: 'white',
  padding: '10px 16px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '14px'
};
