import React, { useState } from 'react';
import { LogOut, Zap, Bug, LayoutDashboard, Ticket, Settings, Menu, X } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { DOCS_SECTIONS } from '../types/docsSections';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string | number;
}

import { useClerk } from '@clerk/clerk-react';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const { signOut } = useClerk();

  const handleLogout = async () => {
    try {
      // 1. Sign out from Clerk (Essential for clearing OAuth session)
      await signOut();

      // 2. Clear local session
      logout();

      // 3. Navigate away
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
      // Fallback local logout
      logout();
      navigate('/login');
    }
  };

  const navItems: NavItem[] = user
    ? [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Tickets', icon: Ticket, href: '/tickets' },
      { label: 'Settings', icon: Settings, href: '/settings' },
      { label: 'Docs', icon: Zap, href: '/docs' }
    ]
    : [
      { label: 'Landing Page', icon: LayoutDashboard, href: '/' },
      { label: 'Docs', icon: Zap, href: '/docs' }
    ];

  // For docs subtabs
  const [searchParams, setSearchParams] = useSearchParams();
  const isDocs = location.pathname === '/docs';
  const docsActiveSection = searchParams.get('section') || DOCS_SECTIONS[0].id;

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-all shadow-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`w-64 glass-sidebar h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* ── Logo ── */}
        <div className="px-5 py-5 border-b border-slate-700/40">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-blue-500 rounded-xl blur-md opacity-50" />
              <div className="relative w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Bug size={18} className="text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight tracking-wide">Bug Tracker</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Error Monitoring</p>
            </div>
          </div>
        </div>

        {/* ── Nav Section Label ── */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Navigation</p>
        </div>

        {/* ── Nav Items ── */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <div key={item.href}>
                <button
                  id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  onClick={() => navigate(item.href)}
                  style={{ animationDelay: `${idx * 50}ms` }}
                  className={[
                    'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group text-left animate-fade-in-up',
                    active
                      ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/10'
                      : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 border border-transparent hover:border-slate-700/50',
                  ].join(' ')}
                >
                  <div className={[
                    'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200',
                    active ? 'bg-blue-500/20' : 'group-hover:bg-slate-600/50',
                  ].join(' ')}>
                    <Icon size={16} className={active ? 'text-blue-400' : ''} />
                  </div>
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
                  )}
                </button>
                {/* Docs subtabs */}
                {item.href === '/docs' && isDocs && (
                  <div className="ml-7 mt-2 flex flex-col gap-1">
                    {DOCS_SECTIONS.map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setSearchParams({ section: section.id })}
                        className={[
                          'flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all',
                          docsActiveSection === section.id
                            ? 'bg-blue-700/30 text-blue-300 font-semibold'
                            : 'text-slate-400 hover:bg-slate-700/40 hover:text-white',
                        ].join(' ')}
                      >
                        <span className="text-base">{section.icon}</span>
                        <span className="text-xs">{section.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Status Indicator ── */}
        <div className="mx-3 mb-3 px-3.5 py-2.5 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-60" />
            </div>
            <span className="text-xs text-emerald-400 font-medium">All systems operational</span>
          </div>
        </div>

        {/* ── User Section ── */}
        <div className="px-3 py-4 border-t border-slate-700/40 space-y-2">
          {user && (
            <div className="px-3.5 py-3 bg-slate-800/50 rounded-xl border border-slate-700/40 hover:border-slate-600/50 transition-all duration-200">
              <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest mb-2">Signed in as</p>
              <div className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {user ? (
            <button
              id="sidebar-logout-btn"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 border border-transparent transition-all duration-200 text-sm font-medium"
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all duration-200 text-sm font-medium shadow-lg shadow-blue-500/10"
            >
              <Zap size={15} />
              <span>Get Started</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
