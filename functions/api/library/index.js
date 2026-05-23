export async function onRequest(context) {
  const { request, env, data } = context;
  const db = env.DB;
  const user = data.user;

  // 1. Role Authorization Check
  const allowedRoles = ['SUPER_ADMIN', 'LIBRARIAN'];
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
      const type = url.searchParams.get('type') || 'books'; // 'books' or 'transactions'

      if (type === 'transactions') {
        const studentId = url.searchParams.get('student_id');

        let query = `
          SELECT t.*, b.title, b.author, s.first_name, s.last_name 
          FROM library_transactions t
          JOIN books b ON t.book_id = b.id
          JOIN students s ON t.student_id = s.id
          WHERE t.school_id = ?
        `;
        const params = [user.school_id];

        if (studentId) {
          query += ' AND t.student_id = ?';
          params.push(studentId);
        }
        query += ' ORDER BY t.checkout_date DESC';

        const { results } = await db.prepare(query).bind(...params).all();
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Fetch inventory books for school
        const { results } = await db.prepare(
          'SELECT * FROM books WHERE school_id = ? ORDER BY title'
        ).bind(user.school_id).all();

        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

    } else if (method === 'POST') {
      const { action, student_id, book_id, transaction_id, days_to_due } = await request.json();

      if (!action || !['BORROW', 'RETURN'].includes(action)) {
        return new Response(JSON.stringify({ error: 'Invalid or missing action. Must be BORROW or RETURN' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (action === 'BORROW') {
        if (!student_id || !book_id) {
          return new Response(JSON.stringify({ error: 'student_id and book_id are required for BORROW' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // VALIDATION CHECKS: Ensure target student belongs to school boundaries
        const student = await db.prepare(
          'SELECT id FROM students WHERE school_id = ? AND id = ?'
        ).bind(user.school_id, student_id).first();

        if (!student) {
          return new Response(JSON.stringify({ error: 'Student not found in this school tenant' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // VALIDATION CHECKS: Ensure target book belongs to school boundaries
        const book = await db.prepare(
          'SELECT id, title, available_copies FROM books WHERE school_id = ? AND id = ?'
        ).bind(user.school_id, book_id).first();

        if (!book) {
          return new Response(JSON.stringify({ error: 'Book not found in this school tenant' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (book.available_copies <= 0) {
          return new Response(JSON.stringify({ error: `No available copies for book: "${book.title}"` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const newTxId = crypto.randomUUID();
        const days = days_to_due || 14;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
        const dueDateString = dueDate.toISOString();

        // Batch transactional D1 operations
        await db.batch([
          db.prepare(
            `INSERT INTO library_transactions (id, school_id, student_id, book_id, due_date, status, processed_by_user_id)
             VALUES (?, ?, ?, ?, ?, 'BORROWED', ?)`
          ).bind(newTxId, user.school_id, student_id, book_id, dueDateString, user.id),
          db.prepare(
            'UPDATE books SET available_copies = available_copies - 1 WHERE school_id = ? AND id = ?'
          ).bind(user.school_id, book_id)
        ]);

        return new Response(JSON.stringify({
          message: 'Book borrowed successfully',
          transaction: { id: newTxId, school_id: user.school_id, student_id, book_id, due_date: dueDateString, status: 'BORROWED' }
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });

      } else if (action === 'RETURN') {
        let activeTx = null;

        if (transaction_id) {
          activeTx = await db.prepare(
            'SELECT * FROM library_transactions WHERE school_id = ? AND id = ?'
          ).bind(user.school_id, transaction_id).first();
        } else if (student_id && book_id) {
          activeTx = await db.prepare(
            `SELECT * FROM library_transactions 
             WHERE school_id = ? AND student_id = ? AND book_id = ? AND status = 'BORROWED' 
             ORDER BY checkout_date DESC LIMIT 1`
          ).bind(user.school_id, student_id, book_id).first();
        }

        if (!activeTx) {
          return new Response(JSON.stringify({ error: 'Active borrowing transaction not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        if (activeTx.status === 'RETURNED') {
          return new Response(JSON.stringify({ error: 'Book already marked as returned' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Batch return update and restore available copy
        await db.batch([
          db.prepare(
            `UPDATE library_transactions 
             SET status = 'RETURNED', return_date = CURRENT_TIMESTAMP 
             WHERE school_id = ? AND id = ?`
          ).bind(user.school_id, activeTx.id),
          db.prepare(
            'UPDATE books SET available_copies = MIN(total_copies, available_copies + 1) WHERE school_id = ? AND id = ?'
          ).bind(user.school_id, activeTx.book_id)
        ]);

        return new Response(JSON.stringify({
          message: 'Book returned successfully',
          transaction_id: activeTx.id
        }), {
          status: 200,
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
    console.error('Library endpoint error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
