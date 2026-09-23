'use client';

import { Settings, ChevronRight, FileText, AlertTriangle } from 'lucide-react';

const actions = [
  {
    icon: FileText,
    label: 'Add Knowledge Document',
    color: 'text-blue-500',
  },
  {
    icon: AlertTriangle,
    label: 'View Escalated Calls',
    color: 'text-red-500',
  },
  {
    icon: Settings,
    label: 'Practice Settings',
    color: 'text-gray-500',
  },
];

export function QuickActionsAdmin() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
      </div>

      {/* Action rows */}
      <div className="space-y-1">
        {actions.map((action) => (
          <button
            key={action.label}
            className="flex items-center justify-between w-full p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <action.icon className={`w-4 h-4 ${action.color}`} />
              <span className="text-sm text-gray-700">{action.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
