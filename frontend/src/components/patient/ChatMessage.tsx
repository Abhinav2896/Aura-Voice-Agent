'use client';

import { useState, useEffect } from 'react';
import { CheckCheck, User, Copy, Check } from 'lucide-react';
import { AuraOrb } from './AuraOrb';
import type { TranscriptEntry } from '@/lib/types';

interface ChatMessageProps {
  message: TranscriptEntry;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAura = message.role === 'assistant';
  const timeString = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const refMatches = message.text.match(/#[A-Z]{2,4}-\d{3,6}/gi);
  const foundRef = refMatches ? refMatches[0] : null;

  const handleCopyRef = (refText: string) => {
    navigator.clipboard.writeText(refText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isAura) {
    return (
      <div className="flex items-start gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
        <AuraOrb size="sm" className="mt-1" />
        <div className="max-w-[82%] sm:max-w-[75%] space-y-1">
          <div className="glass-bubble-aura p-3.5 rounded-2xl rounded-tl-xs text-[13.5px] leading-relaxed text-slate-800">
            <div>{message.text}</div>
            {foundRef && (
              <div className="mt-2.5 pt-2 border-t border-blue-100/80 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  Reference: <strong className="font-mono text-blue-700">{foundRef}</strong>
                </span>
                <button
                  onClick={() => handleCopyRef(foundRef)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-50 border border-blue-200/80 rounded-lg text-[11px] font-semibold text-blue-700 transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
                  title="Copy reference code directly to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-blue-600" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          <span suppressHydrationWarning className="block text-[10px] text-slate-400 pl-1 font-medium">
            {mounted ? timeString : ''}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 justify-end animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="max-w-[82%] sm:max-w-[75%] space-y-1 flex flex-col items-end">
        <div className="glass-bubble-user p-3.5 rounded-2xl rounded-tr-xs text-[13.5px] leading-relaxed text-slate-900 font-medium">
          {message.text}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-500 pr-1 font-medium">
          <span suppressHydrationWarning>{mounted ? timeString : ''}</span>
          <CheckCheck className="w-3 h-3 text-blue-600" />
        </div>
      </div>
      <div className="w-7 h-7 rounded-full bg-blue-100/90 border border-blue-200/80 flex items-center justify-center text-blue-600 flex-shrink-0 mt-1">
        <User className="w-4 h-4" />
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 justify-start animate-in fade-in duration-200">
      <AuraOrb size="sm" />
      <div className="glass-bubble-aura px-3 py-2 rounded-2xl rounded-tl-xs flex items-center gap-2">
        <div className="flex items-center gap-1 px-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 typing-dot-1" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 typing-dot-2" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 typing-dot-3" />
        </div>
        <span className="text-[11px] text-slate-500 font-medium">Aura is typing...</span>
      </div>
    </div>
  );
}
