import type { Context } from '@netlify/functions';
import { createAuthResponse } from './utils/auth';

export default async function handler(request: Request, context: Context) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return createAuthResponse(200, { success: true }, undefined, true);
}
