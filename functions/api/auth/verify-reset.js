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
    const { email, verificationKey, newPassword } = await request.json();

    if (!email || !verificationKey || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'email, verificationKey, and newPassword are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 1. Fetch user reset token parameters
    const user = await db.prepare('SELECT reset_token, reset_token_expires FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired verification key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Validate token identity and expiration
    const keyMatch = user.reset_token && user.reset_token === verificationKey.trim().toUpperCase();
    const isNotExpired = user.reset_token_expires && Date.now() < user.reset_token_expires;

    if (!keyMatch || !isNotExpired) {
      return new Response(JSON.stringify({ error: 'Invalid or expired verification key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Cryptographically derive PBKDF2 hash using Web Crypto
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(newPassword);
    const key = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: 100000,
        hash: "SHA-256"
      },
      key,
      256
    );

    const passwordHash = bufToHex(hashBuffer);
    const passwordSalt = bufToHex(saltBytes);

    // 4. Update password records and clear token values atomically
    await db.prepare(
      `UPDATE users 
       SET password_hash = ?, password_salt = ?, reset_token = NULL, reset_token_expires = NULL 
       WHERE email = ?`
    ).bind(passwordHash, passwordSalt, email).run();

    return new Response(JSON.stringify({ message: 'Password updated successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Verify reset error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
