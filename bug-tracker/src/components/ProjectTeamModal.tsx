import React, { useEffect, useState } from 'react';
import { X, Users, Loader2, ShieldCheck } from 'lucide-react';
import { Button, Badge } from './ui';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';

interface ProjectTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onUpdate?: () => void;
}

export const ProjectTeamModal: React.FC<ProjectTeamModalProps> = ({ isOpen, onClose, projectId, onUpdate }) => {
  const { organizations, currentOrgId } = useAuthStore();
  const currentOrg = organizations.find(o => o._id === currentOrgId);
  const currentUserOrgRole = currentOrg?.my_role || 'viewer';
  const isCurrentUserAdmin = currentUserOrgRole === 'admin';

  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (isOpen && projectId && currentOrgId) {
      fetchData();
    }
  }, [isOpen, projectId, currentOrgId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const headers = {
        'Authorization': `Bearer ${session.token}`,
        'x-org-id': currentOrgId || ''
      };

      // 1. Fetch Org Members
      const orgRes = await fetch(`${API_BASE_URL}/members/org`, { headers });
      const orgData = await orgRes.json();
      
      // 2. Fetch Project Members
      const projRes = await fetch(`${API_BASE_URL}/members/project/${projectId}`, { headers });
      const projData = await projRes.json();

      setOrgMembers(Array.isArray(orgData) ? orgData : []);
      setProjectMembers(Array.isArray(projData) ? projData : []);
      
      // Initialize roles from current project members
      const rolesMap: Record<string, string> = {};
      if (Array.isArray(projData)) {
          projData.forEach(m => {
              rolesMap[m.user_id] = m.role || 'viewer';
          });
      }
      setRoles(rolesMap);
    } catch (err) {
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    setIsAdding(userId);
    const role = roles[userId] || 'viewer';
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/members/project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
          'x-org-id': currentOrgId || ''
        },
        body: JSON.stringify({ user_id: userId, project_id: projectId, role })
      });

      if (!res.ok) throw new Error('Failed to add member');
      
      toast.success('Member updated in project');
      fetchData();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to update member');
    } finally {
      setIsAdding(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/members/project/${projectId}/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'x-org-id': currentOrgId || ''
        }
      });

      if (!res.ok) throw new Error('Failed to remove member');
      
      toast.success('Member removed from project');
      fetchData();
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to remove member');
    }
  };

  if (!isOpen) return null;

  const isUserInProject = (userId: string) => projectMembers.some(m => m.user_id === userId);
  const getProjectRole = (userId: string) => projectMembers.find(m => m.user_id === userId)?.role;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-indigo-400" />
            <h2 className="text-lg font-bold text-white leading-none">Project Team & Roles</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Team Assignment</div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="animate-spin text-slate-500" />
                </div>
              ) : orgMembers.map(member => (
                <div key={member.user_id} className="flex flex-col gap-3 p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                        {member.name.charAt(0)}
                        </div>
                        <div>
                        <div className="text-sm font-medium text-white">{member.name}</div>
                        <div className="text-[10px] text-slate-500">{member.email}</div>
                        </div>
                    </div>
                    
                    {member.role === 'admin' ? (
                        <Badge variant="info" className="gap-1">
                        <ShieldCheck size={10} /> ORG ADMIN
                        </Badge>
                    ) : (
                        <div className="flex items-center gap-2">
                            {isCurrentUserAdmin && (
                                <>
                                    {isUserInProject(member.user_id) && (
                                        <button 
                                        onClick={() => handleRemoveMember(member.user_id)}
                                        className="text-[10px] text-red-500 hover:text-red-400 transition-colors uppercase font-bold tracking-widest"
                                        >
                                        Remove Access
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleAddMember(member.user_id)}
                                        disabled={isAdding === member.user_id}
                                        className="text-xs bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-all font-semibold flex items-center gap-1"
                                    >
                                        {isAdding === member.user_id ? <Loader2 size={12} className="animate-spin" /> : (isUserInProject(member.user_id) ? 'Update' : 'Assign')}
                                    </button>
                                </>
                            )}
                            {!isCurrentUserAdmin && isUserInProject(member.user_id) && (
                                <Badge variant="default">Assigned</Badge>
                            )}
                        </div>
                    )}
                  </div>

                  {member.role !== 'admin' && (
                    <div className="flex items-center gap-4 pt-1">
                        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Project Role:</div>
                        <div className="flex gap-2">
                            {['viewer', 'dev'].map(r => (
                                <button
                                    key={r}
                                    disabled={!isCurrentUserAdmin}
                                    onClick={() => setRoles({ ...roles, [member.user_id]: r })}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                                        (roles[member.user_id] || getProjectRole(member.user_id) || 'viewer') === r
                                        ? 'bg-indigo-500 text-white border-indigo-500'
                                        : 'bg-slate-900 text-slate-500 border-slate-800 border'
                                    } ${!isCurrentUserAdmin ? 'cursor-not-allowed opacity-80' : ''}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {!isCurrentUserAdmin ? (
            <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                <p className="text-[11px] text-amber-500/80 italic">
                  * You are viewing the project team in read-only mode. Only Organization Admins can modify project access or roles.
                </p>
            </div>
          ) : (
            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                <p className="text-[11px] text-slate-400 italic">
                * Per-project roles allow you to give a user more (or less) permission for a specific project than they have globally in the organization.
                </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 flex justify-end">
          <Button onClick={onClose} variant="secondary">Done</Button>
        </div>
      </div>
    </div>
  );
};
