import type { Context } from '@netlify/functions';
import {
  signToken,
  verifyPassword,
  getExpectedUsername,
  createAuthResponse,
} from './utils/auth';

interface LoginRequest {
  username: string;
  password: string;
}

export default async function handler(request: Request, context: Context) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: LoginRequest = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return createAuthResponse(400, { error: 'Username and password required' });
    }

    const expectedUsername = getExpectedUsername();

    if (username !== expectedUsername) {
      return createAuthResponse(401, { error: 'Invalid credentials' });
    }

    const isValidPassword = await verifyPassword(password);

    if (!isValidPassword) {
      return createAuthResponse(401, { error: 'Invalid credentials' });
    }

    const token = await signToken(username);

    return createAuthResponse(200, { user: { username } }, token);
  } catch (error) {
    console.error('Login error:', error);
    return createAuthResponse(500, { error: 'Internal server error' });
  }
}
