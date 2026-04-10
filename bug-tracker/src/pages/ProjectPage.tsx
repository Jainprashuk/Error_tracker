import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Check, AlertTriangle, Clock, Hash, Key, Filter, Eye, EyeOff, ExternalLink, X, Activity } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Card, Button, Badge, Skeleton } from '../components/ui';
import type { Error as ErrorType, Project } from '../types';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ─── Helpers ────────────────────────────────────────────────────
const getErrorMessage = (error: any): string => {
  if (error.message) return error.message;
  if (error.error?.message) return error.error.message;
  const fp = error.fingerprint || 'Unknown Error';
  return fp.substring(0, 60) + (fp.length > 60 ? '…' : '');
};

const getEventTypeMeta = (eventType: string | undefined): {
  label: string; variant: 'danger' | 'warning' | 'info' | 'success' | 'purple';
} => {
  switch (eventType) {
    case 'unhandled_exception': return { label: 'Exception', variant: 'danger' };
    case 'api_error': return { label: 'API Error', variant: 'warning' };
    case 'validation_error': return { label: 'Validation', variant: 'purple' };
    case 'performance': return { label: 'Performance', variant: 'info' };
    default:
      if (!eventType) return { label: 'Unknown', variant: 'info' };
      return {
        label: eventType.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        variant: 'info',
      };
  }
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return 'N/A'; }
};

// ─── Issue row component ────────────────────────────────────────
interface IssueRowProps {
  error: any;
  index: number;
  onClick: () => void;
  refetchData?: () => void;
}

