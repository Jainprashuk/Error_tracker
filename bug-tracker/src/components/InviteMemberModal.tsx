import React, { useState } from 'react';
import { X, Mail, Loader2, UserPlus } from 'lucide-react';
import { Button, Input } from './ui';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, role: string) => Promise<void>;
  isLoading?: boolean;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await onSubmit(email, role);
    setEmail('');
    setRole('viewer');
  };

  const handleClose = () => {
    setEmail('');
    setRole('viewer');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

          <div className="px-6 py-5 border-b border-slate-700/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                <UserPlus size={16} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Invite Member</h2>
                <p className="text-slate-400 text-xs mt-0.5">Send an invitation to join this organization</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-200 active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <Input
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 ml-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
              >
                <option value="viewer">Viewer (Read-only)</option>
                <option value="dev">Developer (Manage Projects)</option>
                <option value="admin">Admin (Full Access)</option>
              </select>
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <UserPlus size={16} className="mr-2" />}
              Send Invitation
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
