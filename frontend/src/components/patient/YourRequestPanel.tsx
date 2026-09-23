'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, Shield, Sparkles, UserCheck, Activity, ArrowRight, Heart, Users, CheckCircle, Copy, Check } from 'lucide-react';
import type { PatientRequestInfo } from '@/lib/types';

interface YourRequestPanelProps {
  request: PatientRequestInfo;
}

export function YourRequestPanel({ request }: YourRequestPanelProps) {
  const [copiedRef, setCopiedRef] = useState(false);

  const handleCopy = (refId: string) => {
    if (!refId) return;
    navigator.clipboard.writeText(refId);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const isIdle = request.stage === 'idle';
  const isCollecting = request.stage === 'collecting';
  const isSubmitted = request.stage === 'submitted';
  const isLookup = request.stage === 'lookup';

  return (
    <div className="flex flex-col h-full py-1">
      {/* ── Prominent Glassmorphism Box for Live Request Feed ── */}
      <div className="glass-card rounded-3xl overflow-hidden bg-white/35 backdrop-blur-2xl border border-white/80 shadow-[0_16px_50px_rgba(50,80,160,0.10)] flex flex-col transition-all">

        {/* ── Glassmorphic Header Bar ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/60 bg-white/25 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-600 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {isSubmitted ? 'Request Submitted' : isLookup ? 'Appointment Lookup' : 'Your Request'}
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600/90 block">
                Live Request Feed
              </span>
            </div>
          </div>

          {/* Status Badge */}
          {isSubmitted && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Logged
            </span>
          )}

          {isCollecting && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-blue-500/15 text-blue-700 border border-blue-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
              Active
            </span>
          )}

          {isLookup && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-indigo-500/15 text-indigo-700 border border-indigo-400/30">
              <Shield className="w-3 h-3 text-indigo-600" />
              Secure lookup
            </span>
          )}

          {isIdle && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-600 border border-slate-300/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ready
            </span>
          )}
        </div>

        {/* ── Card Body by State ── */}
        <div className="p-5 space-y-4">

          {/* STATE 1: IDLE */}
          {isIdle && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-3.5 rounded-2xl bg-white/50 border border-white/80 shadow-2xs flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold text-slate-800 leading-tight">
                    Live Clinical Assistant
                  </h4>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed mt-1">
                    Start speaking or typing to Aura. Your appointment or prescription details will update here in real time.
                  </p>
                </div>
              </div>

              {/* Embedded Trust Points */}
              <div className="pt-2.5 border-t border-white/50 space-y-2.5">
                <div className="flex items-center gap-2.5 text-[12px] text-slate-600 font-medium">
                  <Heart className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>Caring for our community</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12px] text-slate-600 font-medium">
                  <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span>Accessible healthcare</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12px] text-slate-600 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>A healthier tomorrow</span>
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: INTENT DETECTED / COLLECTING */}
          {isCollecting && (
            <div className="space-y-3.5 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-semibold text-blue-600 tracking-wider block">
                    {request.type || 'Request in Progress'}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight truncate">
                    {request.intent || 'Appointment Request'}
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10.5px] font-medium bg-amber-500/15 text-amber-800 border border-amber-400/30 flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3 text-amber-600 animate-spin" style={{ animationDuration: '3s' }} />
                  <span>Collecting</span>
                </span>
              </div>

              {/* Extracted Fields */}
              {request.fields.length > 0 && (
                <div className="rounded-2xl bg-white/70 border border-white/90 p-3 space-y-2.5 shadow-2xs">
                  {request.fields.map((field, idx) => (
                    <div key={idx} className="flex items-baseline justify-between text-xs gap-3">
                      <span className="text-slate-500 font-medium text-[11.5px] flex-shrink-0">{field.label}:</span>
                      <span className="text-slate-900 font-semibold text-[12px] text-right truncate">{field.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Follow-up Note */}
              <div className="pt-2 border-t border-white/60 flex items-center gap-2 text-[11px] text-blue-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>Aura is asking follow-up questions...</span>
              </div>
            </div>
          )}

          {/* STATE 3: REQUEST SUBMITTED */}
          {isSubmitted && (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
              {/* Intent Title & Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 leading-tight truncate">
                  {request.intent || 'Appointment Request'}
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100/90 text-emerald-800 border border-emerald-200/80 whitespace-nowrap flex-shrink-0">
                  {request.status || 'Pending review'}
                </span>
              </div>

              {/* Dedicated Reference Number Banner */}
              {request.referenceId && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-emerald-800">Ref:</span>
                    <span className="text-xs font-mono font-bold text-emerald-900 tracking-wider">
                      {request.referenceId}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(request.referenceId!)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-emerald-800 text-[11px] font-semibold border border-emerald-300/60 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                    title="Copy reference number to clipboard"
                  >
                    {copiedRef ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-emerald-700" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Summary Fields (Unified Clean Card) */}
              {request.fields.length > 0 && (
                <div className="rounded-2xl bg-white/70 border border-white/90 p-3 space-y-2.5 shadow-2xs">
                  {request.fields.map((field, idx) => (
                    <div key={idx} className="flex items-baseline justify-between text-xs gap-3">
                      <span className="text-slate-500 font-medium text-[11.5px] flex-shrink-0">{field.label}:</span>
                      <span className="text-slate-900 font-semibold text-[12px] text-right truncate">{field.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Next Action Advice */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px] mb-1">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Next Step</span>
                </div>
                <p className="text-[11.5px] text-slate-700 leading-normal font-normal">
                  {request.nextAction || 'Submitted to the practice clinical triage team for review'}
                </p>
              </div>
            </div>
          )}

          {/* STATE 4: SECURE APPOINTMENT LOOKUP */}
          {isLookup && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 leading-tight truncate">
                  {request.status || 'Lookup Request'}
                </h4>
                {request.lookupState === 'found' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100/80 text-emerald-800 border border-emerald-200 flex-shrink-0">
                    Found
                  </span>
                )}
                {request.lookupState === 'not_found' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100/80 text-slate-600 border border-slate-200 flex-shrink-0">
                    Not found
                  </span>
                )}
                {request.lookupState === 'multiple' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100/80 text-amber-800 border border-amber-200 flex-shrink-0">
                    Confirm ref
                  </span>
                )}
              </div>

              {request.referenceId && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-indigo-800">Ref:</span>
                    <span className="text-xs font-mono font-bold text-indigo-900 tracking-wider">
                      {request.referenceId}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(request.referenceId!)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-indigo-800 text-[11px] font-semibold border border-indigo-300/60 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                    title="Copy reference number to clipboard"
                  >
                    {copiedRef ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-indigo-700" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Found: curated request fields only */}
              {request.lookupState === 'found' && request.fields.length > 0 && (
                <div className="rounded-2xl bg-white/70 border border-white/90 p-3 space-y-2.5 shadow-2xs">
                  {request.fields.map((field, idx) => (
                    <div key={idx} className="flex items-baseline justify-between text-xs gap-3">
                      <span className="text-slate-500 font-medium text-[11.5px] flex-shrink-0">{field.label}:</span>
                      <span className="text-slate-900 font-semibold text-[12px] text-right truncate">{field.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Safe message for not-found / multiple (never reveals other patients) */}
              {(request.lookupState === 'not_found' || request.lookupState === 'multiple') && request.message && (
                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 text-xs">
                  <div className="flex items-center gap-1.5 text-indigo-800 font-semibold text-[11px] mb-1">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{request.lookupState === 'multiple' ? 'Which request?' : 'No match'}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-700 leading-normal font-normal">
                    {request.message}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
