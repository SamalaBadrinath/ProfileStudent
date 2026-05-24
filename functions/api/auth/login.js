import { generateJWT } from '../utils/auth.js';

const JWT_SECRET = 'your-fallback-jwt-secret-key-change-in-prod';

function hexToBuf(hexString) {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

function bufToHex(buffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

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

    // 1. Query user record (including hash and salt) by email
    const user = await db.prepare(
      `SELECT u.id, u.school_id, u.email, u.name, u.role, u.custom_role_scope, u.password_hash, u.password_salt, s.name as school_name 
       FROM users u
       JOIN schools s ON u.school_id = s.id
       WHERE u.email = ?`
    ).bind(email).first();

    // 2. Generic 401 response if user is not found (prevents email enumeration)
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found or access denied' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Cryptographically verify the password using PBKDF2 SHA-256
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const key = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const saltBytes = hexToBuf(user.password_salt);
    const derivedBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: 100000,
        hash: "SHA-256"
      },
      key,
      256
    );

    const computedHash = bufToHex(derivedBuffer);

    // 4. Compare computed hash with database hash
    if (computedHash !== user.password_hash) {
      return new Response(JSON.stringify({ error: 'User not found or access denied' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. Generate JWT token (expires in 24 hours)
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
