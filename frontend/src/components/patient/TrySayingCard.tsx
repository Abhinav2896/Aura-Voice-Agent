'use client';

import { AudioLines } from 'lucide-react';
import { VOICE_SUGGESTIONS } from '@/lib/constants';

interface TrySayingCardProps {
  onSuggest?: (text: string) => void;
}

export function TrySayingCard({ onSuggest }: TrySayingCardProps) {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/90 shadow-[0_4px_20px_rgba(37,99,235,0.06)] p-4 xl:p-4.5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <AudioLines className="w-4 h-4 text-blue-500" />
        <h3 className="text-xs xl:text-sm font-semibold text-gray-900">Try saying...</h3>
      </div>

      {/* Suggestion chips */}
      <div className="space-y-2">
        {VOICE_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggest?.(suggestion)}
            className="w-full text-left px-3.5 py-2.5 xl:py-3 text-xs xl:text-sm text-gray-700 bg-white/70 hover:bg-blue-50/80 rounded-xl border border-gray-100/90 hover:border-blue-200 hover:text-blue-700 transition-all duration-200 cursor-pointer shadow-xs"
          >
            &ldquo;{suggestion}&rdquo;
          </button>
        ))}
      </div>
    </div>
  );
}
