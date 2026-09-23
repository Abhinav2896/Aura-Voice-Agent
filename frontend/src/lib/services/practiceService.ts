// ============================================================================
// Practice Service
// Reads and updates the single practice_information row via FastAPI / Supabase.
// Backs the admin Settings page. Pure database-driven, no mock fallback.
// ============================================================================

import { adminFetch } from './adminFetch';

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL ?? 'http://localhost:8000';

export interface PracticeInfo {
  id?: string;
  name: string;
  tagline?: string;
  phone?: string;
  address?: string;
  openingHours?: Record<string, string>;
  emergencyInfo?: string;
  servicesOffered?: string[];
}

function mapRow(row: any): PracticeInfo {
  return {
    id: row.id,
    name: row.name ?? '',
    tagline: row.tagline ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    openingHours: row.opening_hours ?? undefined,
    emergencyInfo: row.emergency_info ?? '',
    servicesOffered: row.services_offered ?? undefined,
  };
}

export async function getPracticeInfo(): Promise<PracticeInfo> {
  const res = await fetch(`${FASTAPI_URL}/api/practice-info`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP error ${res.status}: Failed to load practice information`);
  return mapRow(await res.json());
}

// Persist a subset of practice fields. Only whitelisted fields are sent; the
// backend also enforces its own allowlist.
export async function updatePracticeInfo(updates: {
  name?: string;
  tagline?: string;
  phone?: string;
  address?: string;
  opening_hours?: Record<string, string>;
  emergency_info?: string;
  services_offered?: string[];
}): Promise<PracticeInfo> {
  const updated = await adminFetch<any>('/api/practice-info', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return mapRow(updated);
}
