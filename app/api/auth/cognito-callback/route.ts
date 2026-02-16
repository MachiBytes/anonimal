import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, decodeIdToken } from '@/lib/cognito-service';
import { findOrCreateUser } from '@/lib/user-service';
import { createSessionCookie, Session } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code not provided' },
        { status: 400 }
      );
    }

    console.log('Received authorization code, exchanging for tokens...');

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);

    console.log('Tokens received, decoding ID token...');

    // Decode ID token to get user info
    const userInfo = decodeIdToken(tokens.id_token);

    console.log('User info decoded:', userInfo.email);

    // Create or update user in database
    const user = await findOrCreateUser(
      userInfo.name,
      userInfo.email,
      userInfo.sub
    );

    console.log('User created/found in database:', user.id);

    // Create session
    const session: Session = {
      userId: user.id,
      cognitoAccessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };

    // Create response with session cookie
    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', createSessionCookie(session));

    return response;
  } catch (error) {
    console.error('Error in Cognito callback:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Keep GET for backward compatibility
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    console.log('=== Cognito Callback GET ===');
    console.log('Code received:', code ? 'Yes' : 'No');

    if (!code) {
      console.error('No authorization code provided');
      return NextResponse.json(
        { error: 'Authorization code not provided' },
        { status: 400 }
      );
    }

    console.log('Step 1: Exchanging code for tokens...');
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code);
    console.log('Step 1: Success - Tokens received');

    console.log('Step 2: Decoding ID token...');
    // Decode ID token to get user info
    const userInfo = decodeIdToken(tokens.id_token);
    console.log('Step 2: Success - User info:', { email: userInfo.email, sub: userInfo.sub });

    console.log('Step 3: Creating/finding user in database...');
    // Create or update user in database
    const user = await findOrCreateUser(
      userInfo.name,
      userInfo.email,
      userInfo.sub
    );
    console.log('Step 3: Success - User ID:', user.id);

    console.log('Step 4: Creating session...');
    // Create session
    const session: Session = {
      userId: user.id,
      cognitoAccessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };

    // Create response with session cookie
    const response = NextResponse.redirect(
      new URL('/dashboard', request.url)
    );
    
    response.headers.set('Set-Cookie', createSessionCookie(session));
    console.log('Step 4: Success - Redirecting to dashboard');

    return response;
  } catch (error) {
    console.error('=== ERROR in Cognito callback ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
