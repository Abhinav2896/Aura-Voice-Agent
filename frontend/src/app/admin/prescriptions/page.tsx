'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, CheckCircle2, Clock, Pill, Send, Building, Search, AlertCircle, RotateCcw } from 'lucide-react';
import { getPrescriptions } from '@/lib/services';
import { CallerTypePill } from '@/components/ui/CallerTypePill';
import type { PrescriptionRequest } from '@/lib/types';
import { formatTimeAgo } from '@/lib/timeAgo';

interface PrescriptionItem {
  id: string;
  isRegistered: boolean;
  patientName: string;
  medication: string;
  dosage: string;
  pharmacy: string;
  status: string;
  timeAgo: string;
}

function mapPrescription(p: PrescriptionRequest | any): PrescriptionItem {
  return {
    id: p.id,
    isRegistered: Boolean(p.user_id || p.userId),
    patientName: p.patientName ?? p.patient_name ?? 'Anonymous',
    medication: p.medication ?? p.medicationName ?? 'Medication',
    dosage: p.dosage ?? 'Standard repeat',
    pharmacy: p.pharmacy ?? 'Nominated Pharmacy',
    status: p.status,
    timeAgo: formatTimeAgo(p.timestamp ?? p.createdAt),
  };
}

const isAwaiting = (s: string) => s === 'pending_signature' || s === 'pending';
const isSent = (s: string) => s === 'approved';
const isDispensed = (s: string) => s === 'dispensed';

export default function AdminPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPrescriptions();
      setPrescriptions(data.map(mapPrescription));
    } catch (err) {
      console.error('[Prescriptions] Error loading prescriptions:', err);
      setError('Unable to load prescription requests from the practice database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = (id: string) => {
    setPrescriptions((prev) =>
      prev.map((rx) => (rx.id === id ? { ...rx, status: 'approved' } : rx))
    );
  };

  const filtered = prescriptions.filter(
    (p) =>
      p.patientName.toLowerCase().includes(search.toLowerCase()) ||
      p.medication.toLowerCase().includes(search.toLowerCase()) ||
      p.pharmacy.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Repeat Prescription Requests</h1>
            <p className="text-xs text-gray-500">
              Repeat medication orders captured and validated by Aura against EPS records. Review dosages, sign off, and transmit to nominated pharmacies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
            {prescriptions.length} Orders
          </span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            EPS Connected
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
              placeholder="Search medication, patient, or pharmacy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Showing {filtered.length} prescription requests
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
            Loading prescription requests…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-400">
            No prescription requests found.
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Rx Ref #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Medication &amp; Dosage</th>
                  <th className="py-3 px-4">Nominated Pharmacy</th>
                  <th className="py-3 px-4">EPS Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filtered.map((rx) => (
                  <tr key={rx.id} className="hover:bg-purple-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-purple-600">{rx.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900">{rx.patientName}</span>
                        <CallerTypePill type={rx.isRegistered ? 'patient' : 'guest'} />
                      </div>
                      <div className="text-[10px] text-gray-400">Via Aura • {rx.timeAgo}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-purple-100/70 flex items-center justify-center text-purple-700">
                          <Pill className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{rx.medication}</div>
                          <div className="text-[11px] text-gray-500">{rx.dosage}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <Building className="w-3.5 h-3.5 text-gray-400" />
                        {rx.pharmacy}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {isSent(rx.status) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Send className="w-3 h-3 text-blue-500" />
                          Sent to Pharmacy
                        </span>
                      ) : isDispensed(rx.status) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Dispensed
                        </span>
                      ) : isAwaiting(rx.status) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                          Awaiting GP Signature
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                          {rx.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isAwaiting(rx.status) ? (
                        <button
                          onClick={() => handleApprove(rx.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition-colors cursor-pointer"
                        >
                          Approve &amp; Send
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-500 font-medium">Processed</span>
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
