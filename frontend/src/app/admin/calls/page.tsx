'use client';

import { useEffect, useState } from 'react';
import { CallsTable } from '@/components/admin/CallsTable';
import { PhoneCall, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import { getCalls } from '@/lib/services';
import type { Call } from '@/lib/types';

// Parse a "m:ss" or "h:mm:ss" duration display into seconds.
function durationToSeconds(display?: string): number {
  if (!display) return 0;
  const parts = display.split(':').map((p) => parseInt(p, 10));
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

function secondsToDisplay(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.round(total % 60);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function AdminCallsPage() {
  const [aiResolved, setAiResolved] = useState<number | null>(null);
  const [avgDuration, setAvgDuration] = useState<string | null>(null);

  useEffect(() => {
    getCalls()
      .then((calls: Call[]) => {
        const resolved = calls.filter((c) => c.status !== 'Escalated').length;
        setAiResolved(resolved);
        const durations = calls.map((c) => durationToSeconds(c.duration)).filter((s) => s > 0);
        if (durations.length > 0) {
          const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
          setAvgDuration(secondsToDisplay(avg));
        } else {
          setAvgDuration('—');
        }
      })
      .catch((err) => {
        console.error('[Calls] Failed to load call stats:', err);
        setAiResolved(0);
        setAvgDuration('—');
      });
  }, []);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Calls &amp; Triage Stream</h1>
            <p className="text-xs text-gray-500">
              Live log of incoming patient calls handled by Aura with auto-transcriptions and extracted clinical triage data.
            </p>
          </div>
        </div>

        {/* Quick stat chips — derived from real call records */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            {aiResolved === null ? '…' : aiResolved} AI Resolved
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Avg Duration: {avgDuration ?? '…'}
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            NHS Secure
          </span>
        </div>
      </div>

      {/* Calls Table with Details Drawer */}
      <div className="flex-1 min-h-0 flex flex-col">
        <CallsTable fullHeight />
      </div>
    </div>
  );
}
