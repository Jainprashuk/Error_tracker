import React, { useState, useEffect } from 'react';
import { LogOut, Zap, Bug, LayoutDashboard, Ticket, Settings, Menu, X, Users, Shield, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { DOCS_SECTIONS } from '../types/docsSections';
import { OrgSwitcher } from './OrgSwitcher';

type NavSection = 'workspace' | 'manage' | 'resources';

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  section: NavSection;
  badge?: string | number;
}

const SECTION_LABELS: Record<NavSection, string> = {
  workspace: 'Workspace',
  manage: 'Manage',
  resources: 'Resources',
};

import { useClerk } from '@clerk/clerk-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const { signOut } = useClerk();

  const [isOpen, setIsOpen] = useState(false);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('sidebar-collapsed-sections') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed-sections', JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  const toggleSection = (section: NavSection) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const closeMobileMenu = () => setIsOpen(false);

  const handleNavigate = (href: string) => {
    navigate(href);
    closeMobileMenu();
  };

  const handleLogout = async () => {
    closeMobileMenu();
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
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', section: 'workspace' },
      { label: 'Members', icon: Users, href: '/members', section: 'workspace' },
      { label: 'Tickets', icon: Ticket, href: '/tickets', section: 'workspace' },
      { label: 'Settings', icon: Settings, href: '/settings', section: 'manage' },
      ...(user.email === '29jainprashuk@gmail.com' ? [{ label: 'Super Admin', icon: Shield, href: '/superadmin', section: 'manage' as NavSection }] : []),
      { label: 'Docs', icon: Zap, href: '/docs', section: 'resources' },
    ]
    : [
      { label: 'Landing Page', icon: LayoutDashboard, href: '/', section: 'workspace' },
      { label: 'Docs', icon: Zap, href: '/docs', section: 'resources' },
    ];

  const sections: NavSection[] = ['workspace', 'manage', 'resources'];

  // For docs subtabs
  const [searchParams, setSearchParams] = useSearchParams();
  const isDocs = location.pathname === '/docs';
  const docsActiveSection = searchParams.get('section') || DOCS_SECTIONS[0].id;

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  // Always keep the section containing the current page expanded
  useEffect(() => {
    const activeItem = navItems.find((item) => isActive(item.href));
    if (activeItem) {
      setCollapsedSections((prev) => (prev[activeItem.section] ? { ...prev, [activeItem.section]: false } : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const [systemStatus, setSystemStatus] = useState<'healthy' | 'unhealthy' | 'loading'>('loading');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (res.ok) {
          const data = await res.json();
          setSystemStatus(data.status === 'healthy' ? 'healthy' : 'unhealthy');
        } else {
          setSystemStatus('unhealthy');
        }
      } catch (err) {
        setSystemStatus('unhealthy');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

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
          onClick={closeMobileMenu}
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

        {/* ── Organization Switcher ── */}
        {user && <OrgSwitcher />}

        {/* ── Nav Items (grouped, scrollable with edge fade) ── */}
        <nav className="flex-1 px-3 pt-3 space-y-5 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)]">
          {sections.map((section, sectionIdx) => {
            const items = navItems.filter((item) => item.section === section);
            if (items.length === 0) return null;

            return (
              <div key={section} className="animate-fade-in-up" style={{ animationDelay: `${sectionIdx * 75}ms` }}>
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full flex items-center justify-between px-3.5 mb-1.5 py-1 rounded-md text-[10px] font-semibold text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors"
                >
                  <span>{SECTION_LABELS[section]}</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${collapsedSections[section] ? '-rotate-90' : ''}`}
                  />
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                  style={{ gridTemplateRows: collapsedSections[section] ? '0fr' : '1fr' }}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-1 pb-0.5">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                          <div key={item.href}>
                            <button
                              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                              onClick={() => handleNavigate(item.href)}
                              aria-current={active ? 'page' : undefined}
                              className={[
                                'relative w-full flex items-center gap-3 pl-4 pr-3.5 py-2.5 rounded-xl transition-all duration-200 group text-left',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                                active
                                  ? 'bg-blue-600/15 text-blue-300'
                                  : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200',
                              ].join(' ')}
                            >
                              {active && (
                                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
                              )}
                              <div className={[
                                'w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0',
                                active ? 'bg-blue-500/20' : 'group-hover:bg-slate-600/50',
                              ].join(' ')}>
                                <Icon size={16} className={active ? 'text-blue-400' : ''} />
                              </div>
                              <span className="text-sm font-medium flex-1 truncate">{item.label}</span>
                              {item.badge !== undefined && (
                                <span className="text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded-full">
                                  {item.badge}
                                </span>
                              )}
                            </button>
                            {/* Docs subtabs */}
                            {item.href === '/docs' && isDocs && (
                              <div className="ml-7 mt-2 flex flex-col gap-1">
                                {DOCS_SECTIONS.map((docSection) => (
                                  <button
                                    key={docSection.id}
                                    onClick={() => setSearchParams({ section: docSection.id })}
                                    className={[
                                      'flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all',
                                      docsActiveSection === docSection.id
                                        ? 'bg-blue-700/30 text-blue-300 font-semibold'
                                        : 'text-slate-400 hover:bg-slate-700/40 hover:text-white',
                                    ].join(' ')}
                                  >
                                    <span className="text-base">{docSection.icon}</span>
                                    <span className="text-xs">{docSection.title}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* ── Status Indicator ── */}
        <div className="mx-3 mt-2 mb-3 px-3.5 py-2 rounded-lg flex items-center gap-2">
          <div className="relative">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${systemStatus === 'healthy' ? 'bg-emerald-400' : systemStatus === 'unhealthy' ? 'bg-red-400' : 'bg-slate-500'
              }`} />
            {systemStatus !== 'loading' && (
              <div className={`absolute inset-0 w-1.5 h-1.5 rounded-full animate-ping opacity-60 ${systemStatus === 'healthy' ? 'bg-emerald-400' : 'bg-red-400'
                }`} />
            )}
          </div>
          <span className={`text-[11px] font-medium transition-colors duration-300 ${systemStatus === 'healthy' ? 'text-emerald-400' : systemStatus === 'unhealthy' ? 'text-red-400' : 'text-slate-500'
            }`}>
            {systemStatus === 'healthy' ? 'All systems operational' : systemStatus === 'unhealthy' ? 'System issues detected' : 'Checking status...'}
          </span>
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
              onClick={() => handleNavigate('/login')}
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
