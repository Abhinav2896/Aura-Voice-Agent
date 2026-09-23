// ============================================================================
// Aura — Shared TypeScript Types
// All interfaces used across patient and admin views.
// Shaped to match expected real API responses for easy swap.
// ============================================================================

// ── Voice types ──

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error' | 'disconnected';

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export type ToolName =
  | 'book_appointment'
  | 'create_appointment_request'
  | 'get_my_appointment'
  | 'request_prescription'
  | 'create_prescription_request'
  | 'submit_admin_enquiry'
  | 'create_admin_request'
  | 'get_practice_info'
  | 'get_practice_information'
  | 'escalate_to_staff'
  | 'escalate_to_reception'
  | 'save_call_summary';

export interface ToolCallRequest {
  id: string;
  name: ToolName;
  args: Record<string, unknown>;
}

export interface ToolCallResponse {
  id: string;
  result: Record<string, unknown>;
}

// Result of a tool the backend has already executed, relayed over the live
// socket. The frontend renders from this — it does NOT re-execute the tool.
export interface ToolResultPayload {
  id: string;
  name: ToolName;
  result: Record<string, unknown>;
}

export type PatientRequestStage = 'idle' | 'detecting' | 'collecting' | 'submitted' | 'lookup';

export type LookupState = 'found' | 'not_found' | 'multiple';

export interface PatientRequestField {
  label: string;
  value: string;
}

export interface PatientRequestInfo {
  stage: PatientRequestStage;
  intent?: string;
  type?: string;
  fields: PatientRequestField[];
  status: string;
  submittedAt?: string;
  referenceId?: string;
  nextAction?: string;
  lookupState?: LookupState;
  message?: string;
}

// ── Call / Dashboard types ──

export type IntentType = 'Appointment' | 'Prescription' | 'Escalated' | 'Admin';
export type StatusType = 'Pending' | 'Completed' | 'Escalated';
export type KpiColor = 'blue' | 'green' | 'purple' | 'amber' | 'red';

export interface CallDetailTranscript {
  speaker: 'Caller' | 'Aura';
  text: string;
  time: string;
}

export interface Call {
  id: number;
  uuid?: string;
  user_id?: string;
  caller_type?: 'patient' | 'guest';
  callerType?: 'patient' | 'guest';
  time: string;
  caller: string;
  intent: IntentType;
  summary: string;
  duration: string;
  status: StatusType;
  urgency?: string;
  created_at?: string;
  // Enhanced detail fields for CallDetails view
  transcript?: CallDetailTranscript[];
  extractedData?: {
    intent?: string;
    reason?: string;
    duration?: string;
    preferredTime?: string;
    urgency?: string;
    medication?: string;
    dosage?: string;
    requiresHumanReview?: boolean;
    [key: string]: unknown;
  };
  actionTaken?: string;
  escalationState?: string;
  patientProfile?: PatientProfile | null;
  patient_profile?: PatientProfile | null;
  messages?: Array<{
    id?: string;
    role: string;
    content: string;
    created_at?: string;
  }>;
}

export interface CallFilter {
  tab?: 'recent' | 'appointments' | 'prescriptions' | 'escalations';
  status?: StatusType;
  caller_type?: 'all' | 'registered' | 'guest';
}

export interface KpiItem {
  id: string;
  icon: string;
  title: string;
  value: number;
  trend: string;
  trendLabel: string;
  color: KpiColor;
}

export interface CallVolumeDay {
  date: string;
  aiHandled: number;
  escalated: number;
}

export interface RequestTypeSlice {
  label: string;
  value: number;
  pct: string;
  color: string;
}

export interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  callId: string;
  timeAgo: string;
}

export interface OperationStatusItem {
  label: string;
  status: 'online' | 'connected' | 'loaded' | 'operational';
  value: string;
}

// ── Appointment / Prescription / Enquiry types ──

export interface Appointment {
  id: string;
  dbId?: string; // Supabase row UUID (used for status updates); id holds the display reference
  user_id?: string;
  userId?: string;
  patientName?: string;
  callerName?: string;
  callerPhone?: string;
  reason: string;
  preferredDate?: string;
  preferredTime?: string;
  urgency: 'routine' | 'urgent' | string;
  status: 'pending' | 'pending_review' | 'confirmed' | 'cancelled' | string;
  notes?: string;
  patientDob?: string;
  createdAt?: string;
  timestamp?: string;
}
export type AppointmentRequest = Appointment;

export interface CreateAppointmentInput {
  patient_name: string;
  reason: string;
  preferred_date?: string;
  preferred_time?: string;
  urgency: 'routine' | 'urgent';
}

export interface Prescription {
  id: string;
  user_id?: string;
  userId?: string;
  patientName: string;
  patientDob?: string;
  medicationName?: string;
  medication?: string;
  dosage?: string;
  pharmacy?: string;
  notes?: string;
  status: 'pending' | 'pending_signature' | 'approved' | 'rejected' | string;
  createdAt?: string;
  timestamp?: string;
}
export type PrescriptionRequest = Prescription;

export interface CreatePrescriptionInput {
  patient_name: string;
  medication_name: string;
  dosage?: string;
  notes?: string;
}

export interface Enquiry {
  id: string;
  patientName?: string;
  callerName?: string;
  callerPhone?: string;
  subject?: string;
  topic?: string;
  details?: string;
  summary?: string;
  responseSummary?: string;
  status: 'received' | 'answered' | 'resolved' | 'follow_up_required' | string;
  createdAt?: string;
  timestamp?: string;
}
export type AdminEnquiry = Enquiry;

export interface CreateEnquiryInput {
  patient_name: string;
  subject: string;
  details: string;
}

// ── Nav / Sidebar types ──

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

export interface SidebarItem {
  label: string;
  icon: string;
  href: string;
}

// ── Quick action types (patient) ──

export interface QuickActionItem {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
}

// ── Patient Portal & Identity types ──

export interface PatientProfile {
  id: string;
  full_name: string;
  phone?: string;
  dob?: string;
  address?: string;
  nominated_pharmacy?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GuestLookupResult {
  found: boolean;
  reference_id: string;
  request_type: string;
  status: string;
  preferred_date?: string;
  preferred_time?: string;
  notes?: string;
  created_at?: string;
  message: string;
}
