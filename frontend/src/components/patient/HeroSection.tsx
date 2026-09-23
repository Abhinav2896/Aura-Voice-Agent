'use client';

import { VoiceInteraction } from './VoiceInteraction';

export function HeroSection() {
  return (
    <div className="flex flex-col items-center text-center justify-center">
      {/* Eyebrow */}
      <p className="text-xs md:text-sm tracking-[0.35em] text-blue-600/80 uppercase font-semibold mb-2">
        Meet
      </p>

      {/* Gradient headline */}
      <h2 className="text-6xl md:text-7xl lg:text-8xl font-black gradient-text tracking-tight mb-2">
        Aura
      </h2>

      {/* Subtitle */}
      <h3 className="text-xl md:text-2xl text-gray-800 font-semibold tracking-tight mb-3">
        Your AI Receptionist
      </h3>

      {/* Body copy */}
      <p className="text-sm md:text-base text-gray-500 max-w-md leading-relaxed mb-6">
        A faster, simpler way to access your GP surgery. Just speak
        naturally — Aura will take care of the rest.
      </p>

      {/* Centered Live Microphone Button & Voice Controls */}
      <VoiceInteraction />
    </div>
  );
}
