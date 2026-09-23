import { apiFetch } from './apiClient';
import type { PatientProfile, GuestLookupResult, Call, AppointmentRequest, PrescriptionRequest } from '../types';

export async function getMyProfile(): Promise<PatientProfile> {
  return apiFetch<PatientProfile>('/api/patient/me');
}

export async function updateMyProfile(data: Partial<PatientProfile>): Promise<PatientProfile> {
  return apiFetch<PatientProfile>('/api/patient/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getMyAppointments(): Promise<AppointmentRequest[]> {
  return apiFetch<AppointmentRequest[]>('/api/patient/appointments');
}

export async function getMyPrescriptions(): Promise<PrescriptionRequest[]> {
  return apiFetch<PrescriptionRequest[]>('/api/patient/prescriptions');
}

export async function getMyCalls(): Promise<Call[]> {
  return apiFetch<Call[]>('/api/patient/calls');
}

export async function getMyCallDetail(callId: string): Promise<Call> {
  return apiFetch<Call>(`/api/patient/calls/${callId}`);
}

export async function lookupGuestRequest(reference_id: string, phone: string): Promise<GuestLookupResult> {
  return apiFetch<GuestLookupResult>('/api/guest/lookup', {
    method: 'POST',
    body: JSON.stringify({ reference_id, phone }),
  });
}
