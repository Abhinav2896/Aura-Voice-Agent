// ============================================================================
// Admin Layout — No auth gate for prototype
// Provides the sidebar + top bar shell. Dashboard content renders as children.
// ============================================================================

import { Sidebar } from '@/components/admin/Sidebar';
import { TopBar } from '@/components/admin/TopBar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden admin-layout flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="ml-[220px] flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar />
        <main className="flex-1 p-3.5 lg:p-4 overflow-y-auto admin-scrollbar flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
