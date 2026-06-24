import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useAuthStore } from '../store/auth';
import {
  ChevronRight,
  AlertCircle,
  Zap,
  Code,
  BarChart3,
  GitBranch,
  Github,
  ExternalLink,
  Menu,
  X,
  Brain,
  Bell,
  Activity,
  Ticket,
  Users,
  UserPlus,
  Check,
  RefreshCw,
  MousePointerClick,
} from 'lucide-react';
import { SEO } from '../components/SEO';
import { useInView } from '../hooks/useInView';
import { useCountUp } from '../hooks/useCountUp';
import { useTypewriter } from '../hooks/useTypewriter';

const Reveal: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`${inView ? 'animate-fade-in-up' : 'opacity-0'} ${className}`}>
      {children}
    </div>
  );
};

const CountUpStat: React.FC<{ target: number; suffix?: string; active: boolean }> = ({ target, suffix = '', active }) => {
  const value = useCountUp(target, active);
  return <>{value}{suffix}</>;
};

interface DemoError {
  id: number;
  type: string;
  severity: 'critical' | 'warning';
  count: number;
  grouped: boolean;
  endpoint?: string;
  stack: string[];
  request?: { method: string; url: string; payload: string };
  response?: { status: number; body: string };
  breadcrumbs: string[];
  aiInsight: string;
}

let demoErrorId = 0;

const DEMO_TEMPLATES: Record<string, () => DemoError> = {
  typeError: () => ({
    id: ++demoErrorId,
    type: 'TypeError',
    severity: 'critical',
    count: 1,
    grouped: true,
    stack: [
      "TypeError: Cannot read properties of undefined (reading 'items')",
      '  at calculateTotal (checkout.js:42:18)',
      '  at handleCheckoutClick (checkout.js:17:9)',
      '  at HTMLButtonElement.onclick (Checkout.tsx:88:22)'
    ],
    breadcrumbs: ['Clicked "Buy Now"', 'Navigated to /checkout', 'Clicked "Place Order"'],
    aiInsight: "Likely cause: user.cart is undefined when calculateTotal() runs. This usually happens when checkout loads before the cart finishes hydrating from storage. Suggested fix: guard with user.cart?.items ?? [] in checkout.js:42."
  }),
  apiError: () => ({
    id: ++demoErrorId,
    type: 'API Error',
    severity: 'warning',
    count: 1,
    grouped: true,
    endpoint: 'POST /api/checkout',
    request: { method: 'POST', url: '/api/checkout', payload: '{ "cartId": "c_8123", "promoCode": "SAVE10" }' },
    response: { status: 500, body: '{ "error": "Internal Server Error", "code": "PROMO_LOOKUP_FAILED" }' },
    stack: [],
    breadcrumbs: ['Applied promo code "SAVE10"', 'Clicked "Place Order"', 'POST /api/checkout → 500'],
    aiInsight: 'Likely cause: the promo-code lookup service is timing out under load, causing the checkout endpoint to 500 before a response is built. Suggested fix: add a fallback path that completes checkout without the promo if lookup fails.'
  }),
  networkError: () => ({
    id: ++demoErrorId,
    type: 'Network Error',
    severity: 'warning',
    count: 1,
    grouped: false,
    endpoint: 'GET /api/inventory',
    request: { method: 'GET', url: '/api/inventory?sku=SKU-291', payload: '—' },
    response: { status: 0, body: 'ERR_CONNECTION_TIMED_OUT after 8000ms' },
    stack: [],
    breadcrumbs: ['Opened product page', 'Checked stock for SKU-291', 'GET /api/inventory timed out'],
    aiInsight: 'Likely cause: the inventory service is unreachable or overloaded, with no client-side timeout/retry configured. Suggested fix: add a request timeout with exponential backoff and a cached fallback for stock checks.'
  })
};

