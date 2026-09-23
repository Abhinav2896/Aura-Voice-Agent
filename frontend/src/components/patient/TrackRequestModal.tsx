'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle, Clock, ShieldCheck, AlertCircle, FileText, Calendar, Sparkles } from 'lucide-react';
import { lookupGuestRequest } from '@/lib/services/patientService';
import type { GuestLookupResult } from '@/lib/types';

interface TrackRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrackRequestModal({ isOpen, onClose }: TrackRequestModalProps) {
  const [referenceId, setReferenceId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuestLookupResult | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await lookupGuestRequest(referenceId, phone);
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'No matching request found for this reference code and phone number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Track Your Request</h3>
              <p className="text-xs text-gray-500">Check appointment or prescription status</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                    {result.request_type}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white shadow-2xs">
                    {result.reference_id}
                  </span>
                </div>
                <div className="flex items-center gap-2 my-2">
                  {result.status.toLowerCase().includes('confirmed') || result.status.toLowerCase().includes('approved') ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-600" />
                  )}
                  <span className="text-sm font-semibold text-gray-900 capitalize">
                    Status: {result.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-gray-700 mt-2 leading-relaxed">
                  {result.message}
                </p>

                {(result.preferred_date || result.preferred_time) && (
                  <div className="mt-3 p-2.5 bg-white border border-blue-200/80 rounded-xl flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-wide">
                        {result.status.toLowerCase().includes('confirmed') ? 'Confirmed Slot' : 'Slot Details'}
                      </span>
                      <p className="text-xs font-bold text-gray-900">
                        {result.preferred_date || 'Date to be assigned'}
                        {result.preferred_time ? ` • ${result.preferred_time}` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {result.notes && (
                  <div className="mt-2.5 p-2.5 bg-blue-50/80 border border-blue-100 rounded-xl text-xs text-blue-950 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-blue-800">Note from Practice:</span>{' '}
                      <span className="text-blue-900 font-medium">{result.notes}</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setResult(null); setError(null); }}
                className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Track Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Reference Code
                </label>
                <input
                  type="text"
                  required
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="#APT-1048 or #RX-8921"
                  className="w-full px-3.5 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase placeholder:normal-case transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Mobile Number (Used When Booking)
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07700 900123"
                  className="w-full px-3.5 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Lookup Request Status
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Strict privacy: medical reasons are never revealed to guest lookups</span>
          </div>
        </div>
      </div>
    </div>
  );
}
