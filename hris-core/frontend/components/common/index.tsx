/**
 * Octup HRIS - Design System Components
 *
 * Consistent with Reports Dashboard styling:
 * - Premium rounded corners (3xl)
 * - Soft shadows
 * - Octup brand colors (#809292 primary, #00CBC0 secondary, #FF3489 accent)
 * - Glass morphism effects
 * - Inter font family
 */

import React, { forwardRef, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

// =============================================================================
// CARD COMPONENTS
// =============================================================================

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'metric' | 'section';
  hover?: boolean;
}

export function Card({
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  hover = false
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantClasses = {
    default: 'bg-white rounded-3xl shadow-card border border-slate-100/50',
    glass: 'backdrop-blur-xl bg-white/80 rounded-3xl border border-white/50 shadow-soft-lg',
    metric: 'bg-white rounded-3xl shadow-card border border-slate-100/50 relative overflow-hidden',
    section: 'bg-white rounded-3xl shadow-card border border-slate-100/50 overflow-hidden',
  };

  return (
    <div
      className={`
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hover ? 'hover:shadow-card-hover hover:scale-[1.01] cursor-pointer' : ''}
        transition-all duration-200
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// =============================================================================
// KPI / METRIC CARD (Octup Style)
// =============================================================================

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'primary' | 'secondary' | 'accent' | 'warning';
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'primary',
  loading = false
}: KPICardProps) {
  const colorAccents = {
    primary: 'from-[#809292] to-[#9aabab]',
    secondary: 'from-[#00CBC0] to-[#33d6cd]',
    accent: 'from-[#FF3489] to-[#ff5ca1]',
    warning: 'from-[#F9BD63] to-[#fbd08a]',
  };

  const iconBgColors = {
    primary: 'bg-[#809292]/10 text-[#809292]',
    secondary: 'bg-[#00CBC0]/10 text-[#00CBC0]',
    accent: 'bg-[#FF3489]/10 text-[#FF3489]',
    warning: 'bg-[#F9BD63]/10 text-[#F9BD63]',
  };

  const trendColors = {
    up: 'text-[#00CBC0]',
    down: 'text-[#FF3489]',
    neutral: 'text-slate-500',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-card border border-slate-100/50 p-6 relative overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorAccents[color]}`} />
        <div className="space-y-3">
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-card border border-slate-100/50 p-6 relative overflow-hidden group hover:shadow-card-hover transition-all duration-200">
      {/* Top accent bar - Octup gradient style */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorAccents[color]}`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums tracking-tight">{value}</p>

          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}

          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trendColors[trend.direction]}`}>
              {trend.direction === 'up' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : trend.direction === 'down' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                </svg>
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div className={`w-12 h-12 rounded-2xl ${iconBgColors[color]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BADGE COMPONENT (Octup Style)
// =============================================================================

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  pill?: boolean;
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  pill = false,
  dot = false,
  pulse = false
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-slate-100 text-slate-600',
    primary: 'bg-[#809292]/10 text-[#809292]',
    secondary: 'bg-[#00CBC0]/10 text-[#00a89e]',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-rose-100 text-rose-700',
    info: 'bg-blue-100 text-blue-700',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5 font-medium
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${pill ? 'rounded-full' : 'rounded-lg'}
      ${pulse ? 'animate-pulse' : ''}
    `}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full bg-current ${pulse ? 'animate-ping' : ''}`} />
      )}
      {children}
    </span>
  );
}

// =============================================================================
// AVATAR COMPONENT (Octup Style)
// =============================================================================

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'active' | 'away' | 'offline' | 'online' | 'busy';
}

export function Avatar({ name, src, size = 'md', status }: AvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  const statusColors = {
    active: 'bg-[#00CBC0]',
    online: 'bg-[#00CBC0]',
    away: 'bg-[#F9BD63]',
    busy: 'bg-[#FF3489]',
    offline: 'bg-slate-400',
  };

  // Octup brand gradient colors for avatars
  const bgGradients = [
    'from-[#809292] to-[#6a7a7a]',
    'from-[#00CBC0] to-[#00a89e]',
    'from-[#FF3489] to-[#d92d73]',
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-emerald-500 to-emerald-600',
  ];

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Deterministic color based on name
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % bgGradients.length;

  return (
    <div className="relative inline-block">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${bgGradients[colorIndex]} flex items-center justify-center text-white font-semibold ring-2 ring-white`}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${statusColors[status]}`}
        />
      )}
    </div>
  );
}

// =============================================================================
// BUTTON COMPONENT (Octup Style)
// =============================================================================

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}, ref) => {
  const variantClasses = {
    primary: 'bg-[#809292] text-white hover:bg-[#6a7a7a] shadow-[0_4px_14px_0_rgba(128,146,146,0.25)]',
    secondary: 'bg-[#00CBC0] text-white hover:bg-[#00a89e] shadow-soft',
    accent: 'bg-[#FF3489] text-white hover:bg-[#d92d73] shadow-[0_4px_14px_0_rgba(255,52,137,0.25)]',
    ghost: 'bg-transparent text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-soft',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-xs rounded-xl',
    md: 'px-6 py-3 text-sm rounded-2xl',
    lg: 'px-8 py-4 text-base rounded-2xl',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-150 min-h-[44px]
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        focus:outline-none focus:ring-2 focus:ring-[#809292] focus:ring-offset-2
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

// =============================================================================
// INPUT COMPONENT (Octup Style)
// =============================================================================

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  inputSize?: 'sm' | 'md';
  onChange?: (value: string) => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  icon,
  inputSize = 'md',
  onChange,
  className = '',
  value,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-base',
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-slate-700">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          className={`
            w-full px-4 rounded-xl border border-slate-200 bg-slate-50/50
            text-slate-800 placeholder:text-slate-400
            transition-all duration-150
            focus:bg-white focus:border-[#809292] focus:ring-2 focus:ring-[#809292]/20 focus:outline-none
            ${sizeClasses[inputSize]}
            ${icon ? 'pl-11' : ''}
            ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-rose-500">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// =============================================================================
// SELECT COMPONENT (Octup Style)
// =============================================================================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  options: SelectOption[];
  label?: string;
  error?: string;
  selectSize?: 'sm' | 'md';
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  options,
  label,
  error,
  selectSize = 'md',
  onChange,
  className = '',
  value,
  ...props
}, ref) => {
  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-base',
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-semibold text-slate-700">{label}</label>
      )}
      <select
        ref={ref}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className={`
          w-full px-4 rounded-xl border border-slate-200 bg-slate-50/50
          text-slate-800 cursor-pointer
          appearance-none
          bg-no-repeat pr-10
          transition-all duration-150
          focus:bg-white focus:border-[#809292] focus:ring-2 focus:ring-[#809292]/20 focus:outline-none
          ${sizeClasses[selectSize]}
          ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : ''}
          ${className}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.25rem',
        }}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-rose-500">{error}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

// =============================================================================
// TABS COMPONENT (Octup Style)
// =============================================================================

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'pills' | 'underline';
}

export function Tabs({ tabs, activeTab, onChange, variant = 'underline' }: TabsProps) {
  if (variant === 'pills') {
    return (
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
              ${activeTab === tab.id
                ? 'bg-white text-[#809292] shadow-soft'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-xs ${
                  activeTab === tab.id ? 'bg-[#809292]/10 text-[#809292]' : 'bg-slate-200 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-6 border-b border-slate-200">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            pb-3 text-sm font-medium border-b-2 -mb-px transition-all duration-150
            ${activeTab === tab.id
              ? 'text-[#809292] border-[#809292]'
              : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
            }
          `}
        >
          <span className="flex items-center gap-2">
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-[#809292]/10 text-[#809292]' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// PROGRESS BAR (Octup Style)
// =============================================================================

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'accent' | 'warning' | 'blue' | 'green' | 'yellow' | 'red';
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showLabel = false
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorClasses = {
    primary: 'bg-gradient-to-r from-[#809292] to-[#00CBC0]',
    secondary: 'bg-gradient-to-r from-[#00CBC0] to-[#00a89e]',
    accent: 'bg-gradient-to-r from-[#FF3489] to-[#F9BD63]',
    warning: 'bg-[#F9BD63]',
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-rose-500',
  };

  return (
    <div className="w-full">
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SLIDE-OVER PANEL (Octup Style)
// =============================================================================

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export function SlideOver({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'lg'
}: SlideOverProps) {
  const widthClasses = {
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className={`w-screen ${widthClasses[width]} animate-slide-in-right`}>
          <div className="flex h-full flex-col bg-white shadow-soft-xl rounded-l-3xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{title}</h2>
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE (Octup Style)
// =============================================================================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="w-16 h-16 text-slate-300 mb-4">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Button variant="primary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DATA TABLE (Octup Style)
// =============================================================================

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  loading?: boolean;
  emptyState?: ReactNode;
  compact?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  onRowClick,
  rowClassName,
  loading = false,
  emptyState,
  compact = false,
}: DataTableProps<T>) {
  const cellPadding = compact ? 'px-4 py-3' : 'px-4 py-4';

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 sticky top-0 z-10">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`${cellPadding} text-left text-xs font-semibold text-slate-500 uppercase tracking-wide ${
                    i === 0 ? 'rounded-tl-xl' : ''
                  } ${i === columns.length - 1 ? 'rounded-tr-xl' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i} className="border-b border-slate-100">
                {columns.map(col => (
                  <td key={col.key} className={cellPadding}>
                    <div className="h-4 bg-slate-200 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return emptyState || (
      <EmptyState
        icon={
          <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        }
        title="No data available"
        description="There are no items to display."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50/80 sticky top-0 z-10">
          <tr>
            {columns.map((col, i) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`
                  ${cellPadding} text-xs font-semibold text-slate-500 uppercase tracking-wide
                  ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                  ${i === 0 ? 'rounded-tl-xl' : ''}
                  ${i === columns.length - 1 ? 'rounded-tr-xl' : ''}
                `}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {data.map(item => (
            <tr
              key={String(item[keyField])}
              onClick={() => onRowClick?.(item)}
              className={`
                transition-all duration-150
                ${onRowClick ? 'cursor-pointer hover:bg-slate-50/50 hover:shadow-table-row' : ''}
                ${rowClassName?.(item) || ''}
              `}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`
                    ${cellPadding} text-slate-700
                    ${col.align === 'right' ? 'text-right font-mono tabular-nums' : col.align === 'center' ? 'text-center' : ''}
                  `}
                >
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// TOOLTIP
// =============================================================================

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div className={`
        absolute z-50 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg
        shadow-lg pointer-events-none
        opacity-0 group-hover:opacity-100 transition-opacity duration-150
        ${positionClasses[position]}
      `}>
        {content}
      </div>
    </div>
  );
}
