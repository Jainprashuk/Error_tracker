import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertCircle, Cpu } from 'lucide-react';
import { Card } from './ui';
import { useAuthStore } from '../store/auth';

interface AIInsightCardProps {
  title: string;
  endpoint: string;
  icon?: React.ReactNode;
  variant?: 'blue' | 'purple' | 'emerald';
  onRefresh?: () => void;
  method?: 'GET' | 'POST';
  body?: any;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ 
  title, 
  endpoint, 
  icon = <Sparkles size={16} />,
  variant = 'blue',
  method = 'GET',
  body = null
}) => {
  const [insight, setInsight] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentOrgId } = useAuthStore();

  const colors = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  const fetchInsight = async (force: boolean = false) => {
    if (!currentOrgId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const sessionData = localStorage.getItem('session');
      if (!sessionData) throw new Error('Not authenticated');
      const { token } = JSON.parse(sessionData);

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      
      // Append force_refresh query param if requested
      const url = new URL(`${API_BASE_URL}${endpoint}`);
      if (force) {
        url.searchParams.append('force_refresh', 'true');
      }

      const res = await fetch(url.toString(), {
        method: method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-org-id': currentOrgId,
          'Content-Type': 'application/json'
        },
        body: method === 'POST' ? JSON.stringify(body) : undefined
      });
      
      if (!res.ok) {
         if (res.status === 403) throw new Error('AI features restricted to Admins');
         throw new Error('AI analysis failed');
      }
      
      const data = await res.json();
      setInsight(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight(false); // Initial load uses cache
  }, [endpoint, currentOrgId, JSON.stringify(body)]);

  const displayContent = insight?.summary || insight?.insights || (typeof insight === 'string' ? insight : null);

  return (
    <Card className="relative overflow-hidden group border-slate-700/50 bg-slate-900/40">
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${variant === 'blue' ? 'bg-blue-500' : variant === 'purple' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${colors[variant]}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">Gemini Intelligence</h3>
            <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); fetchInsight(true); }}
          disabled={isLoading}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700/50 text-slate-500 hover:text-white disabled:opacity-50 transition-all active:scale-90"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="relative z-10 min-h-[60px]">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 bg-slate-800/80 rounded-lg animate-pulse w-full" />
            <div className="h-4 bg-slate-800/80 rounded-lg animate-pulse w-[90%]" />
            <div className="h-4 bg-slate-800/80 rounded-lg animate-pulse w-[40%]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-4 bg-slate-950/40 rounded-xl border border-slate-800/50">
            <AlertCircle size={20} className="text-slate-600 mb-2" />
            <p className="text-[11px] text-slate-500 font-medium px-4 text-center">{error}</p>
          </div>
        ) : (
          <div className="animate-fade-in">
             <div className="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
               {displayContent || 'Analysis complete. Review details below.'}
             </div>
             
             {/* Special handling for Error Analysis solution */}
             {insight?.solution && (
               <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black text-emerald-500 tracking-wider uppercase">Proposed Solution</span>
                 </div>
                 <p className="text-xs text-slate-300 leading-relaxed">{insight.solution}</p>
               </div>
             )}

             {/* Special handling for Error Analysis root cause */}
             {insight?.problem && !insight?.summary && (
               <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-[10px] font-black text-red-500 tracking-wider uppercase">Root Cause Identified</span>
                 </div>
                 <p className="text-xs text-slate-300 leading-relaxed">{insight.problem}</p>
               </div>
             )}
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-800/50 flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 tracking-widest uppercase">
          <Cpu size={10} />
          <span>Auto-refreshes every 24h • Manual refresh available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-blue-500" />
          <div className="w-1 h-1 rounded-full bg-blue-500/60" />
          <div className="w-1 h-1 rounded-full bg-blue-500/30" />
        </div>
      </div>
    </Card>
  );
};
