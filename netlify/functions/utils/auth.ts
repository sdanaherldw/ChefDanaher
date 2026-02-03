import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import type { Context } from '@netlify/functions';

const SESSION_DURATION = 15 * 60; // 15 minutes in seconds
const REFRESH_THRESHOLD = 5 * 60; // 5 minutes in seconds

interface TokenPayload extends JWTPayload {
  sub: string;
  exp: number;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export function getCookieOptions(isProduction: boolean): string {
  const options = [
    'HttpOnly',
    'Path=/',
    `Max-Age=${SESSION_DURATION}`,
    'SameSite=Strict',
  ];

  if (isProduction) {
    options.push('Secure');
  }

  return options.join('; ');
}

export async function signToken(username: string): Promise<string> {
  const secret = getSecretKey();

  const token = await new SignJWT({ sub: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);

  return token;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.APP_PASSWORD_HASH;
  if (!hash) {
    throw new Error('APP_PASSWORD_HASH not configured');
  }
  return bcrypt.compare(password, hash);
}

export function getExpectedUsername(): string {
  const username = process.env.APP_USERNAME;
  if (!username) {
    throw new Error('APP_USERNAME not configured');
  }
  return username;
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name) {
      cookies[name] = valueParts.join('=');
    }
    return cookies;
  }, {} as Record<string, string>);
}

export function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  const cookies = parseCookies(cookieHeader ?? undefined);
  return cookies['session'] || null;
}

interface AuthResult {
  user: { username: string } | null;
  shouldRefresh: boolean;
  newToken?: string;
}

export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const token = getTokenFromRequest(request);

  if (!token) {
    return { user: null, shouldRefresh: false };
  }

  const payload = await verifyToken(token);

  if (!payload || !payload.sub) {
    return { user: null, shouldRefresh: false };
  }

  const user = { username: payload.sub };

  // Check if we should refresh the token (rolling session)
  const expiresAt = payload.exp * 1000;
  const now = Date.now();
  const timeLeft = (expiresAt - now) / 1000;

  if (timeLeft < REFRESH_THRESHOLD) {
    const newToken = await signToken(payload.sub);
    return { user, shouldRefresh: true, newToken };
  }

  return { user, shouldRefresh: false };
}

export function createAuthResponse(
  statusCode: number,
  body: unknown,
  token?: string,
  clearCookie = false
): Response {
  const isProduction = process.env.NODE_ENV === 'production';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Set-Cookie'] = `session=${token}; ${getCookieOptions(isProduction)}`;
  } else if (clearCookie) {
    headers['Set-Cookie'] = 'session=; Path=/; Max-Age=0; HttpOnly';
  }

  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers,
  });
}

export function unauthorizedResponse(): Response {
  return createAuthResponse(401, { error: 'Unauthorized' });
}
