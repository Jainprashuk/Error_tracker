import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, AlertTriangle, LayoutGrid, Clock,
  ArrowRight, Activity, Zap, RefreshCw, Eye, EyeOff, Bell, MessageSquare, X, Cpu
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Card, Button, Skeleton, EmptyState, Badge } from '../components/ui';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { PendingInvites } from '../components/PendingInvites';
import { useAuthStore } from '../store/auth';
import type { Project } from '../types';
import { ResponsiveContainer } from 'recharts';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { encrypt } from '../utils/crypto';
import { formatRelativeDate } from '../utils/time';
import { AIInsightCard } from '../components/AIInsightCard';
import { useCountUp } from '../hooks/useCountUp';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Recharts custom tooltip ──────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/60 rounded-xl px-4 py-3 shadow-xl backdrop-blur-xl">
        <p className="text-slate-400 text-xs mb-1.5">{label}</p>
        <p className="text-white font-bold text-base">
          {payload[0].value}
          <span className="text-slate-400 font-normal text-xs ml-1">
            {payload[0].value === 1 ? 'error' : 'errors'}
          </span>
        </p>
      </div>
    );
  }
  return null;
};


const AnimatedStat: React.FC<{ value: number; active: boolean }> = ({ value, active }) => {
  const display = useCountUp(value, active, 700);
  return <>{display}</>;
};

