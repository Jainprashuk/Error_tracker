import React from 'react';
import { LogOut, Home, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();

  const handleLogout = async () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', icon: Home, href: '/dashboard' },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-700/50 h-screen fixed left-0 top-0 flex flex-col backdrop-blur-sm">
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-700/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Zap size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Bug Tracker</h1>
            <p className="text-xs text-slate-400">Error monitoring</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
              {active && (
                <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="px-3 py-4 border-t border-slate-700/30 space-y-4">
        {user && (
          <div className="px-4 py-3 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-all">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Logged In</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-300 hover:bg-red-900/20 hover:text-red-400 hover:border hover:border-red-500/30 transition-all duration-200 font-medium"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
