'use client';

import { X, Clock, Calendar, Phone, CheckCircle2, AlertTriangle, ArrowUpRight, Copy, Check, ShieldCheck, User, UserCheck, UserX, Building2, MapPin } from 'lucide-react';
import { useState } from 'react';
import { IntentPill } from '@/components/ui/IntentPill';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CallerTypePill } from '@/components/ui/CallerTypePill';
import type { Call } from '@/lib/types';

interface CallDetailsProps {
  call: Call | null;
  onClose: () => void;
}

export function CallDetails({ call, onClose }: CallDetailsProps) {
  const [copied, setCopied] = useState(false);

  if (!call) return null;

  const isRegistered = call.callerType === 'patient' || call.caller_type === 'patient' || Boolean(call.user_id);
  const patientProfile: any = call.patientProfile || (call as any).patient_profile;

  const handleCopyJson = () => {
    if (call.extractedData) {
      navigator.clipboard.writeText(JSON.stringify(call.extractedData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over drawer container */}
      <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 border-l border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
              #{call.id}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-slate-900">{call.caller}</h3>
                <CallerTypePill type={isRegistered ? 'patient' : 'guest'} />
                <IntentPill intent={call.intent} />
                <StatusBadge status={call.status} />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {call.time}</span>
                <span>•</span>
                <span>Duration: {call.duration}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close call details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Caller Identity Card: Registered Patient vs Guest */}
          {isRegistered ? (
            <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Verified Patient Profile
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                  UID: {call.user_id ? `${call.user_id.slice(0, 8)}...` : 'Linked'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 pt-1">
                <div>
                  <span className="font-semibold text-slate-500 text-[11px] block">Full Name:</span>
                  <span>{patientProfile?.full_name || call.caller}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 text-[11px] block">Phone:</span>
                  <span>{patientProfile?.phone || (call.extractedData as any)?.phone || 'On file'}</span>
                </div>
                {patientProfile?.dob && (
                  <div>
                    <span className="font-semibold text-slate-500 text-[11px] block">Date of Birth:</span>
                    <span>{patientProfile.dob}</span>
                  </div>
                )}
                {patientProfile?.nominated_pharmacy && (
                  <div>
                    <span className="font-semibold text-slate-500 text-[11px] block">Pharmacy:</span>
                    <span className="truncate">{patientProfile.nominated_pharmacy}</span>
                  </div>
                )}
                {patientProfile?.address && (
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-500 text-[11px] block">Address:</span>
                    <span>{patientProfile.address}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-slate-400 text-white flex items-center justify-center text-xs font-bold">
                    <UserX className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Guest Caller (Unauthenticated)
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                  Anonymous
                </span>
              </div>
              <p className="text-xs text-slate-600">
                This caller did not authenticate. Any request created was assigned an anonymous reference code (#APT, #RX, #ADM, #ESC) with zero account linkage.
              </p>
            </div>
          )}
          
          {/* AI Call Summary */}
          <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Gemini AI Summary
              </span>
              <span className="text-[11px] text-blue-600 font-medium">Auto-extracted</span>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-normal">
              {call.summary}
            </p>
          </div>

          {/* Action Taken & Escalation State */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
              <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Action Taken
              </div>
              <p className="text-xs text-slate-800 font-medium leading-normal">
                {call.actionTaken || 'Request saved to triage queue'}
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border ${call.status === 'Escalated' ? 'border-red-100 bg-red-50/40' : 'border-slate-100 bg-slate-50/50'}`}>
              <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <AlertTriangle className={`w-3.5 h-3.5 ${call.status === 'Escalated' ? 'text-red-500' : 'text-slate-400'}`} />
                Escalation State
              </div>
              <p className={`text-xs font-medium leading-normal ${call.status === 'Escalated' ? 'text-red-700 font-semibold' : 'text-slate-800'}`}>
                {call.escalationState || 'None'}
              </p>
            </div>
          </div>

          {/* Structured JSON Extraction (Gemini 3.5 Flash-Lite) */}
          {call.extractedData && (
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-900 text-slate-100">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/60 text-xs">
                <span className="font-mono text-slate-300 flex items-center gap-1.5">
                  <span className="text-purple-400">⚡</span> Structured Metadata (Flash-Lite JSON)
                </span>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy JSON
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-sky-200 overflow-x-auto leading-relaxed">
                {JSON.stringify(call.extractedData, null, 2)}
              </pre>
            </div>
          )}

          {/* Call Transcript */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              Conversation Transcript
            </h4>
            
            {call.transcript && call.transcript.length > 0 ? (
              <div className="space-y-3">
                {call.transcript.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 text-sm ${item.speaker === 'Aura' ? 'items-start' : 'items-start'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold ${
                        item.speaker === 'Aura'
                          ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.speaker === 'Aura' ? 'A' : 'C'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-800">{item.speaker}</span>
                        <span className="text-[10px] text-slate-400">{item.time}</span>
                      </div>
                      <div
                        className={`p-3 rounded-xl text-xs leading-relaxed ${
                          item.speaker === 'Aura'
                            ? 'bg-blue-50/70 border border-blue-100 text-slate-800'
                            : 'bg-slate-100/80 border border-slate-200 text-slate-800'
                        }`}
                      >
                        {item.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                No transcript available for this call.
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Recorded via Aura Voice Agent (Session #{call.id})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
