function generateVerificationKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let key = '';
  for (let i = 0; i < bytes.length; i++) {
    key += chars[bytes[i] % chars.length];
  }
  return key;
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
    const { email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email address is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Look up user by email in the database
    const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();

    // 2. Generic 200 OK return if user does not exist (prevents email enumeration)
    if (!user) {
      return new Response(JSON.stringify({ message: 'Verification key generated' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Generate secure 6-character alphanumeric key and +15 min expiry epoch
    const key = generateVerificationKey();
    const expires = Date.now() + 15 * 60 * 1000;

    // 4. Cache reset token variables on D1
    await db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?')
      .bind(key, expires, email)
      .run();

    // 5. Expose verification key in response for out-of-band front-end integration
    return new Response(JSON.stringify({
      message: 'Verification key generated',
      mockDeliveryToken: key
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Request reset error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
