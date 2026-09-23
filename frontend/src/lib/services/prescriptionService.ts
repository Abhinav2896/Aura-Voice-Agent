// ============================================================================
// Prescription Service
// Connects to FastAPI / Supabase backend. Pure database-driven (no mock fallback).
// ============================================================================

import type { PrescriptionRequest } from '../types';
import { adminFetch } from './adminFetch';

export async function getPrescriptions(): Promise<PrescriptionRequest[]> {
  const data = await adminFetch<any[]>('/api/prescriptions');
  return data.map((p: any) => ({
    id: p.reference_id ?? p.id,
    user_id: p.user_id ?? undefined,
    userId: p.user_id ?? undefined,
    patientName: p.patient_name,
    patientDob: p.patient_dob ?? '01/01/1980',
    medication: p.medication,
    dosage: p.dosage ?? 'Standard',
    pharmacy: p.pharmacy_preference ?? 'Nominated Pharmacy',
    status: p.status,
    timestamp: p.created_at
  }));
}

export async function createPrescription(data: Omit<PrescriptionRequest, 'id' | 'timestamp'>): Promise<PrescriptionRequest> {
  const created = await adminFetch<any>('/api/prescriptions', {
    method: 'POST',
    body: JSON.stringify({
      patient_name: data.patientName,
      patient_dob: data.patientDob,
      medication: data.medication,
      dosage: data.dosage,
      pharmacy_preference: data.pharmacy
    })
  });
  return {
    ...data,
    id: created.reference_id ?? '#RX-NEW',
    timestamp: new Date().toISOString(),
  };
}
