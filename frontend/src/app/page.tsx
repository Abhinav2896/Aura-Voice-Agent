'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { PatientNav } from '@/components/patient/PatientNav';
import { QuickActionCard, PATIENT_QUICK_ACTIONS } from '@/components/patient/QuickActionCard';
import { EmergencyBanner } from '@/components/patient/EmergencyBanner';
import { YourRequestPanel } from '@/components/patient/YourRequestPanel';
import { ChatWindow } from '@/components/patient/ChatWindow';
import { useVoiceSession } from '@/voice/useVoiceSession';
import { useAuth } from '@/context/AuthProvider';

export default function PatientPage() {
  const session = useVoiceSession();
  const { user, isLoading } = useAuth();
  const [dismissBanner, setDismissBanner] = useState(false);

  const handleQuickAction = (intentText: string) => {
    session.sendText(intentText);
  };

  return (
    <div className="patient-page-bg h-screen w-screen overflow-hidden flex flex-col justify-between select-none">
      {/* ── Top Glass Navigation Bar ── */}
      <div className="flex-shrink-0 z-30">
        <PatientNav />
      </div>

      {/* ── Guest Info Banner ── */}
      {!isLoading && !user && !dismissBanner && (
        <div className="flex-shrink-0 max-w-2xl mx-auto px-4 pt-1 z-30 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between gap-3 px-3.5 py-1.5 bg-blue-50/90 border border-blue-200/80 rounded-full shadow-xs text-xs text-blue-900 backdrop-blur-xs">
            <div className="flex items-center gap-2 truncate">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
              <span className="truncate">
                Calling as <strong className="font-semibold">Guest</strong>. Want to save transcripts & health history?{' '}
                <Link href="/register" className="font-semibold text-blue-700 underline hover:text-blue-800">
                  Create account
                </Link>
                {' '}or{' '}
                <Link href="/login" className="font-semibold text-blue-700 underline hover:text-blue-800">
                  Sign in
                </Link>
              </span>
            </div>
            <button
              onClick={() => setDismissBanner(true)}
              className="text-blue-500 hover:text-blue-700 p-0.5 rounded-full hover:bg-blue-100/60 transition-colors flex-shrink-0 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Main 3-Column Layout: Left Quick Actions, Center Chat, Right Your Request ── */}
      <main className="flex-1 max-w-[1460px] w-full mx-auto px-6 py-2 flex items-center justify-center z-20 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-8 items-center w-full h-full">

          {/* Left Column — 5 Quick Action Shortcuts + Emergency Banner in unified stack, Tagline at bottom */}
          <aside className="hidden lg:flex lg:col-span-3 xl:col-span-3 flex-col justify-between h-[calc(100vh-125px)] max-h-[790px] py-1">
            {/* Continuous Stack: 5 Quick Actions + Emergency Banner */}
            <div className="space-y-2">
              {PATIENT_QUICK_ACTIONS.map((item) => (
                <QuickActionCard
                  key={item.id}
                  item={item}
                  onClick={handleQuickAction}
                />
              ))}
              <EmergencyBanner />
            </div>

            {/* Bottom Left Editorial Tagline */}
            <div className="pt-2 pl-1">
              <p className="text-[13px] font-serif italic text-slate-600 leading-tight">
                Small
                <br />
                Conversations
                <br />
                <span className="font-sans not-italic font-semibold text-slate-800 text-[12px] tracking-tight">
                  Brighter Tomorrows
                </span>
              </p>
              <div className="w-7 h-[2.5px] bg-blue-500 rounded-full mt-2 opacity-85" />
            </div>
          </aside>

          {/* Center Column — Main Glassmorphic Chat & Voice Window (Visually Dominant) */}
          <section className="col-span-12 lg:col-span-6 xl:col-span-6 flex items-center justify-center h-full">
            <ChatWindow session={session} />
          </section>

          {/* Right Column — Dynamic "Your Request" Panel (Replaces old marketing section) */}
          <aside className="hidden lg:flex lg:col-span-3 xl:col-span-3 flex-col justify-between h-[calc(100vh-125px)] max-h-[790px] py-1 pl-2">
            <YourRequestPanel request={session.patientRequest} />
          </aside>

        </div>
      </main>
    </div>
  );
}
