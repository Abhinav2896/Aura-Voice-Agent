'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { SidebarNavItem } from './SidebarNavItem';
import { ADMIN_SIDEBAR_ITEMS } from '@/lib/constants';

interface SidebarProps {
  activeItem?: string;
}

export function Sidebar({ activeItem }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] flex flex-col z-40 border-r border-slate-800/80 shadow-lg shadow-black/20"
           style={{ backgroundColor: '#0B0F1A' }}>
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-5">
        <Image src="/assets/sidebar-bg.svg" alt="" fill className="object-cover" />
      </div>

      {/* Logo */}
      <div className="relative px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Image src="/assets/aura-logo.png" alt="Aura" width={26} height={24} priority />
          <div>
            <h1 className="text-white text-[15px] font-bold leading-tight tracking-tight">Aura</h1>
            <p className="text-slate-400 text-[11px] leading-none mt-0.5">AI Receptionist</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="relative flex-1 px-2.5 mt-2 pb-2 space-y-1 overflow-y-auto admin-scrollbar">
        {ADMIN_SIDEBAR_ITEMS.map((item) => {
          const isActive = activeItem
            ? item.label === activeItem
            : item.href === '/admin'
            ? pathname === '/admin'
            : pathname?.startsWith(item.href);

          return (
            <SidebarNavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              isActive={Boolean(isActive)}
              href={item.href}
            />
          );
        })}
      </nav>

      {/* Admin Session Footer */}
      <div className="relative p-2.5 mx-2.5 mb-2.5 bg-slate-900/90 rounded-xl border border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-6.5 h-6.5 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xs font-bold shrink-0">
            A
          </div>
          <div className="truncate">
            <p className="text-[11px] font-semibold text-slate-200 truncate leading-tight">Admin Staff</p>
            <p className="text-[10px] text-slate-400 leading-tight">Clinical Admin</p>
          </div>
        </div>
        <button
          onClick={async () => {
            try {
              await fetch('/api/admin/logout', { method: 'POST' });
            } finally {
              window.location.href = '/admin/login';
            }
          }}
          title="Sign Out"
          className="text-[11px] text-slate-400 hover:text-red-400 p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer shrink-0 font-medium"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