const DashboardMock: React.FC = () => {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [errors, setErrors] = useState<DemoError[]>([
    DEMO_TEMPLATES.typeError(),
    DEMO_TEMPLATES.apiError(),
    DEMO_TEMPLATES.networkError()
  ]);
  const [openIssues, setOpenIssues] = useState(12);
  const [errors24h, setErrors24h] = useState(37);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [justTriggeredId, setJustTriggeredId] = useState<number | null>(null);

  const expanded = errors.find((e) => e.id === expandedId) ?? null;
  const aiText = useTypewriter(expanded?.aiInsight ?? '');

  const triggerError = (key: keyof typeof DEMO_TEMPLATES) => {
    const newError = DEMO_TEMPLATES[key]();
    setErrors((prev) => [newError, ...prev].slice(0, 4));
    setOpenIssues((n) => n + 1);
    setErrors24h((n) => n + 1);
    setExpandedId(newError.id);
    setJustTriggeredId(newError.id);
    setTimeout(() => setJustTriggeredId((cur) => (cur === newError.id ? null : cur)), 1500);
  };

  const resetDemo = () => {
    setErrors([DEMO_TEMPLATES.typeError(), DEMO_TEMPLATES.apiError(), DEMO_TEMPLATES.networkError()]);
    setOpenIssues(12);
    setErrors24h(37);
    setExpandedId(null);
  };

  return (
    <div ref={ref} className={`relative ${inView ? 'animate-fade-in-up' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-10 blur-3xl"></div>
      <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-xl">
        {/* Trigger buttons */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-400 flex items-center gap-1.5">
            <MousePointerClick size={16} /> Trigger a real error:
          </span>
          <button
            onClick={() => triggerError('typeError')}
            className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 hover:border-red-500/60 hover:bg-red-500/20 rounded-lg text-sm text-red-300 transition-all duration-200 active:scale-95"
          >
            Break checkout (TypeError)
          </button>
          <button
            onClick={() => triggerError('apiError')}
            className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-500/20 rounded-lg text-sm text-orange-300 transition-all duration-200 active:scale-95"
          >
            Fail checkout API (500)
          </button>
          <button
            onClick={() => triggerError('networkError')}
            className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/20 rounded-lg text-sm text-blue-300 transition-all duration-200 active:scale-95"
          >
            Time out inventory call
          </button>
          <button
            onClick={resetDemo}
            className="ml-auto px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>

        <div className="space-y-6">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Your Errors</h3>
              <p className="text-slate-400">Centralized error monitoring</p>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-slate-700/50 rounded-lg text-sm text-slate-300">
                Last 24h
              </div>
            </div>
          </div>

          {/* Stat Row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Open issues', value: openIssues, suffix: '', icon: <AlertCircle size={18} /> },
              { label: 'Errors (24h)', value: errors24h, suffix: '', icon: <Bell size={18} /> },
              { label: 'Avg API latency', value: 142, suffix: 'ms', icon: <Activity size={18} /> }
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  {stat.icon}
                  <span>{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {idx === 2 ? <CountUpStat target={stat.value} suffix={stat.suffix} active={inView} /> : stat.value}
                  {idx !== 2 && stat.suffix}
                </p>
              </div>
            ))}
          </div>

          {/* Error List */}
          <div className="space-y-3">
            {errors.map((error) => {
              const isExpanded = expandedId === error.id;
              const isNew = justTriggeredId === error.id;
              return (
                <div
                  key={error.id}
                  className={`bg-slate-900/50 border rounded-lg transition-all duration-300 ${isNew ? 'border-blue-500/60 shadow-lg shadow-blue-500/20' : 'border-slate-700/30'}`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : error.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-900/70 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${error.severity === 'critical' ? 'bg-red-500' : 'bg-orange-500'}`}
                        ></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{error.type}</p>
                            {error.grouped && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-700/60 text-[10px] text-slate-300 flex items-center gap-1">
                                <GitBranch size={10} /> grouped
                              </span>
                            )}
                            {isNew && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[10px] text-blue-300 animate-pulse">
                                just captured
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400">
                            {error.endpoint ?? 'Occurred'} {error.count > 1 ? `· ${error.count} times` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} size={20} />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 animate-fade-in">
                      {/* Breadcrumbs */}
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">Breadcrumb trail</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                          {error.breadcrumbs.map((crumb, i) => (
                            <React.Fragment key={i}>
                              <span className="px-2 py-1 bg-slate-800/80 rounded">{crumb}</span>
                              {i < error.breadcrumbs.length - 1 && <ChevronRight size={12} className="text-slate-600" />}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Stack trace */}
                      {error.stack.length > 0 && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1.5">Stack trace</p>
                          <pre className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs font-mono text-red-300/90 overflow-x-auto">
                            {error.stack.join('\n')}
                          </pre>
                        </div>
                      )}

                      {/* Request/response */}
                      {error.request && error.response && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1.5">Request</p>
                            <pre className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto">
                              {`${error.request.method} ${error.request.url}\n${error.request.payload}`}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1.5">Response</p>
                            <pre className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs font-mono text-orange-300/90 overflow-x-auto">
                              {`${error.response.status || 'ERR'}\n${error.response.body}`}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI Insight Callout */}
          {expanded && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
              <Brain size={20} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-300 mb-1">AI Root Cause — {expanded.type}</p>
                <p className="text-sm text-slate-300 min-h-[2.5rem]">
                  {aiText}
                  {aiText.length < expanded.aiInsight.length && <span className="animate-pulse">▍</span>}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isSignedIn, isLoaded } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-redirect if already fully authenticated
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      navigate('/dashboard');
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <SEO
        title="BugTracker - Know when your app breaks"
        description="BugTracker automatically captures JavaScript errors and API failures from your frontend applications and shows them in a powerful developer dashboard."
      />
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap size={24} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                BugTracker
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('dashboard')}
                className="text-slate-300 hover:text-white transition-colors"
              >
                Preview
              </button>
              <a
                href="/docs"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Docs
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-medium transition-all duration-200 active:scale-95"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? (
                <X size={24} />
              ) : (
                <Menu size={24} />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              <button
                onClick={() => scrollToSection('features')}
                className="block w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="block w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded transition-colors"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('dashboard')}
                className="block w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded transition-colors"
              >
                Preview
              </button>
              <button
                onClick={() => navigate('/docs')}
                className="block w-full text-left px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded transition-colors"
              >
                Docs
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4 animate-fade-in-up">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent leading-tight">
                Know when your app breaks.
              </h1>
              <p className="text-xl text-slate-400 leading-relaxed animate-fade-in-up delay-150">
                BugTracker automatically captures JavaScript errors and API failures from your frontend applications and shows them in a powerful developer dashboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up delay-300">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 hover:shadow-lg hover:shadow-blue-500/50 animate-pulse-glow"
              >
                Get Started <ChevronRight size={20} />
              </button>
              <button
                onClick={() => scrollToSection('dashboard')}
                className="px-8 py-3 border border-slate-700 hover:border-blue-500 rounded-lg font-semibold transition-all duration-200 hover:bg-slate-800/50"
              >
                View Dashboard Demo
              </button>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="hidden md:block animate-fade-in-up delay-225">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-20 blur-2xl"></div>
              <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl">
                <div className="space-y-4">
                  {/* Mock Dashboard */}
                  <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-300">Your Errors</p>
                      <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400">Last 24h</span>
                    </div>
                    {[
                      { label: 'TypeError', count: 24, classes: 'from-red-500/20 to-red-500/10 border-red-500/30' },
                      { label: 'API Error', count: 8, classes: 'from-orange-500/20 to-orange-500/10 border-orange-500/30' },
                      { label: 'Network Error', count: 5, classes: 'from-blue-500/20 to-blue-500/10 border-blue-500/30' }
                    ].map((row, idx) => (
                      <div
                        key={idx}
                        className={`h-12 px-3 flex items-center justify-between bg-gradient-to-r border rounded-lg ${row.classes}`}
                      >
                        <span className="text-sm text-slate-200 font-medium">{row.label}</span>
                        <span className="text-xs text-slate-400">x{row.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-slate-400 text-sm">
                    Centralized error dashboard
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Production bugs shouldn't be a mystery.
            </h2>
            <p className="text-xl text-slate-400">
              When users encounter errors in production, developers often have no idea what went wrong or where it happened.
            </p>
          </Reveal>

          <Reveal className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <AlertCircle size={32} />,
                title: 'Production bugs are hard to reproduce',
                description: 'Users report errors but you can\'t replicate them locally',
                fix: 'Fixed by: full context on every error — stack trace, request/response payload, breadcrumbs, and an optional screenshot'
              },
              {
                icon: <Code size={32} />,
                title: 'No visibility into frontend errors',
                description: 'Browser errors silently fail without proper monitoring',
                fix: 'Fixed by: automatic capture the moment it happens — no manual instrumentation needed'
              },
              {
                icon: <BarChart3 size={32} />,
                title: 'Debugging takes too long',
                description: 'Hunting through logs to find the source of the issue',
                fix: 'Fixed by: AI root-cause analysis points you straight to the cause and a suggested fix'
              }
            ].map((problem, idx) => (
              <div
                key={idx}
                className="group flex flex-col h-full bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-xl p-6 hover:border-red-500/50 hover:bg-slate-800/60 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10"
              >
                <div className="text-red-500 mb-4 group-hover:text-red-400 transition-colors">{problem.icon}</div>
                <h3 className="text-lg font-bold mb-2">{problem.title}</h3>
                <p className="text-slate-400">{problem.description}</p>
                <div className="mt-auto pt-4 border-t border-slate-700/50 flex items-start gap-2 text-sm text-blue-300/90">
                  <Check size={16} className="shrink-0 mt-0.5 text-blue-400" />
                  <span>{problem.fix}</span>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful Error Tracking Features
            </h2>
            <p className="text-xl text-slate-400">
              Everything you need to monitor and debug your application errors
            </p>
          </Reveal>

          {(() => {
            const featureRow1 = [
              {
                icon: <Zap size={28} />,
                title: 'Automatic Error Tracking',
                description: 'Automatically capture JavaScript crashes and unhandled exceptions'
              },
              {
                icon: <Code size={28} />,
                title: 'API Failure Detection',
                description: 'Track failing API calls including request and response data'
              },
              {
                icon: <BarChart3 size={28} />,
                title: 'Stack Trace Analysis',
                description: 'Instantly see the file, line and stack trace where the error occurred'
              },
              {
                icon: <GitBranch size={28} />,
                title: 'Error Grouping',
                description: 'Duplicate errors are grouped together using smart fingerprinting'
              },
              {
                icon: <AlertCircle size={28} />,
                title: 'Developer Dashboard',
                description: 'View all errors across your projects in a clean dashboard'
              },
              {
                icon: <ChevronRight size={28} />,
                title: 'Simple SDK',
                description: 'Install the SDK and start tracking errors in seconds'
              },
            ];
            const featureRow2 = [
              {
                icon: <Brain size={28} />,
                title: 'AI Root-Cause Analysis',
                description: 'Gemini-powered breakdown of each error with a suggested problem and solution'
              },
              {
                icon: <Activity size={28} />,
                title: 'Performance Monitoring',
                description: 'Web Vitals and per-API latency/p75 tracked automatically, charted over 24h–90d'
              },
              {
                icon: <Bell size={28} />,
                title: 'Smart Alerting',
                description: 'Email alerts on new errors or spikes, with per-fingerprint cooldowns'
              },
              {
                icon: <Ticket size={28} />,
                title: 'One-Click Ticketing',
                description: 'Generate a rich ticket from any error and push it to OpenProject'
              },
              {
                icon: <Users size={28} />,
                title: 'Team Permissions',
                description: 'Org and per-project roles let you control access down to a single project'
              },
            ];

            const renderCard = (feature: { icon: React.ReactNode; title: string; description: string }, key: string) => (
              <div
                key={key}
                className="group shrink-0 w-80 bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 hover:bg-slate-800/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="text-blue-400 mb-4 group-hover:text-blue-300 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                  {feature.description}
                </p>
              </div>
            );

            return (
              <div className="space-y-6">
                <div
                  className="marquee-row overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
                >
                  <div className="marquee-track animate-marquee-left flex gap-6 w-max">
                    {featureRow1.map((f, idx) => renderCard(f, `r1a-${idx}`))}
                    {featureRow1.map((f, idx) => renderCard(f, `r1b-${idx}`))}
                  </div>
                </div>
                <div
                  className="marquee-row overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
                >
                  <div className="marquee-track animate-marquee-right flex gap-6 w-max">
                    {featureRow2.map((f, idx) => renderCard(f, `r2a-${idx}`))}
                    {featureRow2.map((f, idx) => renderCard(f, `r2b-${idx}`))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-slate-400">
              From sign-up to root-cause analysis in four steps
            </p>
          </Reveal>

          <Reveal className="flex flex-col md:flex-row md:items-stretch gap-0">
            {[
              {
                step: 1,
                icon: <UserPlus size={28} />,
                title: 'Sign up & create a project',
                description: 'Spin up an org, add a project, and grab your API key — no setup required.'
              },
              {
                step: 2,
                icon: <Code size={28} />,
                title: 'Drop in the SDK',
                description: 'One line of init code. Errors and failing API calls start flowing in immediately.'
              },
              {
                step: 3,
                icon: <Brain size={28} />,
                title: 'Errors get grouped & analyzed',
                description: 'Duplicates are fingerprinted together and Gemini surfaces a likely root cause.'
              },
              {
                step: 4,
                icon: <BarChart3 size={28} />,
                title: 'Alerted, then act',
                description: 'Get notified on new issues or spikes, then dig in or generate a ticket from the dashboard.'
              }
            ].map((item, idx, arr) => (
              <React.Fragment key={item.step}>
                <div className="flex-1">
                  <div className="group relative h-full bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-2xl p-6 pt-8 text-center hover:border-blue-500/50 hover:bg-slate-800/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-blue-500/40">
                      {item.step}
                    </div>
                    <div className="text-blue-400 mb-3 flex justify-center group-hover:text-blue-300 transition-colors">
                      {item.icon}
                    </div>
                    <p className="text-slate-100 font-semibold mb-2">{item.title}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex items-center justify-center shrink-0 py-2 md:py-0 md:px-2">
                    <ChevronRight className="hidden md:block text-blue-500/40" size={24} />
                    <ChevronRight className="md:hidden rotate-90 text-blue-500/40" size={24} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </Reveal>

          <Reveal className="mt-12 bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 overflow-x-auto">
            <pre className="text-slate-300 font-mono text-sm leading-relaxed">
              <code>{`// Install the SDK
npm install bug-tracker-sdk

// Initialize in your application
import { initBugTracker } from "bug-tracker-sdk"
import axios from "axios"

initBugTracker({
  apiKey: "YOUR_API_KEY",
  axios
})

// That's it! Your errors are now tracked.`}</code>
            </pre>
          </Reveal>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section id="dashboard" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Try It Yourself
            </h2>
            <p className="text-xl text-slate-400">
              Trigger a sample error below and see how BugTracker would capture, group, and explain it
            </p>
          </Reveal>

          <DashboardMock />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Start monitoring your application errors today.
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Get instant visibility into your frontend errors and API failures
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-semibold transition-all duration-200 active:scale-95 hover:shadow-lg hover:shadow-blue-500/50"
            >
              Start Free
            </button>
            <a
              href="/docs"
              className="px-8 py-3 border border-slate-700 hover:border-blue-500 rounded-lg font-semibold transition-all duration-200 hover:bg-slate-800/50 flex items-center justify-center gap-2"
            >
              View Docs <ExternalLink size={18} />
            </a>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-12 px-4 sm:px-6 lg:px-8 bg-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors text-left">
                    Features
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('dashboard')} className="hover:text-white transition-colors text-left">
                    Preview
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <a href="/docs" className="hover:text-white transition-colors">
                    Docs
                  </a>
                </li>
                <li>
                  <a href="/docs" className="hover:text-white transition-colors">
                    API Reference
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Community</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Discord
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800/50 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <span className="font-bold">BugTracker</span>
            </div>
            <p className="text-slate-400 text-sm">
              © 2026 BugTracker. All rights reserved.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
