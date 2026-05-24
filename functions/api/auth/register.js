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
    const { schoolName, adminName, email, password } = await request.json();

    if (!schoolName || !adminName || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'schoolName, adminName, email, and password are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 1. Check if email already exists globally to avoid login ambiguity
    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Email address is already registered' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Generate UUIDs for the new school and administrator
    const schoolId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    // 3. Execute batched D1 transaction (all or nothing)
    await db.batch([
      db.prepare('INSERT INTO schools (id, name) VALUES (?, ?)').bind(schoolId, schoolName),
      db.prepare(
        `INSERT INTO users (id, school_id, email, name, role, custom_role_scope)
         VALUES (?, ?, ?, ?, 'SUPER_ADMIN', NULL)`
      ).bind(userId, schoolId, email, adminName)
    ]);

    // PRODUCTION PASSWORD NOTICE:
    // In production, you would hash the password (e.g. using bcrypt/argon2) and save it.
    // E.g., INSERT INTO users (..., password_hash) VALUES (..., hashed_password);

    return new Response(
      JSON.stringify({
        message: 'School and administrator registered successfully',
        school: { id: schoolId, name: schoolName },
        user: { id: userId, name: adminName, email, role: 'SUPER_ADMIN' }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Registration error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error during registration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
