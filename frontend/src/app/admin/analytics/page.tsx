'use client';

import { useEffect, useState } from 'react';
import { CallVolumeChart } from '@/components/admin/CallVolumeChart';
import { RequestTypesChart } from '@/components/admin/RequestTypesChart';
import { BarChart3, TrendingUp, CheckCircle2, AlertTriangle, CalendarClock } from 'lucide-react';
import { getKpis } from '@/lib/services';
import type { KpiItem } from '@/lib/types';

export default function AdminAnalyticsPage() {
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getKpis()
      .then(setKpis)
      .catch((err) => console.error('[Analytics] Failed to load KPIs:', err))
      .finally(() => setLoaded(true));
  }, []);

  const byId = (id: string) => kpis.find((k) => k.id === id);
  const totalCalls = byId('total-calls');
  const handledByAi = byId('handled-by-ai');
  const escalated = byId('escalated-to-staff');
  const appointments = byId('appointment-requests');

  const autoResolvedPct = handledByAi?.trend ?? '—';

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Practice Performance &amp; AI Analytics</h1>
            <p className="text-xs text-gray-500">
              Operational metrics on call volumes, automated patient resolutions, and clinical triage load.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
            {loaded ? `${autoResolvedPct} Auto-Resolved` : 'Loading…'}
          </span>
        </div>
      </div>

      {/* KPI Highlights — derived from real dashboard data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Total Patient Calls</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{loaded ? (totalCalls?.value ?? 0) : '—'}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">{totalCalls?.trendLabel ?? 'total logged'}</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Handled by AI</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{loaded ? (handledByAi?.value ?? 0) : '—'}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">{handledByAi?.trend ?? '0%'} automated</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Escalated to Staff</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{loaded ? (escalated?.value ?? 0) : '—'}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">{escalated?.trend ?? '0%'} needs review</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Appointment Requests</span>
            <CalendarClock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{loaded ? (appointments?.value ?? 0) : '—'}</div>
          <div className="text-[11px] text-purple-600 font-medium mt-1">{appointments?.trendLabel ?? 'triage queue'}</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-[340px]">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Daily Call Volume &amp; Automation Rate</h3>
          <div className="flex-1">
            <CallVolumeChart />
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Patient Intent Distribution</h3>
          <div className="flex-1">
            <RequestTypesChart />
          </div>
        </div>
      </div>
    </div>
  );
}
