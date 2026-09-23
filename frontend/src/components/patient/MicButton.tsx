'use client';

import Image from 'next/image';
import type { VoiceState } from '@/lib/types';

interface MicButtonProps {
  state: VoiceState;
  isMuted?: boolean;
  isUserSpeaking?: boolean;
  isAuraSpeaking?: boolean;
  audioLevel?: number;
  onClick: () => void;
}

export function MicButton({
  state,
  isMuted = false,
  isUserSpeaking = false,
  isAuraSpeaking = false,
  audioLevel = 0,
  onClick,
}: MicButtonProps) {
  const isAuraActive = state === 'speaking' || isAuraSpeaking;
  const isUserActive = state === 'listening' && isUserSpeaking;

  const getStatusLabel = () => {
    if (isMuted) return 'Microphone muted';
    switch (state) {
      case 'connecting':
        return 'Connecting...';
      case 'listening':
        return isUserSpeaking ? 'Hearing you speak...' : 'Listening... (Speak anytime)';
      case 'thinking':
        return 'Aura is thinking...';
      case 'speaking':
        return 'Aura is speaking...';
      case 'error':
        return 'Connection error (Tap to retry)';
      case 'disconnected':
        return 'Tap to reconnect';
      case 'idle':
      default:
        return 'Tap to speak';
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Outer concentric pulsing ring */}
      <div className="relative flex items-center justify-center">
        {/* Animated pulsating aura rings ONLY when actively hearing user speech or Aura is speaking */}
        {!isMuted && (
          <>
            {isUserActive && (
              <>
                <div className="absolute w-14 h-14 rounded-full border border-sky-400/60 animate-ping opacity-40 pointer-events-none" />
                <div className="absolute w-16 h-16 rounded-full border border-blue-400/50 animate-pulse pointer-events-none" />
              </>
            )}
            {isAuraActive && (
              <>
                <div className="absolute w-14 h-14 rounded-full border border-purple-400/50 animate-ping opacity-30 pointer-events-none" />
                <div className="absolute w-16 h-16 rounded-full border border-indigo-300/40 animate-pulse pointer-events-none" />
              </>
            )}
            {state === 'thinking' && (
              <div className="absolute w-14 h-14 rounded-full border border-purple-300/40 animate-pulse pointer-events-none" />
            )}
          </>
        )}

        {/* Halo outer border */}
        <div className="w-[50px] h-[50px] rounded-full p-1 bg-gradient-to-b from-white/90 via-blue-100/50 to-white/40 border border-white/80 shadow-[0_4px_18px_rgba(37,99,235,0.18)] flex items-center justify-center">
          {/* Main Glowing Button */}
          <button
            onClick={onClick}
            className={`w-full h-full rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 shadow-sm ${
              isMuted
                ? 'bg-gradient-to-tr from-slate-400 to-slate-500'
                : isUserActive
                ? 'bg-gradient-to-tr from-blue-600 via-sky-400 to-indigo-600 scale-110 shadow-[0_0_24px_rgba(56,189,248,0.85)]'
                : state === 'listening'
                ? 'bg-gradient-to-tr from-blue-500 via-blue-600 to-indigo-600 scale-100 shadow-[0_0_12px_rgba(59,130,246,0.35)] hover:scale-105'
                : isAuraActive
                ? 'bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-600 scale-105 shadow-[0_0_20px_rgba(168,85,247,0.75)]'
                : state === 'thinking'
                ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 animate-pulse'
                : 'bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 hover:scale-105 hover:shadow-[0_0_16px_rgba(59,130,246,0.45)]'
            }`}
            aria-label={getStatusLabel()}
          >
            <Image
              src="/assets/aura-mic.svg"
              alt="Microphone"
              width={20}
              height={20}
              className={`drop-shadow-xs transition-transform duration-200 ${
                isUserActive ? 'scale-115' : isAuraActive ? 'scale-105' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Status indicator text */}
      <span
        className={`text-[10px] font-medium tracking-normal mt-1 select-none transition-colors flex items-center gap-1 ${
          isUserActive
            ? 'text-sky-600 font-semibold'
            : isAuraActive
            ? 'text-purple-600 font-semibold'
            : 'text-slate-500'
        }`}
      >
        {isUserActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping inline-block" />
        )}
        {isAuraActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse inline-block" />
        )}
        {getStatusLabel()}
      </span>
    </div>
  );
}
