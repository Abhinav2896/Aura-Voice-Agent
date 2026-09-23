// ============================================================================
// Gemini 3.8 Live Voice Provider
// Real-time bidirectional voice streaming with function calling via FastAPI WebSocket relay.
// Captures 16kHz PCM audio from browser microphone.
// Streams 24kHz PCM audio output from Gemini to browser speaker.
// Dispatches tool calls for live interactive receptionist workflows.
// ============================================================================

import type { VoiceState, TranscriptEntry, ToolCallRequest, ToolCallResponse, ToolResultPayload, ToolName } from '../lib/types';
import type { VoiceProvider } from './types';
import { createClient } from '@/lib/supabase/client';

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL ?? 'http://localhost:8000';

export class GeminiLiveProvider implements VoiceProvider {
  onStateChange: ((state: VoiceState) => void) | null = null;
  onTranscript: ((entry: TranscriptEntry) => void) | null = null;
  onAudioOutput: ((audioData: ArrayBuffer) => void) | null = null;
  onToolCall: ((request: ToolCallRequest) => Promise<ToolCallResponse>) | null = null;
  onToolResult: ((payload: ToolResultPayload) => void) | null = null;
  onAudioLevel: ((level: number, type: 'input' | 'output', isVoiceActive: boolean) => void) | null = null;

  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private playbackContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private muted = false;
  private currentState: VoiceState = 'idle';
  private nextPlayTime = 0;
  private activeCallId: string | null = null;
  private pendingText: string[] = [];
  private inputSampleRate = 16000;
  private micGain: GainNode | null = null;
  private audioFramesSent = 0;
  private isUserAudioActive = false;
  private isAuraAudioActive = false;
  private activeAudioSources: Set<AudioBufferSourceNode> = new Set();

  private setState(state: VoiceState) {
    this.currentState = state;
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

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
    try {
      this.setState('connecting');

      // 1. Request ephemeral token from FastAPI (attaching Supabase JWT if authenticated)
      let bearerToken: string | null = null;
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        bearerToken = session?.access_token || null;
      } catch {
        // Unauthenticated or SSR
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (bearerToken) {
        headers['Authorization'] = `Bearer ${bearerToken}`;
      }

      const tokenRes = await fetch(`${FASTAPI_URL}/api/live/token`, {
        method: 'POST',
        headers,
      });
      if (!tokenRes.ok) throw new Error(`Token request failed: ${tokenRes.statusText}`);
      const tokenData = await tokenRes.json();
      const token = tokenData.token;

      // 2. Open WebSocket to FastAPI Live relay
      const host = window.location.hostname || 'localhost';
      const port = '8000';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${host}:${port}/api/live/ws?token=${token}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log('[GeminiLiveProvider] WebSocket connected');
        this.setState('listening');
        await this.startAudioCapture();
        // Flush any text queued before the connection was ready (typed message
        // or a quick-action button pressed while still idle/connecting).
        if (this.pendingText.length > 0) {
          const queued = this.pendingText;
          this.pendingText = [];
          queued.forEach((t) => this.sendClientText(t));
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'call_initialized') {
            this.activeCallId = msg.call_id;
            console.log('[GeminiLiveProvider] Active call ID:', this.activeCallId);
          } else if (msg.type === 'transcript') {
            if (this.onTranscript) {
              this.onTranscript({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                text: msg.text,
                timestamp: Date.now(),
              });
            }
          } else if (msg.type === 'interrupted') {
            console.log('[GeminiLiveProvider] Interrupted signal received — stopping playback');
            this.stopPlayback();
            this.setState('listening');
          } else if (msg.type === 'audio') {
            this.setState('speaking');
            await this.playAudioChunk(msg.data);
          } else if (msg.type === 'tool_call') {
            console.log('[GeminiLiveProvider] Received tool call from Gemini:', msg.name, msg.args);
            // The backend has ALREADY executed this tool. We only update the UI
            // optimistically here — the handler must not run the tool again.
            if (this.onToolCall) {
              await this.onToolCall({
                id: msg.id,
                name: msg.name as ToolName,
                args: msg.args,
              });
            }
          } else if (msg.type === 'tool_result') {
            console.log('[GeminiLiveProvider] Received tool result from backend:', msg.name, msg.result);
            if (this.onToolResult) {
              this.onToolResult({
                id: msg.id,
                name: msg.name as ToolName,
                result: msg.result ?? {},
              });
            }
          }
        } catch (parseErr) {
          console.error('[GeminiLiveProvider] Error processing message:', parseErr);
        }
      };

