// ============================================================================
// Call Service
// Connects to FastAPI / Supabase backend. Pure database-driven (no mock fallback).
// ============================================================================

import type { Call, CallFilter, CallVolumeDay } from '../types';
import { adminFetch } from './adminFetch';

export async function getCalls(filter?: CallFilter): Promise<Call[]> {
  const params = new URLSearchParams();
  if (filter?.tab) params.set('tab', filter.tab);
  if (filter?.status) params.set('status', filter.status);
  if (filter?.caller_type && filter.caller_type !== 'all') params.set('caller_type', filter.caller_type);

  return adminFetch<Call[]>(`/api/calls?${params.toString()}`);
}

export async function getCallById(id: number | string): Promise<Call | null> {
  let data: any;
  try {
    data = await adminFetch<any>(`/api/calls/${id}`);
  } catch (e: any) {
    // Preserve the previous "not found -> null" contract for callers.
    if (e?.status === 404) return null;
    throw e;
  }
  return {
    id: data.call_number ?? id,
    uuid: data.id,
    user_id: data.user_id,
    callerType: data.callerType ?? data.caller_type ?? (data.user_id ? 'patient' : 'guest'),
    caller_type: data.caller_type ?? data.callerType ?? (data.user_id ? 'patient' : 'guest'),
    patientProfile: data.patientProfile ?? data.patient_profile,
    time: data.created_at ? data.created_at.slice(11, 16) : '10:00 AM',
    caller: data.caller_name ?? data.caller ?? 'Anonymous',
    intent: data.intent ?? 'Appointment',
    summary: data.summary ?? '',
    duration: data.duration_display ?? data.duration ?? '1:30',
    status: data.status ?? 'Pending',
    urgency: data.urgency ?? 'routine',
    extractedData: data.extractedData ?? data.extracted_data ?? {},
    actionTaken: data.actionTaken ?? data.action_taken ?? 'Processed by Aura AI',
    escalationState: data.escalationState ?? data.escalation_state ?? 'None',
    requires_human_review: data.requires_human_review ?? true,
    transcript: data.transcript ?? data.messages?.map((m: any) => ({
      speaker: m.role === 'assistant' ? 'Aura' : 'Caller',
      text: m.content,
      time: m.created_at ? m.created_at.slice(11, 16) : ''
    })) ?? []
  } as Call;
}

export async function getCallVolume(range: string = 'last7days'): Promise<CallVolumeDay[]> {
  return adminFetch<CallVolumeDay[]>(`/api/calls-volume?range=${range}`);
}
