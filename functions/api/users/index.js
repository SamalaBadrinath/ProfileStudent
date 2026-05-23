export async function onRequest(context) {
  const { request, env, data } = context;
  const db = env.DB;
  const user = data.user;

  // 1. Role Authorization Check
  const allowedRoles = ['SUPER_ADMIN', 'TEACHER'];
  if (!user || !allowedRoles.includes(user.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient privileges' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database binding "DB" is missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const method = request.method;

  try {
    // 2. GET: List users
    if (method === 'GET') {
      let query = 'SELECT id, school_id, email, name, role, custom_role_scope, created_at FROM users WHERE school_id = ?';
      const params = [user.school_id];

      // Teachers are only allowed to see CUSTOM users, Super Admins can see everyone
      if (user.role === 'TEACHER') {
        query += " AND role = 'CUSTOM'";
      }

      query += ' ORDER BY name';

      const { results } = await db.prepare(query).bind(...params).all();
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    // 3. POST: Create a user
    } else if (method === 'POST') {
      const { email, name, role, custom_role_scope } = await request.json();

      if (!email || !name || !role) {
        return new Response(JSON.stringify({ error: 'email, name, and role are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Security check: Teachers can ONLY create CUSTOM users
      if (user.role === 'TEACHER' && role !== 'CUSTOM') {
        return new Response(JSON.stringify({ error: 'Forbidden: Teachers can only register CUSTOM roles' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const newUserId = crypto.randomUUID();

      // Database insertion
      await db.prepare(
        `INSERT INTO users (id, school_id, email, name, role, custom_role_scope)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        newUserId,
        user.school_id,
        email,
        name,
        role,
        role === 'CUSTOM' ? (custom_role_scope || null) : null
      ).run();

      return new Response(JSON.stringify({
        message: 'User created successfully',
        user: { id: newUserId, school_id: user.school_id, email, name, role, custom_role_scope }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    } else {
      return new Response(JSON.stringify({ error: `Method ${method} Not Allowed` }), {
        status: 451,
        headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST, OPTIONS' }
      });
    }
  } catch (err) {
    console.error('Users endpoint error:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return new Response(JSON.stringify({ error: 'Email already registered in this school' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (err.message && err.message.includes('CHECK constraint failed')) {
      return new Response(JSON.stringify({ error: 'Invalid role or custom scope mapping' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
