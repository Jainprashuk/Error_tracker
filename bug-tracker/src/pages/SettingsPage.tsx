import React, { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Eye, EyeOff, Settings, Link as LinkIcon, Save, RefreshCw, Layers, Bell, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Card, Button, Input, Badge } from "../components/ui";
import { encrypt, decrypt } from "../utils/crypto";

export const SettingsPage: React.FC = () => {
  const API = import.meta.env.VITE_API_BASE_URL;

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");

  const [showApiKey, setShowApiKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState<any>(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  // 🔥 Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      const session = JSON.parse(localStorage.getItem("session") || "{}");

      const res = await fetch(`${API}/projects/${session.user.id}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      const data = await res.json();
      setProjects(data);

      if (data.length) setSelectedProjectId(data[0]._id);
    };

    fetchProjects();
  }, []);

  // 🔥 Load integration config when project changes
  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchConfig = async () => {
      const session = JSON.parse(localStorage.getItem("session") || "{}");

      const res = await fetch(`${API}/projects/${session.user.id}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      const data = await res.json();

      const project = data.find((p: any) => p._id === selectedProjectId);
      const op = project?.integrations?.openproject;

      if (op) {
        setBaseUrl(op.base_url || "");
        // Decrypt the API key from the backend response
        setApiKey(decrypt(op.api_key || ""));
        setProjectId(op.op_project_id || "");
      } else {
        setBaseUrl("");
        setApiKey("");
        setProjectId("");
      }
    };

    fetchConfig();

    const fetchAlertConfig = async () => {
      const session = JSON.parse(localStorage.getItem("session") || "{}");
      try {
        const res = await fetch(`${API}/projects/${selectedProjectId}/alert-config`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });

        if (!res.ok) {
          // 💡 Initialize default config for new projects so user can actually save!
          setAlertConfig({
            channels: { email: { enabled: false, recipients: [] } },
            triggers: { newError: true, spike: { enabled: false, threshold: 10 } },
            cooldown: 60
          });
          return;
        }

        const data = await res.json();
        setAlertConfig(data);
      } catch (err) {
        console.error("❌ Failed to fetch alert config", err);
      }
    };

    fetchAlertConfig();
  }, [selectedProjectId]);

  // 🔥 Test connection
  const handleTest = async () => {
    setLoading(true);
    setStatus("idle");

    try {
      const res = await fetch(`${API}/integrations/openproject/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base_url: baseUrl,
          // Encrypt before sending to the backend
          api_key: encrypt(apiKey),
          project_id: Number(projectId),
        }),
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        setStatus("success");
        toast.success("Connection test successful");
      } else {
        setStatus("error");
        toast.error(data.detail || "Connection test failed");
      }
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Failed to test connection");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Save integration
  const handleSave = async () => {
    if (!selectedProjectId) {
      toast.error("Select project first");
      return;
    }

    const session = JSON.parse(localStorage.getItem("session") || "{}");

    try {
      const res = await fetch(
        `${API}/projects/${selectedProjectId}/integrations/openproject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            base_url: baseUrl,
            // Encrypt before sending to the backend
            api_key: encrypt(apiKey),
            project_id: Number(projectId),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Failed");

      toast.success("Integration saved successfully");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveAlerts = async () => {
    if (!selectedProjectId || !alertConfig) return;
    setAlertLoading(true);
    const session = JSON.parse(localStorage.getItem("session") || "{}");

    try {
      // 💡 P0 FIX: Backend requires projectId in the body even if it is in the URL
      const payload = {
        ...alertConfig,
        projectId: selectedProjectId
      };

      const res = await fetch(`${API}/projects/${selectedProjectId}/alert-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to save alert config");
      toast.success("Alert settings updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAlertLoading(false);
    }
  };

  const addEmail = () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Valid email required");
      return;
    }
    const recipients = alertConfig.channels.email.recipients;
    if (recipients.includes(newEmail)) {
      toast.error("Email already added");
      return;
    }

    setAlertConfig({
      ...alertConfig,
      channels: {
        ...alertConfig.channels,
        email: {
          ...alertConfig.channels.email,
          recipients: [...recipients, newEmail]
        }
      }
    });
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    setAlertConfig({
      ...alertConfig,
      channels: {
        ...alertConfig.channels,
        email: {
          ...alertConfig.channels.email,
          recipients: alertConfig.channels.email.recipients.filter((re: string) => re !== email)
        }
      }
    });
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden">
      <Sidebar />

      {/* Ambient glow blobs */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 md:left-64 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      <main className="flex-1 overflow-y-auto md:ml-64 w-full">
        <div className="p-4 pt-20 md:p-8 space-y-8 animate-fade-in-up max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-800/60 border border-slate-700/50 rounded-xl flex items-center justify-center">
              <Settings size={20} className="text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text leading-none mb-1.5">Settings</h1>
              <p className="text-slate-400 text-sm">Configure integrations and sync rules for your projects</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Card>
                <div className="flex items-center gap-2 mb-6 border-b border-slate-700/40 pb-4">
                  <Layers size={18} className="text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">Project Scope</h2>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Select Project context</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-slate-900/40 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                  >
                    {projects.map((p) => (
                      <option key={p._id} value={p._id} className="bg-slate-800 text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>

              <Card glow="blue">
                <div className="flex items-center justify-between border-b border-slate-700/40 pb-4 mb-6">
                  <div className="flex items-center gap-2">
                    <LinkIcon size={18} className="text-blue-400" />
                    <h2 className="text-lg font-semibold text-white">OpenProject Integration</h2>
                  </div>
                  {status === "success" && <Badge variant="success" dot>Connected</Badge>}
                  {status === "error" && <Badge variant="danger" dot>Failed</Badge>}
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-slate-400 mb-1.5 block">Base URL</label>
                    <Input
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://company.openproject.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-400 mb-1.5 block">API Key</label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="••••••••••••••"
                        className="pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors"
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-400 mb-1.5 block">OpenProject Project ID</label>
                    <Input
                      type="number"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="e.g. 1"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-slate-700/40">
                    <Button
                      variant="secondary"
                      onClick={handleTest}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? (
                        <RefreshCw className="animate-spin text-slate-400" size={16} />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      {loading ? "Testing..." : "Test Connection"}
                    </Button>

                    <Button
                      variant="primary"
                      onClick={handleSave}
                      className="flex-1"
                    >
                      <Save size={16} />
                      Save Integration
                    </Button>
                  </div>
                </div>
              </Card>

              {alertConfig && (
                <Card glow="amber">
                  <div className="flex items-center justify-between border-b border-slate-700/40 pb-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Bell size={18} className="text-amber-400" />
                      <h2 className="text-lg font-semibold text-white">Alert Notifications</h2>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                      <Badge variant={alertConfig?.channels?.email?.enabled ? "warning" : "default"} dot>
                        {alertConfig?.channels?.email?.enabled ? "Active" : "Disabled"}
                      </Badge>
                      <button
                        onClick={() => setAlertConfig({
                          ...alertConfig,
                          channels: {
                            ...alertConfig.channels,
                            email: { ...alertConfig.channels.email, enabled: !alertConfig.channels.email.enabled }
                          }
                        })}
                        className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${alertConfig?.channels?.email?.enabled
                          ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                          }`}
                      >
                        {alertConfig?.channels?.email?.enabled ? "DISABLE" : "ENABLE"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Triggers Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        onClick={() => alertConfig && setAlertConfig({
                          ...alertConfig,
                          triggers: { ...alertConfig?.triggers, newError: !alertConfig?.triggers?.newError }
                        })}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${alertConfig?.triggers?.newError
                          ? "bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10"
                          : "bg-slate-900/40 border-slate-700/50 hover:border-slate-600"
                          }`}
                      >
                        <h4 className="text-sm font-semibold text-white mb-1">New Errors</h4>
                        <p className="text-xs text-slate-400">Notify instantly when a new unique error occurs.</p>
                      </div>

                      <div
                        onClick={() => alertConfig && setAlertConfig({
                          ...alertConfig,
                          triggers: {
                            ...alertConfig?.triggers,
                            spike: { ...alertConfig?.triggers?.spike, enabled: !alertConfig?.triggers?.spike?.enabled }
                          }
                        })}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${alertConfig?.triggers?.spike?.enabled
                          ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10"
                          : "bg-slate-900/40 border-slate-700/50 hover:border-slate-600"
                          }`}
                      >
                        <h4 className="text-sm font-semibold text-white mb-1">Error Spike</h4>
                        <p className="text-xs text-slate-400">Notify when error occurrences exceed a threshold.</p>
                      </div>
                    </div>

                    {/* Email Recipients */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-400">Email Recipients</label>
                      <div className="flex gap-2">
                        <Input
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="engineering@company.com"
                          onKeyDown={(e) => e.key === "Enter" && addEmail()}
                        />
                        <Button variant="outline" size="sm" onClick={addEmail}>
                          <Plus size={16} />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {alertConfig?.channels?.email?.recipients?.map((email: string) => (
                          <div key={email} className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 px-3 py-1.5 rounded-lg text-xs text-slate-300">
                            {email}
                            <button onClick={() => removeEmail(email)} className="text-slate-500 hover:text-red-400 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700/40">
                      <div>
                        <label className="text-sm font-medium text-slate-400 mb-1.5 block">Cooldown (minutes)</label>
                        <Input
                          type="number"
                          value={alertConfig?.cooldown || 0}
                          onChange={(e) => setAlertConfig({ ...alertConfig, cooldown: Number(e.target.value) })}
                        />
                      </div>
                      {alertConfig?.triggers?.spike?.enabled && (
                        <div>
                          <label className="text-sm font-medium text-slate-400 mb-1.5 block">Spike Threshold</label>
                          <Input
                            type="number"
                            value={alertConfig?.triggers?.spike?.threshold || 0}
                            onChange={(e) => alertConfig && setAlertConfig({
                              ...alertConfig,
                              triggers: {
                                ...alertConfig?.triggers,
                                spike: { ...alertConfig?.triggers?.spike, threshold: Number(e.target.value) }
                              }
                            })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-4">
                      <Button
                        variant="primary"
                        onClick={handleSaveAlerts}
                        isLoading={alertLoading}
                        className="w-full"
                      >
                        <Save size={16} />
                        Update Alert Configuration
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar info section */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white mb-3">About Integrations</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Link your error logs directly to your project management software. Once configured, you can automatically or manually generate engineering tasks straight from the Bug Tracker dashboard.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-2 bg-slate-900/50 rounded p-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5" />
                    <p className="text-xs text-slate-300 flex-1">Two-way synchronization allows closing errors when tasks resolve.</p>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-900/50 rounded p-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5" />
                    <p className="text-xs text-slate-300 flex-1">Ticket fields are pre-populated with stack-traces and metadata.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};