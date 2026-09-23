// ============================================================================
// Services — Re-export barrel
// Components import from '@/lib/services' for all data access.
// ============================================================================

export { getCalls, getCallById, getCallVolume } from './callService';
export { getKpis, getRequestTypes, getRecentActivity, getOperationStatus } from './dashboardService';
export { getAppointments, createAppointment, updateAppointment, updateAppointmentStatus } from './appointmentService';
export type { UpdateAppointmentInput } from './appointmentService';
export { getPrescriptions, createPrescription } from './prescriptionService';
export { getEnquiries, createEnquiry } from './enquiryService';
export { getEscalations } from './escalationService';
export type { EscalationRecord } from './escalationService';
export { getKnowledgeDocuments } from './knowledgeService';
export type { KnowledgeDocument } from './knowledgeService';
export { getPracticeInfo, updatePracticeInfo } from './practiceService';
export type { PracticeInfo } from './practiceService';
export {
  getMyProfile,
  updateMyProfile,
  getMyAppointments,
  getMyPrescriptions,
  getMyCalls,
  getMyCallDetail,
  lookupGuestRequest
} from './patientService';
