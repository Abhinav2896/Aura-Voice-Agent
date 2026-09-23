// ============================================================================
// useVoiceSession — Hook for voice & chat interaction
// Consumes the active VoiceProvider (Gemini Live or Mock).
// Supports both voice and text interactions in a unified conversation state.
// Dynamically extracts and maintains the active PatientRequest state.
// ============================================================================

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { VoiceState, TranscriptEntry, PatientRequestInfo, LookupState } from '../lib/types';
import { maskMobile } from '../lib/timeAgo';
import type { VoiceProvider } from './types';
import { MockVoiceProvider } from './MockVoiceProvider';
import { GeminiLiveProvider } from './GeminiLiveProvider';

const IDLE_PATIENT_REQUEST: PatientRequestInfo = {
  stage: 'idle',
  fields: [],
  status: 'Awaiting conversation',
};

// Turn a raw DB status token (e.g. "pending_review") into a readable label.
function formatStatus(raw?: string): string {
  if (!raw) return 'Pending review';
  const map: Record<string, string> = {
    pending_review: 'Pending practice review',
    pending: 'Pending practice review',
    pending_signature: 'Pending GP signature',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  if (map[raw]) return map[raw];
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/_/g, ' ');
}

function createProvider(): VoiceProvider {
  const providerType = process.env.NEXT_PUBLIC_VOICE_PROVIDER ?? 'gemini';

  switch (providerType) {
    case 'gemini':
      return new GeminiLiveProvider();
    case 'mock':
    default:
      return new MockVoiceProvider();
  }
}

export interface UseVoiceSessionReturn {
  state: VoiceState;
  transcript: TranscriptEntry[];
  isMuted: boolean;
  patientRequest: PatientRequestInfo;
  isUserSpeaking: boolean;
  isAuraSpeaking: boolean;
  audioLevel: number;
  start: () => void;
  stop: () => void;
  reset: () => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
  sendText: (message: string) => void;
}

