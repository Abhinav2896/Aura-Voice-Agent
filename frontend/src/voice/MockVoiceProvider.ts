// ============================================================================
// Mock Voice Provider
// MOCK: Replace with GeminiLiveProvider for production.
// Simulates the voice interaction flow with realistic NHS GP triage dialogue,
// timed state transitions, tool calls, and text inputs.
// ============================================================================

import type { VoiceState, TranscriptEntry, ToolCallRequest, ToolCallResponse, ToolResultPayload } from '../lib/types';
import type { VoiceProvider } from './types';

export class MockVoiceProvider implements VoiceProvider {
  onStateChange: ((state: VoiceState) => void) | null = null;
  onTranscript: ((entry: TranscriptEntry) => void) | null = null;
  onAudioOutput: ((audioData: ArrayBuffer) => void) | null = null;
  onToolCall: ((request: ToolCallRequest) => Promise<ToolCallResponse>) | null = null;
  onToolResult: ((payload: ToolResultPayload) => void) | null = null;
  onAudioLevel: ((level: number, type: 'input' | 'output', isVoiceActive: boolean) => void) | null = null;

  private timers: ReturnType<typeof setTimeout>[] = [];
  private isConnected = false;
  private muted = false;
  private turnIndex = 0;

  mute(): void {
    this.muted = true;
  }

  unmute(): void {
    this.muted = false;
  }

  isMuted(): boolean {
    return this.muted;
  }

