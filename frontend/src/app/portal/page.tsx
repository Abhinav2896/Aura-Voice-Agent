'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import {
  getMyAppointments,
  getMyPrescriptions,
  getMyCalls,
  getMyCallDetail,
  updateMyProfile,
} from '@/lib/services/patientService';
import type { AppointmentRequest, PrescriptionRequest, Call } from '@/lib/types';
import {
  Calendar,
  Pill,
  MessageSquare,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  PhoneCall,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Save,
  LogOut,
  Building2,
  FileText,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

type TabType = 'overview' | 'requests' | 'history' | 'profile';

export default function PatientPortalPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, signOut, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const [appointments, setAppointments] = useState<AppointmentRequest[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Call history detail expansion
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [callDetailsMap, setCallDetailsMap] = useState<Record<string, Call>>({});
  const [loadingCallDetail, setLoadingCallDetail] = useState<string | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    dob: '',
    address: '',
    nominated_pharmacy: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/portal');
    }
  }, [authLoading, user, router]);

  // Sync profile data to form
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        dob: profile.dob || '',
        address: profile.address || '',
        nominated_pharmacy: profile.nominated_pharmacy || '',
      });
    } else if (user?.user_metadata) {
      setProfileForm({
        full_name: user.user_metadata.full_name || '',
        phone: user.user_metadata.phone || '',
        dob: user.user_metadata.dob || '',
        address: '',
        nominated_pharmacy: '',
      });
    }
  }, [profile, user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const [apts, rxs, cls] = await Promise.all([
        getMyAppointments().catch(() => []),
        getMyPrescriptions().catch(() => []),
        getMyCalls().catch(() => []),
      ]);
      setAppointments(apts);
      setPrescriptions(rxs);
      setCalls(cls);
    } catch (err: any) {
      setDataError(err?.message || 'Could not load your health records.');
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Expand call transcript
  const toggleCallExpand = async (callId: string) => {
    if (expandedCallId === callId) {
      setExpandedCallId(null);
      return;
    }
    setExpandedCallId(callId);
    if (!callDetailsMap[callId]) {
      setLoadingCallDetail(callId);
      try {
        const detail = await getMyCallDetail(callId);
        setCallDetailsMap((prev) => ({ ...prev, [callId]: detail }));
      } catch (err) {
        console.error('Error loading call transcript:', err);
      } finally {
        setLoadingCallDetail(null);
      }
    }
  };

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);
    try {
      await updateMyProfile(profileForm);
      await refreshProfile();
      setProfileSuccessMsg('Profile updated successfully.');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      setProfileErrorMsg(err?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading || (!user && authLoading)) {
    return (
      <div className="min-h-screen patient-page-bg flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading your health portal...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Patient';

  return (
    <div className="min-h-screen patient-page-bg flex flex-col text-slate-800">
      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/75 border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/assets/aura-logo.png"
                alt="Aura Logo"
                width={30}
                height={27}
                className="drop-shadow-xs group-hover:scale-105 transition-transform"
                priority
              />
              <div className="flex flex-col">
                <span className="text-base font-bold text-slate-900 leading-tight">Aura</span>
                <span className="text-[10px] text-slate-500 leading-none">Patient Portal</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/60 text-[11px] font-medium text-blue-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Patient
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Start Live Session Button */}
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all hover:scale-102 active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Talk to Aura</span>
            </Link>

            {/* Sign Out Button */}
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50/80 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-600 text-white p-6 sm:p-8 shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-medium backdrop-blur-xs text-blue-100">
                <Building2 className="w-3.5 h-3.5" />
                Medical Practice
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Welcome back, {displayName}
              </h1>
              <p className="text-sm text-blue-100/90 max-w-xl">
                Access your appointment requests, repeat prescription orders, full conversational transcripts, and profile settings in real-time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold text-sm rounded-xl shadow-sm transition-all hover:shadow"
              >
                <PhoneCall className="w-4 h-4 text-blue-600" />
                Start Voice Call
              </Link>
            </div>
          </div>
          {/* Decorative glowing gradient overlay */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'requests'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Appointments & Prescriptions
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
              {appointments.length + prescriptions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Saved Voice Transcripts
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
              {calls.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <User className="w-4 h-4" />
            Profile Settings
          </button>
        </div>

        {/* ── Tab Content ── */}
        {dataLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Retrieving patient records...</p>
          </div>
        ) : (
          <>
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="glass-card p-5 rounded-2xl border-white/80 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Appointment Requests</p>
                      <p className="text-2xl font-bold text-slate-900">{appointments.length}</p>
                      <p className="text-[11px] text-blue-600 font-medium">
                        {appointments.filter((a) => a.status?.includes('pending')).length} active review
                      </p>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-2xl border-white/80 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                      <Pill className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Repeat Prescriptions</p>
                      <p className="text-2xl font-bold text-slate-900">{prescriptions.length}</p>
                      <p className="text-[11px] text-green-600 font-medium">
                        {prescriptions.filter((p) => p.status?.includes('pending')).length} pending GP
                      </p>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-2xl border-white/80 shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Saved Voice Calls</p>
                      <p className="text-2xl font-bold text-slate-900">{calls.length}</p>
                      <p className="text-[11px] text-purple-600 font-medium">Full AI transcripts saved</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Latest Appointments */}
                  <div className="glass-card p-6 rounded-2xl border-white/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <h2 className="text-base font-bold text-slate-900">Recent Appointments</h2>
                      </div>
                      <button
                        onClick={() => setActiveTab('requests')}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        View all <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {appointments.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No appointments booked yet. Speak to Aura to schedule one.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {appointments.slice(0, 3).map((apt: any) => (
                          <div
                            key={apt.id}
                            className="p-3.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-3 transition-colors"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyCode(apt.reference_id || apt.id);
                                  }}
                                  className="inline-flex items-center gap-1 font-mono text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50/90 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200/70 transition-all cursor-pointer shadow-2xs"
                                  title="Click to copy reference code"
                                >
                                  <span>{apt.reference_id || apt.id}</span>
                                  {copiedCode === (apt.reference_id || apt.id) ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-blue-500 opacity-80" />
                                  )}
                                </button>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                  apt.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : apt.status === 'cancelled'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {apt.status?.replace('_', ' ') || 'Pending'}
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-800 truncate">{apt.reason}</p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {apt.status === 'confirmed' ? '📅 Confirmed: ' : 'Preferred: '}
                                <span className={apt.status === 'confirmed' ? 'text-emerald-700 font-semibold' : 'text-slate-700'}>
                                  {apt.preferred_date || 'Earliest available'} • {apt.preferred_time || 'Anytime'}
                                </span>
                              </p>
                              {apt.notes && (
                                <p className="text-[10.5px] text-blue-800 bg-blue-50/90 px-2 py-0.5 rounded-md border border-blue-100/80 truncate" title={apt.notes}>
                                  <span className="font-semibold">Note:</span> {apt.notes}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] text-slate-400">
                                {apt.created_at ? new Date(apt.created_at).toLocaleDateString() : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Latest Prescriptions */}
                  <div className="glass-card p-6 rounded-2xl border-white/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Pill className="w-5 h-5 text-green-600" />
                        <h2 className="text-base font-bold text-slate-900">Repeat Prescriptions</h2>
                      </div>
                      <button
                        onClick={() => setActiveTab('requests')}
                        className="text-xs font-semibold text-green-700 hover:text-green-800 flex items-center gap-1 cursor-pointer"
                      >
                        View all <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {prescriptions.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        No prescription requests logged yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {prescriptions.slice(0, 3).map((rx: any) => (
                          <div
                            key={rx.id}
                            className="p-3.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-3 transition-colors"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyCode(rx.reference_id || rx.id);
                                  }}
                                  className="inline-flex items-center gap-1 font-mono text-xs font-bold text-green-700 hover:text-green-900 bg-green-50/90 hover:bg-green-100 px-2 py-0.5 rounded-md border border-green-200/70 transition-all cursor-pointer shadow-2xs"
                                  title="Click to copy reference code"
                                >
                                  <span>{rx.reference_id || rx.id}</span>
                                  {copiedCode === (rx.reference_id || rx.id) ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-green-600 opacity-80" />
                                  )}
                                </button>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-green-100 text-green-800">
                                  {rx.status?.replace('_', ' ') || 'Pending'}
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-800 truncate">
                                {rx.medication} {rx.dosage ? `(${rx.dosage})` : ''}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                Pharmacy: {rx.pharmacy || profile?.nominated_pharmacy || 'Default practice pharmacy'}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] text-slate-400">
                                {rx.created_at ? new Date(rx.created_at).toLocaleDateString() : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. APPOINTMENTS & PRESCRIPTIONS TAB */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                {/* Appointments Section */}
                <div className="glass-card p-6 rounded-2xl border-white/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <h2 className="text-base font-bold text-slate-900">Your Appointment Requests</h2>
                    </div>
                    <button
                      onClick={loadData}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50/60 rounded-lg transition-colors cursor-pointer"
                      title="Refresh appointments"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {appointments.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      You have no appointment requests on record.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {appointments.map((apt: any) => {
                        const isConfirmed = apt.status === 'confirmed';
                        const isCancelled = apt.status === 'cancelled';
                        return (
                          <div
                            key={apt.id}
                            className={`p-4 bg-white/90 border rounded-xl space-y-2.5 shadow-2xs transition-all ${
                              isConfirmed
                                ? 'border-emerald-200/80 bg-emerald-50/20'
                                : isCancelled
                                ? 'border-rose-200/80 bg-rose-50/10'
                                : 'border-slate-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => handleCopyCode(apt.reference_id || apt.id)}
                                className="inline-flex items-center gap-1 font-mono text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50/90 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200/70 transition-all cursor-pointer shadow-2xs"
                                title="Click to copy reference code"
                              >
                                <span>{apt.reference_id || apt.id}</span>
                                {copiedCode === (apt.reference_id || apt.id) ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-blue-500 opacity-80" />
                                )}
                              </button>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                                  isConfirmed
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isCancelled
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {isConfirmed && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                                {apt.status?.replace('_', ' ') || 'Pending'}
                              </span>
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-slate-800">Reason / Symptoms:</p>
                              <p className="text-sm text-slate-700">{apt.reason}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                              <div>
                                <span className="font-medium text-slate-600">
                                  {isConfirmed ? 'Scheduled Date:' : 'Preferred Date:'}
                                </span>{' '}
                                <span className={`font-semibold ${isConfirmed ? 'text-emerald-700' : 'text-slate-800'}`}>
                                  {apt.preferred_date || 'Earliest available'}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-slate-600">
                                  {isConfirmed ? 'Scheduled Time:' : 'Preferred Time:'}
                                </span>{' '}
                                <span className={`font-semibold ${isConfirmed ? 'text-emerald-700' : 'text-slate-800'}`}>
                                  {apt.preferred_time || 'Anytime'}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-slate-600">Urgency:</span>{' '}
                                <span className="capitalize font-medium text-slate-800">{apt.urgency || 'routine'}</span>
                              </div>
                              <div>
                                <span className="font-medium text-slate-600">Logged:</span>{' '}
                                {apt.created_at ? new Date(apt.created_at).toLocaleDateString() : 'Recently'}
                              </div>
                            </div>

                            {/* Practice Note from Admin */}
                            {apt.notes && (
                              <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-bold text-blue-800">Practice Update:</span>{' '}
                                  <span className="text-blue-950 font-medium">{apt.notes}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Prescriptions Section */}
                <div className="glass-card p-6 rounded-2xl border-white/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Pill className="w-5 h-5 text-green-600" />
                    <h2 className="text-base font-bold text-slate-900">Your Repeat Prescriptions</h2>
                  </div>

                  {prescriptions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      You have no repeat prescription requests on record.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {prescriptions.map((rx: any) => (
                        <div
                          key={rx.id}
                          className="p-4 bg-white/80 border border-slate-200/80 rounded-xl space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleCopyCode(rx.reference_id || rx.id)}
                              className="inline-flex items-center gap-1 font-mono text-xs font-bold text-green-700 hover:text-green-900 bg-green-50/90 hover:bg-green-100 px-2 py-0.5 rounded-md border border-green-200/70 transition-all cursor-pointer shadow-2xs"
                              title="Click to copy reference code"
                            >
                              <span>{rx.reference_id || rx.id}</span>
                              {copiedCode === (rx.reference_id || rx.id) ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-green-600 opacity-80" />
                              )}
                            </button>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800">
                              {rx.status?.replace('_', ' ') || 'Pending'}
                            </span>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-slate-800">Medication:</p>
                            <p className="text-sm font-medium text-slate-900">
                              {rx.medication} {rx.dosage ? `— ${rx.dosage}` : ''}
                            </p>
                          </div>

                          {rx.notes && (
                            <p className="text-xs text-slate-500 italic">Notes: {rx.notes}</p>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                            <div>
                              <span className="font-medium text-slate-600">Pharmacy:</span>{' '}
                              {rx.pharmacy || profile?.nominated_pharmacy || 'Standard'}
                            </div>
                            <div>
                              <span className="font-medium text-slate-600">Requested:</span>{' '}
                              {rx.created_at ? new Date(rx.created_at).toLocaleDateString() : 'Recently'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. SAVED CALL HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="glass-card p-6 rounded-2xl border-white/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Saved Voice Sessions & Transcripts</h2>
                      <p className="text-xs text-slate-500">
                        Review your conversations with Aura, post-call clinical summaries, and key points discussed.
                      </p>
                    </div>
                  </div>
                </div>

                {calls.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-sm space-y-2">
                    <p>No saved voice calls associated with your patient account yet.</p>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Start a voice call now <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {calls.map((call: any) => {
                      const isExpanded = expandedCallId === call.id;
                      const detail = callDetailsMap[call.id];
                      const isLoadingDetail = loadingCallDetail === call.id;

                      return (
                        <div
                          key={call.id}
                          className="bg-white/80 border border-slate-200/80 rounded-xl overflow-hidden transition-all shadow-2xs"
                        >
                          {/* Call Header Card */}
                          <div
                            onClick={() => toggleCallExpand(call.id)}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
                          >
                            <div className="flex items-start sm:items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                <PhoneCall className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900">
                                    Call #{call.call_number || call.id.slice(0, 8)}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                                    {call.intent || 'General Intake'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                    Duration: {call.duration_display || '1m 20s'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 line-clamp-1">
                                  {call.summary || 'Consultation session with Aura.'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 justify-between sm:justify-end">
                              <span className="text-[11px] text-slate-400">
                                {call.created_at ? new Date(call.created_at).toLocaleString() : ''}
                              </span>
                              <div className="text-slate-400 p-1">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Transcript and Summary */}
                          {isExpanded && (
                            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 space-y-5 animate-in fade-in duration-200">
                              {/* Clinical Summary Block */}
                              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                    AI Clinical Summary
                                  </h4>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-200/60 text-indigo-800">
                                    Urgency: {call.urgency || 'routine'}
                                  </span>
                                </div>
                                <p className="text-xs text-indigo-950 leading-relaxed">
                                  {call.summary || 'Summary generated upon call completion.'}
                                </p>
                              </div>

                              {/* Message Bubbles */}
                              <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                  Conversation Transcript
                                </h4>

                                {isLoadingDetail ? (
                                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                    Loading transcript messages...
                                  </div>
                                ) : detail?.messages && detail.messages.length > 0 ? (
                                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-2">
                                    {detail.messages.map((msg: any, idx: number) => {
                                      const isAura = msg.role === 'assistant';
                                      return (
                                        <div
                                          key={msg.id || idx}
                                          className={`flex flex-col ${isAura ? 'items-start' : 'items-end'}`}
                                        >
                                          <span className="text-[10px] font-medium text-slate-400 px-1 mb-0.5">
                                            {isAura ? 'Aura (AI Receptionist)' : displayName}
                                          </span>
                                          <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                                              isAura
                                                ? 'bg-white border border-slate-200/80 text-slate-800 shadow-2xs'
                                                : 'bg-blue-600 text-white shadow-xs'
                                            }`}
                                          >
                                            {msg.content}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">No message entries recorded for this call.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. PROFILE SETTINGS TAB */}
            {activeTab === 'profile' && (
              <div className="glass-card p-6 sm:p-8 rounded-2xl border-white/80 shadow-xs max-w-2xl space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Patient Profile & Practice Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Keep your contact details up-to-date so Aura can personalize your clinical triage requests.
                  </p>
                </div>

                {profileSuccessMsg && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                {profileErrorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>{profileErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
                      <input
                        type="text"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                        required
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Contact Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        required
                        placeholder="+44 7700 900077"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date of Birth (DD/MM/YYYY)
                      </label>
                      <input
                        type="text"
                        value={profileForm.dob}
                        onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                        placeholder="14/08/1988"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nominated Pharmacy
                      </label>
                      <input
                        type="text"
                        value={profileForm.nominated_pharmacy}
                        onChange={(e) => setProfileForm({ ...profileForm, nominated_pharmacy: e.target.value })}
                        placeholder="Boots Pharmacy, High Street"
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                    <textarea
                      rows={2}
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="12 Baker Street, London, NW1 6XE"
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs resize-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">
                      Email address is managed via your Supabase security account.
                    </p>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
