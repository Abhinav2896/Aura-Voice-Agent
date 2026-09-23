'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getRequestTypes } from '@/lib/services';
import type { RequestTypeSlice } from '@/lib/types';
import { PieChart as PieChartIcon, ChevronDown, AlertCircle, RotateCcw } from 'lucide-react';

export function RequestTypesChart() {
  const [data, setData] = useState<RequestTypeSlice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRequestTypes();
      setData(res);
    } catch (err) {
      console.error('[RequestTypesChart] Error loading request types:', err);
      setError('Unable to load live practice data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-4.5 xl:p-5 shadow-sm h-[350px] min-h-[350px] flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-purple-500" />
            <h3 className="text-base font-semibold text-gray-900">Request Types</h3>
          </div>
          <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
            All Time
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Breakdown of patient enquiry categories
        </p>
      </div>

      {/* Body: Error State */}
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-red-50/40 border border-red-100 rounded-lg text-center space-y-2.5 my-auto">
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
        <div className="flex-1 flex items-center justify-center my-auto">
          <div className="w-28 h-28 rounded-full border-4 border-gray-100 border-t-purple-400 animate-spin" />
        </div>
      ) : (
        /* Body: Donut + Legend centered vertically */
        <div className="flex-1 flex flex-col justify-center my-auto">
          <div className="flex items-center justify-between gap-3">
            {/* Donut */}
            <div className="relative w-[115px] h-[115px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-gray-900 leading-none">{total}</span>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold mt-0.5">Requests</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 min-w-0 space-y-1.5 ml-1">
              {data.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[12px] font-medium text-gray-700 truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-auto pl-1 text-right">
                    <span className="text-xs font-bold text-gray-900 tabular-nums">{item.value}</span>
                    <span className="text-[11px] text-gray-400 font-medium tabular-nums">({item.pct})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
