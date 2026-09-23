'use client';

import { IntentPill } from '@/components/ui/IntentPill';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CallerTypePill } from '@/components/ui/CallerTypePill';
import { MoreHorizontal } from 'lucide-react';
import type { Call } from '@/lib/types';

interface CallsTableRowProps {
  call: Call;
  onView?: (call: Call) => void;
}

export function CallsTableRow({ call, onView }: CallsTableRowProps) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="py-3 px-4 text-sm text-gray-600 font-medium">{call.id}</td>
      <td className="py-3 px-4 text-sm text-gray-500">{call.time}</td>
      <td className="py-3 px-4 text-sm text-gray-900 font-medium">
        <span>{call.caller}</span>
      </td>
      <td className="py-3 px-4">
        <CallerTypePill type={call.callerType || call.caller_type || (call.user_id ? 'patient' : 'guest')} />
      </td>
      <td className="py-3 px-4">
        <IntentPill intent={call.intent} />
      </td>
      <td className="py-3 px-4 text-sm text-gray-600 max-w-[280px] truncate">{call.summary}</td>
      <td className="py-3 px-4 text-sm text-gray-500">{call.duration}</td>
      <td className="py-3 px-4">
        <StatusBadge status={call.status} />
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onView?.(call)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          >
            View
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors cursor-pointer">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
