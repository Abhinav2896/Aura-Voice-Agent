'use client';

import { Lock } from 'lucide-react';

export function PrivacyNotice() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] text-slate-500 font-medium">
      <Lock className="w-3 h-3 text-slate-400" />
      <span>Your conversation is private and secure.</span>
    </div>
  );
}
