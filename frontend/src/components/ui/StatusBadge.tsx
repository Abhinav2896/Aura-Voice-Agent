'use client';

import { STATUS_COLORS } from '@/lib/constants';
import type { StatusType } from '@/lib/types';

interface StatusBadgeProps {
  status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.Pending;

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {status}
    </span>
  );
}