      this.ws.onclose = () => {
        console.log('[GeminiLiveProvider] WebSocket closed');
        this.cleanupAudio();
        this.setState('idle');
      };

      this.ws.onerror = (err) => {
        console.error('[GeminiLiveProvider] WebSocket error:', err);
        this.cleanupAudio();
        this.setState('idle');
      };
    } catch (err) {
      console.error('[GeminiLiveProvider] Connection failed:', err);
      this.cleanupAudio();
      this.setState('idle');
      throw err;
    }
  }

  disconnect(): void {
    this.pendingText = [];
    this.audioFramesSent = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanupAudio();
    this.setState('idle');
  }

  sendAudio(chunk: Float32Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || this.muted) return;
    // Gemini Live expects 16 kHz mono PCM. The mic AudioContext usually runs at
    // the hardware rate (often 48 kHz), so downsample here rather than trusting
    // the browser to honour a forced 16 kHz context (which many do not, sending
    // wrong-rate audio that the model cannot transcribe).
    const pcm16 = this.downsampleTo16kPCM(chunk, this.inputSampleRate);
    if (pcm16.length === 0) return;
    const base64Data = this.int16ToBase64(pcm16);
    this.audioFramesSent++;
    if (this.audioFramesSent === 1 || this.audioFramesSent % 50 === 0) {
      console.log(`[GeminiLiveProvider] Sent mic audio frame #${this.audioFramesSent} (${base64Data.length} b64 chars @ ${this.inputSampleRate}Hz→16000Hz)`);
    }
    this.ws.send(
      JSON.stringify({
        type: 'audio',
        data: base64Data,
        mimeType: 'audio/pcm;rate=16000',
      })
    );
  }

  sendText(message: string): void {
    // Optimistically show the user's message right away.
    if (this.onTranscript) {
      this.onTranscript({
        role: 'user',
        text: message,
        timestamp: Date.now(),
      });
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendClientText(message);
      return;
    }

    // Not connected yet (e.g. typed a message or tapped a quick-action button
    // before starting a call). Queue the text and open the session; it will be
    // flushed once the WebSocket is ready.
    this.pendingText.push(message);
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this.connect().catch((err) => {
        console.error('[GeminiLiveProvider] Auto-connect for text failed:', err);
      });
    }
  }

  private sendClientText(message: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'text',
        text: message,
      })
    );
  }

  // ── Audio Capture (16kHz PCM) ──

  private notify(text: string): void {
    // Surface a status/error line directly in the chat so problems are visible
    // without opening DevTools.
    if (this.onTranscript) {
      this.onTranscript({ role: 'assistant', text, timestamp: Date.now() });
    }
  }

  private async startAudioCapture(): Promise<void> {
    // getUserMedia only exists in a secure context (https:// or http://localhost).
    // Accessing the app via a LAN IP over plain http disables the microphone.
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.error('[GeminiLiveProvider] navigator.mediaDevices unavailable — insecure context?');
      this.notify(
        "I can't access the microphone here. Open the app at http://localhost:3000 (not an IP address) or over HTTPS, then allow mic access. You can still type your message below."
      );
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      // Use the hardware-native sample rate and resample in JS; forcing a rate
      // here is unreliable across browsers.
      this.audioContext = new AudioCtx();
      this.inputSampleRate = this.audioContext.sampleRate;
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.muted) {
          if (this.onAudioLevel) this.onAudioLevel(0, 'input', false);
          return;
        }
        const inputData = e.inputBuffer.getChannelData(0);

        // Compute RMS energy to detect speech vs silence
        let sum = 0;
        const step = Math.max(1, Math.floor(inputData.length / 512));
        let count = 0;
        for (let i = 0; i < inputData.length; i += step) {
          sum += inputData[i] * inputData[i];
          count++;
        }
        const rms = Math.sqrt(sum / (count || 1));
        const isVoiceActive = rms > 0.015;

        // Only fire audio level callback when voice activity state actually transitions (silent <-> speaking)
        // to prevent 12-20 React re-renders per second that starve the audio thread.
        if (isVoiceActive !== this.isUserAudioActive) {
          this.isUserAudioActive = isVoiceActive;
          if (this.onAudioLevel && this.currentState === 'listening') {
            this.onAudioLevel(isVoiceActive ? 1 : 0, 'input', isVoiceActive);
          }
        }

        this.sendAudio(inputData);
      };

      // A ScriptProcessor only runs while connected to the destination, but we
      // must not feed the mic back to the speakers — route through a muted gain
      // node so processing fires without any audible echo.
      this.micGain = this.audioContext.createGain();
      this.micGain.gain.value = 0;
      source.connect(this.processor);
      this.processor.connect(this.micGain);
      this.micGain.connect(this.audioContext.destination);

      console.log(`[GeminiLiveProvider] Mic capture started at ${this.inputSampleRate}Hz (downsampling to 16000Hz)`);
    } catch (err) {
      console.error('[GeminiLiveProvider] Microphone access failed — voice input disabled, text still works:', err);
      const name = (err as { name?: string })?.name ?? '';
      let msg = "I couldn't start your microphone, so I can't hear you. You can type your message below instead.";
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        msg = "Microphone permission was blocked. Click the 🔒/camera icon in the address bar, allow the microphone, then tap the mic again. You can type in the meantime.";
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        msg = "I couldn't find a microphone on this device. Please check your mic is connected. You can type your message below instead.";
      } else if (name === 'NotReadableError') {
        msg = "Your microphone is in use by another app. Close it, then tap the mic again. You can type in the meantime.";
      }
      this.notify(msg);
      // Still allows text interactions even without mic
    }
  }

  // ── Audio Playback (24kHz PCM) ──

  private async playAudioChunk(base64Pcm: string): Promise<void> {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.playbackContext) {
        this.playbackContext = new AudioCtx({ sampleRate: 24000 });
      }
      if (this.playbackContext.state === 'suspended') {
        await this.playbackContext.resume();
      }

      const binaryStr = atob(base64Pcm);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.playbackContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);

      const currentTime = this.playbackContext.currentTime;
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.activeAudioSources.add(source);

      // Only fire output audio level when Aura starts speaking (not on every single 50ms chunk)
      if (!this.isAuraAudioActive) {
        this.isAuraAudioActive = true;
        if (this.onAudioLevel) {
          this.onAudioLevel(1, 'output', true);
        }
      }

      source.onended = () => {
        this.activeAudioSources.delete(source);
        if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlayTime - 0.05) {
          if (this.currentState === 'speaking') {
            this.setState('listening');
          }
          if (this.isAuraAudioActive) {
            this.isAuraAudioActive = false;
            if (this.onAudioLevel) {
              this.onAudioLevel(0, 'output', false);
            }
          }
        }
      };
    } catch (audioErr) {
      console.error('[GeminiLiveProvider] Audio playback error:', audioErr);
    }
  }

  private stopPlayback(): void {
    for (const src of this.activeAudioSources) {
      try {
        src.stop();
      } catch {}
    }
    this.activeAudioSources.clear();
    if (this.playbackContext) {
      this.nextPlayTime = this.playbackContext.currentTime;
    }
    if (this.isAuraAudioActive) {
      this.isAuraAudioActive = false;
      if (this.onAudioLevel) {
        this.onAudioLevel(0, 'output', false);
      }
    }
  }

  private cleanupAudio(): void {
    this.stopPlayback();
    if (this.onAudioLevel) {
      this.onAudioLevel(0, 'input', false);
      this.onAudioLevel(0, 'output', false);
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.micGain) {
      this.micGain.disconnect();
      this.micGain = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.playbackContext) {
      this.playbackContext.close();
      this.playbackContext = null;
    }
    this.nextPlayTime = 0;
  }

  // Linear-resample mic Float32 samples from the capture rate down to 16 kHz
  // and convert to signed 16-bit PCM.
  private downsampleTo16kPCM(input: Float32Array, inputRate: number): Int16Array {
    const TARGET = 16000;
    const toInt16 = (s: number) => {
      const c = Math.max(-1, Math.min(1, s));
      return c < 0 ? c * 0x8000 : c * 0x7fff;
    };

    if (!inputRate || inputRate === TARGET) {
      const out = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) out[i] = toInt16(input[i]);
      return out;
    }

    const ratio = inputRate / TARGET;
    const outLen = Math.floor(input.length / ratio);
    const out = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const idx = i * ratio;
      const i0 = Math.floor(idx);
      const frac = idx - i0;
      const a = input[i0] ?? 0;
      const b = input[i0 + 1] ?? a;
      out[i] = toInt16(a + (b - a) * frac);
    }
    return out;
  }

  private int16ToBase64(int16: Int16Array): string {
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
