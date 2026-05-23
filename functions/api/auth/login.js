import { generateJWT } from '../utils/auth.js';

const JWT_SECRET = 'your-fallback-jwt-secret-key-change-in-prod';

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding "DB" is missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Query user and check existence across all schools
    const user = await db.prepare(
      `SELECT u.id, u.school_id, u.email, u.name, u.role, u.custom_role_scope, s.name as school_name 
       FROM users u
       JOIN schools s ON u.school_id = s.id
       WHERE u.email = ?`
    ).bind(email).first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found or access denied' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // PRODUCTION SECURITY NOTICE:
    // In a production deployment, users would store hashed passwords (e.g. using Argon2id or bcrypt).
    // You would perform password validation here, for example:
    //   const isValid = await verifyPasswordHash(password, user.password_hash);
    //   if (!isValid) return new Response(..., { status: 401 });
    // Since this is a mock/development reset phase, we bypass actual hashing checks.
    // ==========================================

    // Generate JWT token (expires in 24 hours)
    const secret = env.JWT_SECRET || JWT_SECRET;
    const payload = {
      id: user.id,
      school_id: user.school_id,
      role: user.role,
      custom_role_scope: user.custom_role_scope,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
    };

    const token = await generateJWT(payload, secret);

    // Set token in HttpOnly, Secure, SameSite=Strict cookie
    const cookie = `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`;

    return new Response(JSON.stringify({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        custom_role_scope: user.custom_role_scope,
        school_id: user.school_id,
        school_name: user.school_name
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
