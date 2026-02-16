import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', clearSessionCookie());
    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
