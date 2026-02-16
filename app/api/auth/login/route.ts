import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/cognito-config';

export async function GET() {
  try {
    const authUrl = getAuthorizationUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error generating authorization URL:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}
