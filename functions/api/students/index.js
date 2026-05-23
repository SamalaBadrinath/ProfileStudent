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
    // 2. HTTP Method Routing
    if (method === 'GET') {
      // Fetch students belonging strictly to the user's school_id
      const { results } = await db.prepare(
        'SELECT * FROM students WHERE school_id = ? ORDER BY last_name, first_name'
      ).bind(user.school_id).all();

      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (method === 'POST') {
      const { first_name, last_name, email, enrollment_status } = await request.json();

      if (!first_name || !last_name) {
        return new Response(JSON.stringify({ error: 'first_name and last_name are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const studentId = crypto.randomUUID();
      const status = enrollment_status || 'ACTIVE';

      // Insert new student, explicitly attaching user's school_id
      await db.prepare(
        `INSERT INTO students (id, school_id, first_name, last_name, email, enrollment_status)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(studentId, user.school_id, first_name, last_name, email || null, status).run();

      return new Response(JSON.stringify({
        message: 'Student created successfully',
        student: { id: studentId, school_id: user.school_id, first_name, last_name, email, enrollment_status: status }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    } else {
      return new Response(JSON.stringify({ error: `Method ${method} Not Allowed` }), {
        status: 451, // Custom code or 405 Method Not Allowed
        headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST, OPTIONS' }
      });
    }
  } catch (err) {
    console.error('Students endpoint error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
