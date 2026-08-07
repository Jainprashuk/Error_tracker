import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Card, Badge, Skeleton } from '../components/ui';
import { InviteMemberModal, type InvitePayload, type ProjectOption } from '../components/InviteMemberModal';
import { UserPlus, Mail, Shield, Users, Clock, CheckCircle2, XCircle, X } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { formatRelativeDate } from '../utils/time';
import toast from 'react-hot-toast';

export const MembersPage: React.FC = () => {
  const { currentOrgId, user } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (currentOrgId) {
      fetchData();
    }
  }, [currentOrgId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const headers = {
        'Authorization': `Bearer ${session.token}`,
        'x-org-id': currentOrgId || ''
      };

      // Fetch active members
      const membersRes = await fetch(`${API_BASE_URL}/members/org`, { headers });
      const membersData = await membersRes.json();
      setMembers(Array.isArray(membersData) ? membersData : []);

      // Fetch sent invitations
      const invitesRes = await fetch(`${API_BASE_URL}/members/org/invitations`, { headers });
      const invitesData = await invitesRes.json();
      setInvitations(Array.isArray(invitesData) ? invitesData : []);

      // Fetch org projects (for scoping restricted invites)
      const projectsRes = await fetch(`${API_BASE_URL}/projects`, { headers });
      const projectsData = await projectsRes.json();
      setProjects(
        Array.isArray(projectsData)
          ? projectsData.map((p: any) => ({ id: p.id || p._id, name: p.name }))
          : []
      );

    } catch (err) {
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (payload: InvitePayload) => {
    setIsInviting(true);
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/members/org`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
          'x-org-id': currentOrgId || ''
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to invite user');
      }

      toast.success('Invitation sent successfully');
      setIsInviteModalOpen(false);
      fetchData(); // Refresh both lists
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsInviting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" className="gap-1 flex items-center"><Clock size={12} /> Pending</Badge>;
      case 'accepted':
        return <Badge variant="success" className="gap-1 flex items-center"><CheckCircle2 size={12} /> Accepted</Badge>;
      case 'declined':
        return <Badge variant="danger" className="gap-1 flex items-center"><XCircle size={12} /> Declined</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/members/org/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
          'x-org-id': currentOrgId || ''
        },
        body: JSON.stringify({ user_id: userId, role: newRole })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to update user role');
      }

      toast.success('Member role updated');
      fetchData(); // Refresh to show changes
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from this organization? This will also remove them from all assigned projects.`)) return;

    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/members/org/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'x-org-id': currentOrgId || ''
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to remove member');
      }

      toast.success('Member removed successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCancelInvite = async (invitationId: string, email: string) => {
    if (!window.confirm(`Cancel the pending invitation to ${email}?`)) return;

    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/members/org/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'x-org-id': currentOrgId || ''
        }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to cancel invitation');
      }

      toast.success('Invitation cancelled');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const myUserId = user?.id;
  const myRole = members.find(m => m.user_id === myUserId)?.role;
  const canManage = myRole === 'admin';
  const roleCounts = members.reduce((acc: Record<string, number>, m) => {
    acc[m.role] = (acc[m.role] || 0) + 1;
    return acc;
  }, {});
  const pendingCount = invitations.filter((i) => i.status === 'pending').length;

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto md:ml-64 bg-slate-950">
        <div className="p-4 pt-20 md:p-8 max-w-4xl mx-auto space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                <Users size={22} className="text-blue-500" /> Team Management
              </h1>
              <p className="text-slate-500 text-sm mt-1">Manage who has access to this organization.</p>
            </div>
            {canManage && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 shadow-lg shadow-blue-500/10 shrink-0"
              >
                <UserPlus size={16} />
                Invite Member
              </button>
            )}
          </div>

          {/* ── Stat strip ── */}
          {!isLoading && members.length > 0 && (
            <Card className="!p-0 overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-slate-700/40">
                <div className="px-5 py-3.5">
                  <p className="text-xl font-bold text-slate-100">{members.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">members</p>
                </div>
                <div className="px-5 py-3.5">
                  <p className="text-xl font-bold text-amber-400">{roleCounts.admin || 0}</p>
                  <p className="text-xs text-slate-500 mt-0.5">admin</p>
                </div>
                <div className="px-5 py-3.5">
                  <p className="text-xl font-bold text-blue-400">{roleCounts.dev || 0}</p>
                  <p className="text-xs text-slate-500 mt-0.5">developer</p>
                </div>
                <div className="px-5 py-3.5">
                  <p className="text-xl font-bold text-slate-300">{pendingCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">pending invites</p>
                </div>
              </div>
            </Card>
          )}

          {/* ── Active Members ── */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
              Active Members
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : members.length === 0 ? (
              <Card className="p-12 text-center text-slate-500">
                No active members found.
              </Card>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <Card key={member.user_id} className="group hover:border-slate-700 transition-all overflow-hidden" noPadding>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white flex items-center gap-2">
                            {member.name}
                            {member.role === 'admin' && <Shield size={12} className="text-amber-400" />}
                            {member.user_id === myUserId && <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">You</span>}
                          </div>
                          <div className="text-xs text-slate-500">{member.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {canManage && member.user_id !== myUserId ? (
                          <>
                            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                              {['admin', 'dev', 'viewer'].map(r => (
                                <button
                                  key={r}
                                  onClick={() => handleUpdateRole(member.user_id, r)}
                                  className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all ${
                                    member.role === r ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => handleRemoveMember(member.user_id, member.name)}
                              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Remove from organization"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        ) : (
                          <Badge variant={member.role === 'admin' ? 'info' : 'default'}>
                            {member.role.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* ── Sent Invitations ── */}
          {invitations.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                Sent Invitations
              </div>
              <div className="space-y-3">
                {invitations.map((invite) => (
                  <Card key={invite.invitation_id} className="border-slate-800/50 bg-slate-900/30 overflow-hidden" noPadding>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center">
                          <Mail size={18} className="text-slate-500" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-300">{invite.email}</div>
                          <div className="text-xs text-slate-500">
                            Invited as {invite.role}
                            {invite.created_at && ` · ${formatRelativeDate(invite.created_at).label}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(invite.status)}
                        {canManage && invite.status === 'pending' && (
                          <button
                            onClick={() => handleCancelInvite(invite.invitation_id, invite.email)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Cancel invitation"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={handleInvite}
        isLoading={isInviting}
        projects={projects}
      />
    </div>
  );
};
