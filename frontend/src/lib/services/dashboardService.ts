// ============================================================================
// Dashboard Service
// Connects to FastAPI / Supabase backend. Pure database-driven (no mock fallback).
// ============================================================================

import type { KpiItem, RequestTypeSlice, ActivityItem, OperationStatusItem } from '../types';
import { adminFetch } from './adminFetch';

export async function getKpis(): Promise<KpiItem[]> {
  return adminFetch<KpiItem[]>('/api/dashboard/kpis');
}

export async function getRequestTypes(): Promise<RequestTypeSlice[]> {
  return adminFetch<RequestTypeSlice[]>('/api/dashboard/request-types');
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  return adminFetch<ActivityItem[]>('/api/dashboard/recent-activity');
}

export async function getOperationStatus(): Promise<OperationStatusItem[]> {
  return adminFetch<OperationStatusItem[]>('/api/dashboard/operation-status');
}