// ── Project card component ───────────────────────────────────────
const ProjectCard: React.FC<{
  project: Project;
  onClick: () => void;
  delayMs?: number;
  avgErrors: number;
  sparkline?: { date: string; count: number }[];
}> = ({ project, onClick, delayMs = 0, avgErrors, sparkline = [] }) => {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCopyKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(project.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Severity is relative to the org, not an absolute color for any nonzero count —
  // a project with 4 errors shouldn't look as urgent as one with 47.
  const severity =
    project.errorCount === 0 ? 'none' : project.errorCount > Math.max(avgErrors, 1) ? 'high' : 'low';
  const severityText = { none: 'text-emerald-400', low: 'text-amber-400', high: 'text-red-400' }[severity];
  const severityBorder = { none: 'border-l-emerald-500', low: 'border-l-amber-500', high: 'border-l-red-500' }[severity];
  const severityStroke = { none: '#34d399', low: '#fbbf24', high: '#f87171' }[severity];

  const activity = formatRelativeDate(project.lastSeen);
  const isStale = project.isIntegrated && activity.days >= 14 && activity.days !== Infinity;

  return (
    <div
      id={`project-card-${project.id}`}
      onClick={onClick}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`group relative bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 border-l-[3px] ${severityBorder} rounded-xl p-5 cursor-pointer transition-all duration-300 hover:border-slate-600/70 hover:bg-slate-800/80 hover:-translate-y-0.5 animate-fade-in-up`}
    >
      {/* ── Header ── */}
      <div className="flex justify-between items-start mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate">
            {project.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${project.isIntegrated ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>{project.isIntegrated ? 'Connected' : 'Pending'}</span>
            <span className="text-slate-700">·</span>
            <span className={isStale ? 'text-amber-400 font-medium' : ''}>
              {isStale ? `Stale · ${activity.label}` : activity.label}
            </span>
          </div>
        </div>
        <ArrowRight size={16} className="text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
      </div>

      {/* ── Errors + sparkline ── */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className={`text-3xl font-black leading-none ${severityText}`}>{project.errorCount}</p>
          <p className="text-xs text-slate-500 mt-1">errors total</p>
        </div>
        {sparkline.length > 1 && (
          <div className="w-24 h-9">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline.slice(-7)} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`spark-${project.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={severityStroke} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={severityStroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={severityStroke}
                  strokeWidth={1.5}
                  fill={`url(#spark-${project.id})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Ingestion key ── */}
      <div
        className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <code className="flex-1 text-xs font-mono text-slate-500 truncate">
          {revealed ? project.apiKey : '••••••••••••••••••••••••'}
        </code>
        <button
          onClick={(e) => { e.stopPropagation(); setRevealed(!revealed); }}
          className="text-slate-500 hover:text-white transition-colors"
        >
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button
          onClick={handleCopyKey}
          className={`text-xs font-medium transition-colors ${copied ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentOrgId } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allErrors, setAllErrors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [trendData, setTrendData] = useState<{ date: string; count: number }[]>([]);
  const [trendByProject, setTrendByProject] = useState<Record<string, { date: string; count: number }[]>>({});
  const [trendPct, setTrendPct] = useState<number | null>(null);
  const [topErrors, setTopErrors] = useState<{
    fingerprint: string;
    eventType: string;
    message: string;
    occurrences: number;
    lastSeen: string | null;
    projectId: string;
    projectName: string;
  }[]>([]);
  const [alertLogs, setAlertLogs] = useState<any[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    loadProjects();
  }, [user, currentOrgId]);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return null;
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const loadProjects = async (silent = false) => {
    const { currentOrgId } = useAuthStore.getState();
    if (!user || !currentOrgId) {
      setProjects([]);
      setIsLoading(false);
      return;
    }
    
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'x-org-id': currentOrgId
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed: ${response.statusText}`);
      }

      const projectsData = await response.json();
      const mappedProjects: Project[] = Array.isArray(projectsData)
        ? projectsData.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          apiKey: p.api_key || p.apiKey,
          orgId: p.org_id,
          createdAt: p.created_at || p.createdAt,
          errorCount: 0,
          lastSeen: p.lastSeen || null,
          my_project_role: p.my_project_role,
          isIntegrated: p.is_integrated,
        }))
        : [];

      setProjects(mappedProjects);

      if (token && mappedProjects.length > 0) {
        // Single aggregate call replaces one /errors fetch per project.
        const statsRes = await fetch(`${API_BASE_URL}/projects/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-org-id': currentOrgId
          },
        });

        const statsByProjectId: Record<string, { errorCount: number; lastSeen: string | null; count24h: number }> =
          statsRes.ok ? await statsRes.json() : {};

        const projectsWithCounts = mappedProjects.map((project) => {
          const stats = statsByProjectId[project.id];
          return stats
            ? { ...project, errorCount: stats.errorCount, lastSeen: stats.lastSeen }
            : project;
        });

        const totalErrorsLast24Hours = Object.values(statsByProjectId).reduce(
          (sum, s) => sum + (s.count24h || 0),
          0
        );

        setProjects(projectsWithCounts);
        setAllErrors([{ count24h: totalErrorsLast24Hours }]);

        // Daily error-event trend for the last 14 days, used for both the
        // chart and a real (not fabricated) day-over-day trend indicator.
        const trendsRes = await fetch(`${API_BASE_URL}/projects/trends?days=14`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-org-id': currentOrgId
          },
        });

        const trendsJson: { org: { date: string; count: number }[]; byProject: Record<string, { date: string; count: number }[]> } =
          trendsRes.ok ? await trendsRes.json() : { org: [], byProject: {} };
        const series = trendsJson.org;
        setTrendData(series);
        setTrendByProject(trendsJson.byProject || {});

        if (series.length >= 2) {
          const today = series[series.length - 1].count;
          const yesterday = series[series.length - 2].count;
          if (yesterday > 0) {
            setTrendPct(Math.round(((today - yesterday) / yesterday) * 100));
          } else if (today > 0) {
            setTrendPct(100);
          } else {
            setTrendPct(0);
          }
        } else {
          setTrendPct(null);
        }

        // Most recently active errors across the org, for the at-a-glance feed.
        const topErrorsRes = await fetch(`${API_BASE_URL}/projects/top-errors?limit=5`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-org-id': currentOrgId
          },
        });
        setTopErrors(topErrorsRes.ok ? await topErrorsRes.json() : []);
      } else {
        setTopErrors([]);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load projects:', err);
      toast.error('Failed to load projects');
      setProjects([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchAlertLogs = async () => {
    if (projects.length === 0) return;
    setIsLogsLoading(true);
    setIsAlertsOpen(!isAlertsOpen);

    if (!isAlertsOpen) { // Only fetch if we are opening it
      try {
        const session = JSON.parse(localStorage.getItem('session') || "{}");
        const allLogs = await Promise.all(
          projects.map(async (p) => {
            const res = await fetch(`${API_BASE_URL}/projects/${p.id}/alerts/logs`, {
              headers: { 
                Authorization: `Bearer ${session.token}`,
                'x-org-id': currentOrgId || ''
              }
            });
            return res.ok ? await res.json() : [];
          })
        );

        // Flatten and sort by date
        const flatLogs = allLogs.flat().sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 10); // Show only latest 10

        setAlertLogs(flatLogs);
      } catch (err) {
        console.error("Failed to fetch alert logs", err);
      } finally {
        setIsLogsLoading(false);
      }
    }
  };

  const handleCreateProject = async (name: string, configs?: any) => {
    if (!user) return;
    setIsCreating(true);
    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;
      if (!token) throw new Error('Not authenticated');

      const { currentOrgId } = useAuthStore.getState();
      if (!currentOrgId) throw new Error('No organization selected');

      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`, 
          'Content-Type': 'application/json',
          'x-org-id': currentOrgId
        },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed: ${response.statusText}`);
      }

      const result = await response.json();
      const newProjectId = result.project_id || result.id;

      // 🔥 Handle Advanced Configs if provided
      if (configs && newProjectId) {
        // 1. OpenProject Integration
        if (configs.openProject) {
          try {
            const encryptedKey = encrypt(configs.openProject.token);
            await fetch(`${API_BASE_URL}/projects/${newProjectId}/integrations/openproject`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                base_url: configs.openProject.url,
                api_key: encryptedKey,
                project_id: configs.openProject.projectId
              })
            });
          } catch (e) {
            console.error("Failed to save OpenProject config during creation", e);
          }
        }

        // 2. Alert Config
        if (configs.alerts) {
          try {
            await fetch(`${API_BASE_URL}/projects/${newProjectId}/alert-config`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: newProjectId,
                channels: {
                  email: {
                    enabled: true,
                    recipients: configs.alerts.recipients
                  }
                },
                triggers: {
                  newError: configs.alerts.triggers.newError,
                  spike: {
                    enabled: configs.alerts.triggers.spike,
                    threshold: configs.alerts.spikeThreshold
                  }
                },
                cooldown: configs.alerts.cooldown
              })
            });
          } catch (e) {
            console.error("Failed to save Alert config during creation", e);
          }
        }
      }

      await loadProjects();
      toast.success('Project created and configured!');
      return { apiKey: result.api_key, projectId: newProjectId };
    } catch (err) {
      console.error('Failed to create project:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create project');
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const totalErrors = projects.reduce((s, p) => s + p.errorCount, 0);
  const last24HoursCount = allErrors.length > 0 ? allErrors[0].count24h : 0;
  const avgErrors = projects.length > 0 ? Math.round(totalErrors / projects.length) : 0;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden">
      <Sidebar />

      {/* ── Ambient glow blobs ── */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 md:left-64 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

      <main className="flex-1 h-screen overflow-y-auto md:ml-64">
        <div className="p-4 pt-20 md:p-8 space-y-6 md:space-y-8">
          <PendingInvites />

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 animate-fade-in-up relative z-50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-widest">Overview</span>
              </div>
              <h1 className="text-3xl font-bold gradient-text mb-1">Dashboard</h1>
              <p className="text-slate-400 text-sm">
                Monitor errors from{' '}
                <span className="text-slate-300 font-medium">{projects.length}</span>{' '}
                {projects.length === 1 ? 'project' : 'projects'}
              </p>
            </div>

            <div className="flex items-center gap-3 relative flex-wrap sm:flex-nowrap">
              {lastUpdated && (
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Updated {formatLastUpdated(lastUpdated)}
                </span>
              )}
              <button
                id="dashboard-refresh-btn"
                onClick={() => loadProjects(true)}
                disabled={isRefreshing}
                aria-label="Refresh dashboard data"
                title="Refresh"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600/70 transition-all duration-200 active:scale-95"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>

              <div className="relative">
                <button
                  onClick={fetchAlertLogs}
                  aria-label="View alert history"
                  title="Alert history"
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95 border ${isAlertsOpen
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-400"
                    : "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600/70"
                    }`}
                >
                  <Bell size={18} />
                  {alertLogs.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-slate-900 animate-pulse" />
                  )}
                </button>

                {isAlertsOpen && (
                  <div className="absolute right-0 mt-3 w-[400px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-xl z-[300] overflow-hidden animate-fade-in-up origin-top-right">
                    <div className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2.5">
                        <MessageSquare size={16} className="text-blue-400" />
                        Alert History
                      </h3>
                      <button onClick={() => setIsAlertsOpen(false)} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="max-h-[480px] overflow-y-auto">
                      {isLogsLoading ? (
                        <div className="p-14 flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="animate-spin text-blue-500" size={24} />
                          <p className="text-xs text-slate-500">Loading alerts...</p>
                        </div>
                      ) : alertLogs.length === 0 ? (
                        <div className="p-14 text-center">
                          <div className="w-14 h-14 bg-slate-800/60 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                            <Bell size={24} className="text-slate-600" />
                          </div>
                          <p className="text-sm text-slate-300 font-medium">No alerts yet</p>
                          <p className="text-xs text-slate-500 mt-1">You'll see new errors and spikes here</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800">
                          {alertLogs.map((log, i) => (
                            <div key={i} className="p-5 transition-colors cursor-default group hover:bg-slate-800/40">
                              <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${log.type === 'SPIKE'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/40'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/40'
                                    }`}>
                                    {log.type}
                                  </span>
                                  <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                    <Clock size={11} />
                                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-slate-200 leading-relaxed mb-3">
                                {log.detail}
                              </p>
                              <button
                                onClick={() => navigate(`/error/${log.fingerprint}`)}
                                className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-all flex items-center gap-1.5 group/btn"
                              >
                                <span>View details</span>
                                <ArrowRight size={13} className="group-hover/btn:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Button
                id="new-project-btn"
                variant="primary"
                size="lg"
                onClick={() => setIsModalOpen(true)}
                className="shadow-lg shadow-blue-500/20"
              >
                <Plus size={18} />
                New Project
              </Button>
            </div>
          </div>

          {/* ── AI Intelligence Overview ── */}
          {!isLoading && projects.length > 0 && (
            <div className="animate-fade-in-up delay-75">
              <AIInsightCard
                title="Organization executive Summary"
                endpoint="/ai/global-overview"
                icon={<Cpu size={16} />}
                variant="purple"
              />
            </div>
          )}

          {/* ── Stat strip ── */}
          <div className="animate-fade-in-up delay-150">
            <Card className="!p-0 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-slate-700/40">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle size={16} className="text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">Total Errors</p>
                    <p className="text-2xl font-bold text-slate-100 leading-tight">
                      {isLoading ? '—' : <AnimatedStat value={totalErrors} active={!isLoading} />}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <LayoutGrid size={16} className="text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">Active Projects</p>
                    <p className="text-2xl font-bold text-slate-100 leading-tight">
                      {isLoading ? '—' : <AnimatedStat value={projects.length} active={!isLoading} />}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 mb-0.5">Last 24 Hours</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-slate-100 leading-tight">
                        {isLoading ? '—' : <AnimatedStat value={last24HoursCount} active={!isLoading} />}
                      </p>
                      {!isLoading && trendPct !== null && trendPct !== 0 && (
                        <span className={`text-xs font-semibold ${trendPct > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {trendPct > 0 ? '↑' : '↓'} {Math.abs(trendPct)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {!isLoading && trendData.length > 1 && (
                    <div className="w-16 h-8 shrink-0 hidden sm:block">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData.slice(-7)} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="sparklineFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#34d399"
                            strokeWidth={1.5}
                            fill="url(#sparklineFill)"
                            dot={false}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* ── Error trend chart ── */}
          {!isLoading && projects.length > 0 && (
            <div className="animate-fade-in-up delay-300">
              <Card className="!p-0 overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-slate-700/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-blue-500/15 rounded-lg flex items-center justify-center">
                      <Activity size={14} className="text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">Error Trends</h2>
                      <p className="text-xs text-slate-500">Last 14 days, across all projects</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {trendPct !== null && trendPct !== 0 && (
                      <span className={`text-xs font-semibold flex items-center gap-1 ${trendPct > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {trendPct > 0 ? '↑' : '↓'} {Math.abs(trendPct)}%
                        <span className="text-slate-500 font-normal">vs yesterday</span>
                      </span>
                    )}
                    <Badge variant="info" dot>Synced</Badge>
                  </div>
                </div>
                <div className="p-4 pt-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart
                      data={trendData.map((d) => ({
                        ...d,
                        label: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      }))}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="errorTrendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        width={28}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        fill="url(#errorTrendFill)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}

          {/* ── Recent errors widget ── */}
          {!isLoading && topErrors.length > 0 && (
            <div className="animate-fade-in-up delay-300">
              <Card className="!p-0 overflow-hidden">
                <div className="px-6 pt-5 pb-4 border-b border-slate-700/40 flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-red-500/15 rounded-lg flex items-center justify-center">
                    <AlertTriangle size={14} className="text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Recent Errors</h2>
                    <p className="text-xs text-slate-500">Most recently active, across all projects</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-800">
                  {topErrors.map((err) => (
                    <button
                      key={err.fingerprint}
                      onClick={() => navigate(`/error/${err.fingerprint}`)}
                      className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
                            {err.projectName}
                          </span>
                          <span className="text-xs text-slate-500">{err.eventType}</span>
                        </div>
                        <p className="text-sm text-slate-200 truncate">
                          {err.message || 'No message captured'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400">{formatRelativeDate(err.lastSeen).label}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{err.occurrences}x</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── Projects section ── */}
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Your Projects</h2>
                {projects.length > 0 && (
                  <span className="px-2.5 py-0.5 bg-slate-700/60 text-slate-300 text-xs rounded-full border border-slate-600/50 font-medium">
                    {projects.length}
                  </span>
                )}
              </div>
              {projects.length > 0 && (
                <p className="text-xs text-slate-500">
                  Avg. <span className="text-slate-300 font-medium">{avgErrors}</span> errors/project
                </p>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-56" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <EmptyState
                icon={<Zap size={28} />}
                title="No projects yet"
                description="Create your first project to start capturing and monitoring production errors."
                action={{ label: '+ Create Project', onClick: () => setIsModalOpen(true) }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map((project, idx) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    delayMs={Math.min(idx, 8) * 60}
                    avgErrors={avgErrors}
                    sparkline={trendByProject[project.id]}
                    onClick={() => navigate(`/project/${project.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
        isLoading={isCreating}
      />
    </div>
  );
};
