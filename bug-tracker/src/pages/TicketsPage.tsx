import React, { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Card, Skeleton, Badge } from '../components/ui';
import { ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line
  }, []);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const session = localStorage.getItem('session');
      const token = session ? JSON.parse(session).token : null;
      const user = session ? JSON.parse(session).user : null;
      if (!token || !user || !user.id) throw new Error('Not authenticated');
      // Fetch all projects for user
      const projectsRes = await fetch(`${API_BASE_URL}/projects/${user.id}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!projectsRes.ok) throw new Error('Failed to load projects');
      const projects = await projectsRes.json();
      let allTickets: any[] = [];
      for (const project of projects) {
        const ticketsRes = await fetch(`${API_BASE_URL}/projects/${project._id}/tickets`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (ticketsRes.ok) {
          const projectTickets = await ticketsRes.json();
          allTickets = allTickets.concat(projectTickets.map((t: any) => ({ ...t, projectName: project.name })));
        }
      }
      setTickets(allTickets.filter(t => t.ticket_url));
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      toast.error('Failed to load tickets');
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden">
      <Sidebar />
      <main className="overflow-auto flex-1 ">
        <div className="p-8 space-y-7">
          <div className="flex items-center gap-4 animate-fade-in-up">
            <h1 className="text-2xl font-bold gradient-text truncate">Tickets</h1>
            <Badge variant="info">{tickets.length}</Badge>
          </div>
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : tickets.length === 0 ? (
            <Card className="text-center py-16">
              <div className="w-12 h-12 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ExternalLink size={20} className="text-blue-400" />
              </div>
              <p className="text-slate-300 font-semibold mb-1">No tickets found</p>
              <p className="text-slate-500 text-sm">No tickets have been generated yet.</p>
            </Card>
          ) : (
            <Card noPadding className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-900/40">
                      <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Project</th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Fingerprint</th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Last Seen</th>
                      <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Ticket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.fingerprint} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-all duration-150">
                        <td className="px-6 py-4 text-slate-300 text-sm">{ticket.projectName || '-'}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs">{ticket.event_type || '-'}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-mono truncate max-w-xs">{ticket.fingerprint}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs">{ticket.last_seen ? new Date(ticket.last_seen).toLocaleString() : '-'}</td>
                        <td className="px-6 py-4">
                          {ticket.ticket_url ? (
                            <a
                              href={ticket.ticket_url.startsWith('http') ? ticket.ticket_url : `https://bugtrace.openproject.com${ticket.ticket_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-400 hover:underline text-xs"
                            >
                              <ExternalLink size={14} /> View Ticket
                            </a>
                          ) : (
                            <span className="text-slate-500 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};
