import React, { useState } from 'react';
import { X, Mail, Loader2, UserPlus, Building2, FolderLock } from 'lucide-react';
import { Button, Input } from './ui';

export interface ProjectOption {
  id: string;
  name: string;
}

export interface InvitePayload {
  email: string;
  role: string;
  restricted: boolean;
  projects: { project_id: string; role: string }[];
}

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: InvitePayload) => Promise<void>;
  isLoading?: boolean;
  projects?: ProjectOption[];
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  projects = [],
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [restricted, setRestricted] = useState(false);
  // Map of project_id -> per-project role for the granted projects
  const [grants, setGrants] = useState<Record<string, string>>({});

  const reset = () => {
    setEmail('');
    setRole('viewer');
    setRestricted(false);
    setGrants({});
  };

  const toggleProject = (projectId: string) => {
    setGrants((prev) => {
      const next = { ...prev };
      if (next[projectId]) delete next[projectId];
      else next[projectId] = 'viewer';
      return next;
    });
  };

  const setGrantRole = (projectId: string, r: string) => {
    setGrants((prev) => ({ ...prev, [projectId]: r }));
  };

  const grantedIds = Object.keys(grants);
  const canSubmit =
    !!email.trim() && (!restricted || grantedIds.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit({
      email: email.trim(),
      role: restricted ? 'viewer' : role,
      restricted,
      projects: restricted
        ? grantedIds.map((pid) => ({ project_id: pid, role: grants[pid] }))
        : [],
    });
    reset();
  };

  const handleClose = () => {
    reset();
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

            {/* Access scope toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 ml-1">Access Scope</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRestricted(false)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    !restricted
                      ? 'border-blue-500/60 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Building2 size={16} className={!restricted ? 'text-blue-400' : 'text-slate-500'} />
                  <div>
                    <div className="text-xs font-semibold">Whole org</div>
                    <div className="text-[10px] opacity-70">All projects</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRestricted(true)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    restricted
                      ? 'border-blue-500/60 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <FolderLock size={16} className={restricted ? 'text-blue-400' : 'text-slate-500'} />
                  <div>
                    <div className="text-xs font-semibold">Specific projects</div>
                    <div className="text-[10px] opacity-70">Restricted</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Org-wide role (only when not restricted) */}
            {!restricted && (
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
            )}

            {/* Per-project grants (only when restricted) */}
            {restricted && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 ml-1">
                  Projects &amp; Roles
                </label>
                {projects.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-xl px-3 py-3">
                    No projects available in this organization yet.
                  </p>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {projects.map((p) => {
                      const checked = !!grants[p.id];
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                            checked ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-800 bg-slate-900'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProject(p.id)}
                            className="h-4 w-4 accent-blue-500 shrink-0"
                          />
                          <span className="text-sm text-slate-200 truncate flex-1">{p.name}</span>
                          <select
                            value={grants[p.id] || 'viewer'}
                            onChange={(e) => setGrantRole(p.id, e.target.value)}
                            disabled={!checked}
                            className="bg-slate-800 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white disabled:opacity-40 outline-none focus:ring-1 focus:ring-blue-500/50"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="dev">Developer</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 ml-1">
                  This member will only see and access the projects you select above.
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500"
              disabled={isLoading || !canSubmit}
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
