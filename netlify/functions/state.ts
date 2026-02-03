import type { Context } from '@netlify/functions';
import {
  authenticateRequest,
  createAuthResponse,
  unauthorizedResponse,
} from './utils/auth';
import { getState, checkVersionAndSave } from './utils/blobs';

export default async function handler(request: Request, context: Context) {
  // Authenticate all requests
  const authResult = await authenticateRequest(request);

  if (!authResult.user) {
    return unauthorizedResponse();
  }

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add refreshed token if needed
  if (authResult.shouldRefresh && authResult.newToken) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      'HttpOnly',
      'Path=/',
      'Max-Age=900',
      'SameSite=Strict',
    ];
    if (isProduction) cookieOptions.push('Secure');
    baseHeaders['Set-Cookie'] = `session=${authResult.newToken}; ${cookieOptions.join('; ')}`;
  }

  try {
    if (request.method === 'GET') {
      const state = await getState();
      return new Response(
        JSON.stringify({ state, version: state.version }),
        { status: 200, headers: baseHeaders }
      );
    }

    if (request.method === 'PUT') {
      const body = await request.json();
      const { state, version } = body;

      if (typeof version !== 'number') {
        return new Response(
          JSON.stringify({ error: 'Version number required' }),
          { status: 400, headers: baseHeaders }
        );
      }

      const result = await checkVersionAndSave(state, version);

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: 'Version conflict', state: result.state }),
          { status: 409, headers: baseHeaders }
        );
      }

      return new Response(
        JSON.stringify({ state: result.state, version: result.state.version }),
        { status: 200, headers: baseHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: baseHeaders }
    );
  } catch (error) {
    console.error('State error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: baseHeaders }
    );
  }
}
