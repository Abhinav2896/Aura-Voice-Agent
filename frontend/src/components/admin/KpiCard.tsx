'use client';

import Image from 'next/image';
import { SEMANTIC_COLORS } from '@/lib/constants';
import type { KpiColor } from '@/lib/types';

interface KpiCardProps {
  icon: string;
  title: string;
  value: number;
  trend: string;
  trendLabel: string;
  color: KpiColor;
}

export function KpiCard({ icon, title, value, trend, trendLabel, color }: KpiCardProps) {
  const colorScheme = SEMANTIC_COLORS[color] || SEMANTIC_COLORS.blue;
  const isPositiveTrend = (trend || '').includes('↑') || (trend || '').includes('+');

  return (
    <div
      className="flex-1 min-w-[150px] p-4 rounded-xl border transition-all duration-200 hover:shadow-md"
      style={{
        backgroundColor: colorScheme.bg,
        borderColor: colorScheme.border,
      }}
    >
      {/* Icon + Title */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${colorScheme.text}15` }}
        >
          <Image src={`/assets/${icon}.svg`} alt={title} width={18} height={18} />
        </div>
        <span className="text-xs font-medium text-gray-600 leading-tight">{title}</span>
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>

      {/* Trend */}
      <p className="text-xs">
        <span className={isPositiveTrend ? 'text-green-600 font-medium' : 'font-medium'} style={{ color: colorScheme.text }}>
          {trend || 'Active'}
        </span>{' '}
        <span className="text-gray-400">{trendLabel || ''}</span>
      </p>
    </div>
  );
}
