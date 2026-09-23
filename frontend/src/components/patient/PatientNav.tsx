'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthProvider';
import { TrackRequestModal } from './TrackRequestModal';
import { Search, User, LogOut, LayoutDashboard } from 'lucide-react';

export function PatientNav() {
  const { user, profile, signOut, isLoading } = useAuth();
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Patient';

  return (
    <>
      <header className="w-full flex justify-center pt-3 px-4 select-none flex-shrink-0">
        <div className="glass-card px-4 sm:px-5 py-2 flex items-center justify-between gap-4 border-white/80 shadow-[0_8px_30px_rgba(45,80,155,0.07)] rounded-2xl w-full max-w-[760px]">
          {/* Aura Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 p-1 flex items-center justify-center border border-white/80 shadow-2xs group-hover:scale-105 transition-transform flex-shrink-0">
              <Image
                src="/assets/aura-logo.png"
                alt="Aura Logo"
                width={22}
                height={20}
                className="drop-shadow-xs"
                priority
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 tracking-tight leading-none">Aura</span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-semibold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-dot-online" />
                Online
              </span>
            </div>
          </Link>

          {/* Action and Auth Nav Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            {/* Track Request Button (Available for everyone) */}
            <button
              onClick={() => setIsTrackModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-700 bg-white/70 hover:bg-white border border-slate-200/80 hover:border-blue-200 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer"
              title="Track request with reference number"
            >
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Track Request</span>
            </button>

            {/* Auth Dependent Controls */}
            {!isLoading && (
              user ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/portal"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50/90 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all shadow-2xs"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">My Portal</span>
                  </Link>

                  <div className="flex items-center gap-1.5 pl-1.5 py-1 pr-2 bg-white/80 border border-slate-200/80 rounded-xl shadow-2xs">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold uppercase shadow-2xs">
                      {displayName.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-slate-700 max-w-[80px] truncate hidden md:inline">
                      {displayName}
                    </span>
                  </div>

                  <button
                    onClick={() => signOut()}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-500 bg-slate-100/80 border border-slate-200/70 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Guest
                  </div>
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </header>

      {/* Guest Track Modal */}
      <TrackRequestModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
      />
    </>
  );
}
