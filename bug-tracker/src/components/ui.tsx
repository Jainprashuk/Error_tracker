import React from 'react';

// ─── Button ─────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 select-none';

  const variants = {
    primary:
      'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 hover:shadow-lg hover:shadow-blue-500/40 active:scale-95 focus:ring-blue-500',
    secondary:
      'bg-slate-700/80 border border-slate-600/60 text-slate-200 hover:bg-slate-600/80 hover:border-slate-500/70 hover:text-white active:scale-95 focus:ring-slate-500',
    danger:
      'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/40 active:scale-95 focus:ring-red-500',
    ghost:
      'text-slate-300 hover:bg-slate-700/50 hover:text-white active:scale-95 focus:ring-slate-500',
    outline:
      'border border-slate-600/60 text-slate-300 hover:border-blue-500/60 hover:text-blue-400 hover:bg-blue-500/5 active:scale-95 focus:ring-blue-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading…
        </>
      ) : (
        children
      )}
    </button>
  );
};

// ─── Card ────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
  hover?: boolean;
  glow?: 'blue' | 'red' | 'green' | 'amber' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  noPadding = false,
  hover = false,
  glow = 'none',
  ...props
}) => {
  const glowMap = {
    blue: 'hover:shadow-glow-blue hover:border-blue-500/30',
    red: 'hover:shadow-glow-red hover:border-red-500/30',
    green: 'hover:shadow-glow-green hover:border-emerald-500/30',
    amber: 'hover:shadow-glow-amber hover:border-amber-500/30',
    none: '',
  };

  return (
    <div
      className={[
        'bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-inner-glow transition-all duration-300',
        hover ? 'hover:border-slate-600/60 hover:shadow-lg' : '',
        glow !== 'none' ? glowMap[glow] : '',
        !noPadding ? 'p-6' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
};

// ─── Input ───────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => (
  <input
    className={`w-full bg-slate-700/40 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/70 hover:border-slate-500/70 transition-all duration-200 text-sm ${className}`}
    {...props}
  />
);

// ─── Badge ───────────────────────────────────────────────────────
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
  dot = false,
}) => {
  const variants = {
    default: 'bg-slate-700/60 text-slate-300 border border-slate-600/50',
    success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    danger: 'bg-red-500/15 text-red-300 border border-red-500/30',
    info: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
  };

  const dotColors = {
    default: 'bg-slate-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    info: 'bg-blue-400',
    purple: 'bg-purple-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

// ─── Skeleton ────────────────────────────────────────────────────
interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`relative overflow-hidden bg-slate-700/40 rounded-xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent before:animate-shimmer before:bg-[length:200%_100%] ${className}`}
  />
);

// ─── StatCard ────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  iconBg?: string;
  glowColor?: 'blue' | 'red' | 'green' | 'amber';
  trend?: { value: number; direction: 'up' | 'down' };
  description?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  iconBg = 'bg-blue-500/20',
  glowColor = 'blue',
  trend,
  description,
  className = '',
}) => {
  const glowStyles = {
    blue: 'hover:shadow-glow-blue hover:border-blue-500/30',
    red: 'hover:shadow-glow-red hover:border-red-500/30',
    green: 'hover:shadow-glow-green hover:border-emerald-500/30',
    amber: 'hover:shadow-glow-amber hover:border-amber-500/30',
  };

  const valueColors = {
    blue: 'from-blue-400 to-blue-300',
    red: 'from-red-400 to-red-300',
    green: 'from-emerald-400 to-emerald-300',
    amber: 'from-amber-400 to-amber-300',
  };

  return (
    <div
      className={`group bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 transition-all duration-300 hover:border-slate-600/60 hover:shadow-lg hover:-translate-y-0.5 ${glowStyles[glowColor]} ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-slate-400 tracking-wide">{label}</p>
        {icon && (
          <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
            {icon}
          </div>
        )}
      </div>

      <p className={`text-4xl font-bold bg-gradient-to-br ${valueColors[glowColor]} bg-clip-text text-transparent mb-2`}>
        {value}
      </p>

      {description && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}

      {trend && (
        <div className="flex items-center gap-1.5 mt-3">
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-slate-500">vs last 7 days</span>
        </div>
      )}
    </div>
  );
};

// ─── EmptyState ──────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => (
  <Card className="text-center py-16">
    {icon && (
      <div className="flex justify-center mb-5">
        <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center text-slate-500">
          {icon}
        </div>
      </div>
    )}
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">{description}</p>
    {action && (
      <Button variant="primary" onClick={action.onClick} className="mx-auto">
        {action.label}
      </Button>
    )}
  </Card>
);

// ─── Tabs ────────────────────────────────────────────────────────
interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => (
  <div className="flex items-center gap-1 bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-xl p-1">
    {tabs
      .filter(tab => tab.show !== false)
      .map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={[
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            activeTab === tab.id
              ? 'bg-slate-700/80 text-white shadow-sm border border-slate-600/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/30',
          ].join(' ')}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
  </div>
);

// ─── PageLayout ──────────────────────────────────────────────────
interface PageLayoutProps {
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children }) => (
  <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 overflow-hidden">
    {children}
  </div>
);

// ─── PageContent ─────────────────────────────────────────────────
interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContent: React.FC<PageContentProps> = ({ children, className = '' }) => (
  <div className={`flex-1 ml-64 overflow-auto ${className}`}>
    <div className="p-8 min-h-full">
      {children}
    </div>
  </div>
);
