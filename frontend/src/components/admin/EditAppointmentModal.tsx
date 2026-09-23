'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Phone,
  Save,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { updateAppointment } from '@/lib/services';
import type { AppointmentRequest } from '@/lib/types';
import { CallerTypePill } from '@/components/ui/CallerTypePill';

export interface EditableAppointment {
  id: string; // display reference_id (#APT-XXXX)
  dbId?: string; // row UUID
  isRegistered?: boolean;
  user_id?: string;
  userId?: string;
  patientName: string;
  callerPhone?: string;
  reason: string;
  urgency: string;
  preferredDate?: string;
  preferredTime?: string;
  status: string;
  notes?: string;
}

interface EditAppointmentModalProps {
  isOpen: boolean;
  appointment: EditableAppointment | null;
  onClose: () => void;
  onSaved: (updated: AppointmentRequest) => void;
}

const STATUS_OPTIONS = [
  { value: 'pending_review', label: 'Pending Review', color: 'amber', icon: Clock },
  { value: 'confirmed', label: 'Confirmed', color: 'emerald', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Cancelled', color: 'rose', icon: X },
  { value: 'completed', label: 'Completed', labelFull: 'Completed Consultation', color: 'blue', icon: ShieldCheck },
] as const;

// Helper to format a time string to 12-hour AM/PM if needed
function formatToAmPm(timeStr: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  // If already contains AM or PM
  if (/am|pm/i.test(trimmed)) return trimmed;

  // If 24-hr format "HH:MM"
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
    return `${hourStr}:${minute} ${ampm}`;
  }
  return trimmed;
}

// Helper to convert AM/PM or arbitrary string to "HH:MM" for <input type="time">
function to24HourInput(timeStr: string): string {
  if (!timeStr) return '09:00';
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return '09:00';
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const ampm = match[3]?.toLowerCase();
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${minute}`;
}

export function EditAppointmentModal({
  isOpen,
  appointment,
  onClose,
  onSaved,
}: EditAppointmentModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState('pending_review');
  const [urgency, setUrgency] = useState('routine');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form state when appointment opens
  useEffect(() => {
    if (appointment) {
      setDate(appointment.preferredDate || '');
      // If preferredTime is an interval or string, normalize
      setTime(formatToAmPm(appointment.preferredTime || '09:30 AM'));
      setStatus(appointment.status || 'pending_review');
      setUrgency(appointment.urgency || 'routine');
      setPatientName(appointment.patientName || '');
      setPatientPhone(appointment.callerPhone || '');
      setReason(appointment.reason || '');
      setNotes(appointment.notes || '');
      setError(null);
    }
  }, [appointment]);

  // Quick date shortcuts
  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setDate(d.toISOString().split('T')[0]);
  };

  // Quick next Monday shortcut
  const setNextMonday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (8 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    setDate(d.toISOString().split('T')[0]);
  };

  if (!isOpen || !appointment) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = appointment.dbId || appointment.id;
    if (!targetId) {
      setError('Missing appointment identifier.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updateAppointment(targetId, {
        status,
        preferredDate: date.trim() || undefined,
        preferredTime: time.trim() || undefined,
        urgency,
        patientName: patientName.trim() || undefined,
        patientPhone: patientPhone.trim() || undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim(),
      });

      onSaved(updated);
      onClose();
    } catch (err: any) {
      console.error('[EditAppointmentModal] Failed to update appointment:', err);
      setError(err?.message || 'Failed to save appointment changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">Edit Appointment</h2>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200">
                  {appointment.id}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Modify schedule, exact hour & minute, clinician notes, and confirmation status.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Patient Overview Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                {patientName.charAt(0).toUpperCase() || 'P'}
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                  <span>{patientName || 'Unknown Patient'}</span>
                  <CallerTypePill type={(appointment.isRegistered ?? Boolean(appointment.user_id || appointment.userId)) ? 'patient' : 'guest'} />
                </div>
                <div className="text-gray-500 flex items-center gap-1 text-[11px]">
                  <Phone className="w-3 h-3 text-gray-400" />
                  <span>{patientPhone || 'No phone provided'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Section: Date & Any Customizable Hour/Minute */}
          <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100/80 pb-2">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Appointment Schedule (Custom Time & Date)
              </span>
              <span className="text-[11px] text-blue-700 font-medium">
                Customize to any hour or exact minute
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Appointment Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                  />
                </div>

                {/* Quick Date Chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className="px-2 py-0.5 text-[10.5px] font-medium bg-white hover:bg-blue-50 text-gray-700 border border-gray-200 hover:border-blue-200 rounded-md transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="px-2 py-0.5 text-[10.5px] font-medium bg-white hover:bg-blue-50 text-gray-700 border border-gray-200 hover:border-blue-200 rounded-md transition-colors cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(2)}
                    className="px-2 py-0.5 text-[10.5px] font-medium bg-white hover:bg-blue-50 text-gray-700 border border-gray-200 hover:border-blue-200 rounded-md transition-colors cursor-pointer"
                  >
                    +2 Days
                  </button>
                  <button
                    type="button"
                    onClick={setNextMonday}
                    className="px-2 py-0.5 text-[10.5px] font-medium bg-white hover:bg-blue-50 text-gray-700 border border-gray-200 hover:border-blue-200 rounded-md transition-colors cursor-pointer"
                  >
                    Next Monday
                  </button>
                </div>
              </div>

              {/* Exact Customizable Hour & Minute Time Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Appointment Time (Any Hour & Minute)
                </label>
                <div className="flex items-center gap-2">
                  {/* Native Time picker for picking ANY minute */}
                  <input
                    type="time"
                    value={to24HourInput(time)}
                    onChange={(e) => setTime(formatToAmPm(e.target.value))}
                    className="px-3 py-2 text-xs font-mono font-medium bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs w-32 cursor-pointer"
                  />
                  {/* Text representation so user can type whatever custom string they want */}
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="e.g. 10:15 AM or 02:40 PM"
                    className="flex-1 px-3 py-2 text-xs font-medium bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                  />
                </div>

                {/* Quick Time Preset Chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {['09:00 AM', '10:15 AM', '11:30 AM', '02:00 PM', '03:45 PM', '04:30 PM'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setTime(slot)}
                      className={`px-2 py-0.5 text-[10.5px] font-medium rounded-md transition-colors cursor-pointer ${
                        time.toLowerCase() === slot.toLowerCase()
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-white hover:bg-blue-50 text-gray-700 border border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Status & Urgency Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Request Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? opt.value === 'confirmed'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                            : opt.value === 'cancelled'
                            ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs'
                            : opt.value === 'completed'
                            ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-2xs'
                            : 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Urgency Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">
                Clinical Urgency
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUrgency('routine')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    urgency === 'routine'
                      ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-2xs'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>Routine</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('urgent')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    urgency === 'urgent'
                      ? 'bg-red-50 border-red-300 text-red-800 shadow-2xs'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  <span>Urgent</span>
                </button>
              </div>
            </div>
          </div>

          {/* Clinician / Staff Notes (Synced with Patient Portal & Tracking) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700">
                Staff / Clinician Notes & Instructions
              </label>
              <span className="text-[10.5px] text-blue-600 font-medium">
                Visible to patient in Portal & Reference Tracking
              </span>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Assigned to Dr. Sarah Jenkins, Room 3. Please arrive 10 minutes prior for blood pressure check."
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400"
            />
          </div>

          {/* Clinical Reason / Chief Complaint */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              Clinical Reason / Patient Symptoms
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for consultation..."
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Changes will immediately update Patient Portal & Guest Tracking</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
