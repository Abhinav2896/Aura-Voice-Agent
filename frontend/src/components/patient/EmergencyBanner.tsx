'use client';

export function EmergencyBanner() {
  return (
    <div className="glass-emergency p-3 border-red-200/50 bg-red-50/25 backdrop-blur-xl shadow-[0_4px_20px_rgba(239,68,68,0.04)] rounded-2xl flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-white/70 border border-red-100/80 shadow-2xs flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <div className="flex-1 pr-1">
        <h5 className="text-[12px] font-semibold text-slate-900 leading-tight">
          For emergencies, call <span className="text-red-600 font-bold">999</span>.
        </h5>
        <p className="text-[10.5px] text-slate-600 font-normal leading-normal mt-0.5">
          If you are experiencing a life-threatening emergency, please call 999 or go to A&E.
        </p>
      </div>
    </div>
  );
}
