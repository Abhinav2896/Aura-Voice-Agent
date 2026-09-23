// ============================================================================
// Escalation Service
// Connects to FastAPI / Supabase backend. Pure database-driven (no mock fallback).
// ============================================================================

export interface EscalationRecord {
  id: string;
  referenceId: string;
  patientName: string;
  patientPhone?: string;
  reason: string;
  priority: string;
  transferredTo: string;
  status: string;
  notes?: string;
  createdAt: string;
}

import { adminFetch } from './adminFetch';

export async function getEscalations(): Promise<EscalationRecord[]> {
  const data = await adminFetch<any[]>('/api/escalations');
  return data.map((e: any) => ({
    id: e.id,
    referenceId: e.reference_id ?? e.id,
    patientName: e.patient_name,
    patientPhone: e.patient_phone,
    reason: e.reason,
    priority: e.priority ?? 'Urgent',
    transferredTo: e.transferred_to ?? 'Duty Clinician',
    status: e.status,
    notes: e.notes,
    createdAt: e.created_at
  }));
}
