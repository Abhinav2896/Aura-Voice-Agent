'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Calendar,
  Pill,
  AlertTriangle,
  CheckCheck,
  RotateCw,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { getAppointments, getPrescriptions, getEscalations } from '@/lib/services';
import { formatTimeAgo } from '@/lib/timeAgo';

export type NotificationCategory = 'all' | 'appointment' | 'prescription' | 'escalation';

export interface NotificationItem {
  id: string;
  category: 'appointment' | 'prescription' | 'escalation';
  title: string;
  patientName: string;
  subtitle: string;
  details?: string;
  referenceId: string;
  status: string;
  timestamp: string;
  href: string;
  isUrgent?: boolean;
}

function formatStatus(status: string) {
  switch (status?.toLowerCase()) {
    case 'pending_review':
    case 'pending':
      return 'Pending Review';
    case 'pending_signature':
      return 'Pending Signature';
    case 'confirmed':
      return 'Confirmed';
    case 'approved':
      return 'Approved';
    case 'escalated':
      return 'Action Needed';
    case 'resolved':
      return 'Resolved';
    default:
      return status || 'New';
  }
}

function getStatusBadgeClass(status: string, isUrgent?: boolean) {
  if (isUrgent || status?.toLowerCase() === 'urgent' || status?.toLowerCase() === 'escalated') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  switch (status?.toLowerCase()) {
    case 'confirmed':
    case 'approved':
    case 'resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'pending_review':
    case 'pending':
    case 'pending_signature':
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200';
  }
}

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch live notifications from Appointments, Prescriptions, and Escalations
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aptRes, rxRes, escRes] = await Promise.allSettled([
        getAppointments(),
        getPrescriptions(),
        getEscalations(),
      ]);

      const list: NotificationItem[] = [];

      // 1. Appointments
      if (aptRes.status === 'fulfilled' && Array.isArray(aptRes.value)) {
        for (const a of aptRes.value) {
          list.push({
            id: `apt-${a.id}`,
            category: 'appointment',
            title: 'Appointment Request',
            patientName: a.callerName || (a as any).patient_name || 'Patient',
            subtitle: a.reason || 'General GP Consultation',
            details: a.preferredDate || a.preferredTime ? `Pref: ${[a.preferredDate, a.preferredTime].filter(Boolean).join(' • ')}` : undefined,
            referenceId: a.id || '#APT',
            status: a.status || 'pending_review',
            timestamp: a.timestamp || (a as any).created_at || new Date().toISOString(),
            href: '/admin/appointments',
            isUrgent: a.urgency === 'urgent',
          });
        }
      }

      // 2. Prescriptions
      if (rxRes.status === 'fulfilled' && Array.isArray(rxRes.value)) {
        for (const p of rxRes.value) {
          list.push({
            id: `rx-${p.id}`,
            category: 'prescription',
            title: 'Prescription Request',
            patientName: p.patientName || 'Patient',
            subtitle: `${p.medication || 'Medication'} ${p.dosage ? `(${p.dosage})` : ''}`,
            details: p.pharmacy ? `Pharmacy: ${p.pharmacy}` : undefined,
            referenceId: p.id || '#RX',
            status: p.status || 'pending_signature',
            timestamp: p.timestamp || (p as any).created_at || new Date().toISOString(),
            href: '/admin/prescriptions',
            isUrgent: false,
          });
        }
      }

      // 3. Escalations
      if (escRes.status === 'fulfilled' && Array.isArray(escRes.value)) {
        for (const e of escRes.value) {
          list.push({
            id: `esc-${e.id}`,
            category: 'escalation',
            title: 'Clinician Escalation',
            patientName: e.patientName || 'Patient',
            subtitle: e.reason || 'Red flag clinical escalation',
            details: e.transferredTo ? `Transferred to: ${e.transferredTo}` : undefined,
            referenceId: e.referenceId || e.id || '#ESC',
            status: e.status || 'Escalated',
            timestamp: e.createdAt || new Date().toISOString(),
            href: '/admin/escalations',
            isUrgent: true,
          });
        }
      }

      // Sort newest first
      list.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        return timeB - timeA;
      });

      setItems(list);
    } catch (err) {
      console.error('[NotificationDropdown] Failed to fetch notifications:', err);
      setError('Could not load recent notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Click outside and ESC listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleItemClick = (item: NotificationItem) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    setIsOpen(false);
    router.push(item.href);
  };

  const handleMarkAllRead = () => {
    const allIds = new Set(items.map((it) => it.id));
    setReadIds(allIds);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const unreadCount = items.filter((it) => !readIds.has(it.id)).length;
  const aptCount = items.filter((it) => it.category === 'appointment').length;
  const rxCount = items.filter((it) => it.category === 'prescription').length;
  const escCount = items.filter((it) => it.category === 'escalation').length;

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className={`relative p-2 rounded-xl transition-all cursor-pointer ${
          isOpen
            ? 'text-blue-600 bg-blue-50/80 shadow-xs'
            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
        }`}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5 transition-transform active:scale-90" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[410px] max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-gray-100/90 z-50 overflow-hidden flex flex-col animate-in fade-in-0 slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/70 to-white">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full">
                  All caught up
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={fetchNotifications}
                disabled={loading}
                title="Refresh notifications"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark read</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 bg-gray-50/70 border-b border-gray-100 overflow-x-auto text-[11px] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setActiveCategory('appointment')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeCategory === 'appointment'
                  ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Bookings ({aptCount})
            </button>
            <button
              onClick={() => setActiveCategory('prescription')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeCategory === 'prescription'
                  ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Prescriptions ({rxCount})
            </button>
            <button
              onClick={() => setActiveCategory('escalation')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeCategory === 'escalation'
                  ? 'bg-white text-amber-700 shadow-2xs font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Escalations ({escCount})
            </button>
          </div>

          {/* Body: List */}
          <div className="max-h-[380px] overflow-y-auto admin-scrollbar divide-y divide-gray-100">
            {error ? (
              <div className="p-6 text-center text-xs text-red-600 bg-red-50/40">
                {error}
              </div>
            ) : loading && items.length === 0 ? (
              <div className="p-5 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3 items-center animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                      <div className="h-2.5 bg-gray-50 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
                <Sparkles className="w-6 h-6 text-gray-300" />
                <p className="text-xs font-medium text-gray-600">No notifications in this category</p>
                <p className="text-[11px] text-gray-400">New patient bookings and prescription requests will appear here in real-time.</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isRead = readIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`group px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                      isRead ? 'bg-white hover:bg-gray-50/80 opacity-75' : 'bg-blue-50/15 hover:bg-blue-50/40'
                    }`}
                  >
                    {/* Category Icon */}
                    <div className="pt-0.5 flex-shrink-0">
                      {item.category === 'appointment' ? (
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                          <Calendar className="w-4 h-4" />
                        </div>
                      ) : item.category === 'prescription' ? (
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                          <Pill className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold text-gray-900 truncate">
                            {item.patientName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                            {item.referenceId}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 font-medium truncate mt-0.5">
                        {item.subtitle}
                      </p>

                      {item.details && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {item.details}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-0.5">
                        <span
                          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getStatusBadgeClass(
                            item.status,
                            item.isUrgent
                          )}`}
                        >
                          {formatStatus(item.status)}
                        </span>

                        <span className="text-[10px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                          View details <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {!isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <span className="text-gray-400 font-medium">Quick links:</span>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin/appointments');
                }}
                className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                Appointments <ExternalLink className="w-3 h-3" />
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/admin/prescriptions');
                }}
                className="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                Prescriptions <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
