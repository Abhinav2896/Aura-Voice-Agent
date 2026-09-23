'use client';

interface StatusPillProps {
  status?: 'online' | 'offline';
  label?: string;
  sublabel?: string;
  compact?: boolean;
}

export function StatusPill({
  status = 'online',
  label = 'Aura is Online',
  sublabel,
  compact = false,
}: StatusPillProps) {
  const isOnline = status === 'online';

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
        <span
          className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 status-dot-online' : 'bg-gray-400'}`}
        />
        <span className="text-xs font-medium text-green-700">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 status-dot-online' : 'bg-gray-400'}`}
      />
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
      </div>
    </div>
  );
}
