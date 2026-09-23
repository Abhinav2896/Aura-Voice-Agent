// ============================================================================
// useLiveClock — Ticking clock hook for admin dashboard
// Returns formatted date and time strings, updates every second.
// ============================================================================

'use client';

import { useState, useEffect } from 'react';

interface LiveClock {
  dateString: string;
  timeString: string;
  greeting: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  isMounted: boolean;
}

export function useLiveClock(): LiveClock {
  const [clock, setClock] = useState<LiveClock>(() => ({
    ...formatClock(new Date()),
    isMounted: false,
  }));

  useEffect(() => {
    setClock({ ...formatClock(new Date()), isMounted: true });
    const interval = setInterval(() => {
      setClock({ ...formatClock(new Date()), isMounted: true });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return clock;
}

function formatClock(date: Date): Omit<LiveClock, 'isMounted'> {
  const dateString = date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const timeString = date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).toUpperCase();

  const hour = date.getHours();
  let greeting = 'Good Morning!';
  let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'morning';

  if (hour >= 12 && hour < 17) {
    greeting = 'Good Afternoon!';
    timeOfDay = 'afternoon';
  } else if (hour >= 17 || hour < 4) {
    greeting = 'Good Evening!';
    timeOfDay = 'evening';
  }

  return { dateString, timeString, greeting, timeOfDay };
}
