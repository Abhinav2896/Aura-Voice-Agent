'use client';

import { CallVolumeChart } from '@/components/admin/CallVolumeChart';
import { RequestTypesChart } from '@/components/admin/RequestTypesChart';
import { RecentActivity } from '@/components/admin/RecentActivity';
import { CallsTable } from '@/components/admin/CallsTable';

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-3.5 min-h-full">

      {/* 3. Analytics & Activity Row — 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Call Volume Bar Chart (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <CallVolumeChart />
        </div>

        {/* Request Types Donut Chart (4 cols) */}
        <div className="lg:col-span-4 flex flex-col">
          <RequestTypesChart />
        </div>

        {/* Recent Activity List (3 cols) */}
        <div className="lg:col-span-3 flex flex-col">
          <RecentActivity />
        </div>
      </div>

      {/* 4. Calls Table with Internal Scroll */}
      <div className="min-h-[260px] pb-2">
        <CallsTable />
      </div>
    </div>
  );
}
