'use client';

import { RotateCcw, MoreHorizontal } from 'lucide-react';
import { AuraOrb } from './AuraOrb';

interface ChatHeaderProps {
  onNewConversation: () => void;
  isLive?: boolean;
  isAuraSpeaking?: boolean;
}

export function ChatHeader({
  onNewConversation,
  isLive = false,
  isAuraSpeaking = false,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/50 bg-white/20 backdrop-blur-md rounded-t-3xl">
      {/* Left: Avatar & Identity */}
      <div className="flex items-center gap-3">
        <AuraOrb size="md" isActive={isLive} isSpeaking={isAuraSpeaking} />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 leading-tight">Aura</h2>
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-dot-online" />
              Online
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-normal mt-0.5">
            AI Receptionist • Medical Practice
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewConversation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 bg-white/60 hover:bg-white/90 border border-white/80 shadow-2xs transition-all cursor-pointer"
          title="Start a new conversation"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>New conversation</span>
        </button>

        <button
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 bg-white/60 hover:bg-white/90 border border-white/80 shadow-2xs transition-all cursor-pointer"
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
