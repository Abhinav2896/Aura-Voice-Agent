// ============================================================================
// Voice Integration — Types
// Defines the VoiceProvider interface that both MockVoiceProvider and
// GeminiLiveProvider implement. UI components never reference these directly;
// they go through useVoiceSession().
// ============================================================================

import type { VoiceState, TranscriptEntry, ToolCallRequest, ToolCallResponse, ToolResultPayload } from '../lib/types';

export interface VoiceProvider {
  /** Initialise and open connection (mic permission, WebSocket, etc.) */
  connect(): Promise<void>;

  /** Tear down connection */
  disconnect(): void;

  /** Mute / Unmute microphone input */
  mute(): void;
  unmute(): void;
  isMuted(): boolean;

  /** Send raw audio chunk (from browser mic) — used in live mode */
  sendAudio(chunk: Float32Array): void;

  /** Send text message (for "Use Text Instead" mode) */
  sendText(message: string): void;

  // ── Event callbacks (set by useVoiceSession) ──

  onStateChange: ((state: VoiceState) => void) | null;
  onTranscript: ((entry: TranscriptEntry) => void) | null;
  onAudioOutput: ((audioData: ArrayBuffer) => void) | null;
  /** Fired when Gemini requests a tool. UI updates optimistically; the backend
   *  has already executed it, so the handler must NOT call the tool again. */
  onToolCall: ((request: ToolCallRequest) => Promise<ToolCallResponse>) | null;
  /** Fired with the authoritative result the backend produced for a tool. */
  onToolResult: ((payload: ToolResultPayload) => void) | null;
  /** Real-time audio energy level (0-1), type ('input' | 'output'), and whether active voice is detected */
  onAudioLevel?: ((level: number, type: 'input' | 'output', isVoiceActive: boolean) => void) | null;
}
