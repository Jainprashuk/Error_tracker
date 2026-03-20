import React, { useState } from 'react';
import { X, Copy, Check, Terminal } from 'lucide-react';
import { Button, Input } from './ui';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<{ apiKey: string; projectId: string } | void>;
  isLoading?: boolean;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [projectName, setProjectName] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!projectName.trim()) { setError('Project name is required'); return; }
    try {
      const result = await onSubmit(projectName.trim());
      if (result && result.apiKey) {
        setApiKey(result.apiKey);
        setProjectId(result.projectId);
      } else {
        setError('Failed to create project. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const copyText = (text: string, which: 'key' | 'id') => {
    navigator.clipboard.writeText(text);
    if (which === 'key') { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }
    else { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }
  };

  const handleClose = () => {
    setProjectName('');
    setApiKey(null);
    setProjectId(null);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">

          {/* Top accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-700/40 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Create New Project</h2>
              <p className="text-slate-400 text-xs mt-0.5">Set up error monitoring in seconds</p>
            </div>
            <button
              id="modal-close-btn"
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all duration-200 active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            {apiKey ? (
              /* ── Success State ── */
              <div className="space-y-5 animate-fade-in-up">
                {/* Success banner */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-300 font-semibold text-sm">Project created!</p>
                    <p className="text-emerald-400/60 text-xs mt-0.5">Save your credentials below.</p>
                  </div>
                </div>

                {/* Project ID */}
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-2">Project ID</p>
                  <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3">
                    <code className="text-blue-400 font-mono text-xs flex-1 break-all">{projectId}</code>
                    <button
                      onClick={() => copyText(projectId || '', 'id')}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700/60 hover:bg-slate-600/70 text-slate-400 hover:text-white transition-all duration-150"
                    >
                      {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-2">API Key</p>
                  <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3">
                    <code className="text-emerald-400 font-mono text-xs flex-1 break-all">{apiKey}</code>
                    <button
                      onClick={() => copyText(apiKey, 'key')}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700/60 hover:bg-slate-600/70 text-slate-400 hover:text-white transition-all duration-150"
                    >
                      {copiedKey ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">⚠ Store this key securely — it won't be shown again.</p>
                </div>

                {/* Code snippet */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal size={12} className="text-slate-500" />
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">SDK Setup</p>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-700/40 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-700/40 flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                      <span className="text-slate-600 text-[10px] font-mono ml-2">index.ts</span>
                    </div>
                    <pre className="p-4 text-slate-300 font-mono text-xs overflow-x-auto leading-relaxed">
                      {`import { initBugTracker } from 'bug-tracker-sdk';

initBugTracker({
  project: "${projectName}",
  collectorUrl: "https://bugtracker.jainprashuk.in",
  apiKey: "${apiKey}"
});`}
                    </pre>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2 font-mono">npm install bug-tracker-sdk</p>
                </div>

                <Button id="modal-done-btn" variant="primary" onClick={handleClose} className="w-full">
                  Done — Go to Dashboard
                </Button>
              </div>
            ) : (
              /* ── Form ── */
              <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in-up">
                <div>
                  <label className="block text-sm text-slate-300 font-medium mb-2">
                    Project Name
                  </label>
                  <Input
                    id="project-name-input"
                    type="text"
                    placeholder="e.g. My Web App, API Server…"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                  <p className="text-xs text-slate-600 mt-1.5">
                    Choose a name that identifies this application.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    id="create-project-submit-btn"
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    disabled={!projectName.trim()}
                    className="flex-1"
                  >
                    Create Project
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
