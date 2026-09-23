'use client';

import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import type { QuickActionItem } from '@/lib/types';

interface ActionCardProps extends QuickActionItem {
  onClick?: () => void;
}

export function ActionCard({ icon, title, subtitle, color, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="action-card w-full flex items-center gap-3.5 p-3.5 xl:p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-white/90 shadow-[0_4px_20px_rgba(37,99,235,0.06)] hover:bg-white hover:border-blue-300 hover:shadow-[0_8px_25px_rgba(37,99,235,0.12)] text-left group transition-all duration-200 cursor-pointer"
    >
      {/* Icon */}
      <div
        className="w-11 h-11 xl:w-12 xl:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
        style={{ backgroundColor: `${color}15` }}
      >
        <Image src={`/assets/${icon}.svg`} alt={title} width={26} height={26} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-snug">{title}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
      </div>

      {/* Chevron */}
      <ChevronRight
        className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
      />
    </button>
  );
}
