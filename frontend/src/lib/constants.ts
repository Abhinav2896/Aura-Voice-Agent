// ============================================================================
// Aura — Constants
// Color tokens, nav items, static text strings.
// ============================================================================

import type { NavItem, SidebarItem, QuickActionItem } from './types';

// ── Brand Colors ──

export const BRAND = {
  gradientStart: '#36B7FF',
  gradientMid: '#2767F2',
  gradientEnd: '#8B5CF6',
  accent: '#A9E6FF',
  patientBg: '#F5F9FF',
  adminSidebar: '#0B0F1A',
  adminSidebarHover: '#151B2E',
} as const;

// ── Semantic Colors for KPI / Intent / Status ──

export const SEMANTIC_COLORS = {
  blue: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  green: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
  purple: { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  amber: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  red: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
} as const;

export const INTENT_COLORS: Record<string, { bg: string; text: string }> = {
  Appointment: { bg: '#DBEAFE', text: '#1D4ED8' },
  Prescription: { bg: '#D1FAE5', text: '#065F46' },
  Escalated: { bg: '#FEE2E2', text: '#B91C1C' },
  Admin: { bg: '#EDE9FE', text: '#5B21B6' },
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#FEF3C7', text: '#92400E' },
  Completed: { bg: '#D1FAE5', text: '#065F46' },
  Escalated: { bg: '#FEE2E2', text: '#B91C1C' },
};

// ── Patient Nav Links ──

export const PATIENT_NAV_LINKS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'Help', href: '#help' },
];

// ── Patient Quick Actions ──

export const QUICK_ACTIONS: QuickActionItem[] = [
  {
    icon: 'icon-appointment',
    title: 'Book an Appointment',
    subtitle: 'Request a GP appointment',
    color: '#3B82F6',
  },
  {
    icon: 'icon-prescription',
    title: 'Repeat Prescription',
    subtitle: 'Request your medication',
    color: '#8B5CF6',
  },
  {
    icon: 'icon-results',
    title: 'Test Results',
    subtitle: 'Ask about your results',
    color: '#10B981',
  },
  {
    icon: 'icon-info',
    title: 'Practice Information',
    subtitle: 'Opening hours, services & more',
    color: '#3B82F6',
  },
  {
    icon: 'icon-enquiry',
    title: 'Other Enquiries',
    subtitle: 'Get help with general questions',
    color: '#6B7280',
  },
];

// ── Patient Suggestions ──

export const VOICE_SUGGESTIONS = [
  "I'd like to book an appointment",
  "I need a repeat prescription",
  "What are your opening hours?",
];

// ── Admin Sidebar Items ──

export const ADMIN_SIDEBAR_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', icon: 'home', href: '/admin' },
  { label: 'Calls', icon: 'calls', href: '/admin/calls' },
  { label: 'Appointment Requests', icon: 'appointment', href: '/admin/appointments' },
  { label: 'Prescription Requests', icon: 'prescription', href: '/admin/prescriptions' },
  { label: 'Admin Enquiries', icon: 'admin', href: '/admin/enquiries' },
  { label: 'Escalations', icon: 'escalation', href: '/admin/escalations' },
  { label: 'Knowledge Base', icon: 'knowledge', href: '/admin/knowledge' },
  { label: 'Analytics', icon: 'analytics', href: '/admin/analytics' },
  { label: 'Settings', icon: 'settings', href: '/admin/settings' },
];

// ── Practice Info ──

export const PRACTICE = {
  name: 'Medical Clinic',
  tagline: 'Care · Convenience · Always Here',
  adminTagline: 'Care · Community · Better Tomorrows',
  quote: 'Here to help, so you can focus on what matters most.',
  missionLine1: 'Healthier People',
  missionLine2: 'Brighter Tomorrows',
  footerTagline: 'Trusted Care for a Healthier Community',
} as const;

// ── Recharts Colors ──

export const CHART_COLORS = {
  aiHandled: '#3B82F6',
  escalated: '#BFDBFE',
  appointments: '#3B82F6',
  prescriptions: '#10B981',
  adminEnquiries: '#8B5CF6',
  escalations: '#EF4444',
} as const;
