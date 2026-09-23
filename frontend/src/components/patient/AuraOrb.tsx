'use client';

import Image from 'next/image';

interface AuraOrbProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isActive?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

export function AuraOrb({
  size = 'md',
  isActive = false,
  isSpeaking = false,
  className = '',
}: AuraOrbProps) {
  const sizeMap = {
    sm: { px: 28, container: 'w-7 h-7' },
    md: { px: 44, container: 'w-11 h-11' },
    lg: { px: 68, container: 'w-17 h-17' },
    xl: { px: 110, container: 'w-28 h-28' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`relative flex items-center justify-center flex-shrink-0 ${currentSize.container} ${className}`}>
      {/* Ambient background glow when speaking or active */}
      {isSpeaking ? (
        <div className="absolute inset-0 rounded-full bg-purple-500/60 blur-lg animate-pulse" />
      ) : isActive ? (
        <div className="absolute inset-0 rounded-full bg-blue-400/40 blur-md animate-pulse" />
      ) : null}
      
      {/* High-res Aura Orb */}
      <Image
        src="/assets/aura-orb-hd.png"
        alt="Aura Orb"
        width={currentSize.px}
        height={currentSize.px}
        className={`relative z-10 transition-all duration-300 drop-shadow-sm ${
          isSpeaking
            ? 'scale-110 drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]'
            : isActive
            ? 'scale-105'
            : 'hover:scale-102'
        }`}
        priority={size === 'md' || size === 'lg'}
      />
    </div>
  );
}
