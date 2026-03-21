import React, { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { Eye, EyeOff } from "lucide-react";

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
        setApiKey(op.api_key || "");
        setProjectId(op.op_project_id || "");
      } else {
        setBaseUrl("");
        setApiKey("");
        setProjectId("");
      }
    };

    fetchConfig();
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
          api_key: apiKey,
          project_id: Number(projectId),
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Save integration
  const handleSave = async () => {
    if (!selectedProjectId) {
      alert("Select project first");
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
            api_key: apiKey,
            project_id: Number(projectId),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Failed");

      alert("✅ Integration saved");
    } catch (err: any) {
      alert("❌ " + err.message);
    }
  };

  return (
    <div className="flex h-screen bg-[#0f172a]">
      <Sidebar />

      <main className="flex-1 flex items-center justify-center p-10">
        <div className="w-full max-w-xl bg-[#111827] border border-[#1f2937] rounded-2xl p-8 shadow-xl">

          {/* 🔽 Project Selector */}
          <div className="mb-6">
            <label className="text-sm text-gray-400 mb-2 block">
              Select Project
            </label>

            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[#020617] border border-[#1f2937] text-white focus:ring-2 focus:ring-blue-500"
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 🔥 Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              🔗 OpenProject Integration
            </h2>

            {status === "success" && (
              <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-400">
                Connected
              </span>
            )}

            {status === "error" && (
              <span className="text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-400">
                Failed
              </span>
            )}
          </div>

          {/* 🔥 Form */}
          <div className="space-y-5">

            {/* Base URL */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                Base URL
              </label>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://company.openproject.com"
                className="w-full px-4 py-2 rounded-lg bg-[#020617] border border-[#1f2937] text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-2 pr-10 rounded-lg bg-[#020617] border border-[#1f2937] text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-2.5 text-gray-400"
                >
                  {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Project ID */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">
                OpenProject Project ID
              </label>
              <input
                type="number"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#020617] border border-[#1f2937] text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">

              <button
                onClick={handleTest}
                disabled={loading}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition"
              >
                {loading ? "Testing..." : "Test Connection"}
              </button>

              <button
                onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
              >
                Save Integration
              </button>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
};