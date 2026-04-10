import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Zap, Activity, Clock, Server, MonitorPlay } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { Card, Badge, Skeleton } from '../components/ui';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/60 rounded-xl px-4 py-3 shadow-xl backdrop-blur-xl">
        <p className="text-slate-400 text-xs mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="text-white font-bold text-sm">
            {p.name}: {p.value} <span className="text-slate-400 font-normal text-xs">ms</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ProjectPerformancePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [timeseries, setTimeseries] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('/');
  const [selectedApiRoute, setSelectedApiRoute] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pages' | 'api'>('pages');
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState<number>(7);

  useEffect(() => {
    loadProjectAndMetrics();
  }, [id, days]);

  useEffect(() => {
    if (id && selectedRoute) {
      loadRouteTimeseries(selectedRoute);
    }
  }, [id, selectedRoute, days]);

  const loadProjectAndMetrics = async () => {
    setIsLoading(true);
    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;
      if (!token || !id) return;

      const { user } = JSON.parse(session || '{}');
      const projectsRes = await fetch(`${API_BASE_URL}/projects/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!projectsRes.ok) throw new Error('Failed to load projects');

      const allProjects = await projectsRes.json();
      const projectData = (Array.isArray(allProjects) ? allProjects : []).find((p: any) => p._id === id);
      if (!projectData) throw new Error('Project not found');
      setProject(projectData);

      const perfRes = await fetch(`${API_BASE_URL}/projects/${id}/performance?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!perfRes.ok) throw new Error('Failed to load performance metrics');

      const perfData = await perfRes.json();
      setMetrics(perfData);

      if (perfData.routes && perfData.routes.length > 0) {
        setSelectedRoute(perfData.routes[0].route);
      }
      if (perfData.api_routes && perfData.api_routes.length > 0) {
        setSelectedApiRoute(perfData.api_routes[0].apiRoute);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load performance data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRouteTimeseries = async (route: string) => {
    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;
      if (!token || !id) return;

      const res = await fetch(`${API_BASE_URL}/projects/${id}/performance/route?route=${encodeURIComponent(route)}&days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      // Format data for chart
      const formatted = data.data.map((d: any) => {
        const date = new Date(d.timestamp);
        return {
          time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
          Load: d.pageLoadTime || 0,
          DOM: d.domContentLoaded || 0,
          FCP: d.firstContentfulPaint || 0,
        };
      });
      setTimeseries(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <Sidebar />
        <div className="flex-1 md:ml-64 p-4 pt-20 md:p-8 space-y-5">
          <Skeleton className="h-12 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <Sidebar />
        <div className="flex-1 md:ml-64 p-4 pt-20 md:p-8 text-center text-slate-400">Project not found.</div>
      </div>
    );
  }

  const routes = metrics?.routes || [];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden">
      <Sidebar />
      <div className="fixed top-20 right-10 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <main className="overflow-auto flex-1 md:ml-64 p-4 pt-20 md:p-8 space-y-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/project/${project._id}`)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600/70 transition-all duration-200 active:scale-95 flex-shrink-0"
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
               <span className="text-xs text-slate-500 font-medium">{project.name} /</span>
               <span className="text-xs text-slate-400 font-medium">Performance</span>
              </div>
              <h1 className="text-2xl font-bold gradient-text">Web Vitals</h1>
            </div>
          </div>
          <select 
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none hover:bg-blue-500/20 cursor-pointer transition-all"
            style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none', textAlign: 'center' }}
          >
            <option value={1} className="bg-slate-900 text-slate-300">Last 24 Hours</option>
            <option value={7} className="bg-slate-900 text-slate-300">Last 7 Days</option>
            <option value={30} className="bg-slate-900 text-slate-300">Last 30 Days</option>
            <option value={90} className="bg-slate-900 text-slate-300">Last 90 Days</option>
          </select>
        </div>

        {routes.length === 0 && (metrics?.api_routes || []).length === 0 ? (
           <Card className="text-center py-16">
             <div className="w-12 h-12 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
               <Zap size={20} className="text-blue-400" />
             </div>
             <p className="text-slate-300 font-semibold mb-1">No Performance Data Yet</p>
             <p className="text-slate-500 text-sm max-w-sm mx-auto">
               Update your SDK capabilities to capture performance metrics on your project. They will automatically appear here.
             </p>
           </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setActiveTab('pages')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'pages' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>Frontend Pages</button>
              <button onClick={() => setActiveTab('api')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'api' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>API Integrations</button>
            </div>

            {activeTab === 'pages' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
               {/* Routes Sidebar */}
               <Card className="!p-0 overflow-hidden flex flex-col max-h-[500px]">
                  <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-2 bg-slate-900/60">
                    <MonitorPlay size={16} className="text-blue-400" />
                    <h2 className="text-sm font-bold text-white">Browser Routes</h2>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2">
                    {routes.map((r: any) => (
                      <button
                        key={r.route}
                        onClick={() => setSelectedRoute(r.route)}
                        className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-all ${selectedRoute === r.route ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-slate-800/80 border border-transparent'}`}
                      >
                         <div className="flex justify-between items-center mb-1">
                            <span className={`font-mono text-sm font-semibold truncate ${selectedRoute === r.route ? 'text-blue-300' : 'text-slate-300'}`}>{r.route}</span>
                            <Badge variant="default" className="text-[10px] py-0">{r.sample_count} req</Badge>
                         </div>
                         <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>LCP: <strong className={selectedRoute === r.route ? 'text-blue-200' : 'text-slate-400'}>{r.avg?.pageLoadTime || '-'}ms</strong></span>
                            <span>FCP: <strong className={selectedRoute === r.route ? 'text-blue-200' : 'text-slate-400'}>{r.avg?.firstContentfulPaint || '-'}ms</strong></span>
                         </div>
                      </button>
                    ))}
                  </div>
               </Card>

               {/* Right Side: Details & Chart */}
               <div className="flex flex-col gap-5">
                 {/* Top overview of selected route */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">DOM Ready</p>
                        <Server size={14} className="text-emerald-400" />
                      </div>
                      <p className="text-xl font-black text-white truncate">
                        {routes.find((r: any) => r.route === selectedRoute)?.avg?.domContentLoaded || '-'}
                        <span className="text-xs text-slate-500 ml-1 font-normal">ms</span>
                      </p>
                    </div>
                    <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Avg FCP</p>
                        <Activity size={14} className="text-blue-400" />
                      </div>
                      <p className="text-xl font-black text-white truncate">
                        {routes.find((r: any) => r.route === selectedRoute)?.avg?.firstContentfulPaint || '-'}
                        <span className="text-xs text-slate-500 ml-1 font-normal">ms</span>
                      </p>
                    </div>
                    <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Avg TTFB</p>
                        <Zap size={14} className="text-amber-400" />
                      </div>
                      <p className="text-xl font-black text-white truncate">
                        {routes.find((r: any) => r.route === selectedRoute)?.avg?.ttfb || '-'}
                        <span className="text-xs text-slate-500 ml-1 font-normal">ms</span>
                      </p>
                    </div>
                    <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Avg DNS</p>
                        <Server size={14} className="text-purple-400" />
                      </div>
                      <p className="text-xl font-black text-white truncate">
                        {routes.find((r: any) => r.route === selectedRoute)?.avg?.dnsLookupTime || '-'}
                        <span className="text-xs text-slate-500 ml-1 font-normal">ms</span>
                      </p>
                    </div>
                 </div>

                 {/* Chart */}
                 <Card className="!p-0 flex-1 flex flex-col">
                   <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-2">
                      <Clock size={16} className="text-amber-400" />
                      <h2 className="text-sm font-bold text-white">Latest Activity: {selectedRoute}</h2>
                   </div>
                   <div className="p-4 flex-1 min-h-[250px]">
                      {timeseries.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-sm">No recent data</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.2)" vertical={false} />
                            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="Load" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} name="Page Load" />
                            <Bar dataKey="FCP" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} name="First Contentful Paint" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                   </div>
                 </Card>
               </div>
            </div>
            )}

            {activeTab === 'api' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
               <Card className="!p-0 overflow-hidden flex flex-col max-h-[500px]">
                  <div className="px-5 py-4 border-b border-slate-700/40 flex items-center gap-2 bg-slate-900/60">
                    <Server size={16} className="text-purple-400" />
                    <h2 className="text-sm font-bold text-white">API Endpoints</h2>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2">
                    {(metrics?.api_routes || []).map((r: any) => (
                      <button
                        key={r.apiRoute}
                        onClick={() => setSelectedApiRoute(r.apiRoute)}
                        className={`w-full text-left px-4 py-3 rounded-xl mb-1 transition-all ${selectedApiRoute === r.apiRoute ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-slate-800/80 border border-transparent'}`}
                      >
                         <div className="flex justify-between items-center mb-1">
                            <span className={`font-mono text-sm font-semibold truncate max-w-[200px] ${selectedApiRoute === r.apiRoute ? 'text-purple-300' : 'text-slate-300'}`}>[{r.method}] {r.apiRoute.split('?')[0]}</span>
                            <Badge variant="default" className="text-[10px] py-0">{r.sample_count} req</Badge>
                         </div>
                         <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Avg Dur: <strong className={selectedApiRoute === r.apiRoute ? 'text-purple-200' : 'text-slate-400'}>{r.avgDuration}ms</strong></span>
                            <span>Success: <strong className={selectedApiRoute === r.apiRoute ? 'text-emerald-400' : 'text-slate-400'}>{r.successRate}%</strong></span>
                         </div>
                      </button>
                    ))}
                  </div>
               </Card>

               <div className="flex flex-col gap-5">
                 <div className="grid grid-cols-2 gap-5">
                    <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Average Duration</p>
                        <Clock size={14} className="text-purple-400" />
                      </div>
                      <p className="text-2xl font-black text-white">
                        {(metrics?.api_routes || []).find((r: any) => r.apiRoute === selectedApiRoute)?.avgDuration || '-'}
                        <span className="text-sm text-slate-500 ml-1 font-normal">ms</span>
                      </p>
                    </div>
                    <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Health (200 OK)</p>
                        <Activity size={14} className="text-emerald-400" />
                      </div>
                      <p className="text-2xl font-black text-white">
                        {(metrics?.api_routes || []).find((r: any) => r.apiRoute === selectedApiRoute)?.successRate || 0}
                        <span className="text-sm text-slate-500 ml-1 font-normal">%</span>
                      </p>
                    </div>
                 </div>
               </div>
            </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
