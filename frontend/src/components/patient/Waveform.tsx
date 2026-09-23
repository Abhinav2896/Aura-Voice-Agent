'use client';

import type { VoiceState } from '@/lib/types';

interface WaveformProps {
  state: VoiceState;
  side: 'left' | 'right';
  isUserSpeaking?: boolean;
  isAuraSpeaking?: boolean;
  audioLevel?: number;
}

export function Waveform({
  state,
  side,
  isUserSpeaking = false,
  isAuraSpeaking = false,
  audioLevel = 0,
}: WaveformProps) {
  // Only animate on input audio when listening, or when Aura is speaking
  const isUserAudioActive = state === 'listening' && isUserSpeaking;
  const isAuraAudioActive = state === 'speaking' || isAuraSpeaking;
  const isAnimated = isUserAudioActive || isAuraAudioActive;
  const isThinking = state === 'thinking';

  // Base bar heights (percentages)
  const leftBars = [22, 35, 20, 52, 30, 68, 42, 85, 38, 62, 28, 48];
  const rightBars = [48, 28, 62, 38, 85, 42, 68, 30, 52, 20, 35, 22];

  const heights = side === 'left' ? leftBars : rightBars;

  return (
    <div className="flex items-center gap-[2.5px] h-6 px-1">
      {heights.map((baseH, idx) => {
        let heightStyle = `${baseH}%`;
        let animDuration = `${0.8 + (idx % 4) * 0.25}s`;
        const animDelay = `${(idx * 0.07).toFixed(2)}s`;

        if (isUserAudioActive) {
          // Lively speaking animation when user is talking
          heightStyle = `${baseH}%`;
          animDuration = `${0.55 + (idx % 3) * 0.18}s`;
        } else if (isAuraAudioActive) {
          // Lively speaking rhythm for Aura
          animDuration = `${0.65 + (idx % 4) * 0.18}s`;
          heightStyle = `${baseH}%`;
        } else if (isThinking) {
          heightStyle = `${Math.max(20, baseH * 0.45)}%`;
        } else {
          // Resting, calm bars when quiet / not speaking
          heightStyle = `${Math.max(14, Math.round(baseH * 0.28))}%`;
        }

        return (
          <div
            key={idx}
            className={`w-[2.5px] rounded-full transition-all duration-200 ${
              isUserAudioActive
                ? 'bg-gradient-to-t from-sky-400 via-blue-500 to-indigo-500 opacity-100 shadow-[0_0_6px_rgba(56,189,248,0.6)]'
                : isAuraAudioActive
                ? 'bg-gradient-to-t from-purple-500 via-fuchsia-400 to-indigo-400 opacity-95 shadow-[0_0_6px_rgba(168,85,247,0.5)]'
                : isThinking
                ? 'bg-gradient-to-t from-purple-400 to-blue-300 opacity-60 animate-pulse'
                : 'bg-blue-300/40 opacity-40'
            }`}
            style={{
              height: heightStyle,
              ...(isAnimated && {
                animationName: 'wave-bounce',
                animationDuration: animDuration,
                animationTimingFunction: 'ease-in-out',
                animationIterationCount: 'infinite',
                animationDirection: 'alternate',
                animationDelay: animDelay,
              }),
            }}
          />
        );
      })}
    </div>
  );
}
