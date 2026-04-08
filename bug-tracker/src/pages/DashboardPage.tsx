import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, AlertTriangle, LayoutGrid, Clock,
  ArrowRight, Activity, Zap, RefreshCw, Eye, EyeOff, Bell, MessageSquare, X
} from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Card, Button, Skeleton, StatCard, EmptyState, Badge } from '../components/ui';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { useAuthStore } from '../store/auth';
import type { Project } from '../types';
import { ResponsiveContainer } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { encrypt } from '../utils/crypto';

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


const buildProjectChartData = (projects: Project[]) => {
  return projects.map((p) => ({
    name: p.name.length > 10 ? p.name.slice(0, 10) + '...' : p.name,
    errors: p.errorCount,
  }));
};

// ── Project card component ───────────────────────────────────────
const ProjectCard: React.FC<{
  project: Project;
  onClick: () => void;
}> = ({ project, onClick }) => {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleCopyKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(project.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const errorBadgeVariant =
    project.errorCount === 0 ? 'success' :
      project.errorCount > 50 ? 'danger' :
        project.errorCount > 10 ? 'warning' : 'info';

  return (
    <div
      id={`project-card-${project.id}`}
      onClick={onClick}
      className="group relative bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 hover:border-slate-600/70 hover:-translate-y-0.5 animate-fade-in-up"
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors duration-200 truncate">
            {project.name}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Created{' '}
            {new Date(project.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex-shrink-0">
          <Badge variant={errorBadgeVariant} dot>
            {project.errorCount} {project.errorCount === 1 ? 'error' : 'errors'}
          </Badge>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/40">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Total Errors</p>
          <p className={`text-xl font-bold ${project.errorCount === 0 ? 'text-emerald-400' :
            project.errorCount > 50 ? 'text-red-400' :
              project.errorCount >
                10 ? 'text-amber-400' : 'text-blue-400'
            }`}>
            {project.errorCount}
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/40">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Last Seen</p>
          <p className="text-sm font-semibold text-slate-300">
            {project.lastSeen
              ? new Date(project.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '—'}
          </p>
        </div>
      </div>

      {/* API Key row */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <code className="flex-1 text-[10px] font-mono text-slate-500 bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-2 truncate tracking-widest">
          {revealed ? project.apiKey : '•'.repeat(28)}
        </code>
        <button
          onClick={(e) => { e.stopPropagation(); setRevealed((r) => !r); }}
          title={revealed ? 'Hide API key' : 'Reveal API key'}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/60 border border-slate-600/50 text-slate-400 hover:bg-slate-600/70 hover:text-white transition-all duration-150 active:scale-95"
        >
          {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button
          onClick={handleCopyKey}
          className="flex-shrink-0 px-3 py-2 text-[10px] font-semibold rounded-lg bg-slate-700/60 border border-slate-600/50 text-slate-300 hover:bg-slate-600/70 hover:text-white transition-all duration-150 active:scale-95"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>

      {/* View arrow */}
      <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0">
        <ArrowRight size={16} className="text-blue-400" />
      </div>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allErrors, setAllErrors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [alertLogs, setAlertLogs] = useState<any[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [user]);

  const loadProjects = async (silent = false) => {
    if (!user) return;
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/projects/${user.id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Failed: ${response.statusText}`);

      const projectsData = await response.json();
      const mappedProjects: Project[] = Array.isArray(projectsData)
        ? projectsData.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          apiKey: p.api_key || p.apiKey,
          userId: p.user_id || p.userId,
          createdAt: p.created_at || p.createdAt,
          errorCount: 0,
          lastSeen: p.lastSeen || null,
        }))
        : [];

      setProjects(mappedProjects);

      if (token) {
        let totalErrorsLast24Hours = 0;
        const now = new Date();
        const last24HoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const allRawErrors: any[] = []; // collect every error across all projects

        const projectsWithCounts = await Promise.all(
          mappedProjects.map(async (project) => {
            try {
              const errorsRes = await fetch(`${API_BASE_URL}/projects/${project.id}/errors`, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              });
              if (errorsRes.ok) {
                const errorsData = await errorsRes.json();
                const errors = Array.isArray(errorsData) ? errorsData : [];
                // Push every raw error so the chart can use real timestamps
                allRawErrors.push(...errors);
                errors.forEach((err: any) => {
                  const lastSeen = new Date(err.last_seen || err.lastSeen);
                  if (lastSeen >= last24HoursAgo) totalErrorsLast24Hours++;
                });
                // Derive lastSeen from the most recently seen error
                const latestSeen = errors.reduce((latest: string | null, err: any) => {
                  const ts = err.last_seen || err.lastSeen;
                  if (!ts) return latest;
                  if (!latest) return ts;
                  return new Date(ts) > new Date(latest) ? ts : latest;
                }, null);
                return { ...project, errorCount: errors.length, lastSeen: latestSeen };
              }
            } catch { /* silently ignore per-project error */ }
            return project;
          })
        );

        setProjects(projectsWithCounts);
        setAllErrors([{ count24h: totalErrorsLast24Hours }]);
        // Build chart from REAL timestamps, not random numbers
        setChartData(buildProjectChartData(projectsWithCounts));
      }
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
              headers: { Authorization: `Bearer ${session.token}` }
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

      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, user_id: user.id }),
      });
      if (!response.ok) throw new Error(`Failed: ${response.statusText}`);

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

          {/* ── Header ── */}
          <div className="flex items-start justify-between animate-fade-in-up relative z-50">
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

            <div className="flex items-center gap-3 relative">
              <button
                id="dashboard-refresh-btn"
                onClick={() => loadProjects(true)}
                disabled={isRefreshing}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600/70 transition-all duration-200 active:scale-95"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>

              <div className="relative">
                <button
                  onClick={fetchAlertLogs}
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
                  <div
                    className="absolute right-0 mt-3 w-[400px] border border-slate-700/80 rounded-2xl shadow-[0_50px_120px_rgba(0,0,0,1)] z-[300] overflow-hidden animate-fade-in-up origin-top-right ring-4 ring-white/5"
                    style={{ backgroundColor: '#020617', opacity: 1 }}
                  >
                    <div className="px-6 py-5 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
                      <h3 className="text-sm font-black text-white flex items-center gap-3 tracking-widest uppercase">
                        <MessageSquare size={18} className="text-blue-400" />
                        Live Alert Center
                      </h3>
                      <button onClick={() => setIsAlertsOpen(false)} className="text-slate-500 hover:text-white transition-colors bg-slate-800/80 p-1.5 rounded-lg hover:bg-slate-700">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="max-h-[480px] overflow-y-auto" style={{ backgroundColor: '#020617' }}>
                      {isLogsLoading ? (
                        <div className="p-16 flex flex-col items-center justify-center gap-4">
                          <RefreshCw className="animate-spin text-blue-500" size={32} />
                          <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em]">INITIALIZING FEED...</p>
                        </div>
                      ) : alertLogs.length === 0 ? (
                        <div className="p-16 text-center">
                          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-slate-800 shadow-inner">
                            <Bell size={28} className="text-slate-700" />
                          </div>
                          <p className="text-sm text-slate-400 font-black tracking-tight">QUIET BEFORE THE STORM</p>
                          <p className="text-[10px] text-slate-600 mt-1 font-bold">No critical events detected</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800/80">
                          {alertLogs.map((log, i) => (
                            <div key={i} className="p-6 transition-all cursor-default group border-b border-slate-900 bg-[#020617] hover:bg-[#0f172a]">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${log.type === 'SPIKE'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/40'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/40'
                                    }`}>
                                    {log.type}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-slate-800" />
                                  <span className="text-[10px] text-slate-500 font-black tracking-tight flex items-center gap-1.5 uppercase">
                                    <Clock size={11} />
                                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-slate-100 font-bold leading-relaxed mb-4">
                                {log.detail}
                              </p>
                              <button
                                onClick={() => navigate(`/error/${log.fingerprint}`)}
                                className="text-[11px] font-bold text-blue-500 hover:text-blue-400 transition-all flex items-center gap-2 group/btn"
                              >
                                <span>VIEW DEEP TRACE</span>
                                <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
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

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            <div className="animate-fade-in-up delay-75">
              <StatCard
                label="Total Errors"
                value={isLoading ? '—' : totalErrors}
                icon={<AlertTriangle size={18} className="text-red-400" />}
                iconBg="bg-red-500/15"
                glowColor="red"
                description="Across all projects"
              />
            </div>
            <div className="animate-fade-in-up delay-150">
              <StatCard
                label="Active Projects"
                value={isLoading ? '—' : projects.length}
                icon={<LayoutGrid size={18} className="text-blue-400" />}
                iconBg="bg-blue-500/15"
                glowColor="blue"
                description="Being monitored"
              />
            </div>
            <div className="animate-fade-in-up delay-225">
              <StatCard
                label="Last 24 Hours"
                value={isLoading ? '—' : last24HoursCount}
                icon={<Clock size={18} className="text-emerald-400" />}
                iconBg="bg-emerald-500/15"
                glowColor="green"
                description="Recent activity"
              />
            </div>
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
                      <p className="text-xs text-slate-500">Project Trends</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {totalErrors > 0 ? (
                      <span className="text-xs text-red-400 font-semibold">
                        {totalErrors} total
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold">No errors</span>
                    )}
                    <Badge variant="info" dot>Live</Badge>
                  </div>
                </div>
                <div className="p-4 pt-2">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="errors"
                        radius={[6, 6, 0, 0]}
                        fill="#3b82f6"
                      />
                    </BarChart>
                  </ResponsiveContainer>
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
                description="Create your first project to start monitoring production errors in real time."
                action={{ label: '+ Create Project', onClick: () => setIsModalOpen(true) }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
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
