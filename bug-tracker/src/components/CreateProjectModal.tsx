import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Card, Input } from './ui';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      const result = await onSubmit(projectName);
      if (result && result.apiKey) {
        setApiKey(result.apiKey);
        setProjectId(result.projectId);
      } else {
        setError('Failed to create project');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <Card className="rounded-2xl shadow-2xl shadow-blue-500/20">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-700/50">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Create New Project
              </h2>
              <p className="text-slate-400 text-sm mt-1">Set up a new project to start tracking errors</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800/50 rounded-lg text-slate-400 hover:text-white transition-all duration-200"
            >
              <X size={24} />
            </button>
          </div>

          {apiKey ? (
            // Success view with API key
            <div className="space-y-6">
              <div className="bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-4">
                <p className="text-emerald-400 font-medium flex items-center gap-2">
                  <span className="text-xl">✓</span> Project created successfully!
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3 text-lg">Your Project ID</h3>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between gap-4 group hover:bg-slate-800/60 transition-all">
                  <code className="text-blue-400 font-mono text-sm break-all flex-1">{projectId}</code>
                  <button
                    onClick={() => copyToClipboard(projectId || '')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-slate-400 text-sm mt-3">
                  Use this ID to link errors and fetch project data.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3 text-lg">Your API Key</h3>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between gap-4 group hover:bg-slate-800/60 transition-all">
                  <code className="text-emerald-400 font-mono text-sm break-all flex-1">{apiKey}</code>
                  <button
                    onClick={() => copyToClipboard(apiKey)}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-slate-400 text-sm mt-3">
                  Keep this API key safe. You'll need it to configure your SDK.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3 text-lg">SDK Integration</h3>
                <p className="text-slate-300 mb-3 text-sm">Install the SDK:</p>
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mb-4">
                  <code className="text-emerald-400 font-mono text-sm">npm install bug-tracker-sdk</code>
                </div>

                <p className="text-slate-300 mb-3 text-sm">Initialize in your app:</p>
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                  <pre className="text-slate-300 font-mono text-sm overflow-x-auto leading-relaxed">
{`import { initBugTracker } from 'bug-tracker-sdk';

initBugTracker({
  project: "${projectName}",
  collectorUrl: "https://bugtracker.jainprashuk.in",
  apiKey: "${apiKey}"
})`}
                  </pre>
                </div>
              </div>

              <Button variant="primary" onClick={onClose} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            // Form view
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-3">Project Name</label>
                <Input
                  type="text"
                  placeholder="e.g., My Web App"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={isLoading}
                  className="text-base"
                />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-6 border-t border-slate-700/50">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isLoading}
                >
                  Create Project
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
