import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await validateSession(request);

    if (!auth) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: auth.user });
  } catch (error) {
    console.error('Error retrieving session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve session' },
      { status: 500 }
    );
  }
}
