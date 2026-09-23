'use client';

import Image from 'next/image';
import { PRACTICE } from '@/lib/constants';

export function QuoteCard() {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/90 shadow-[0_4px_20px_rgba(37,99,235,0.06)] overflow-hidden">
      {/* Clinic illustration */}
      <div className="relative h-32 xl:h-36 bg-gradient-to-br from-blue-50/90 to-indigo-50/90">
        <Image
          src="/assets/practice-building.svg"
          alt="Clinic Building"
          fill
          className="object-contain p-3.5"
        />
      </div>

      {/* Quote */}
      <div className="p-4.5">
        <p className="text-xs xl:text-sm italic text-gray-600 leading-relaxed mb-2.5">
          &ldquo;{PRACTICE.quote}&rdquo;
        </p>

        {/* Divider line */}
        <div className="w-10 h-0.5 bg-blue-500 mb-2.5" />

        <p className="text-xs xl:text-sm font-semibold text-gray-900">Aura Healthcare</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {PRACTICE.missionLine1} / {PRACTICE.missionLine2}
        </p>
      </div>
    </div>
  );
}
