'use client';

import { ChevronRight } from 'lucide-react';

export interface QuickActionItemData {
  id: string;
  title: string;
  subtitle: string;
  intentText: string;
  iconType: 'calendar' | 'pill' | 'test' | 'info' | 'enquiry';
}

export const PATIENT_QUICK_ACTIONS: QuickActionItemData[] = [
  {
    id: 'appt',
    title: 'Book an appointment',
    subtitle: 'See a GP or nurse',
    intentText: "I'd like to book an appointment with a GP.",
    iconType: 'calendar',
  },
  {
    id: 'presc',
    title: 'Repeat prescription',
    subtitle: 'Request your medication',
    intentText: 'I need to request a repeat prescription for my medication.',
    iconType: 'pill',
  },
  {
    id: 'test',
    title: 'Test results',
    subtitle: 'Ask about your results',
    intentText: "I'd like to check the status of my recent test results.",
    iconType: 'test',
  },
  {
    id: 'info',
    title: 'Practice information',
    subtitle: 'Opening hours, services & more',
    intentText: 'Could you tell me the practice opening hours and available services?',
    iconType: 'info',
  },
  {
    id: 'enquiry',
    title: 'Other enquiries',
    subtitle: 'Get help with general questions',
    intentText: 'I have a general enquiry regarding the practice.',
    iconType: 'enquiry',
  },
];

interface QuickActionCardProps {
  item: QuickActionItemData;
  onClick: (intentText: string) => void;
}

export function QuickActionCard({ item, onClick }: QuickActionCardProps) {
  const renderIcon = () => {
    switch (item.iconType) {
      case 'calendar':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2.5" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M7 16l3-3 2 2 4-4" />
          </svg>
        );
      case 'pill':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.2 4.1 19.9 15.8a3 3 0 0 1 0 4.2l-.7.7a3 3 0 0 1-4.2 0L3.3 9a3 3 0 0 1 0-4.2l.7-.7a3 3 0 0 1 4.2 0Z" />
            <path d="m7 7 10 10" />
          </svg>
        );
      case 'test':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        );
      case 'info':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="8.01" strokeWidth="2.5" />
            <line x1="12" y1="11" x2="12" y2="16" />
          </svg>
        );
      case 'enquiry':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        );
    }
  };

  return (
    <button
      onClick={() => onClick(item.intentText)}
      className="glass-card w-full py-2.5 px-3.5 text-left flex items-center justify-between group cursor-pointer border-white/60 bg-white/30 hover:bg-white/50 shadow-[0_6px_20px_rgba(50,80,160,0.06)] rounded-2xl transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/70 border border-white/90 shadow-2xs flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
          {renderIcon()}
        </div>
        <div className="pr-1">
          <h4 className="text-[12.5px] font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
            {item.title}
          </h4>
          <p className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5">
            {item.subtitle}
          </p>
        </div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </button>
  );
}
