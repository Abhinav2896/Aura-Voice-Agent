// ============================================================================
// Enquiry Service
// Connects to FastAPI / Supabase backend. Pure database-driven (no mock fallback).
// ============================================================================

import type { AdminEnquiry } from '../types';
import { adminFetch } from './adminFetch';

export async function getEnquiries(): Promise<AdminEnquiry[]> {
  const data = await adminFetch<any[]>('/api/enquiries');
  return data.map((e: any) => ({
    id: e.reference_id ?? e.id,
    callerName: e.patient_name,
    callerPhone: e.patient_phone,
    topic: e.category,
    summary: e.query,
    responseSummary: e.response_summary,
    status: e.status,
    timestamp: e.created_at
  }));
}

export async function createEnquiry(data: Omit<AdminEnquiry, 'id' | 'timestamp'>): Promise<AdminEnquiry> {
  const created = await adminFetch<any>('/api/enquiries', {
    method: 'POST',
    body: JSON.stringify({
      patient_name: data.callerName,
      patient_phone: data.callerPhone,
      category: data.topic,
      query: data.summary,
      status: data.status
    })
  });
  return {
    ...data,
    id: created.reference_id ?? '#ADM-NEW',
    timestamp: new Date().toISOString(),
  };
}
