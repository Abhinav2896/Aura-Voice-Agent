'use client';

import { Sun, Moon } from 'lucide-react';
import { useLiveClock } from '@/hooks/useLiveClock';

export function GreetingBar() {
  const { dateString, timeString, greeting, timeOfDay, isMounted } = useLiveClock();

  return (
    <div className="flex items-center justify-between">
      {/* Left: Dynamic Live Wish */}
      <div className="flex items-center gap-2.5">
        {timeOfDay === 'evening' ? (
          <Moon className="w-6 h-6 text-indigo-500" />
        ) : (
          <Sun className="w-6 h-6 text-amber-400" />
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isMounted ? greeting : 'Good Day!'}
          </h1>
          <p className="text-xs text-gray-500">
            Here&apos;s what Aura handled for your clinic today.
          </p>
        </div>
      </div>

      {/* Right: Live Date/time (Status pill removed per user instruction) */}
      <div className="hidden sm:flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-800">{isMounted ? dateString : ''}</p>
          <p className="text-xs text-blue-600 font-mono font-medium">{isMounted ? timeString : ''}</p>
        </div>
      </div>
    </div>
  );
}
