'use client';

import { StatusPill } from '@/components/ui/StatusPill';
import { ActionCard } from './ActionCard';
import { QUICK_ACTIONS } from '@/lib/constants';

export function QuickActions() {
  return (
    <div className="space-y-4">
      {/* Status */}
      <StatusPill status="online" label="Aura is online" sublabel="Ready to assist you" />

      {/* Action Cards */}
      <div className="space-y-3">
        {QUICK_ACTIONS.map((action) => (
          <ActionCard key={action.title} {...action} />
        ))}
      </div>
    </div>
  );
}