  async connect(): Promise<void> {
    this.isConnected = true;
    this.fireState('connecting');

    // Request actual mic permission if in browser to feel 100% authentic
    if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release tracks right away in mock mode
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.info('[MockVoiceProvider] Mic permission info/fallback:', err);
      }
    }

    this.delay(600, () => {
      this.fireState('listening');

      // First turn simulation: User asks for appointment
      this.delay(2400, () => {
        if (!this.isConnected) return;
        this.fireTranscript({
          role: 'user',
          text: "Hi, I'd like to book a GP appointment.",
          timestamp: Date.now(),
        });
        this.fireState('thinking');

        // Aura response
        this.delay(1600, () => {
          if (!this.isConnected) return;
          this.fireTranscript({
            role: 'assistant',
            text: 'Of course. I can help with that. What would you like to see the GP about?',
            timestamp: Date.now(),
          });
          this.fireState('speaking');

          // After speaking, Aura listens again
          this.delay(3500, () => {
            if (!this.isConnected) return;
            this.fireState('listening');

            // Patient follows up
            this.delay(2600, () => {
              if (!this.isConnected) return;
              this.fireTranscript({
                role: 'user',
                text: "I've had a persistent cough for about two weeks.",
                timestamp: Date.now(),
              });
              this.fireState('thinking');

              // Aura triage response
              this.delay(1800, () => {
                if (!this.isConnected) return;
                this.fireTranscript({
                  role: 'assistant',
                  text: 'Thank you for sharing that. How would you describe your cough? Is it dry or bringing up phlegm?',
                  timestamp: Date.now(),
                });
                this.fireState('speaking');

                // Tool call execution (Appointment booking tool)
                if (this.onToolCall) {
                  this.onToolCall({
                    id: 'tc-' + Date.now(),
                    name: 'book_appointment',
                    args: {
                      patient_name: 'Patient',
                      reason: 'Persistent cough (2 weeks)',
                      urgency: 'routine',
                    },
                  }).catch(() => { });
                  this.fireMockToolResult('book_appointment');
                }

                // Return to listening for caller response
                this.delay(3800, () => {
                  if (!this.isConnected) return;
                  this.fireState('listening');
                });
              });
            });
          });
        });
      });
    });
  }

  disconnect(): void {
    this.isConnected = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.turnIndex = 0;
    this.fireState('idle');
  }

  sendAudio(_chunk: Float32Array): void {
    // In live mode, audio streaming to Gemini Live WebSocket occurs here
  }

  sendText(message: string): void {
    if (!this.isConnected) {
      this.isConnected = true;
    }

    // Clear active progression
    this.timers.forEach(clearTimeout);
    this.timers = [];

    this.fireState('thinking');
    this.fireTranscript({
      role: 'user',
      text: message,
      timestamp: Date.now(),
    });

    const lower = message.toLowerCase();
    let reply = `Thank you for sharing that. I am taking note of your request: "${message}". How else can I assist you today?`;

    if (lower.includes('appointment') || lower.includes('book') || lower.includes('doctor') || lower.includes('gp')) {
      reply = "Of course. I can help with that. What would you like to see the GP about, and do you prefer a morning or afternoon appointment?";
      if (this.onToolCall) {
        this.onToolCall({
          id: 'tc-' + Date.now(),
          name: 'book_appointment',
          args: { request: message, urgency: 'routine' },
        }).catch(() => { });
        this.fireMockToolResult('book_appointment');
      }
    } else if (lower.includes('prescription') || lower.includes('medication') || lower.includes('repeat')) {
      reply = "I can certainly arrange your repeat prescription. Could you confirm the name of the medication and your preferred pharmacy?";
      if (this.onToolCall) {
        this.onToolCall({
          id: 'tc-' + Date.now(),
          name: 'request_prescription',
          args: { request: message },
        }).catch(() => { });
        this.fireMockToolResult('request_prescription');
      }
    } else if (lower.includes('test') || lower.includes('result') || lower.includes('blood')) {
      reply = "Routine blood test results typically take 3 to 5 working days. You can view them directly on the NHS App once reviewed by your GP, or I can log a request for a receptionist callback.";
    } else if (lower.includes('hour') || lower.includes('open') || lower.includes('time') || lower.includes('contact')) {
      reply = "Medical Practice is open Monday to Friday, 8:00 AM to 6:30 PM. For urgent needs outside these hours, please dial NHS 111.";
    } else if (lower.includes('chest pain') || lower.includes('heart') || lower.includes('stroke') || lower.includes('severe')) {
      reply = "If you or someone else is experiencing severe chest pain, breathlessness, or signs of stroke, please call 999 or go to your nearest A&E immediately. I am also alerting our duty staff.";
      if (this.onToolCall) {
        this.onToolCall({
          id: 'tc-' + Date.now(),
          name: 'escalate_to_staff',
          args: { reason: message, priority: 'urgent' },
        }).catch(() => { });
        this.fireMockToolResult('escalate_to_staff');
      }
    }

    this.delay(1400, () => {
      this.fireTranscript({
        role: 'assistant',
        text: reply,
        timestamp: Date.now(),
      });
      this.fireState('speaking');

      this.delay(3000, () => {
        this.fireState('listening');
      });
    });
  }

  // ── Helpers ──

  private fireState(state: VoiceState): void {
    if (this.onStateChange) this.onStateChange(state);
    if (this.onAudioLevel) {
      if (state === 'speaking') {
        this.onAudioLevel(0.65, 'output', true);
      } else {
        this.onAudioLevel(0, 'output', false);
      }
    }
  }

  private fireTranscript(entry: TranscriptEntry): void {
    if (this.onTranscript) this.onTranscript(entry);
  }

  // In live mode the backend relays a `tool_result`; simulate that here so the
  // request panel reaches its submitted state in mock mode too.
  private fireMockToolResult(name: ToolCallRequest['name']): void {
    if (!this.onToolResult) return;
    this.onToolResult({
      id: 'tr-' + Date.now(),
      name,
      result: {
        success: true,
        reference_id: `#APT-${Math.floor(1048 + Math.random() * 8000)}`,
        status: 'pending_review',
      },
    });
  }

  private delay(ms: number, fn: () => void): void {
    this.timers.push(setTimeout(fn, ms));
  }
}
