import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
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
    'font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900';

  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:shadow-blue-500/30 hover:from-blue-500 hover:to-blue-600 active:scale-95',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 transition-colors active:scale-95',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg hover:shadow-red-500/30 active:scale-95',
    ghost: 'text-slate-300 hover:bg-slate-700/50 active:scale-95',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading
        </span>
      ) : (
        children
      )}
    </button>
  );
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  noPadding = false,
  hover = false,
  ...props 
}) => (
  <div
    className={`bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm transition-all duration-200 ${
      hover ? 'hover:border-slate-600 hover:shadow-lg hover:shadow-blue-500/10' : ''
    } ${!noPadding ? 'p-6' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => (
  <input
    className={`bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 ${className}`}
    {...props}
  />
);

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
}) => {
  const variants = {
    default: 'bg-slate-700/50 text-slate-200 border border-slate-600/50',
    success: 'bg-emerald-900/30 text-emerald-200 border border-emerald-700/50',
    warning: 'bg-amber-900/30 text-amber-200 border border-amber-700/50',
    danger: 'bg-red-900/30 text-red-200 border border-red-700/50',
    info: 'bg-blue-900/30 text-blue-200 border border-blue-700/50',
  };

  return (
    <span
      className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`bg-slate-700/50 rounded-lg animate-pulse ${className}`}
  />
);

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; direction: 'up' | 'down' };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  className = '',
}) => (
  <Card hover className={`flex flex-col gap-4 ${className}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm text-slate-400 font-medium mb-2">{label}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
      {icon && (
        <div className="text-slate-600 opacity-50">
          {icon}
        </div>
      )}
    </div>
    {trend && (
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold ${trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
        </span>
        <span className="text-xs text-slate-500">vs last week</span>
      </div>
    )}
  </Card>
);

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
  <Card className="text-center py-12">
    {icon && (
      <div className="flex justify-center mb-4 opacity-50">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
    <p className="text-slate-400 text-sm mb-6">{description}</p>
    {action && (
      <Button variant="primary" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </Card>
);
