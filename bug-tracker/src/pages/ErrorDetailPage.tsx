import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Copy, Check, AlertTriangle, Clock, Hash,
  FileCode, Globe, Zap, Image, ExternalLink, Terminal,
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Card, Button, Badge, Skeleton, Tabs } from '../components/ui';
import type { ErrorDetail } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Helpers ─────────────────────────────────────────────────────
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return { date: 'N/A', time: 'N/A', relative: 'N/A' };
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { date: 'N/A', time: 'N/A', relative: 'N/A' };
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    let relative = 'just now';
    if (mins < 1) relative = 'just now';
    else if (mins < 60) relative = `${mins}m ago`;
    else if (hours < 24) relative = `${hours}h ago`;
    else relative = `${days}d ago`;

    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      relative,
    };
  } catch { return { date: 'N/A', time: 'N/A', relative: 'N/A' }; }
};

const getEventTypeMeta = (eventType: string | undefined) => {
  switch (eventType) {
    case 'unhandled_exception': return { label: 'Exception', variant: 'danger' as const };
    case 'api_error': return { label: 'API Error', variant: 'warning' as const };
    case 'validation_error': return { label: 'Validation', variant: 'purple' as const };
    case 'performance': return { label: 'Performance', variant: 'info' as const };
    default:
      if (!eventType) return { label: 'Unknown', variant: 'default' as const };
      return {
        label: eventType.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        variant: 'info' as const,
      };
  }
};

