'use client';

import { useEffect, useState, useCallback } from 'react';
import { KpiCard } from './KpiCard';
import { getKpis } from '@/lib/services';
import type { KpiItem } from '@/lib/types';
import { AlertCircle, RotateCcw } from 'lucide-react';

export function KpiRow() {
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getKpis();
      setKpis(data);
    } catch (err) {
      console.error('[KpiRow] Error loading KPIs:', err);
      setError('Unable to load live practice data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (error && kpis.length === 0) {
    return (
      <div className="flex items-center justify-between p-3.5 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-700">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1 bg-white border border-red-300 rounded-lg font-medium text-red-700 hover:bg-red-100/60 transition-colors shadow-2xs"
        >
          <RotateCcw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  if (loading && kpis.length === 0) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 admin-scrollbar">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex-1 min-w-[150px] bg-white rounded-xl border border-gray-100 p-4 shadow-sm animate-pulse space-y-2"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
            <div className="h-6 w-12 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 admin-scrollbar">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.title} {...kpi} />
      ))}
    </div>
  );
}
