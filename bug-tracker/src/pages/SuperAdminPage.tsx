import React, { useEffect, useState } from 'react';
import { Shield, Users, Building2, Layout, Database, TrendingUp, ArrowRight, Save, Plus, X, Lock, RefreshCw, ChevronLeft, FolderKey, Info, BookOpen } from 'lucide-react';
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
    { id: 'TEAM_MANAGE', label: 'Team Manager', desc: 'Add/Remove users from projects and change project-specific roles.' },
    { id: 'ERROR_VIEW', label: 'Error Viewer', desc: 'Can see error groups, stack traces, and details (telemetry).' },
    { id: 'ERROR_RESOLVE', label: 'Error Resolver', desc: 'Authorize resolving, linking, or deleting error groupings.' },
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
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingMembers, setIsRefreshingMembers] = useState(false);
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchData();
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
    setIsRefreshingMembers(true);
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
      setIsRefreshingMembers(false);
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
                className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${
                    showGuide ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
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
                   className={`p-5 rounded-2xl border transition-all cursor-pointer group ${
                     editingRole?.name === role.name 
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
               <div className="mt-8 pt-8 border-t border-slate-800 space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                     <h3 className="text-lg font-bold text-white uppercase tracking-wider">{editingRole.name || 'New Role'}</h3>
                     <button onClick={() => setEditingRole(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input value={editingRole.name} onChange={e => setEditingRole({...editingRole, name: e.target.value.toLowerCase()})} placeholder="name" className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white outline-none focus:border-indigo-500" />
                    <button onClick={handleUpdateRole} className="bg-indigo-600 py-2 rounded-xl text-xs font-bold text-white hover:bg-indigo-500 transition-all flex items-center justify-center gap-2">
                       {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />} 
                       Save Changes
                    </button>
                  </div>
                  <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl min-h-[100px] flex flex-wrap gap-2">
                    {editingRole.permissions.map((p, i) => (
                      <span key={i} className="px-2 py-1 bg-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded-lg flex items-center gap-1.5">
                        {p} <button onClick={() => setEditingRole({...editingRole, permissions: editingRole.permissions.filter((_, idx) => idx !== i)})}><X size={8} /></button>
                      </span>
                    ))}
                    <input 
                      onKeyDown={e => {
                          if(e.key === 'Enter') {
                              const v = e.currentTarget.value.trim().toUpperCase();
                              if(v && !editingRole.permissions.includes(v)) {
                                  setEditingRole({...editingRole, permissions: [...editingRole.permissions, v]});
                                  e.currentTarget.value = '';
                              }
                          }
                      }}
                      placeholder="Add permission..." 
                      className="bg-transparent text-xs text-white outline-none flex-1 min-w-[100px]" 
                    />
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
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedOrg?._id === org._id ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
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
    </div>
  );
};
