import React, { useEffect, useState } from 'react';
import { Shield, Users, Building2, Layout, Database, ArrowRight, Save, Plus, X, Lock, RefreshCw, ChevronLeft, FolderKey, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

interface Stats {
  orgs: number;
  users: number;
  projects: number;
  total_events: number;
}

interface RoleMapping {
  _id: string;
  name: string;
  permissions: string[];
  description: string;
}

interface OrgMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

interface Project {
  _id: string;
  name: string;
}

const PERMISSION_GUIDE = [
  { id: '*', label: 'Superpower', desc: 'Full system bypass. Access everything with no restrictions.' },
  { id: 'ORG_VIEW', label: 'Org Viewer', desc: 'Can see organization stats, history and the basic member list.' },
  { id: 'ORG_MANAGE', label: 'Org Manager', desc: 'Invite/Remove members and update organization-wide settings.' },
  { id: 'PROJECT_VIEW', label: 'Project Viewer', desc: 'Can see the list of projects and their basic metadata.' },
  { id: 'PROJECT_CREATE', label: 'Project Creator', desc: 'Authorize the spawning of new project containers.' },
  { id: 'PROJECT_EDIT', label: 'Project Editor', desc: 'Rename projects or update project-level settings.' },
  { id: 'PROJECT_DELETE', label: 'Project Deleter', desc: 'Permanently remove a project and all its data.' },
  { id: 'TEAM_MANAGE', label: 'Team Manager', desc: 'Add/Remove users from projects and change project-specific roles.' },
  { id: 'MEMBER_REMOVE', label: 'Member Remover', desc: 'Remove users from the organization and cleanup their access.' },
  { id: 'ROLE_CHANGE', label: 'Role Switcher', desc: 'Modify organization-wide roles and capabilities for any member.' },
  { id: 'ERROR_VIEW', label: 'Error Viewer', desc: 'Can see error groups, stack traces, and details (telemetry).' },
  { id: 'ERROR_RESOLVE', label: 'Error Resolver', desc: 'Authorize resolving, linking, or deleting error groupings.' },
  { id: 'PERFORMANCE_VIEW', label: 'Performance Viewer', desc: 'Can view performance metrics, vitals, and page load telemetry.' },
  { id: 'TICKET_CREATE', label: 'Ticket Creator', desc: 'Generate 3rd party tickets (like OpenProject) from errors.' },
  { id: 'TICKET_VIEW', label: 'Ticket Viewer', desc: 'View lists of external tickets associated with projects.' },
  { id: 'API_KEY_VIEW', label: 'Credential Viewer', desc: 'Can see the raw API keys. Highly sensitive permission.' },
  { id: 'INTEGRATIONS_MANAGE', label: 'Integration Manager', desc: 'Manage 3rd party links like GitHub, Linear, or OpenProject.' },
];


export const SuperAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'members' | 'projects'>('members');
  const [stats, setStats] = useState<Stats | null>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [roles, setRoles] = useState<RoleMapping[]>([]);
  const [editingRole, setEditingRole] = useState<RoleMapping | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [orgProjects, setOrgProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [aiUsage, setAiUsage] = useState<any[]>([]);
  const [usageFilters, setUsageFilters] = useState({ org: '', user_email: '', project: '' });
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [isEmailLogsLoading, setIsEmailLogsLoading] = useState(false);
  const [emailTotalLogs, setEmailTotalLogs] = useState(0);
  const [emailCurrentPage, setEmailCurrentPage] = useState(1);
  const [selectedEmailLog, setSelectedEmailLog] = useState<any>(null);
  const [emailFilters, setEmailFilters] = useState({ type: '', recipient: '' });
  const [showEmailFilters, setShowEmailFilters] = useState(false);

  const pageSize = 10;

  const [isLoading, setIsLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // const [isRefreshingMembers, setIsRefreshingMembers] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchData();
    fetchEmailLogs(1);
    fetchAIUsage(1);
  }, []);

  const fetchData = async () => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const headers = { 'Authorization': `Bearer ${session.token}` };

      const [statsRes, orgsRes, rolesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/stats`, { headers }),
        fetch(`${API_BASE_URL}/admin/orgs`, { headers }),
        fetch(`${API_BASE_URL}/admin/roles`, { headers })
      ]);

      if (!statsRes.ok || !orgsRes.ok || !rolesRes.ok) throw new Error('Failed to fetch admin data');

      setStats(await statsRes.json());
      setOrgs(await orgsRes.json());
      setRoles(await rolesRes.json());
    } catch (err) {
      toast.error('Failed to load superadmin dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrgData = async (orgId: string) => {
    // setIsRefreshingMembers(true);
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const headers = { 'Authorization': `Bearer ${session.token}` };

      const [membersRes, projectsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/org/${orgId}/members`, { headers }),
        fetch(`${API_BASE_URL}/admin/org/${orgId}/projects`, { headers })
      ]);

      if (!membersRes.ok || !projectsRes.ok) throw new Error('Failed to fetch org details');

      setOrgMembers(await membersRes.json());
      setOrgProjects(await projectsRes.json());
    } catch (err) {
      toast.error('Failed to load organization data');
    } finally {
      // setIsRefreshingMembers(false);
    }
  };

  const fetchAIUsage = async (page: number = 1) => {
    setIsAiLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const params = new URLSearchParams();
      if (usageFilters.org) params.append('org_id', usageFilters.org);
      if (usageFilters.user_email) params.append('user_id', usageFilters.user_email);
      if (usageFilters.project) params.append('project_id', usageFilters.project);
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());

      const res = await fetch(`${API_BASE_URL}/admin/ai-usage?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch AI usage');
      const data = await res.json();
      setAiUsage(data.logs);
      setTotalLogs(data.total);
      setCurrentPage(data.page);
      setShowFilters(false);
    } catch (err) {
      toast.error('Failed to load AI consumption data');
    } finally {
      setIsAiLoading(false);
    }
  };

  const fetchEmailLogs = async (page: number = 1) => {
    setIsEmailLogsLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const params = new URLSearchParams();
      if (emailFilters.type) params.append('type', emailFilters.type);
      if (emailFilters.recipient) params.append('recipient', emailFilters.recipient);
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());

      const res = await fetch(`${API_BASE_URL}/admin/email-logs?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch email logs');
      const data = await res.json();
      setEmailLogs(data.logs);
      setEmailTotalLogs(data.total);
      setEmailCurrentPage(data.page);
      setShowEmailFilters(false);
    } catch (err) {
      toast.error('Failed to load email logs');
    } finally {
      setIsEmailLogsLoading(false);
    }
  };

  const fetchGlobalProjects = async () => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/admin/projects`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      if (res.ok) setAllProjects(await res.json());
    } catch (err) {
      console.error('Failed to fetch global projects');
    }
  };

  const fetchGlobalUsers = async () => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      if (res.ok) setAllUsers(await res.json());
    } catch (err) {
      console.error('Failed to fetch global users');
    }
  };

  const fetchProjectMembers = async (projectId: string) => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/admin/project/${projectId}/members`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch project members');
      setProjectMembers(await res.json());
    } catch (err) {
      toast.error('Failed to load project members');
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;
    setIsSaving(true);
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/admin/roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingRole.name,
          permissions: editingRole.permissions,
          description: editingRole.description
        })
      });

      if (!res.ok) throw new Error('Update failed');

      toast.success(`Role ${editingRole.name} updated!`);
      setEditingRole(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to update role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUserOrgRole = async (userId: string, newRole: string) => {
    if (!selectedOrg) return;
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/admin/org/${selectedOrg._id}/member-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update member role');
      toast.success('Org role updated');
      fetchOrgData(selectedOrg._id);
    } catch (err) {
      toast.error('Failed to update member role');
    }
  };

  const handleUpdateProjectRole = async (userId: string, newRole: string) => {
    if (!selectedProject) return;
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/admin/project/${selectedProject._id}/member-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update project role');
      toast.success('Project role updated');
      fetchProjectMembers(selectedProject._id);
    } catch (err) {
      toast.error('Failed to update project role');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="text-indigo-400" size={32} />
            System Administration
          </h1>
          <p className="text-slate-400 mt-2">BugTrace global system overview and management</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${showGuide ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
          >
            <BookOpen size={16} />
            Permissions Guide
          </button>
          <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/10 animate-pulse">
            <Lock size={12} />
            SuperAdmin Mode
          </div>
        </div>
      </div>

      {/* ── Permissions Guide Overlay ── */}
      {showGuide && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in text-left">
          {PERMISSION_GUIDE.map(item => (
            <div key={item.id} className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-lg">{item.id}</span>
                <h4 className="text-xs font-bold text-white">{item.label}</h4>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── System Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
        {[
          { label: 'Organizations', value: stats?.orgs, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Platform Users', value: stats?.users, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total Projects', value: stats?.projects, icon: Layout, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Traffic (Events)', value: stats?.total_events, icon: Database, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl shadow-xl hover:border-slate-700 transition-all group">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
              <stat.icon size={24} />
            </div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-3xl font-bold text-white mt-1">{stat.value?.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* ── Communications Audit Log ── */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-xl text-left mt-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="text-blue-500">📧</span>
              Communications Audit Log
            </h2>
            <p className="text-xs text-slate-500 mt-1">Live monitoring of all Resend outbound email dispatches</p>
          </div>
          <div className="flex items-center gap-3 relative">
            <div className="relative">
              <button 
                onClick={() => setShowEmailFilters(!showEmailFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showEmailFilters ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500'}`}
              >
                <Layout size={14} />
                Filters
                {(emailFilters.type || emailFilters.recipient) && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ml-1" />
                )}
              </button>

              {showEmailFilters && (
                <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Email Type</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                        value={emailFilters.type}
                        onChange={e => setEmailFilters({...emailFilters, type: e.target.value})}
                      >
                        <option value="">All Types</option>
                        <option value="lifecycle">Lifecycle (Welcome)</option>
                        <option value="alert">System Alert</option>
                        <option value="digest">Weekly Digest</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Recipient Search</label>
                      <input 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-mono"
                        value={emailFilters.recipient}
                        onChange={e => setEmailFilters({...emailFilters, recipient: e.target.value})}
                        placeholder="john@example.com"
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                       <button 
                        onClick={() => setEmailFilters({ type: '', recipient: '' })}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5 transition-colors"
                      >
                        Reset
                      </button>
                      <button 
                        onClick={() => fetchEmailLogs(1)}
                        className="flex-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => fetchEmailLogs(1)}
              className="w-9 h-9 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-2">Timestamp</th>
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recipient</th>
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject Line</th>
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {isEmailLogsLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center animate-pulse">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Loading Dispatch Records...</p>
                    </div>
                  </td>
                </tr>
              ) : emailLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center opacity-20">
                    <Layout size={32} className="mx-auto mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No Outbound Emails Logged</p>
                  </td>
                </tr>
              ) : (
                emailLogs.map((log) => (
                  <tr 
                    key={log._id} 
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => setSelectedEmailLog(log)}
                  >
                    <td className="py-4 pl-2 text-[11px] text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-4">
                      <span className="text-[11px] font-medium text-slate-300">{log.recipient}</span>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter ${
                        log.type === 'digest' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : 
                        log.type === 'lifecycle' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                        log.type === 'alert' ? 'bg-red-500/10 text-red-500 border border-red-500/30' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="text-[11px] font-bold text-white max-w-xs block truncate">{log.subject}</span>
                    </td>
                    <td className="py-4">
                      {log.status === 'sent' ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Dispatch Success
                        </span>
                      ) : (
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Bounced / Failed
                          </span>
                          {log.error && <span className="text-[9px] text-slate-500 font-mono truncate max-w-[150px]">{log.error}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {emailTotalLogs > pageSize && (
          <div className="mt-8 flex items-center justify-between border-t border-slate-800/50 pt-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Showing {((emailCurrentPage - 1) * pageSize) + 1} - {Math.min(emailCurrentPage * pageSize, emailTotalLogs)} of {emailTotalLogs} Records
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => fetchEmailLogs(emailCurrentPage - 1)}
                disabled={emailCurrentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-20 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => fetchEmailLogs(emailCurrentPage + 1)}
                disabled={emailCurrentPage * pageSize >= emailTotalLogs}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-20 transition-all"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Gemini Consumption Intelligence ── */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-xl text-left">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Database size={20} className="text-amber-400" />
              Gemini Credit Consumption
            </h2>
            <p className="text-xs text-slate-500 mt-1">Real-time API hit monitoring (bypassing DB cache)</p>
          </div>
          <div className="flex items-center gap-3 relative">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowFilters(!showFilters);
                  if (!allProjects.length) fetchGlobalProjects();
                  if (!allUsers.length) fetchGlobalUsers();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showFilters ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500'}`}
              >
                <Database size={14} />
                Advanced Filters
                {(usageFilters.org || usageFilters.project || usageFilters.user_email) && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-1" />
                )}
              </button>

              {showFilters && (
                <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Organization</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                        value={usageFilters.org}
                        onChange={e => setUsageFilters({...usageFilters, org: e.target.value})}
                      >
                        <option value="">All Organizations</option>
                        {orgs.map(org => (
                          <option key={org._id} value={org._id}>{org.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Specific Project</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                        value={usageFilters.project}
                        onChange={e => setUsageFilters({...usageFilters, project: e.target.value})}
                      >
                        <option value="">All Projects</option>
                        <option value="global">Organization-Wide Only</option>
                        {allProjects.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">User Identity</label>
                      <select 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                        value={usageFilters.user_email}
                        onChange={e => setUsageFilters({...usageFilters, user_email: e.target.value})}
                      >
                        <option value="">All Users</option>
                        {allUsers.map(u => (
                          <option key={u._id} value={u._id}>{u.email}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2 flex gap-2">
                       <button 
                        onClick={() => setUsageFilters({ org: '', user_email: '', project: '' })}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/5 transition-colors"
                      >
                        Reset
                      </button>
                      <button 
                        onClick={() => fetchAIUsage(1)}
                        className="flex-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => fetchAIUsage(1)}
              className="w-9 h-9 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all border border-slate-700"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organization</th>
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User</th>
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Telemetry Target</th>
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Agent Type</th>
                <th className="pb-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {isAiLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center animate-pulse">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Scanning Machine Logs...</p>
                    </div>
                  </td>
                </tr>
              ) : aiUsage.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center opacity-20">
                    <Database size={32} className="mx-auto mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No Consumption Logs Found</p>
                  </td>
                </tr>
              ) : (
                aiUsage.map((log) => (
                  <tr 
                    key={log._id} 
                    className="group hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-4 text-[11px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white">{log.org_name || 'N/A'}</span>
                        <span className="text-[9px] text-slate-600 font-mono">{log.org_id}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-slate-300">{log.user_email || 'System'}</span>
                        <span className="text-[9px] text-slate-600 font-mono">{log.user_id}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-slate-300 capitalize">
                          {log.project_id === 'global' ? '🌍 Organizational' : (log.project_name || 'Project Specific')}
                        </span>
                        {log.project_id !== 'global' && (
                          <span className="text-[9px] text-slate-600 font-mono">{log.project_id}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">
                        {log.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="text-[10px] font-bold text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {log.model}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalLogs > pageSize && (
          <div className="mt-8 flex items-center justify-between border-t border-slate-800/50 pt-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalLogs)} of {totalLogs} Events
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => fetchAIUsage(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              {[...Array(Math.ceil(totalLogs / pageSize))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => fetchAIUsage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${currentPage === i+1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 border-indigo-500' : 'border border-slate-800 text-slate-500 hover:border-slate-600'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                onClick={() => fetchAIUsage(currentPage + 1)}
                disabled={currentPage * pageSize >= totalLogs}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        {/* ── Main Work Area ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Global Role Designer */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Shield size={20} className="text-indigo-400" />
                Global Role Designer
              </h2>
              <button
                onClick={() => setEditingRole({ _id: '', name: '', permissions: [], description: '' })}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
              >
                <Plus size={14} />
                New Role
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {roles.map(role => (
                <div
                  key={role.name}
                  onClick={() => setEditingRole(role)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group ${editingRole?.name === role.name
                    ? 'bg-indigo-500/10 border-indigo-500'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-600'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white uppercase text-[10px] tracking-widest">{role.name}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5 overflow-hidden h-10">
                    {role.permissions.slice(0, 3).map(p => (
                      <span key={p} className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase">{p}</span>
                    ))}
                    {role.permissions.length > 3 && <span className="text-[8px] text-slate-600">+{role.permissions.length - 3}</span>}
                  </div>
                </div>
              ))}
            </div>

            {editingRole && (
              <div className="mt-8 pt-8 border-t border-slate-800 space-y-6 animate-fade-in relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Lock size={18} className="text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-wider">{editingRole.name || 'Create New Role'}</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Role Configuration & Capability Blueprint</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingRole(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 bg-slate-950/40 p-6 rounded-2xl border border-slate-800/50">
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1.5 text-left">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Role Identifier</label>
                        <input
                          value={editingRole.name}
                          onChange={e => setEditingRole({ ...editingRole, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                          placeholder="e.g. system-integrator"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5 text-left">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Friendly Description</label>
                        <input
                          value={editingRole.description}
                          onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                          placeholder="Briefly describe what this role can do..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dual Column Permission Selector */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4 h-[400px]">
                    {/* Available List */}
                    <div className="flex flex-col h-full bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
                      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available</span>
                          <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full">
                            {PERMISSION_GUIDE.filter(g => !editingRole.permissions.includes(g.id)).length}
                          </span>
                        </div>
                        <input
                          placeholder="Filter..."
                          className="bg-slate-950/50 text-[10px] px-2 py-1 rounded-md text-white outline-none border border-slate-800 focus:border-indigo-500/50 w-24"
                          onChange={(e) => {
                            (window as any)._permFilter = e.target.value.toLowerCase();
                            setEditingRole({ ...editingRole }); // Force re-render
                          }}
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                        {PERMISSION_GUIDE
                          .filter(g => !editingRole.permissions.includes(g.id))
                          .filter(g => !((window as any)._permFilter) || g.id.toLowerCase().includes((window as any)._permFilter) || g.label.toLowerCase().includes((window as any)._permFilter))
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => setEditingRole({ ...editingRole, permissions: [...editingRole.permissions, p.id] })}
                              className="group p-2.5 bg-slate-950/40 hover:bg-indigo-500/10 border border-slate-800/50 hover:border-indigo-500/30 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">{p.id}</span>
                                  <span className="text-[11px] font-bold text-slate-300 group-hover:text-white">{p.label}</span>
                                </div>
                                <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{p.desc}</p>
                              </div>
                              <Plus size={14} className="text-slate-600 group-hover:text-indigo-400 transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Chosen List */}
                    <div className="flex flex-col h-full bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
                      <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chosen Capabilities</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                            {editingRole.permissions.length}
                          </span>
                        </div>
                        <button
                          onClick={() => setEditingRole({ ...editingRole, permissions: [] })}
                          className="text-[9px] text-slate-600 hover:text-red-400 uppercase tracking-tighter transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                        {editingRole.permissions.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center opacity-20 py-8">
                            <Shield size={32} className="mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">No Permissions Assigned</p>
                          </div>
                        ) : (
                          editingRole.permissions.map(permId => {
                            const p = PERMISSION_GUIDE.find(g => g.id === permId) || { id: permId, label: permId, desc: 'Unknown capability' };
                            return (
                              <div
                                key={permId}
                                onClick={() => setEditingRole({ ...editingRole, permissions: editingRole.permissions.filter(pid => pid !== permId) })}
                                className="group p-2.5 bg-emerald-500/5 hover:bg-red-500/10 border border-emerald-500/20 hover:border-red-500/30 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">{p.id}</span>
                                    <span className="text-[11px] font-bold text-slate-200 group-hover:text-white">{p.label}</span>
                                  </div>
                                  <p className="text-[9px] text-slate-500 mt-0.5 leading-tight">{p.desc}</p>
                                </div>
                                <X size={14} className="text-slate-600 group-hover:text-red-400 transition-all" />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={handleUpdateRole}
                      disabled={isSaving || !editingRole.name}
                      className="bg-indigo-600 px-8 py-3 rounded-xl text-sm font-bold text-white hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                      Finalize Role Blueprint
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Organization Deep-Dive */}
          {selectedOrg && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedOrg(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-xl font-bold text-white">Project & Team: {selectedOrg.name}</h2>
                </div>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button onClick={() => setActiveTab('members')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'members' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}>Members</button>
                  <button onClick={() => setActiveTab('projects')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}>Projects</button>
                </div>
              </div>

              {activeTab === 'members' ? (
                <div className="space-y-3">
                  {orgMembers.map(m => (
                    <div key={m.user_id} className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center font-bold">{m.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="text-sm font-bold text-white">{m.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{m.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {['admin', 'dev', 'viewer'].map(r => (
                          <button key={r} onClick={() => handleUpdateUserOrgRole(m.user_id, r)} className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase ${m.role === r ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{r}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Project List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orgProjects.map(p => (
                      <div
                        key={p._id}
                        onClick={() => {
                          setSelectedProject(p);
                          fetchProjectMembers(p._id);
                        }}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${selectedProject?._id === p._id ? 'bg-purple-500/10 border-purple-500' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}
                      >
                        <div className="flex items-center gap-3">
                          <FolderKey size={18} className="text-purple-400 group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-bold text-white">{p.name}</span>
                        </div>
                        <ArrowRight size={14} className={`text-purple-400 transition-all ${selectedProject?._id === p._id ? 'translate-x-0' : '-translate-x-2 opacity-0'}`} />
                      </div>
                    ))}
                  </div>

                  {/* Project Member Management */}
                  {selectedProject && (
                    <div className="mt-8 pt-8 border-t border-slate-800 animate-slide-up">
                      <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        Members in {selectedProject.name}
                      </h3>
                      <div className="space-y-3">
                        {projectMembers.map(pm => (
                          <div key={pm.user_id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-[10px] font-bold text-purple-400">{pm.name.charAt(0)}</div>
                              <p className="text-xs font-medium text-white">{pm.name}</p>
                            </div>
                            <div className="flex gap-2">
                              {['admin', 'dev', 'viewer'].map(r => (
                                <button key={r} onClick={() => handleUpdateProjectRole(pm.user_id, r)} className={`px-2.5 py-1 rounded-md text-[8px] font-bold uppercase ${pm.role === r ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{r}</button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl text-left">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
              <Building2 size={18} className="text-blue-400" />
              Select Organization
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {orgs.map((org: any) => (
                <div
                  key={org._id}
                  onClick={() => {
                    setSelectedOrg(org);
                    setSelectedProject(null);
                    fetchOrgData(org._id);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedOrg?._id === org._id ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                >
                  <p className="text-[11px] font-bold text-white truncate">{org.name}</p>
                  <p className="text-[9px] text-slate-500 truncate mt-0.5 uppercase tracking-tighter italic">{org.slug}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Log Detail Modal ── */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Database size={16} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Consumption Intelligence</h3>
                  <p className="text-[10px] text-slate-500 font-mono tracking-tighter">{selectedLog._id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-800/50">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Model</p>
                  <p className="text-xs font-bold text-amber-500">{selectedLog.model}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Agent Type</p>
                  <p className="text-xs font-bold text-slate-300 capitalize">{selectedLog.type.replace('_', ' ')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Executed By</p>
                  <p className="text-xs font-medium text-slate-400 truncate">{selectedLog.user_email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</p>
                  <p className="text-xs font-medium text-slate-400">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
              </div>

              {/* Data Blocks */}
              <div className="space-y-6">
                {/* Input Prompt */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">Input Telemetry (Prompt)</h4>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap max-h-64 overflow-auto">
                    {selectedLog.prompt || 'No prompt recorded for this legacy log.'}
                  </div>
                </div>

                {/* Output Response */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">Machine Response</h4>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-emerald-400/90 whitespace-pre-wrap max-h-64 overflow-auto">
                    {selectedLog.response || 'No response recorded for this legacy log.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close Insights
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Email Detail Modal ── */}
      {selectedEmailLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Layout size={16} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Outbound Email Detail</h3>
                  <p className="text-[10px] text-slate-500 font-mono tracking-tighter">{selectedEmailLog._id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEmailLog(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-800/50">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Recipient</p>
                  <p className="text-xs font-bold text-white">{selectedEmailLog.recipient}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Type</p>
                  <p className="text-xs font-bold text-slate-300 capitalize">{selectedEmailLog.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Subject Line</p>
                  <p className="text-xs font-medium text-slate-400 truncate w-full" title={selectedEmailLog.subject}>{selectedEmailLog.subject}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Status / Errors</p>
                  {selectedEmailLog.status === 'sent' ? (
                     <p className="text-xs font-bold text-emerald-400">Success</p>
                  ) : (
                     <p className="text-xs font-bold text-red-500">{selectedEmailLog.error || 'Failed'}</p>
                  )}
                </div>
              </div>

              {/* Render HTML content via iframe if exists */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">Email Body Render</h4>
                </div>
                {selectedEmailLog.content ? (
                  <div className="bg-white rounded-xl border border-slate-700 overflow-hidden" style={{ minHeight: '400px' }}>
                    <iframe 
                      srcDoc={selectedEmailLog.content} 
                      className="w-full h-full bg-white" 
                      style={{ minHeight: '400px', border: 'none' }}
                      sandbox="allow-same-origin"
                      title="Email Content Preview"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-12 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <p className="text-slate-500 text-xs font-mono">No HTML body tracked for this log entry.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button 
                onClick={() => setSelectedEmailLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
