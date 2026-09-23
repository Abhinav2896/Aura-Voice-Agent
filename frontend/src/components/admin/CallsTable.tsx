'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCalls } from '@/lib/services';
import { CallsTableRow } from './CallsTableRow';
import { CallDetails } from './CallDetails';
import { Phone, Calendar, FileText, AlertTriangle, AlertCircle, RotateCcw, Filter } from 'lucide-react';
import type { Call } from '@/lib/types';

const TABS = [
  { key: 'recent', label: 'Recent Calls', icon: Phone },
  { key: 'appointments', label: 'Appointment Requests', icon: Calendar },
  { key: 'prescriptions', label: 'Prescription Requests', icon: FileText },
  { key: 'escalations', label: 'Escalations', icon: AlertTriangle },
] as const;

type CallerFilterType = 'all' | 'registered' | 'guest';

interface CallsTableProps {
  fullHeight?: boolean;
}

export function CallsTable({ fullHeight = false }: CallsTableProps) {
  const [activeTab, setActiveTab] = useState<string>('recent');
  const [callerFilter, setCallerFilter] = useState<CallerFilterType>('all');
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCalls = useCallback(async (tab: string, filter: CallerFilterType) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams: any = {};
      if (tab !== 'recent') {
        queryParams.tab = tab as 'appointments' | 'prescriptions' | 'escalations';
      }
      if (filter !== 'all') {
        queryParams.caller_type = filter;
      }
      const data = await getCalls(queryParams);
      setCalls(data);
    } catch (err) {
      console.error('[CallsTable] Error loading calls:', err);
      setError('Unable to load live practice data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalls(activeTab, callerFilter);
  }, [activeTab, callerFilter, loadCalls]);

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative ${
      fullHeight ? 'h-full flex flex-col' : ''
    }`}>
      {/* Tab Bar and Caller Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 border-b border-gray-100 gap-2 sm:gap-0 flex-shrink-0">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Filter by Caller Type (All / Registered / Guest) */}
        <div className="flex items-center gap-2 pb-2 sm:pb-0">
          <div className="inline-flex p-0.5 bg-gray-100/90 rounded-lg border border-gray-200/60 text-xs">
            <button
              onClick={() => setCallerFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                callerFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCallerFilter('registered')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                callerFilter === 'registered'
                  ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-emerald-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Registered
            </button>
            <button
              onClick={() => setCallerFilter('guest')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1 ${
                callerFilter === 'guest'
                  ? 'bg-white text-gray-800 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Guests
            </button>
          </div>

          <span className="text-[11px] text-gray-400 font-medium hidden md:inline ml-1">
            {calls.length} calls
          </span>
        </div>
      </div>

      {/* Body: Error State */}
      {error ? (
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-2.5 bg-red-50/30">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <p className="text-xs font-medium text-red-700">{error}</p>
          <button
            onClick={() => loadCalls(activeTab, callerFilter)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      ) : loading && calls.length === 0 ? (
        /* Body: Loading Skeleton */
        <div className="p-6 space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-50 rounded flex items-center px-4 gap-6">
              <div className="w-8 h-4 bg-gray-200 rounded" />
              <div className="w-16 h-4 bg-gray-200 rounded" />
              <div className="w-24 h-4 bg-gray-200 rounded" />
              <div className="flex-1 h-4 bg-gray-100 rounded" />
              <div className="w-16 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : calls.length === 0 ? (
        /* Body: Empty State */
        <div className="p-12 text-center text-xs text-gray-400">
          No records found for this view.
        </div>
      ) : (
        /* Table — Scrollable box with sticky header */
        <div className={`overflow-x-auto overflow-y-auto admin-scrollbar relative ${
          fullHeight
            ? 'flex-1 min-h-0'
            : 'min-h-[190px] max-h-[270px] 2xl:max-h-[320px]'
        }`}>
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-xs z-10 shadow-2xs">
              <tr className="border-b border-gray-200/80">
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caller</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intent</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="py-2.5 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calls.map((call) => (
                <CallsTableRow key={call.id} call={call} onView={setSelectedCall} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Call Details Drawer/Modal */}
      <CallDetails call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}
