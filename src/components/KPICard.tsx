import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  primary?: boolean;
}

const colorMap = {
  blue:   { glow: 'rgba(0,213,196,0.18)',   icon: '#00d5c4', iconBg: 'rgba(0,213,196,0.12)',  iconBorder: 'rgba(0,213,196,0.25)'  },
  green:  { glow: 'rgba(16,185,129,0.18)',  icon: '#10b981', iconBg: 'rgba(16,185,129,0.10)', iconBorder: 'rgba(16,185,129,0.25)' },
  red:    { glow: 'rgba(239,68,68,0.18)',   icon: '#ef4444', iconBg: 'rgba(239,68,68,0.10)',  iconBorder: 'rgba(239,68,68,0.25)'  },
  yellow: { glow: 'rgba(245,158,11,0.18)',  icon: '#f59e0b', iconBg: 'rgba(245,158,11,0.10)', iconBorder: 'rgba(245,158,11,0.25)' },
  purple: { glow: 'rgba(167,139,250,0.18)', icon: '#a78bfa', iconBg: 'rgba(139,92,246,0.10)', iconBorder: 'rgba(139,92,246,0.25)' },
};

const trendColorMap = {
  up:      '#10b981',
  down:    '#ef4444',
  neutral: 'var(--text-muted)',
};

export default function KPICard({ title, value, icon, trend, color = 'blue', primary = false }: KPICardProps) {
  const c = colorMap[color];

  return (
    <div
      className="relative overflow-hidden rounded-[16px] p-[18px] transition-all duration-200 cursor-default"
      style={{
        background: primary ? 'rgba(0,213,196,0.06)' : 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: primary
          ? '1px solid rgba(0,213,196,0.22)'
          : '1px solid var(--glass-border)',
        boxShadow: primary ? 'var(--glow-accent)' : 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,213,196,0.25)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = primary
          ? 'rgba(0,213,196,0.22)'
          : 'var(--glass-border)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute top-[-20px] right-[-20px] w-[80px] h-[80px] rounded-full pointer-events-none"
        style={{ background: c.glow, filter: 'blur(28px)' }}
      />

      {/* Icon */}
      <div
        className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center mb-[14px]"
        style={{ background: c.iconBg, border: `1px solid ${c.iconBorder}`, color: c.icon }}
      >
        {icon}
      </div>

      {/* Label */}
      <p
        className="text-[10px] font-semibold uppercase tracking-[1px] mb-[5px]"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {title}
      </p>

      {/* Value */}
      <p
        className="text-[20px] font-extrabold leading-none truncate"
        style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
      >
        {value}
      </p>

      {/* Trend */}
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trend.direction === 'up'      && <TrendingUp   className="w-3 h-3" style={{ color: trendColorMap.up }}      />}
          {trend.direction === 'down'    && <TrendingDown  className="w-3 h-3" style={{ color: trendColorMap.down }}    />}
          {trend.direction === 'neutral' && <Minus         className="w-3 h-3" style={{ color: trendColorMap.neutral }} />}
          <span className="text-[11px] font-medium" style={{ color: trendColorMap[trend.direction] }}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
