'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Zap, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react';
import { getRecentActivity } from '@/lib/services';
import type { ActivityItem } from '@/lib/types';

export function RecentActivity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRecentActivity();
      setItems(res);
    } catch (err) {
      console.error('[RecentActivity] Error loading activity:', err);
      setError('Unable to load live practice data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col h-[350px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
          <span className="text-[10.5px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        </div>
        <span className="text-[10.5px] text-gray-400 font-medium">Live from DB</span>
      </div>

      {/* Body: Error State */}
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-red-50/40 border border-red-100 rounded-lg text-center space-y-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-xs font-medium text-red-700">{error}</p>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      ) : loading && items.length === 0 ? (
        /* Body: Loading Skeleton */
        <div className="flex-1 space-y-2.5 p-1 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50/60">
              <div className="w-7 h-7 rounded-lg bg-gray-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-28 bg-gray-200 rounded" />
                <div className="h-2 w-16 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
          No recent activity recorded yet.
        </div>
      ) : (
        /* Items — Scrollable box */
        <div className="space-y-2 overflow-y-auto pr-1.5 flex-1 admin-scrollbar">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50/80 transition-colors cursor-pointer group border border-transparent hover:border-gray-100"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50/70 flex items-center justify-center flex-shrink-0">
                <Image src={`/assets/${item.icon}.svg`} alt="" width={15} height={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{item.title}</p>
                <p className="text-[10.5px] text-gray-400">
                  {item.callId} · {item.timeAgo}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
