export async function onRequest(context) {
  const { request, env, data } = context;
  const db = env.DB;
  const user = data.user;

  // 1. Role Authorization Check
  const allowedRoles = ['SUPER_ADMIN', 'FEE_COUNTER'];
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
      const url = new URL(request.url);
      const studentId = url.searchParams.get('student_id');

      let query = `
        SELECT f.*, s.first_name, s.last_name 
        FROM fee_payments f
        JOIN students s ON f.student_id = s.id
        WHERE f.school_id = ?
      `;
      const params = [user.school_id];

      if (studentId) {
        query += ' AND f.student_id = ?';
        params.push(studentId);
      }
      query += ' ORDER BY f.payment_date DESC';

      const { results } = await db.prepare(query).bind(...params).all();

      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (method === 'POST') {
      const { id, student_id, amount, payment_status, fee_type } = await request.json();

      if (!student_id || amount === undefined || !payment_status || !fee_type) {
        return new Response(JSON.stringify({ error: 'student_id, amount, payment_status, and fee_type are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // WRAP VALIDATION QUERY: Check that student_id belongs to the current user's school_id
      const targetStudent = await db.prepare(
        'SELECT id FROM students WHERE school_id = ? AND id = ?'
      ).bind(user.school_id, student_id).first();

      if (!targetStudent) {
        return new Response(JSON.stringify({ error: 'Student not found in this school tenant' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (id) {
        // MODIFY: If fee ID is provided in request body, modify the payment status or details
        // Ensure the record is scoped to the school_id
        const existingFee = await db.prepare(
          'SELECT id FROM fee_payments WHERE school_id = ? AND id = ?'
        ).bind(user.school_id, id).first();

        if (!existingFee) {
          return new Response(JSON.stringify({ error: 'Fee record not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        await db.prepare(
          `UPDATE fee_payments 
           SET amount = ?, payment_status = ?, fee_type = ? 
           WHERE school_id = ? AND id = ?`
        ).bind(amount, payment_status, fee_type, user.school_id, id).run();

        return new Response(JSON.stringify({
          message: 'Fee payment record updated successfully',
          fee_payment: { id, school_id: user.school_id, student_id, amount, payment_status, fee_type }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      } else {
        // APPEND: Create a new fee payment row
        const feeId = crypto.randomUUID();

        await db.prepare(
          `INSERT INTO fee_payments (id, school_id, student_id, amount, payment_status, fee_type, created_by_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(feeId, user.school_id, student_id, amount, payment_status, fee_type, user.id).run();

        return new Response(JSON.stringify({
          message: 'Fee payment record created successfully',
          fee_payment: { id: feeId, school_id: user.school_id, student_id, amount, payment_status, fee_type }
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }

    } else if (method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    } else {
      return new Response(JSON.stringify({ error: `Method ${method} Not Allowed` }), {
        status: 451,
        headers: { 'Content-Type': 'application/json', 'Allow': 'GET, POST, OPTIONS' }
      });
    }
  } catch (err) {
    console.error('Fees endpoint error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
