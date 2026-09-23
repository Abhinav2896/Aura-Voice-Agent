// ============================================================================
// Appointment Service
// Connects to FastAPI / Supabase backend. Pure database-driven (no mock fallback).
// ============================================================================

import type { AppointmentRequest } from '../types';
import { adminFetch } from './adminFetch';

export interface UpdateAppointmentInput {
  status?: 'confirmed' | 'cancelled' | 'pending_review' | 'completed' | string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
  reason?: string;
  urgency?: 'routine' | 'urgent' | string;
  patientName?: string;
  patientPhone?: string;
}

export async function getAppointments(): Promise<AppointmentRequest[]> {
  const data = await adminFetch<any[]>('/api/appointments');
  return data.map((a: any) => ({
    id: a.reference_id ?? a.id,
    dbId: a.id,
    user_id: a.user_id ?? undefined,
    userId: a.user_id ?? undefined,
    callerName: a.patient_name,
    callerPhone: a.patient_phone,
    reason: a.reason,
    preferredDate: a.preferred_date ?? undefined,
    preferredTime: a.preferred_time ?? undefined,
    urgency: a.urgency ?? 'routine',
    status: a.status,
    notes: a.notes ?? undefined,
    patientDob: a.patient_dob ?? undefined,
    timestamp: a.created_at
  }));
}

export async function createAppointment(data: Omit<AppointmentRequest, 'id' | 'timestamp'>): Promise<AppointmentRequest> {
  const created = await adminFetch<any>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify({
      patient_name: data.callerName,
      patient_phone: data.callerPhone,
      reason: data.reason,
      preferred_date: data.preferredDate,
      preferred_time: data.preferredTime,
      urgency: data.urgency,
      notes: data.notes
    })
  });
  return {
    ...data,
    id: created.reference_id ?? '#APT-NEW',
    timestamp: new Date().toISOString(),
  };
}

// Full update for an appointment request (date, custom time, status, notes, urgency, reason).
export async function updateAppointment(
  dbIdOrRef: string,
  input: UpdateAppointmentInput
): Promise<AppointmentRequest> {
  const payload: Record<string, any> = {};
  if (input.status !== undefined) payload.status = input.status;
  if (input.preferredDate !== undefined) payload.preferred_date = input.preferredDate;
  if (input.preferredTime !== undefined) payload.preferred_time = input.preferredTime;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.reason !== undefined) payload.reason = input.reason;
  if (input.urgency !== undefined) payload.urgency = input.urgency;
  if (input.patientName !== undefined) payload.patient_name = input.patientName;
  if (input.patientPhone !== undefined) payload.patient_phone = input.patientPhone;

  const updated = await adminFetch<any>(`/api/appointments/${encodeURIComponent(dbIdOrRef)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return {
    id: updated.reference_id ?? updated.id,
    dbId: updated.id,
    user_id: updated.user_id ?? undefined,
    userId: updated.user_id ?? undefined,
    callerName: updated.patient_name,
    callerPhone: updated.patient_phone,
    reason: updated.reason,
    preferredDate: updated.preferred_date ?? undefined,
    preferredTime: updated.preferred_time ?? undefined,
    urgency: updated.urgency ?? 'routine',
    status: updated.status,
    notes: updated.notes ?? undefined,
    patientDob: updated.patient_dob ?? undefined,
    timestamp: updated.created_at,
  };
}

// Persist a staff status change (confirm / cancel) to Supabase.
export async function updateAppointmentStatus(
  dbId: string,
  status: 'confirmed' | 'cancelled' | 'pending_review'
): Promise<string> {
  const updated = await updateAppointment(dbId, { status });
  return updated.status ?? status;
}
