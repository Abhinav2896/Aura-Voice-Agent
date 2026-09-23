'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, ShieldAlert, Stethoscope, Search, AlertCircle, RotateCcw } from 'lucide-react';
import { getEscalations, type EscalationRecord } from '@/lib/services';
import { CallerTypePill } from '@/components/ui/CallerTypePill';
import { formatTimeAgo } from '@/lib/timeAgo';

interface EscalationItem {
  id: string;
  isRegistered: boolean;
  patientName: string;
  symptoms: string;
  assignedDutyStaff: string;
  triageOutcome: string;
  priority: string;
  status: string;
  timeAgo: string;
}

function mapEscalation(e: EscalationRecord | any): EscalationItem {
  return {
    id: e.referenceId ?? e.id,
    isRegistered: Boolean(e.user_id || e.userId),
    patientName: e.patientName ?? e.patient_name ?? 'Anonymous',
    symptoms: e.reason,
    assignedDutyStaff: e.transferredTo ?? 'Duty Clinician',
    triageOutcome: e.notes ?? 'Escalated to the duty clinician for immediate review.',
    priority: e.priority ?? 'Urgent',
    status: e.status ?? 'Escalated',
    timeAgo: formatTimeAgo(e.createdAt),
  };
}

export default function AdminEscalationsPage() {
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEscalations();
      setEscalations(data.map(mapEscalation));
    } catch (err) {
      console.error('[Escalations] Error loading escalations:', err);
      setError('Unable to load clinical escalations from the practice database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = escalations.filter(
    (e) =>
      e.patientName.toLowerCase().includes(search.toLowerCase()) ||
      e.symptoms.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Alert Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-red-50/70 rounded-2xl border border-red-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-700">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-red-950">Clinical Escalations &amp; Emergency Triage</h1>
            <p className="text-xs text-slate-500 mt-1">
              High-priority clinical safety triggers intercepted by Aura Voice Agent. Immediate duty clinician handoffs and 999 safety-net records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white shadow-xs flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {escalations.length} Escalations
          </span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-red-800 border border-red-200">
            Zero Dropped Calls
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
              placeholder="Search by patient name, symptom, or doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Showing {filtered.length} priority escalations
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
            Loading clinical escalations…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-400">
            No clinical escalations found.
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Escalation ID</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Red-Flag Symptoms</th>
                  <th className="py-3 px-4">Duty Clinician Assigned</th>
                  <th className="py-3 px-4">Triage Outcome</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filtered.map((esc) => (
                  <tr key={esc.id} className="hover:bg-red-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-red-600">{esc.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">{esc.patientName}</span>
                        <CallerTypePill type={esc.isRegistered ? 'patient' : 'guest'} />
                      </div>
                      <div className="text-[10px] text-gray-400">Via Aura • {esc.timeAgo}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-red-950 font-medium">
                      {esc.symptoms}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-800">
                        <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                        {esc.assignedDutyStaff}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-gray-600 text-[11.5px]">
                      {esc.triageOutcome}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        {esc.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        {esc.status}
                      </span>
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
