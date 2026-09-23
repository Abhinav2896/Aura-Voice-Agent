'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getCallVolume } from '@/lib/services';
import { CHART_COLORS } from '@/lib/constants';
import type { CallVolumeDay } from '@/lib/types';
import { BarChart3, ChevronDown, AlertCircle, RotateCcw } from 'lucide-react';

export function CallVolumeChart() {
  const [data, setData] = useState<CallVolumeDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCallVolume();
      setData(res);
    } catch (err) {
      console.error('[CallVolumeChart] Error loading call volume:', err);
      setError('Unable to load live practice data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm h-[350px] min-h-[350px] flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h3 className="text-base font-semibold text-gray-900">Call Volume</h3>
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
            Last 7 days
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Number of calls received and handled by Aura
        </p>
      </div>

      {/* Body: Error State */}
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-red-50/40 border border-red-100 rounded-lg text-center space-y-2.5">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <p className="text-xs font-medium text-red-700">{error}</p>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      ) : loading && data.length === 0 ? (
        /* Body: Loading Skeleton */
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-[240px] bg-gray-50/80 rounded-lg animate-pulse flex items-end justify-between px-6 pb-4 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="w-8 bg-gray-200 rounded-t" style={{ height: `${20 + (i % 4) * 25}%` }} />
            ))}
          </div>
        </div>
      ) : (
        /* Chart */
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barGap={2} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                fontSize: '12px',
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />
            <Bar
              dataKey="aiHandled"
              name="AI Handled"
              fill={CHART_COLORS.aiHandled}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="escalated"
              name="Escalated"
              fill={CHART_COLORS.escalated}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
