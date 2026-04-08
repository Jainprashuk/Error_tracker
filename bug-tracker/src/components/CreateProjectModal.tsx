import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Button, Input } from './ui';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, configs?: {
    openProject?: { url: string; token: string; projectId: string };
    alerts?: { recipients: string[] };
  }) => Promise<{ apiKey: string; projectId: string } | void>;
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

  // Stepper State
  const [currentStep, setCurrentStep] = useState(0); // 0: Name, 1: Ticketing, 2: Alerts

  // Advanced Configs
  const [openProjectUrl, setOpenProjectUrl] = useState('');
  const [openProjectToken, setOpenProjectToken] = useState('');
  const [openProjectId, setOpenProjectId] = useState('');

  const [alertRecipients, setAlertRecipients] = useState('');
  const [alertCooldown, setAlertCooldown] = useState('60');
  const [spikeThreshold, setSpikeThreshold] = useState('10');
  const [newErrorTrigger, setNewErrorTrigger] = useState(true);
  const [spikeTrigger, setSpikeTrigger] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // If not on final step, we should NOT be here if type="button" is used.
    // However, for "Enter" key support, we handle it:
    if (currentStep < 2) {
      if (projectName.trim()) {
        setCurrentStep(s => s + 1);
      } else {
        setError('Project name is mandatory');
      }
      return;
    }

    if (!projectName.trim()) { setError('Project name is required'); return; }

    try {
      const configs: any = {};

      // Collect OpenProject if any field is filled
      if (openProjectUrl || openProjectToken || openProjectId) {
        configs.openProject = {
          url: openProjectUrl,
          token: openProjectToken,
          projectId: openProjectId
        };
      }

      // Collect Alerts if recipients provided
      if (alertRecipients) {
        configs.alerts = {
          recipients: alertRecipients.split(',').map(r => r.trim()).filter(r => r),
          cooldown: parseInt(alertCooldown) || 60,
          spikeThreshold: parseInt(spikeThreshold) || 10,
          triggers: {
            newError: newErrorTrigger,
            spike: spikeTrigger
          }
        };
      }

      const result = await onSubmit(projectName.trim(), configs);
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
    // Reset all states
    setProjectName('');
    setApiKey(null);
    setProjectId(null);
    setError('');
    setCurrentStep(0);
    setOpenProjectUrl('');
    setOpenProjectToken('');
    setOpenProjectId('');
    setAlertRecipients('');
    setAlertCooldown('60');
    setSpikeThreshold('10');
    setNewErrorTrigger(true);
    setSpikeTrigger(true);
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



                <Button id="modal-done-btn" variant="primary" onClick={handleClose} className="w-full">
                  Done — Go to Dashboard
                </Button>
              </div>
            ) : (
              /* Stepper Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Stepper Progress */}
                <div className="flex items-center justify-between mb-8 px-2">
                  {[0, 1, 2].map((step) => (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${currentStep === step ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110' :
                          currentStep > step ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}>
                          {currentStep > step ? <Check size={14} /> : step + 1}
                        </div>
                        <span className={`text-[10px] uppercase tracking-widest font-bold ${currentStep === step ? 'text-blue-400' : 'text-slate-500'}`}>
                          {step === 0 ? 'General' : step === 1 ? 'Ticketing' : 'Alerts'}
                        </span>
                      </div>
                      {step < 2 && <div className={`flex-1 h-0.5 mx-4 mb-6 transition-colors duration-300 ${currentStep > step ? 'bg-emerald-500' : 'bg-slate-800'}`} />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Step Content */}
                <div className="min-h-[220px] animate-fade-in-up">
                  {currentStep === 0 && (
                    <div className="space-y-4">
                      <h3 className="text-white font-bold text-sm">Basic Information</h3>
                      <div>
                        <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-2 text-start">Project Name <span className="text-red-500">*</span></label>
                        <Input
                          id="project-name-input"
                          type="text"
                          placeholder="e.g. My Web App, API Server…"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          disabled={isLoading}
                          autoFocus
                          className="bg-slate-800/40 border-slate-700/50 h-12"
                        />
                      </div>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold text-sm">OpenProject Integration</h3>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-bold tracking-tighter">Optional</span>
                      </div>
                      <div className="space-y-3">
                        <Input
                          placeholder="Host URL (e.g. https://community.openproject.org)"
                          value={openProjectUrl}
                          onChange={(e) => setOpenProjectUrl(e.target.value)}
                          className="bg-slate-800/40 border-slate-700/50"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            type="password"
                            placeholder="API Token"
                            value={openProjectToken}
                            onChange={(e) => setOpenProjectToken(e.target.value)}
                            className="bg-slate-800/40 border-slate-700/50"
                          />
                          <Input
                            placeholder="Project ID"
                            value={openProjectId}
                            onChange={(e) => setOpenProjectId(e.target.value)}
                            className="bg-slate-800/40 border-slate-700/50"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold text-sm">Alert Notifications</h3>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-bold tracking-tighter">Optional</span>
                      </div>
                      <div className="space-y-4">
                        <Input
                          placeholder="Recipient Emails (comma separated)"
                          value={alertRecipients}
                          onChange={(e) => setAlertRecipients(e.target.value)}
                          className="bg-slate-800/40 border-slate-700/50"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-tight ml-1">Cooldown (Min)</label>
                            <Input type="number" value={alertCooldown} onChange={(e) => setAlertCooldown(e.target.value)} className="bg-slate-800/40 border-slate-700/50" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-tight ml-1">Spike Threshold</label>
                            <Input type="number" value={spikeThreshold} onChange={(e) => setSpikeThreshold(e.target.value)} className="bg-slate-800/40 border-slate-700/50" />
                          </div>
                        </div>
                        <div className="flex gap-4 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={newErrorTrigger} onChange={(e) => setNewErrorTrigger(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500" />
                            <span className="text-xs text-slate-400 font-medium group-hover:text-slate-300">New Errors</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input type="checkbox" checked={spikeTrigger} onChange={(e) => setSpikeTrigger(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500" />
                            <span className="text-xs text-slate-400 font-medium group-hover:text-slate-300">Spikes</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex gap-3 pt-2">
                  {currentStep > 0 && (
                    <Button type="button" variant="secondary" onClick={() => setCurrentStep(s => s - 1)} disabled={isLoading} className="flex-1">
                      Previous
                    </Button>
                  )}
                  {currentStep < 2 ? (
                    <div className="flex gap-3 flex-1">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          if (currentStep === 0) {
                            if (projectName.trim()) {
                              setError('');
                              setCurrentStep(s => s + 1);
                            } else {
                              setError('Project name is mandatory');
                            }
                          } else {
                            // On Step 1 (Ticketing), we just go to Step 2
                            setError('');
                            setCurrentStep(s => s + 1);
                          }
                        }}
                        className="flex-1"
                      >
                        {currentStep === 0 ? 'Next Step' : 'Next Step'}
                      </Button>
                    </div>
                  ) : (
                    <Button id="create-project-submit-btn" type="submit" variant="primary" isLoading={isLoading} className="flex-1 shadow-lg shadow-blue-500/20">
                      Complete Setup & Create Project
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
