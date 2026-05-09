import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Card, Button, Input, Badge, Skeleton } from '../components/ui';
import { UserPlus, Mail, Shield, Plus, Users, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';

export const MembersPage: React.FC = () => {
  const { currentOrgId } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
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

    } catch (err) {
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

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
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to invite user');
      }

      toast.success('Invitation sent successfully');
      setInviteEmail('');
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

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto md:ml-64 bg-slate-950">
        <div className="p-4 pt-20 md:p-8 max-w-5xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Users className="text-indigo-500" /> Team Management
              </h1>
              <p className="text-slate-500 text-sm">Manage who has access to this organization and monitor invitation statuses.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Invite Form */}
            <Card className="lg:col-span-1 h-fit">
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-2">
                  <UserPlus size={14} /> Invite New Member
                </div>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <Input
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Role</label>
                    <select 
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                    >
                      <option value="viewer">Viewer (Read-only)</option>
                      <option value="dev">Developer (Manage Projects)</option>
                      <option value="admin">Admin (Full Access)</option>
                    </select>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-500"
                    disabled={isInviting || !inviteEmail.trim()}
                  >
                    {isInviting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Plus size={16} className="mr-2" />}
                    Send Invitation
                  </Button>
                </form>
              </div>
            </Card>

            <div className="lg:col-span-2 space-y-8">
              {/* Active Members */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Active Members ({members.length})
                  </div>
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
                              </div>
                              <div className="text-xs text-slate-500">{member.email}</div>
                            </div>
                          </div>
                          <Badge variant={member.role === 'admin' ? 'info' : 'default'}>
                            {member.role.toUpperCase()}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Sent Invitations */}
              {invitations.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                      Sent Invitations ({invitations.length})
                    </div>
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
                              <div className="text-[10px] text-slate-600 uppercase tracking-tighter">
                                Invited as <span className="text-slate-500">{invite.role}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            {getStatusBadge(invite.status)}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
