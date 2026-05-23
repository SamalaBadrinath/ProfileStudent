export async function onRequest(context) {
  const { request, env, data } = context;
  const db = env.DB;
  const user = data.user;

  // 1. Role Authorization Check
  const allowedRoles = ['TEACHER', 'CUSTOM'];
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
    if (method === 'POST') {
      const { scope, log_entry } = await request.json();

      if (!scope || !log_entry) {
        return new Response(JSON.stringify({ error: 'scope and log_entry are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // SECURITY CHECK: If the user role is CUSTOM, restrict them to their explicit custom_role_scope
      if (user.role === 'CUSTOM') {
        if (scope !== user.custom_role_scope) {
          return new Response(
            JSON.stringify({
              error: `Forbidden: You only have permission to log to scope "${user.custom_role_scope}". Cannot submit with scope "${scope}".`
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }

      const logId = crypto.randomUUID();

      // Database insertion
      await db.prepare(
        `INSERT INTO custom_records (id, school_id, user_id, scope, log_entry)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(logId, user.school_id, user.id, scope, log_entry).run();

      return new Response(JSON.stringify({
        message: 'Log record appended successfully',
        record: { id: logId, school_id: user.school_id, user_id: user.id, scope, log_entry }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (method === 'GET') {
      // Teachers can fetch all logs in the school, CUSTOM users can only fetch logs within their scope
      let query = 'SELECT * FROM custom_records WHERE school_id = ?';
      const params = [user.school_id];

      if (user.role === 'CUSTOM') {
        query += ' AND scope = ?';
        params.push(user.custom_role_scope);
      } else {
        const url = new URL(request.url);
        const scopeFilter = url.searchParams.get('scope');
        if (scopeFilter) {
          query += ' AND scope = ?';
          params.push(scopeFilter);
        }
      }

      query += ' ORDER BY created_at DESC';

      const { results } = await db.prepare(query).bind(...params).all();

      return new Response(JSON.stringify(results), {
        status: 200,
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
    console.error('Custom endpoint error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
