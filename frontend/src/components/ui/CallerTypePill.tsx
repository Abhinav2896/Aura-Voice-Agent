'use client';

import React from 'react';

interface CallerTypePillProps {
  type?: 'patient' | 'registered' | 'guest' | string;
}

export function CallerTypePill({ type }: CallerTypePillProps) {
  const isRegistered = type === 'patient' || type === 'registered';

  if (isRegistered) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs whitespace-nowrap"
        title="Verified Patient Account"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Registered
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/70 whitespace-nowrap"
      title="Anonymous / Guest Caller"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      Guest
    </span>
  );
}
