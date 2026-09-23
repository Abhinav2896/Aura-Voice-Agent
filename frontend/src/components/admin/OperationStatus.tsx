'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
import { getOperationStatus } from '@/lib/services';
import type { OperationStatusItem } from '@/lib/types';

export function OperationStatus() {
  const [items, setItems] = useState<OperationStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOperationStatus();
      setItems(res);
    } catch (err) {
      console.error('[OperationStatus] Error loading operation status:', err);
      setError('Unable to load live practice data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-500" />
        <h3 className="text-sm font-semibold text-gray-900">Operation Status</h3>
      </div>

      {/* Body: Error State */}
      {error ? (
        <div className="flex items-center justify-between p-3 bg-red-50/50 border border-red-100 rounded-lg text-xs text-red-700">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1 px-2 py-0.5 bg-white border border-red-200 rounded text-[11px] font-semibold text-red-700 hover:bg-red-50 transition-colors"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Retry
          </button>
        </div>
      ) : loading && items.length === 0 ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-5 bg-gray-50 rounded" />
          ))}
        </div>
      ) : (
        /* Status rows */
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 status-dot-online" />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <span className="text-sm font-medium text-green-600">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
