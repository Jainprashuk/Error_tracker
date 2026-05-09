import React, { useEffect, useState } from 'react';
import { Mail, Check, X, Bell, Loader2 } from 'lucide-react';
import { Card } from './ui';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';

export const PendingInvites: React.FC = () => {
  const [invites, setInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { setOrganizations } = useAuthStore();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchInvites = async () => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      if (!session.token) return;

      const res = await fetch(`${API_BASE_URL}/members/invitations`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      const data = await res.json();
      setInvites(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch invites');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
    // Poll every 30 seconds for new invites
    const interval = setInterval(fetchInvites, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRespond = async (invitationId: string, accept: boolean) => {
    setProcessingId(invitationId);
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}');
      const res = await fetch(`${API_BASE_URL}/members/invitations/${invitationId}/respond?accept=${accept}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.token}` }
      });

      if (!res.ok) throw new Error('Failed to respond');

      toast.success(accept ? 'Invitation accepted!' : 'Invitation declined');
      
      // If accepted, we might need to refresh organizations list
      if (accept) {
        const orgsRes = await fetch(`${API_BASE_URL}/orgs/`, {
            headers: { 'Authorization': `Bearer ${session.token}` }
        });
        const orgsData = await orgsRes.json();
        setOrganizations(orgsData);
      }

      setInvites(invites.filter(i => i.invitation_id !== invitationId));
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading || invites.length === 0) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 text-amber-500 font-bold text-[10px] uppercase tracking-widest px-1">
        <Bell size={12} className="animate-pulse" /> Pending Invitations ({invites.length})
      </div>
      <div className="space-y-3">
        {invites.map((invite) => (
          <Card key={invite.invitation_id} className="border-amber-500/30 bg-amber-500/5 overflow-hidden ring-1 ring-amber-500/10" noPadding>
            <div className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Mail className="text-amber-500" size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    Join <span className="text-amber-400">{invite.org_name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                     as <span className="uppercase font-bold text-slate-400">{invite.role}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRespond(invite.invitation_id, false)}
                  disabled={!!processingId}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <X size={18} />
                </button>
                <button
                  onClick={() => handleRespond(invite.invitation_id, true)}
                  disabled={!!processingId}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
                >
                  {processingId === invite.invitation_id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Accept
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
