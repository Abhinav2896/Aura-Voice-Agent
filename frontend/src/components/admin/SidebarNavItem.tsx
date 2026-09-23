'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Phone,
  Calendar,
  FileText,
  HelpCircle,
  AlertTriangle,
  BookOpen,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';

interface SidebarNavItemProps {
  icon: string;
  label: string;
  isActive?: boolean;
  href?: string;
  onClick?: () => void;
}

interface IconStyle {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

const ICON_MAP: Record<string, IconStyle> = {
  home: {
    icon: LayoutDashboard,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/25',
  },
  calls: {
    icon: Phone,
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/25',
  },
  appointment: {
    icon: Calendar,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/15',
    border: 'border-indigo-500/25',
  },
  prescription: {
    icon: FileText,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/25',
  },
  admin: {
    icon: HelpCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/25',
  },
  escalation: {
    icon: AlertTriangle,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/25',
  },
  knowledge: {
    icon: BookOpen,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/25',
  },
  analytics: {
    icon: BarChart3,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/25',
  },
  settings: {
    icon: Settings,
    color: 'text-slate-300',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/25',
  },
};

export function SidebarNavItem({ icon, label, isActive = false, href, onClick }: SidebarNavItemProps) {
  const iconConfig = ICON_MAP[icon] || {
    icon: LayoutDashboard,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/25',
  };
  const IconComponent = iconConfig.icon;

  const baseClasses =
    'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer select-none';
  const activeClasses =
    'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-600/30 font-semibold';
  const inactiveClasses =
    'text-slate-300 hover:text-white hover:bg-white/[0.06]';

  const content = (
    <>
      <div
        className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all duration-200 flex-shrink-0 ${
          isActive
            ? 'bg-white/20 border-white/30 text-white shadow-xs'
            : `${iconConfig.bg} ${iconConfig.border} ${iconConfig.color} group-hover:scale-105 group-hover:brightness-125`
        }`}
      >
        <IconComponent className="w-3.5 h-3.5" />
      </div>
      <span className="truncate tracking-tight">{label}</span>
    </>
  );

  if (href && !onClick) {
    return (
      <Link href={href} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} w-full text-left`}
    >
      {content}
    </button>
  );
}
