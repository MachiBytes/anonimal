import { NextRequest } from 'next/server';
import { getSessionFromCookie } from './session';
import { User } from '@/types/database';
import { query } from './db';

export interface AuthenticatedRequest {
  user: User;
  session: {
    userId: string;
    cognitoAccessToken: string;
    expiresAt: Date;
  };
}

export async function validateSession(
  request: NextRequest
): Promise<AuthenticatedRequest | null> {
  const cookieHeader = request.headers.get('cookie');
  const session = getSessionFromCookie(cookieHeader);

  if (!session) {
    return null;
  }

  // Get user from database
  const result = await query('SELECT * FROM users WHERE id = $1', [session.userId]);
  
  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  return {
    user,
    session,
  };
}

export async function requireAuth(
  request: NextRequest
): Promise<AuthenticatedRequest> {
  const auth = await validateSession(request);

  if (!auth) {
    throw new Error('Unauthorized');
  }

  return auth;
}
