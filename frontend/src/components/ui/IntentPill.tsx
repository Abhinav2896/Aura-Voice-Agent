'use client';

import { INTENT_COLORS } from '@/lib/constants';
import type { IntentType } from '@/lib/types';

interface IntentPillProps {
  intent: IntentType;
}

export function IntentPill({ intent }: IntentPillProps) {
  const colors = INTENT_COLORS[intent] ?? INTENT_COLORS.Admin;

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {intent}
    </span>
  );
}
