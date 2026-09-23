'use client';

export function PracticeInfoCard() {
  return (
    <div className="flex flex-col justify-between h-full py-1">
      {/* ── Top Section: Heading + Quote Card ── */}
      <div className="space-y-5">
        {/* Top Heading */}
        <div>
          <span className="block text-[13px] font-serif italic text-slate-600">
            Trusted care.
          </span>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight mt-0.5">
            Always here for you.
          </h3>
          <div className="w-8 h-[2.5px] bg-blue-500 rounded-full mt-2" />
        </div>

        {/* Glass Quote Card */}
        <div className="glass-card p-5 rounded-3xl relative overflow-hidden bg-white/35 backdrop-blur-2xl border border-white/75 shadow-[0_12px_40px_rgba(50,80,160,0.07)]">
          <div className="text-2xl text-blue-500 font-serif leading-none font-black select-none mb-2 opacity-90">
            “
          </div>
          <blockquote className="text-[13.5px] font-serif italic text-slate-800 leading-relaxed">
            “Here to help,
            <br />
            so you can focus on
            <br />
            what matters most.”
          </blockquote>
          <div className="w-6 h-[2px] bg-blue-400 rounded-full my-3.5 opacity-80" />
          <p className="text-[11px] font-semibold text-slate-600 tracking-wide">
            Medical Practice
          </p>
        </div>
      </div>

      {/* ── Bottom Section: Clean Trust Badges (Matching Image 1) ── */}
      <div className="space-y-3.5 pb-2">
        <div className="flex items-center gap-3 text-[12px] text-slate-600 font-medium">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>Caring for our community</span>
        </div>

        <div className="flex items-center gap-3 text-[12px] text-slate-600 font-medium">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Accessible healthcare</span>
        </div>

        <div className="flex items-center gap-3 text-[12px] text-slate-600 font-medium">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span>A healthier tomorrow</span>
        </div>
      </div>
    </div>
  );
}
