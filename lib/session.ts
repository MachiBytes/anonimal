import { User } from '@/types/database';

export interface Session {
  userId: string;
  cognitoAccessToken: string;
  expiresAt: Date;
}

export interface SessionData {
  user: User;
  session: Session;
}

const SESSION_COOKIE_NAME = 'session';

export function createSessionToken(session: Session): string {
  // In production, this should use proper encryption/signing
  // For now, we'll use a simple base64 encoding
  const sessionData = JSON.stringify(session);
  return Buffer.from(sessionData).toString('base64');
}

export function parseSessionToken(token: string): Session | null {
  try {
    const sessionData = Buffer.from(token, 'base64').toString('utf-8');
    const session = JSON.parse(sessionData);
    
    // Check if session is expired
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}

export function createSessionCookie(session: Session): string {
  const token = createSessionToken(session);
  const maxAge = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);
  
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getSessionFromCookie(cookieHeader: string | null): Session | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  
  if (!sessionCookie) {
    return null;
  }

  const token = sessionCookie.substring(`${SESSION_COOKIE_NAME}=`.length);
  return parseSessionToken(token);
}