export function useVoiceSession(): UseVoiceSessionReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [patientRequest, setPatientRequest] = useState<PatientRequestInfo>(IDLE_PATIENT_REQUEST);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAuraSpeaking, setIsAuraSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const providerRef = useRef<VoiceProvider | null>(null);

  // Initialize provider once
  useEffect(() => {
    const provider = createProvider();

    provider.onStateChange = (newState) => {
      setState(newState);
      if (newState !== 'listening') {
        setIsUserSpeaking(false);
      }
      if (newState !== 'speaking') {
        setIsAuraSpeaking(false);
      }
    };

    if (provider.onAudioLevel !== undefined) {
      provider.onAudioLevel = (_level, type, isVoiceActive) => {
        if (type === 'input') {
          if (isVoiceActive) {
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            setIsUserSpeaking(true);
          } else {
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                setIsUserSpeaking(false);
                silenceTimerRef.current = null;
              }, 350);
            }
          }
        } else if (type === 'output') {
          setIsAuraSpeaking(isVoiceActive);
        }
      };
    }

    provider.onTranscript = (entry) => {
      setTranscript((prev) => [...prev, entry]);

      // Show a lightweight "collecting" hint while the patient is describing what
      // they need. This only drives the interim UI state — it deliberately does
      // NOT fabricate reason/medication/date values. The real, authoritative
      // details come from the tool round-trip (onToolResult) once submitted.
      if (entry.role !== 'user') return;
      const text = entry.text.toLowerCase();

      const detect = (): { intent: string; type: string } | null => {
        if (text.includes('appointment') || text.includes('gp') || text.includes('doctor') || text.includes('see someone')) {
          return { intent: 'Appointment Request', type: 'GP Consultation' };
        }
        if (text.includes('prescription') || text.includes('medication') || text.includes('repeat')) {
          return { intent: 'Repeat Prescription', type: 'Medication Repeat' };
        }
        if (text.includes('test') || text.includes('result') || text.includes('blood')) {
          return { intent: 'Test Results', type: 'Results Enquiry' };
        }
        if (text.includes('hour') || text.includes('open') || text.includes('enquiry')) {
          return { intent: 'Practice Information', type: 'General Enquiry' };
        }
        return null;
      };

      const detected = detect();
      if (!detected) return;

      setPatientRequest((prev) => {
        // Never regress a submitted/looked-up card back to "collecting".
        if (prev.stage === 'submitted' || prev.stage === 'lookup') return prev;
        return {
          stage: 'collecting',
          intent: detected.intent,
          type: detected.type,
          fields: [],
          status: 'Collecting your details…',
        };
      });
    };

    // The backend Live relay has ALREADY executed the tool and written to the
    // database before it forwards this event. We must NOT re-execute it here —
    // doing so previously created duplicate rows. This handler only reflects the
    // in-flight request optimistically; the authoritative result (reference id,
    // status, lookup outcome) arrives via onToolResult below.
    provider.onToolCall = async (request) => {
      console.log('[VoiceSession] Tool call in flight:', request.name);

      const strOrUndef = (v: unknown): string | undefined => {
        if (v === undefined || v === null) return undefined;
        const s = String(v).trim();
        return s ? s : undefined;
      };

      if (request.name === 'get_my_appointment') {
        setPatientRequest((prev) => ({
          ...prev,
          stage: 'lookup',
          intent: 'Appointment Lookup',
          type: 'Existing Request',
          fields: [],
          status: 'Checking your request…',
        }));
      } else if (request.name === 'book_appointment' || request.name === 'create_appointment_request') {
        const args = request.args || {};
        const fields = [
          strOrUndef(args.reason) && { label: 'Reason', value: strOrUndef(args.reason)! },
          strOrUndef(args.preferred_date) && { label: 'Preferred date', value: strOrUndef(args.preferred_date)! },
          strOrUndef(args.preferred_time) && { label: 'Preferred time', value: strOrUndef(args.preferred_time)! },
          strOrUndef(args.patient_phone) && { label: 'Mobile', value: maskMobile(strOrUndef(args.patient_phone)!) },
        ].filter(Boolean) as PatientRequestInfo['fields'];

        setPatientRequest((prev) => ({
          ...prev,
          stage: 'collecting',
          intent: 'Appointment Request',
          type: 'GP Consultation',
          fields,
          status: 'Submitting your request…',
        }));
      } else if (request.name === 'request_prescription' || request.name === 'create_prescription_request') {
        const args = request.args || {};
        const fields = [
          strOrUndef(args.medication) && { label: 'Medication', value: strOrUndef(args.medication)! },
          strOrUndef(args.dosage) && { label: 'Dosage', value: strOrUndef(args.dosage)! },
          strOrUndef(args.pharmacy_preference) && { label: 'Nominated Pharmacy', value: strOrUndef(args.pharmacy_preference)! },
          strOrUndef(args.patient_phone) && { label: 'Mobile', value: maskMobile(strOrUndef(args.patient_phone)!) },
        ].filter(Boolean) as PatientRequestInfo['fields'];

        setPatientRequest((prev) => ({
          ...prev,
          stage: 'collecting',
          intent: 'Repeat Prescription',
          type: 'Medication Repeat',
          fields,
          status: 'Submitting prescription request…',
        }));
      }

      // No network call here — the backend owns execution.
      return { id: request.id, result: { acknowledged: true } };
    };

    // Authoritative outcome of a backend-executed tool, relayed over the socket.
    provider.onToolResult = ({ name, result }) => {
      console.log('[VoiceSession] Tool result received:', name, result);
      const refId = typeof result.reference_id === 'string' ? result.reference_id : undefined;
      const status = typeof result.status === 'string' ? result.status : undefined;

      if (name === 'get_my_appointment') {
        const found = result.found === true;
        const multiple = result.multiple === true;
        const appt = (result.appointment as Record<string, unknown> | undefined) ?? undefined;
        const message = typeof result.message === 'string' ? result.message : undefined;
        let lookupState: LookupState = 'not_found';
        if (found && multiple) lookupState = 'multiple';
        else if (found) lookupState = 'found';

        const fields: PatientRequestInfo['fields'] = [];
        if (lookupState === 'found' && appt) {
          if (appt.reason) fields.push({ label: 'Reason', value: String(appt.reason) });
          if (appt.preferred_date) fields.push({ label: 'Scheduled date', value: String(appt.preferred_date) });
          if (appt.preferred_time) fields.push({ label: 'Scheduled time', value: String(appt.preferred_time) });
          if (appt.notes) fields.push({ label: 'Practice update', value: String(appt.notes) });
        }

        setPatientRequest({
          stage: 'lookup',
          intent: 'Appointment Lookup',
          type: 'Existing Request',
          fields,
          lookupState,
          status:
            lookupState === 'found'
              ? formatStatus(appt?.status ? String(appt.status) : status)
              : lookupState === 'multiple'
              ? 'Multiple matches'
              : 'No matching request',
          referenceId: lookupState === 'found' && appt?.reference_id ? String(appt.reference_id) : undefined,
          message,
        });
        return;
      }

      if (result.success === false) {
        // Leave the collecting state in place; the assistant explains the issue.
        return;
      }

      if (name === 'book_appointment' || name === 'create_appointment_request') {
        const finalTime = typeof result.preferred_time === 'string' ? result.preferred_time : undefined;
        const nextAct = typeof result.next_action === 'string' ? result.next_action : undefined;
        setPatientRequest((prev) => ({
          ...prev,
          stage: 'submitted',
          intent: 'Appointment Request',
          type: 'GP Consultation',
          status: formatStatus(status ?? 'pending_review'),
          nextAction: nextAct ?? 'Submitted to the practice clinical triage team for review',
          referenceId: refId ?? prev.referenceId,
          submittedAt: 'Just now',
          fields: prev.fields.map((f) => {
            if (f.label === 'Preferred time' && finalTime) {
              return { ...f, value: finalTime };
            }
            return f;
          }),
        }));
      } else if (name === 'request_prescription' || name === 'create_prescription_request') {
        setPatientRequest((prev) => ({
          ...prev,
          stage: 'submitted',
          intent: 'Repeat Prescription',
          type: 'Medication Repeat',
          status: formatStatus(status ?? 'pending_signature'),
          nextAction: 'Sent for GP electronic signature. Once approved, you can collect it directly from your nominated pharmacy.',
          referenceId: refId ?? prev.referenceId,
          submittedAt: 'Just now',
        }));
      } else if (name === 'escalate_to_staff' || name === 'escalate_to_reception') {
        setPatientRequest((prev) => ({
          ...prev,
          stage: 'submitted',
          intent: 'Clinical Escalation',
          type: 'Priority Review',
          status: 'Escalated to staff',
          nextAction: 'Handed over to the practice team',
          referenceId: refId ?? prev.referenceId,
          submittedAt: 'Just now',
        }));
      }
    };

    providerRef.current = provider;

    return () => {
      provider.disconnect();
    };
  }, []);

  const start = useCallback(() => {
    if (providerRef.current) {
      if (state === 'idle' || state === 'disconnected') {
        providerRef.current.connect();
      } else if (state === 'listening' || state === 'speaking') {
        providerRef.current.disconnect();
      }
    }
  }, [state]);

  const stop = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.disconnect();
    }
  }, []);

  const reset = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.disconnect();
    }
    setState('idle');
    setTranscript([]);
    setIsMuted(false);
    setPatientRequest(IDLE_PATIENT_REQUEST);
    setIsUserSpeaking(false);
    setIsAuraSpeaking(false);
    setAudioLevel(0);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const mute = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.mute();
      setIsMuted(true);
    }
  }, []);

  const unmute = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.unmute();
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (providerRef.current) {
      if (isMuted) {
        providerRef.current.unmute();
        setIsMuted(false);
      } else {
        providerRef.current.mute();
        setIsMuted(true);
      }
    }
  }, [isMuted]);

  const sendText = useCallback((message: string) => {
    if (!message.trim()) return;
    if (providerRef.current) {
      providerRef.current.sendText(message.trim());
    }
  }, []);

  return {
    state,
    transcript,
    isMuted,
    patientRequest,
    isUserSpeaking,
    isAuraSpeaking,
    audioLevel,
    start,
    stop,
    reset,
    mute,
    unmute,
    toggleMute,
    sendText,
  };
}
