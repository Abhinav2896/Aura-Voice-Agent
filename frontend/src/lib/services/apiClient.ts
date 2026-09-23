import { createClient } from '@/lib/supabase/client';

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL ?? 'http://localhost:8000';

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token: string | null = null;
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
  } catch {
    // Non-browser or uninitialized
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = path.startsWith('http') ? path : `${FASTAPI_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers,
    cache: options.cache ?? 'no-store',
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}
