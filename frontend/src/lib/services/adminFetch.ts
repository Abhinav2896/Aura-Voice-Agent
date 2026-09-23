// ============================================================================
// adminFetch — authenticated fetch for admin-only FastAPI endpoints.
//
// The FastAPI backend enforces admin access on /api/calls, /api/appointments,
// /api/prescriptions, /api/enquiries, /api/escalations, /api/dashboard/*,
// /api/knowledge, and the practice-info PATCH via a shared HMAC token
// (see backend/services/admin_auth.py). This helper obtains that token from the
// Next.js server route /api/admin/token (which reads the httpOnly admin cookie)
// and attaches it as `X-Admin-Token`. The token is cached in-memory for the tab
// and refreshed on a 401/403.
// ============================================================================

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL ?? 'http://localhost:8000';

let _cachedToken: string | null = null;

async function fetchAdminToken(force = false): Promise<string | null> {
  if (_cachedToken && !force) return _cachedToken;
  try {
    const res = await fetch('/api/admin/token', { cache: 'no-store' });
    if (!res.ok) {
      _cachedToken = null;
      return null;
    }
    const data = await res.json();
    _cachedToken = data.token || null;
  } catch {
    _cachedToken = null;
  }
  return _cachedToken;
}

export async function adminFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${FASTAPI_URL}${path}`;

  const doFetch = async (token: string | null): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) headers.set('X-Admin-Token', token);
    return fetch(url, { ...options, headers, cache: options.cache ?? 'no-store' });
  };

  let res = await doFetch(await fetchAdminToken());
  // On auth failure, refresh the token once (it may have expired) and retry.
  if (res.status === 401 || res.status === 403) {
    res = await doFetch(await fetchAdminToken(true));
  }

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // ignore
    }
    const err = new Error(errorMsg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}
