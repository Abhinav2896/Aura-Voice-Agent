import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from '@/lib/adminAuth';

/**
 * Hands the verified admin session token to the browser so it can authenticate
 * directly to the FastAPI backend (which enforces admin access independently).
 *
 * The session token lives in an httpOnly cookie scoped to this Next.js origin,
 * so client JS cannot read it and it is not sent cross-origin to FastAPI. This
 * server route reads the cookie, verifies it, and returns the same token value
 * in the JSON body for the client to attach as `X-Admin-Token` on backend calls.
 * If the cookie is missing or invalid, returns 401 and no token.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isValid = await verifyAdminSessionToken(token);
  if (!isValid || !token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({ token }, { headers: { 'Cache-Control': 'no-store' } });
}