// ── Stack trace line parser ──────────────────────────────────────
const StackTraceViewer: React.FC<{ stack: string }> = ({ stack }) => {
  const lines = stack.split('\n');
  return (
    <div className="font-mono text-xs leading-6 overflow-x-auto">
      {lines.map((line, idx) => {
        const isAtLine = line.trim().startsWith('at ');
        const isError = idx === 0;
        return (
          <div
            key={idx}
            className={[
              'px-4 py-0.5 rounded transition-colors hover:bg-slate-700/30',
              isError ? 'text-red-400 font-semibold' :
                isAtLine ? 'text-slate-400' : 'text-slate-500',
            ].join(' ')}
          >
            {isAtLine ? (
              <>
                <span className="text-slate-600 select-none mr-3">{String(idx).padStart(3, ' ')}</span>
                <span className="text-slate-500">at </span>
                <span className="text-blue-300">
                  {line.trim().replace(/^at\s+/, '')}
                </span>
              </>
            ) : (
              <>
                <span className="text-slate-600 select-none mr-3">{String(idx).padStart(3, ' ')}</span>
                {line}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── JSON block ───────────────────────────────────────────────────
const JsonBlock: React.FC<{ data: any }> = ({ data }) => (
  <pre className="font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed p-4">
    {JSON.stringify(data, null, 2)}
  </pre>
);

// ── Main Page ────────────────────────────────────────────────────
export const ErrorDetailPage: React.FC = () => {
  const { fingerprint } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<ErrorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeTab, setActiveTab] = useState('stack');

  useEffect(() => { loadErrorDetail(); }, [fingerprint]);

  const loadErrorDetail = async () => {
    setIsLoading(true);
    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;
      if (!token || !fingerprint) return;

      const response = await fetch(`${API_BASE_URL}/errors/${fingerprint}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Failed: ${response.statusText}`);

      const errorData = await response.json();
      setError({
        fingerprint: errorData.fingerprint,
        message: errorData.payload?.error?.message || 'Unknown error',
        screenshot_url: errorData.screenshot_url || null,
        stack: errorData.payload?.error?.stack || '',
        occurrences: errorData.occurrences || 0,
        firstSeen: errorData.first_seen || new Date().toISOString(),
        lastSeen: errorData.last_seen || new Date().toISOString(),
        errorType: errorData.event_type || undefined,
        location: errorData.location || undefined,
        projectId: errorData.project_id || '',
        request: errorData.payload?.request || undefined,
        response: errorData.payload?.response || undefined,
        payload: errorData.payload || {},
        performance: errorData.payload?.performance || undefined,
      });
      console.log(error);
    } catch (err) {
      console.error('Failed to load error detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  console.log(error);
  const copyJson = () => {
    if (error) {
      navigator.clipboard.writeText(JSON.stringify(error, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <Sidebar />
        <div className="flex-1 ml-64 p-8 space-y-5">
          <Skeleton className="h-12 w-2/3" />
          <div className="grid grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!error) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          <Card className="text-center py-16">
            <p className="text-slate-400 mb-6">Error not found</p>
            <Button onClick={() => navigate('/dashboard')}>← Back to Dashboard</Button>
          </Card>
        </div>
      </div>
    );
  }

  const { label: typeLabel, variant: typeVariant } = getEventTypeMeta(error.errorType);
  const firstSeenDate = formatDate(error.firstSeen);
  const lastSeenDate = formatDate(error.lastSeen);

  // Build tabs dynamically
  const tabs = [
    { id: 'stack', label: 'Stack Trace', icon: <Terminal size={13} /> },
    { id: 'request', label: 'Request / Response', icon: <Globe size={13} /> },
    { id: 'perf', label: 'Performance', icon: <Zap size={13} /> },
    { id: 'screen', label: 'Screenshot', icon: <Image size={13} /> },
  ];

  console.log(error, "<<< ERROR DETAIL >>>");


  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden">
      <Sidebar />

      {/* Ambient glow */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-64 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <main className="flex-1 ml-64 overflow-auto">
        <div className="p-8 space-y-7 animate-fade-in-up">

          {/* ── Header ── */}
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate(-1)}
              className="mt-1 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600/70 transition-all duration-200 active:scale-95 flex-shrink-0"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <Badge variant={typeVariant} dot>{typeLabel}</Badge>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-xs text-slate-500 font-medium">{lastSeenDate.relative}</span>
              </div>
              <h1 className="text-xl font-bold text-white break-words leading-tight mb-1">
                {error.message}
              </h1>
              <p className="text-slate-500 font-mono text-[10px]">{error.fingerprint}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="secondary" size="sm" onClick={copyJson}>
                {copiedJson ? <Check size={13} /> : <Copy size={13} />}
                {copiedJson ? 'Copied!' : 'Copy JSON'}
              </Button>
            </div>
          </div>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Occurrences */}
            <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 hover:border-red-500/30 hover:shadow-glow-red transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Occurrences</p>
                <div className="w-8 h-8 bg-red-500/15 rounded-lg flex items-center justify-center">
                  <Hash size={14} className="text-red-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-red-400">{error.occurrences}</p>
              <p className="text-xs text-slate-500 mt-1">Total occurrences</p>
            </div>

            {/* First seen */}
            <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">First Seen</p>
                <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                  <Clock size={14} className="text-blue-400" />
                </div>
              </div>
              <p className="text-sm font-bold text-white">{firstSeenDate.date}</p>
              <p className="text-xs text-slate-500 mt-0.5">{firstSeenDate.time}</p>
            </div>

            {/* Last seen */}
            <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 hover:border-amber-500/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Last Seen</p>
                <div className="w-8 h-8 bg-amber-500/15 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={14} className="text-amber-400" />
                </div>
              </div>
              <p className="text-sm font-bold text-white">{lastSeenDate.date}</p>
              <p className="text-xs text-slate-500 mt-0.5">{lastSeenDate.time}</p>
            </div>
          </div>

          {/* ── Error Location ── */}
          {error.location && (
            <Card className="!py-4">
              <div className="flex items-center gap-2 mb-3">
                <FileCode size={14} className="text-slate-400" />
                <h2 className="text-sm font-semibold text-white">Error Location</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0 bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-2.5">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">File</p>
                  <p className="text-emerald-400 font-mono text-xs break-all">{error.location.file}</p>
                </div>
                {error.location.line !== undefined && (
                  <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-2.5 min-w-[80px]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Line</p>
                    <p className="text-blue-400 font-mono text-sm font-bold">{error.location.line}</p>
                  </div>
                )}
                {error.location.column !== undefined && (
                  <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-2.5 min-w-[80px]">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Col</p>
                    <p className="text-blue-400 font-mono text-sm font-bold">{error.location.column}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ── Tabs ── */}
          <div>
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </div>

          {/* ── Tab Content ── */}
          <div className="animate-fade-in">

            {/* Stack Trace */}
            {activeTab === 'stack' && (
              <Card noPadding className="overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-700/40 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-slate-500 text-xs font-mono ml-2">stack_trace.txt</span>
                </div>
                {error.stack ? (
                  <div className="bg-slate-950/60 max-h-[500px] overflow-y-auto py-3">
                    <StackTraceViewer stack={error.stack} />
                  </div>
                ) : (
                  <div className="bg-slate-950/60 p-8 text-center">
                    <p className="text-slate-400 text-sm">No stack trace available for this error</p>
                  </div>
                )}
              </Card>
            )}

            {/* Request / Response */}
            {activeTab === 'request' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {error?.request && (error.request.url || error.request.payload) ? (
                  <Card noPadding className="overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-700/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">Request</h3>
                      </div>
                      <Badge variant="info">{error?.request?.method}</Badge>
                    </div>
                    <div className="p-5 space-y-4">
                      {<div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">URL</p>
                        <p className="text-blue-400 break-all font-mono text-xs bg-slate-900/60 border border-slate-700/40 rounded-xl p-3">
                          {error.request.url}
                        </p>
                      </div>}
                      {error.request.payload && (
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Payload</p>
                          <div className="bg-slate-950/60 border border-slate-700/40 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                            <JsonBlock data={error.request.payload} />
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (

                  <Card className="flex items-center justify-center py-12">

                    <p className="text-slate-500 text-sm">No request data captured</p>
                  </Card>
                )}

                {error.response ? (
                  <Card noPadding className="overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-700/40 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Response</h3>
                      <Badge variant={error.response.status >= 400 ? 'danger' : 'success'}>
                        {error.response.status}
                      </Badge>
                    </div>
                    <div className="p-5">
                      {error.response.data ? (
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1.5">Response Data</p>
                          <div className="bg-slate-950/60 border border-slate-700/40 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                            <JsonBlock data={error.response.data} />
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">No response data</p>
                      )}
                    </div>
                  </Card>
                ) : (
                  <Card className="flex items-center justify-center py-12">
                    <p className="text-slate-500 text-sm">No response data captured</p>
                  </Card>
                )}
              </div>
            )}

            {/* Performance */}
            {activeTab === 'perf' && (
              <Card>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                    <Zap size={15} className="text-blue-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">Performance Metrics</h2>
                </div>

                {/* Client info section */}
                {(error as any).performance ? (
                  <div className="space-y-4">
                    {Object.keys(error.performance).length > 0 && (
                      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">

                        {/* LCP */}
                        {error.performance.domContentLoaded && (
                          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase mb-1">Dom Content Loaded</p>
                            <p className="text-lg font-bold text-blue-400">
                              {(error.performance.domContentLoaded).toFixed(2)}s
                            </p>
                          </div>
                        )}

                        {/* FCP */}
                        {error.performance.firstContentfulPaint && (
                          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase mb-1">First Contentful Paint</p>
                            <p className="text-lg font-bold text-emerald-400">
                              {(error.performance.firstContentfulPaint).toFixed(2)}s
                            </p>
                          </div>
                        )}

                        {/* TTFB */}
                        {error.performance.firstPaint && (
                          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase mb-1">First Paint</p>
                            <p className="text-lg font-bold text-amber-400">
                              {(error.performance.firstPaint).toFixed(2)}s
                            </p>
                          </div>
                        )}

                        {/* CLS */}
                        {error.performance.pageLoadTime !== undefined && (
                          <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase mb-1">Page Load Time</p>
                            <p className="text-lg font-bold text-purple-400">
                              {(error.performance.pageLoadTime).toFixed(2)}s
                            </p>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Zap size={20} className="text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium mb-1">No performance data</p>
                    <p className="text-slate-500 text-xs">Enable the performance plugin in your SDK to capture metrics.</p>
                  </div>
                )}


              </Card>
            )}

            {/* Screenshot */}
            {activeTab === 'screen' && (
              <Card>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-purple-500/15 rounded-lg flex items-center justify-center">
                    <Image size={15} className="text-purple-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-white">Error Screenshot</h2>
                  {error.screenshot_url && (
                    <a
                      href={error.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Open full size
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>

                {error.screenshot_url ? (
                  <div className="bg-slate-950/50 border border-slate-700/40 rounded-xl p-4 flex justify-center items-center">
                    <img
                      src={error.screenshot_url}
                      alt="Error Screenshot"
                      className="rounded-xl max-h-[500px] object-contain border border-slate-700/40 shadow-xl"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div className="bg-slate-950/50 border border-dashed border-slate-700/60 rounded-xl p-16 text-center">
                    <div className="w-14 h-14 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Image size={22} className="text-slate-500" />
                    </div>
                    <p className="text-slate-300 font-semibold mb-1 text-sm">No screenshot available</p>
                    <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
                      Screenshots are disabled or failed to capture. Check your SDK configuration.
                    </p>
                  </div>
                )}
              </Card>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};
