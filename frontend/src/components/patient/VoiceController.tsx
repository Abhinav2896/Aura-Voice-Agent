'use client';

import { useState } from 'react';
import { Send, Keyboard, Mic, MicOff, PhoneOff } from 'lucide-react';
import { Waveform } from './Waveform';
import { MicButton } from './MicButton';
import type { VoiceState } from '@/lib/types';

interface VoiceControllerProps {
  state: VoiceState;
  isMuted: boolean;
  isUserSpeaking?: boolean;
  isAuraSpeaking?: boolean;
  audioLevel?: number;
  onMicClick: () => void;
  onToggleMute: () => void;
  onEndCall: () => void;
  onSendMessage: (text: string) => void;
}

export function VoiceController({
  state,
  isMuted,
  isUserSpeaking = false,
  isAuraSpeaking = false,
  audioLevel = 0,
  onMicClick,
  onToggleMute,
  onEndCall,
  onSendMessage,
}: VoiceControllerProps) {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-toolbar px-3 py-2 mx-3 mb-2.5 border-white/80 shadow-[0_8px_30px_rgba(50,80,160,0.06)] rounded-2xl flex flex-col items-center gap-1.5">
      {/* ── 1. Compact Waveform & Mic Row (NO OVERLAP) ── */}
      <div className="w-full flex items-center justify-center gap-2 sm:gap-4 py-0.5">
        {/* Left Waveform Bars */}
        <div className="flex-1 flex justify-end">
          <Waveform
            state={state}
            side="left"
            isUserSpeaking={isUserSpeaking}
            isAuraSpeaking={isAuraSpeaking}
            audioLevel={audioLevel}
          />
        </div>

        {/* Central Compact Microphone Button */}
        <div className="flex-shrink-0">
          <MicButton
            state={state}
            isMuted={isMuted}
            isUserSpeaking={isUserSpeaking}
            isAuraSpeaking={isAuraSpeaking}
            audioLevel={audioLevel}
            onClick={onMicClick}
          />
        </div>

        {/* Right Waveform Bars */}
        <div className="flex-1 flex justify-start">
          <Waveform
            state={state}
            side="right"
            isUserSpeaking={isUserSpeaking}
            isAuraSpeaking={isAuraSpeaking}
            audioLevel={audioLevel}
          />
        </div>
      </div>

      {/* ── 2. Compact Input Row ── */}
      <div className="w-full flex items-center gap-1.5 px-0.5">
        {/* Keyboard Toggle Icon */}
        <button
          type="button"
          className="w-8 h-8 rounded-xl bg-white/70 hover:bg-white/95 border border-white/90 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex-shrink-0"
          aria-label="Toggle keyboard"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>

        {/* Text Input Field */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Speak to Aura or type your message..."
            className="w-full h-8 px-3 rounded-xl bg-white/70 focus:bg-white/90 border border-white/90 focus:border-blue-300 shadow-inner text-xs text-slate-800 placeholder-slate-400 outline-none transition-all"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white shadow-2xs flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
          aria-label="Send message"
        >
          <Send className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>

      {/* ── 3. Compact Action Row (Mute & End) ── */}
      <div className="w-full flex items-center justify-center gap-2.5 pt-0.5">
        <button
          type="button"
          onClick={onToggleMute}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border shadow-2xs transition-all cursor-pointer ${
            isMuted
              ? 'bg-amber-50/80 border-amber-200 text-amber-700 hover:bg-amber-100/80'
              : 'bg-white/60 hover:bg-white/90 border-white/80 text-slate-700'
          }`}
        >
          {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          type="button"
          onClick={onEndCall}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-red-50/70 hover:bg-red-100/80 border border-red-200/80 text-red-600 shadow-2xs transition-all cursor-pointer"
        >
          <PhoneOff className="w-3 h-3" />
          <span>End</span>
        </button>
      </div>
    </div>
  );
}
