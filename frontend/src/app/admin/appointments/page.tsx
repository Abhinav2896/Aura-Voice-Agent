'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  RotateCcw,
  XCircle,
  Pencil
} from 'lucide-react';
import { getAppointments, updateAppointmentStatus } from '@/lib/services';
import { CallerTypePill } from '@/components/ui/CallerTypePill';
import { EditAppointmentModal, type EditableAppointment } from '@/components/admin/EditAppointmentModal';
import type { AppointmentRequest } from '@/lib/types';
import { formatTimeAgo } from '@/lib/timeAgo';

interface AppointmentItem {
  id: string;
  dbId?: string;
  user_id?: string;
  userId?: string;
  isRegistered: boolean;
  patientName: string;
  callerPhone?: string;
  reason: string;
  urgency: string;
  preferredDate?: string;
  preferredTime: string;
  status: string;
  notes?: string;
  timeAgo: string;
}

function mapAppointment(a: AppointmentRequest | any): AppointmentItem {
  const isRegistered = Boolean(a.user_id || a.userId);
  return {
    id: a.id,
    dbId: a.dbId,
    user_id: a.user_id || a.userId,
    userId: a.user_id || a.userId,
    isRegistered,
    patientName: a.callerName ?? a.patientName ?? a.patient_name ?? 'Anonymous',
    callerPhone: a.callerPhone ?? a.patient_phone,
    reason: a.reason,
    urgency: a.urgency ?? 'routine',
    preferredDate: a.preferredDate ?? a.preferred_date,
    preferredTime: a.preferredTime ?? a.preferred_time ?? 'Anytime',
    status: a.status,
    notes: a.notes,
    timeAgo: formatTimeAgo(a.timestamp ?? a.createdAt),
  };
}

const isPending = (s: string) => s === 'pending_review' || s === 'pending';
const isConfirmed = (s: string) => s === 'confirmed';
const isCancelled = (s: string) => s === 'cancelled';

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  // Edit modal state
  const [editingAppointment, setEditingAppointment] = useState<AppointmentItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAppointments();
      setAppointments(data.map(mapAppointment));
    } catch (err) {
      console.error('[Appointments] Error loading appointments:', err);
      setError('Unable to load appointment requests from the practice database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = appointments.filter((apt) => {
    const matchesSearch =
      apt.patientName.toLowerCase().includes(search.toLowerCase()) ||
      apt.reason.toLowerCase().includes(search.toLowerCase()) ||
      (apt.notes && apt.notes.toLowerCase().includes(search.toLowerCase())) ||
      apt.id.toLowerCase().includes(search.toLowerCase());
    if (filter === 'pending') return matchesSearch && isPending(apt.status);
    if (filter === 'confirmed') return matchesSearch && isConfirmed(apt.status);
    return matchesSearch;
  });

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const changeStatus = async (item: AppointmentItem, status: 'confirmed' | 'cancelled') => {
    if (!item.dbId) {
      setActionError('This request is missing its database id and cannot be updated.');
      return;
    }
    setActionError(null);
    setUpdatingId(item.id);
    // Optimistic update
    const previousStatus = item.status;
    setAppointments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status } : a)));
    try {
      const saved = await updateAppointmentStatus(item.dbId, status);
      setAppointments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: saved } : a)));
    } catch (err) {
      console.error('[Appointments] Failed to update status:', err);
      setActionError('Could not save the status change. Please try again.');
      setAppointments((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: previousStatus } : a)));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAppointmentSaved = (updated: AppointmentRequest) => {
    const mapped = mapAppointment(updated);
    setAppointments((prev) =>
      prev.map((item) =>
        item.id === mapped.id || (item.dbId && item.dbId === mapped.dbId) ? mapped : item
      )
    );
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Appointment Requests Queue</h1>
            <p className="text-xs text-gray-500">
              Patient appointments triaged and collected by Aura. Review clinical symptoms, customize any slot or date, edit clinician notes, and confirm.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === 'all' ? 'bg-blue-600 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({appointments.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === 'pending' ? 'bg-amber-600 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending Review ({appointments.filter((a) => isPending(a.status)).length})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === 'confirmed' ? 'bg-emerald-600 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Confirmed ({appointments.filter((a) => isConfirmed(a.status)).length})
          </button>
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
              placeholder="Search by patient name, reason, or ref code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium">
              Showing {filtered.length} appointment requests
            </span>
            <button
              onClick={loadData}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh Queue"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {actionError && (
          <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            {actionError}
          </div>
        )}

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
            Loading appointment requests…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm text-gray-400">
            No appointment requests found.
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Ref #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Clinical Reason / Symptoms</th>
                  <th className="py-3 px-4">Scheduled Slot</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filtered.map((apt) => (
                  <tr key={apt.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-blue-600">
                      {apt.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[11px]">
                          {apt.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900">{apt.patientName}</span>
                            <CallerTypePill type={apt.isRegistered ? 'patient' : 'guest'} />
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {apt.callerPhone ? `${apt.callerPhone} • ` : ''}Via Aura • {apt.timeAgo}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-gray-700">
                      <div className="font-medium text-gray-900 truncate" title={apt.reason}>
                        {apt.reason}
                      </div>
                      {apt.notes && (
                        <div
                          className="mt-1 flex items-center gap-1 text-[10.5px] text-blue-800 bg-blue-50/90 px-2 py-0.5 rounded-md border border-blue-100/90 max-w-xs truncate"
                          title={`Practice Note: ${apt.notes}`}
                        >
                          <span className="font-semibold shrink-0">Note:</span>
                          <span className="truncate">{apt.notes}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                          <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>{apt.preferredDate || 'Earliest available'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                          <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{apt.preferredTime}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {apt.urgency !== 'routine' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          {apt.urgency === 'urgent' ? 'Urgent' : apt.urgency}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          Routine
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {isConfirmed(apt.status) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Confirmed
                        </span>
                      ) : isCancelled(apt.status) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-500" />
                          Cancelled
                        </span>
                      ) : isPending(apt.status) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                          Pending Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                          {apt.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {updatingId === apt.id ? (
                        <span className="text-[11px] text-gray-400 font-medium">Saving…</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* EDIT BUTTON (Opens customized edit modal) */}
                          <button
                            onClick={() => {
                              setEditingAppointment(apt);
                              setIsEditModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200 shadow-2xs transition-all cursor-pointer"
                            title="Edit appointment date, time, status, notes"
                          >
                            <Pencil className="w-3 h-3 text-blue-600" />
                            <span>Edit</span>
                          </button>

                          {/* Quick Actions */}
                          {isPending(apt.status) ? (
                            <>
                              <button
                                onClick={() => changeStatus(apt, 'confirmed')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => changeStatus(apt, 'cancelled')}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 shadow-2xs transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          ) : isConfirmed(apt.status) ? (
                            <button
                              onClick={() => changeStatus(apt, 'cancelled')}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 shadow-2xs transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          ) : isCancelled(apt.status) ? (
                            <button
                              onClick={() => changeStatus(apt, 'confirmed')}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 shadow-2xs transition-colors cursor-pointer"
                            >
                              Reinstate
                            </button>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Appointment Modal */}
      <EditAppointmentModal
        isOpen={isEditModalOpen}
        appointment={editingAppointment}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAppointment(null);
        }}
        onSaved={handleAppointmentSaved}
      />
    </div>
  );
}