const IssueRow: React.FC<IssueRowProps> = ({
  error, index, onClick, refetchData,
}) => {
  const [loading, setLoading] = useState(false);
  const isTicketGenerated = error.is_ticket_generated === true;
  const ticketUrl = error.ticket_url;

  const eventType = (error as any).event_type || error.errorType;
  const { label, variant } = getEventTypeMeta(eventType);
  const file = error.location?.file ?? null;
  const line = error.location?.line ?? null;

  const handleCreateTicket = async (errItem: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isTicketGenerated) {
      toast.error('Ticket for this fingerprint is already generated.');
      return;
    }

    setLoading(true);
    try {
      const sessionStr = localStorage.getItem('session');
      const session = sessionStr ? JSON.parse(sessionStr) : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }

      const res = await fetch(`${API_BASE_URL}/tickets/openproject/${errItem.fingerprint}`, {
        method: 'POST',
        headers,
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = {};
      }

      if (!res.ok) {
        throw new Error(data?.detail || data?.error || data?.message || res.statusText || 'Failed to create ticket');
      }

      toast.success(
        <div>
          Ticket Created! <br /> ID: {data.id || data.ticket_id || 'N/A'}
        </div>
      );

      if (typeof refetchData === 'function') {
        refetchData();
      }
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      toast.error(err?.message || 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr
      id={`issue-row-${error.fingerprint}`}
      onClick={onClick}
      className="issue-row border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer transition-all duration-150 group"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Type */}
      <td className="px-6 py-4 ">
        <Badge variant={variant}>{label}</Badge>
      </td>

      {/* Message + file */}
      <td className="px-6 py-4">
        <div className="max-w-lg">
          <p className="text-white text-sm font-medium truncate group-hover:text-blue-300 transition-colors duration-150">
            {getErrorMessage(error)}
          </p>
          {file && (
            <p className="text-slate-500 text-xs font-mono mt-0.5 truncate">
              {file}{line !== null ? `:${line}` : ''}
            </p>
          )}
          <p className="text-slate-600 text-[10px] font-mono mt-0.5 truncate">{error.fingerprint}</p>
        </div>
      </td>

      {/* Occurrences */}
      <td className="px-6 py-4 text-center">
        <Badge
          variant={
            error.occurrences > 50 ? 'danger' :
              error.occurrences > 10 ? 'warning' :
                error.occurrences > 5 ? 'info' : 'default'
          }
        >
          {error.occurrences}×
        </Badge>
      </td>

      {/* Last seen */}
      <td className="px-6 py-4 text-right">
        <span className="text-slate-400 text-xs">{formatDate((error as any).last_seen || error.lastSeen)}</span>
      </td>

      {/* Ticket action */}
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end items-center">
          {isTicketGenerated && ticketUrl ? (
            <a
              className="group/link inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-lg border border-green-500/20 hover:border-green-500/40 transition-all duration-200"
              href={ticketUrl.startsWith('http') ? ticketUrl : `https://bugtrace.openproject.com${ticketUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              View
              <ExternalLink size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
            </a>
          ) : (
            <button
              disabled={loading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${loading
                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                : 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 hover:border-blue-500/40'
                }`}
              onClick={(e) => handleCreateTicket(error, e)}
            >
              {loading ? (
                <>
                  <Clock size={12} className="animate-spin text-slate-500" />
                  Generating...
                </>
              ) : (
                <>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ticket" viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v1a2 2 0 0 0 0 4v1a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-1a2 2 0 0 0 0-4V9Z" /><path d="M13 5v2" /><path d="M13 17v2" /></svg>
                  Generate
                </>
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};


// Existing ProjectPage export
export const ProjectPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [errors, setErrors] = useState<ErrorType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  useEffect(() => { loadProjectData(); }, [id]);

  const loadProjectData = async () => {
    setIsLoading(true);
    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;
      if (!token || !id) return;

      const { user } = JSON.parse(session || '{}');
      const projectsRes = await fetch(`${API_BASE_URL}/projects/${user.id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!projectsRes.ok) throw new Error('Failed to load projects');

      const allProjects = await projectsRes.json();
      const projectData = (Array.isArray(allProjects) ? allProjects : []).find((p: any) => p._id === id);
      if (!projectData) throw new Error('Project not found');

      const errorsRes = await fetch(`${API_BASE_URL}/projects/${id}/errors`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!errorsRes.ok) throw new Error('Failed to load errors');

      const errorsData = await errorsRes.json();
      // 💡 Handle paginated response { data: [...] } or direct array
      const projectErrors = errorsData.data || (Array.isArray(errorsData) ? errorsData : []);

      setProject({
        id: projectData._id,
        name: projectData.name,
        apiKey: projectData.api_key,
        createdAt: projectData.created_at,
        userId: projectData.user_id,
        errorCount: errorsData.total || projectErrors.length,
        lastSeen: projectErrors.length > 0
          ? (projectErrors[0].last_seen || projectErrors[0].lastSeen)
          : null,
      });
      setErrors(projectErrors);
    } catch (err) {
      console.error('Failed to load project data:', err);
      toast.error('Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  };

  const copyApiKey = () => {
    if (project) {
      navigator.clipboard.writeText(project.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  // Derived stats from errors
  const errorTypes = errors.reduce((acc: Record<string, number>, e: any) => {
    const t = e.event_type || e.errorType || 'unknown';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const filteredErrors = filterType === 'all'
    ? errors
    : errors.filter((e: any) => (e.event_type || e.errorType) === filterType);

  const uniqueTypes = ['all', ...Object.keys(errorTypes)];

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <Sidebar />
        <div className="flex-1 md:ml-64 p-4 pt-20 md:p-8 space-y-5">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <Sidebar />
        <div className="flex-1 md:ml-64 p-4 pt-20 md:p-8">
          <Card className="text-center py-16">
            <p className="text-slate-400 mb-6">Project not found</p>
            <Button onClick={() => navigate('/dashboard')}>← Back to Dashboard</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden">
      <Sidebar />

      {/* Ambient glow */}
      <div className="fixed top-20 right-10 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <main className="overflow-auto flex-1 md:ml-64">
        <div className="p-4 pt-20 md:p-8 space-y-7">

          {/* ── Header ── */}
          <div className="flex items-center gap-4 animate-fade-in-up">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600/70 transition-all duration-200 active:scale-95 flex-shrink-0"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-slate-500 font-medium">Projects /</span>
                <span className="text-xs text-slate-400 font-medium">{project.name}</span>
              </div>
              <h1 className="text-2xl font-bold gradient-text truncate">{project.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={errors.length === 0 ? 'success' : 'danger'} dot>
                {errors.length} {errors.length === 1 ? 'issue' : 'issues'}
              </Badge>
              <button
                onClick={() => navigate(`/project/${project.id}/performance`)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all duration-200"
              >
                <Activity size={14} />
                Web Vitals
              </button>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fade-in-up delay-75">
            {/* Total errors */}
            <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 hover:border-red-500/30 hover:shadow-glow-red transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total Issues</p>
                <div className="w-8 h-8 bg-red-500/15 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={14} className="text-red-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-red-400">{errors.length}</p>
            </div>

            {/* Last seen */}
            <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 hover:border-amber-500/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Last Seen</p>
                <div className="w-8 h-8 bg-amber-500/15 rounded-lg flex items-center justify-center">
                  <Clock size={14} className="text-amber-400" />
                </div>
              </div>
              <p className="text-sm font-semibold text-white">
                {project.lastSeen ? formatDate(project.lastSeen) : 'No activity'}
              </p>
            </div>

            {/* Error types */}
            <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Issue Types</p>
                <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                  <Hash size={14} className="text-blue-400" />
                </div>
              </div>
              <p className="text-3xl font-bold text-blue-400">{Object.keys(errorTypes).length}</p>
            </div>
          </div>

          {/* ── API Key ── */}
          <div className="animate-fade-in-up delay-150">
            <Card className="!p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                  <Key size={13} className="text-emerald-400" />
                </div>
                <h2 className="text-sm font-semibold text-white">API Key</h2>
                <Badge variant="success" className="ml-auto">Active</Badge>
              </div>
              <div className="px-5 py-4 flex items-center gap-3">
                <code className="flex-1 bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-2.5 text-emerald-400 font-mono text-xs break-all tracking-widest">
                  {revealedKey ? project.apiKey : '•'.repeat(36)}
                </code>
                <button
                  onClick={() => setRevealedKey((r) => !r)}
                  title={revealedKey ? 'Hide API key' : 'Reveal API key'}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-700/60 border border-slate-600/50 text-slate-400 hover:bg-slate-600/70 hover:text-white transition-all duration-150 active:scale-95"
                >
                  {revealedKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <Button
                  id="copy-api-key-btn"
                  variant="secondary"
                  size="sm"
                  onClick={copyApiKey}
                >
                  {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                  {copiedKey ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </Card>
          </div>

          {/* ── Issues table ── */}
          <div className="animate-fade-in-up delay-225">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Issues</h2>
                <span className="px-2.5 py-0.5 bg-slate-700/60 text-slate-300 text-xs rounded-full border border-slate-600/50 font-medium">
                  {filteredErrors.length}
                </span>
              </div>

              {/* Filter by type */}
              {uniqueTypes.length > 1 && (
                <div className="relative flex items-center gap-2">
                  <button
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all duration-150"
                    onClick={() => setFilterPopoverOpen((v) => !v)}
                  >
                    <Filter size={13} className="text-slate-500" />
                    {filterType === 'all' ? 'All Types' : getEventTypeMeta(filterType).label}
                  </button>
                  {filterPopoverOpen && (
                    <div className="absolute right-0 mt-2 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-2 min-w-[180px] max-h-72 overflow-y-auto animate-fade-in-up">
                      <div className="flex justify-between items-center px-4 pb-2 border-b border-slate-700">
                        <span className="text-xs text-slate-400 font-semibold">Filter by Type</span>
                        <button onClick={() => setFilterPopoverOpen(false)} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
                      </div>
                      {uniqueTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => { setFilterType(type); setFilterPopoverOpen(false); }}
                          className={[
                            'w-full text-left px-4 py-2 text-xs font-medium',
                            filterType === type
                              ? 'bg-blue-600/20 text-blue-300'
                              : 'text-slate-300 hover:bg-slate-800',
                          ].join(' ')}
                        >
                          {type === 'all' ? 'All' : getEventTypeMeta(type).label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {filteredErrors.length === 0 ? (
              <Card className="text-center py-16">
                <div className="w-12 h-12 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Check size={20} className="text-emerald-400" />
                </div>
                <p className="text-slate-300 font-semibold mb-1">No issues found</p>
                <p className="text-slate-500 text-sm">
                  {filterType !== 'all' ? 'Try removing the filter.' : 'Your project is error-free! 🎉'}
                </p>
              </Card>
            ) : (
              <Card noPadding className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50 bg-slate-900/40">
                        <th></th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest ">Type</th>
                        <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Issue</th>
                        <th className="px-6 py-3.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Count</th>
                        <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Last Seen</th>
                        <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Ticket</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredErrors.map((error, idx) => (
                        <IssueRow
                          key={error.fingerprint}
                          error={error}
                          index={idx}
                          onClick={() => navigate(`/error/${error.fingerprint}`)}
                          refetchData={loadProjectData}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};
