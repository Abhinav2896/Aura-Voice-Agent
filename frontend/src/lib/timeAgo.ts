// ============================================================================
// timeAgo — format an ISO timestamp as a short relative "time ago" string.
// Shared by the admin queue pages so relative times are derived from real
// Supabase created_at values rather than hardcoded labels.
// ============================================================================

export function formatTimeAgo(iso?: string): string {
  if (!iso) return 'Recently';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Recently';

  const diff = Math.floor((Date.now() - then) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

// Mask a mobile number for display, revealing only the last two digits
// (e.g. "07700900123" -> "•••••••••23"). The full number is sensitive and is
// never rendered in the patient UI.
export function maskMobile(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 2) return '•'.repeat(digits.length);
  return '•'.repeat(digits.length - 2) + digits.slice(-2);
}
