'use client';

import { Search, Sun, Moon } from 'lucide-react';
import { useLiveClock } from '@/hooks/useLiveClock';
import { NotificationDropdown } from '@/components/admin/NotificationDropdown';

export function TopBar() {
  const { dateString, timeString, greeting, timeOfDay, isMounted } = useLiveClock();

  return (
    <header className="relative z-30 flex items-center justify-between px-6 py-2.5 bg-white border-b border-gray-100">
      {/* Dynamic Greeting & Live Clock (formerly Medical Practice) */}
      <div className="flex items-center gap-2.5">
        {timeOfDay === 'evening' ? (
          <Moon className="w-5 h-5 text-indigo-500 flex-shrink-0" />
        ) : (
          <Sun className="w-5 h-5 text-amber-500 flex-shrink-0" />
        )}
        <div>
          <h2 className="text-sm font-bold text-gray-900 leading-tight">
            {isMounted ? greeting : 'Good Afternoon!'}
          </h2>
          <p className="text-[11px] text-gray-500 font-medium leading-tight mt-0.5">
            {isMounted ? (
              <>
                <span>{dateString}</span>
                <span className="mx-1 text-gray-300">•</span>
                <span className="text-blue-600 font-mono font-medium">{timeString}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center flex-1 max-w-sm mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search calls, patients, requests..."
            className="w-full pl-10 pr-4 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-colors"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Switch to Patient View button */}
        <a
          href="/"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
        >
          <span>Patient App</span>
          <span className="text-[10px] text-blue-500">↗</span>
        </a>

        {/* Notification bell with interactive dropdown */}
        <NotificationDropdown />

        {/* Admin Sign Out */}
        <button
          onClick={async () => {
            try {
              await fetch('/api/admin/logout', { method: 'POST' });
            } finally {
              window.location.href = '/admin/login';
            }
          }}
          title="Sign out of Admin Dashboard"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-xl transition-colors cursor-pointer"
        >
          <span className="hidden sm:inline">Sign Out</span>
          <span className="text-xs">🚪</span>
        </button>
      </div>
    </header>
  );
}
