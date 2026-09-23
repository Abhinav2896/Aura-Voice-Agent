import { NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  validateAdminCredentials,
  createAdminSessionToken,
} from '@/lib/adminAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!validateAdminCredentials(username, password)) {
      return NextResponse.json(
        { error: 'Invalid admin username or password' },
        { status: 401 }
      );
    }

    const token = await createAdminSessionToken(username.trim());
    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
