import { verifyJWT } from './utils/auth.js';

// Secret key for signing/verifying JWTs
// In production, configure this via wrangler.toml or Cloudflare Dashboard environment variables
const JWT_SECRET = 'your-fallback-jwt-secret-key-change-in-prod';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Bypass authentication checks for the login endpoint
  if (url.pathname === '/api/auth/login') {
    return await context.next();
  }

  // Parse Cookie header to extract the auth token
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, ...value] = cookie.trim().split('=');
    if (key) acc[key] = value.join('=');
    return acc;
  }, {});

  const token = cookies['token'];

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized: No token provided' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const secret = env.JWT_SECRET || JWT_SECRET;
  const payload = await verifyJWT(token, secret);

  if (!payload) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Attach user details to context.data to make them accessible in subsequent route handlers
  context.data.user = {
    id: payload.id,
    school_id: payload.school_id,
    role: payload.role,
    custom_role_scope: payload.custom_role_scope
  };

  return await context.next();
}
