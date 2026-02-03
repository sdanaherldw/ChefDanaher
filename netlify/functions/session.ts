import type { Context } from '@netlify/functions';
import {
  authenticateRequest,
  createAuthResponse,
  unauthorizedResponse,
} from './utils/auth';

export default async function handler(request: Request, context: Context) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.user) {
      return unauthorizedResponse();
    }

    // If token needs refresh, include new token in response
    if (authResult.shouldRefresh && authResult.newToken) {
      return createAuthResponse(
        200,
        { user: authResult.user },
        authResult.newToken
      );
    }

    return createAuthResponse(200, { user: authResult.user });
  } catch (error) {
    console.error('Session check error:', error);
    return createAuthResponse(500, { error: 'Internal server error' });
  }
}
