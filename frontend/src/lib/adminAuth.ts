/**
 * Admin authentication and session management utilities.
 * Uses Web Crypto API (HMAC-SHA256) for zero external dependencies.
 */

export const ADMIN_COOKIE_NAME = 'aura_admin_session';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

/**
 * HMAC signing secret. Fail closed: no baked-in fallback. If the env var is
 * missing the app must not silently sign tokens with a public, repo-known key
 * (which would let anyone forge an admin session).
 */
function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'ADMIN_SESSION_SECRET is not set. Set it in the environment before starting the app.'
    );
  }
  return secret;
}

export function validateAdminCredentials(username?: string, password?: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;

  // Fail closed: without configured credentials, no login is possible. Never
  // fall back to hardcoded defaults shipped in the repo.
  if (!expectedUser || !expectedPass) {
    console.error('ADMIN_USERNAME / ADMIN_PASSWORD are not set; admin login is disabled.');
    return false;
  }
  if (!username || !password) return false;
  return username.trim() === expectedUser && password === expectedPass;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generate a signed session token for authenticated admin.
 */
export async function createAdminSessionToken(username: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = JSON.stringify({ user: username, exp });
  const payloadB64 = Buffer.from(payload).toString('base64url');

  const key = await getCryptoKey(getSecret());
  const enc = new TextEncoder();
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const sigHex = toHex(sigBuffer);

  return `${payloadB64}.${sigHex}`;
}

/**
 * Verify admin session token validity and expiration.
 */
export async function verifyAdminSessionToken(token?: string | null): Promise<boolean> {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, sigHex] = parts;
  if (!payloadB64 || !sigHex || sigHex.length !== 64) return false;

  try {
    const key = await getCryptoKey(getSecret());
    const enc = new TextEncoder();
    const sigBytes = hexToBytes(sigHex);

    const validSig = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes as BufferSource,
      enc.encode(payloadB64)
    );

    if (!validSig) return false;

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (!payload.exp || typeof payload.exp !== 'number') return false;

    // Check expiration with 5-second clock skew tolerance
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now - 5;
  } catch {
    return false;
  }
}
