import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DocsPage } from './pages/DocsPage';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { ErrorDetailPage } from './pages/ErrorDetailPage';
import { TicketsPage } from './pages/TicketsPage';
import { SettingsPage } from './pages/SettingsPage';

import { ClerkSync } from './components/ClerkSync';

import { useUser } from '@clerk/clerk-react';

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: storeLoading, error, logout } = useAuthStore();
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const [showRetry, setShowRetry] = React.useState(false);

  // Show a retry button if it stays stuck for too long
  useEffect(() => {
    let timer: any;
    if (isSignedIn && !user && !error) {
      timer = setTimeout(() => setShowRetry(true), 5000);
    } else {
      setShowRetry(false);
    }
    return () => clearTimeout(timer);
  }, [isSignedIn, user, error]);

  // 1. Wait for everything to load
  if (storeLoading || !clerkLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 gap-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Initializing session...</p>
      </div>
    );
  }

  // 2. Error state (backend down or sync failed)
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
          ⚠️
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">Sync Connection Error</h2>
        <p className="text-slate-400 max-w-sm mb-6">{error}</p>
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-medium"
          >
            Retry Connection
          </button>
          <button
            onClick={() => { logout(); window.location.href = '/login'; }}
            className="w-full px-6 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // 3. If Clerk says we ARE signed in, but local store is still empty,
  // we are likely waiting for ClerkSync to finish.
  if (isSignedIn && !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 gap-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Synchronizing account...</p>
        <p className="text-slate-600 text-xs">Connecting to local server...</p>

        {showRetry && (
          <div className="mt-8 animate-fade-in text-center">
            <p className="text-slate-500 text-xs mb-4 max-w-[200px]">The sync process seems to be taking longer than expected.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition border border-slate-700"
            >
              Force Refresh
            </button>
          </div>
        )}
      </div>
    );
  }

  // 4. Fallback to login ONLY if we are truly signed out
  // EXPLICIT LOGOUT SYNC: If Clerk says we ARE signed out, clear local session immediately
  if (clerkLoaded && !isSignedIn) {
    if (user) {
      console.log("[ProtectedRoute] Clerk session missing, clearing local session.");
      // We don't call logout() here to avoid infinite loops, just navigate to login
      // ClerkSync will handle the actual store cleanup
    }
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Basic init, ClerkSync handles the real bridge
    const session = localStorage.getItem('session');
    if (session) {
      try {
        const parsedSession = JSON.parse(session);
        setUser(parsedSession.user);
      } catch (error) {
        localStorage.removeItem('session');
      }
    }
    setLoading(false);
  }, [setUser, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ClerkSync />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/project/:id" element={<ProjectPage />} />
            <Route path="/error/:fingerprint" element={<ErrorDetailPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
          },
        }}
      />
    </QueryClientProvider>
  );
}
