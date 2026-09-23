'use client';

import { useEffect, useState, useCallback } from 'react';
import { HelpCircle, FileCheck, CheckCircle2, MessageSquare, Search, Info, AlertCircle, RotateCcw } from 'lucide-react';
import { getEnquiries } from '@/lib/services';
import type { AdminEnquiry } from '@/lib/types';
import { formatTimeAgo } from '@/lib/timeAgo';

interface EnquiryItem {
  id: string;
  patientName: string;
  category: string;
  query: string;
  auraResolution: string;
  status: string;
  timeAgo: string;
}

function humanizeCategory(raw?: string): string {
  if (!raw) return 'General';
  return raw
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function mapEnquiry(e: AdminEnquiry): EnquiryItem {
  return {
    id: e.id,
    patientName: e.callerName ?? e.patientName ?? 'Anonymous',
    category: humanizeCategory(e.topic),
    query: e.summary ?? e.details ?? '',
    auraResolution: e.responseSummary ?? 'Handled by Aura and logged for the practice team.',
    status: e.status,
    timeAgo: formatTimeAgo(e.timestamp ?? e.createdAt),
  };
}

const isResolved = (s: string) => s === 'answered' || s === 'resolved';

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEnquiries();
      setEnquiries(data.map(mapEnquiry));
    } catch (err) {
      console.error('[Enquiries] Error loading enquiries:', err);
      setError('Unable to load admin enquiries from the practice database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = enquiries.filter(
    (e) =>
      e.patientName.toLowerCase().includes(search.toLowerCase()) ||
      e.query.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
  );

  const resolvedCount = enquiries.filter((e) => isResolved(e.status)).length;
  const resolutionPct = enquiries.length > 0 ? Math.round((resolvedCount / enquiries.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Admin &amp; Test Result Enquiries</h1>
            <p className="text-xs text-gray-500">
              General enquiries, practice information, test result timeframes, and fit notes resolved by Aura AI or routed to reception.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {enquiries.length} Enquiries
          </span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            {resolutionPct}% First-Contact Resolution
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-2xs flex flex-col overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search enquiries, patient, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Showing {filtered.length} enquiries
          </span>
        </div>

        {/* Content: error / loading / empty / table */}
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-400">
            Loading enquiries…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-400">
            No enquiries found.
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Patient Query</th>
                  <th className="py-3 px-4">Aura Automated Resolution</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filtered.map((enq) => (
                  <tr key={enq.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-blue-600">{enq.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{enq.patientName}</div>
                      <div className="text-[10px] text-gray-400">Via Aura • {enq.timeAgo}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700">
                        {enq.category === 'Test Results' ? <FileCheck className="w-3.5 h-3.5 text-blue-600" /> : <Info className="w-3.5 h-3.5 text-purple-600" />}
                        {enq.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-gray-800 font-medium">
                      {enq.query}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm text-gray-600">
                      {enq.auraResolution}
                    </td>
                    <td className="py-3.5 px-4">
                      {isResolved(enq.status) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          AI Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <MessageSquare className="w-3 h-3 text-amber-600" />
                          Callback Scheduled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
