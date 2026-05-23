const PORT = 8788;
const BASE_URL = `http://localhost:${PORT}/api`;

// Helper to log in and return cookie headers + user profile
async function login(email, password = "password") {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email} with status ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(`Login failed for ${email}: No set-cookie header returned`);
  }
  // Extract token value
  const match = setCookie.match(/token=([^;]+)/);
  if (!match) {
    throw new Error(`Login failed for ${email}: Could not parse token from cookie`);
  }
  return {
    user: data.user,
    cookie: `token=${match[1]}`
  };
}

async function runTests() {
  console.log('Starting ProfileStudent Backend API Integration Verification...');
  console.log('================================================================');

  // Log in Alice (SUPER_ADMIN, School A)
  console.log('\nLogging in as Alice (SUPER_ADMIN, School A)...');
  const alice = await login('superadmin.a@oakridge.edu');
  console.log(`Successfully logged in. User: ${alice.user.name}, Role: ${alice.user.role}, School: ${alice.user.school_name}`);

  // Log in Charlie (FEE_COUNTER, School A)
  console.log('Logging in as Charlie (FEE_COUNTER, School A)...');
  const charlie = await login('feecounter.a@oakridge.edu');

  // Log in Eve (CUSTOM, School A, Scope: LAB)
  console.log('Logging in as Eve (CUSTOM, School A, Scope: LAB)...');
  const eve = await login('custom.a@oakridge.edu');

  // Log in Bob (TEACHER, School A)
  console.log('Logging in as Bob (TEACHER, School A)...');
  const bob = await login('teacher.a@oakridge.edu');

  let passed = 0;
  let failed = 0;

  // Test Case 1: Alice creates a new student in School A (Should succeed)
  try {
    console.log('\nTest 1: SUPER_ADMIN Alice creates a student in School A...');
    const res = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': alice.cookie },
      body: JSON.stringify({ first_name: 'George', last_name: 'Weasley', email: 'george@oakridge.edu' })
    });
    if (res.status === 201) {
      const data = await res.json();
      console.log(`✅ PASS: Student created with ID: ${data.student.id}`);
      passed++;
      // Save student id for subsequent tests
      var schoolAStudentId = data.student.id;
    } else {
      console.log(`❌ FAIL: Expected 201, got ${res.status}: ${await res.text()}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: Exception occurred: ${err.message}`);
    failed++;
  }

  // Test Case 2: FEE_COUNTER Charlie attempts to create a student (Should be forbidden)
  try {
    console.log('Test 2: FEE_COUNTER Charlie attempts to create student (expected to fail)...');
    const res = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': charlie.cookie },
      body: JSON.stringify({ first_name: 'Fred', last_name: 'Weasley' })
    });
    if (res.status === 403) {
      console.log('✅ PASS: Correctly blocked with 403 Forbidden.');
      passed++;
    } else {
      console.log(`❌ FAIL: Expected 403, got ${res.status}: ${await res.text()}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: Exception occurred: ${err.message}`);
    failed++;
  }

  // Test Case 3: FEE_COUNTER Charlie records a fee payment for School A student (Should succeed)
  try {
    console.log('Test 3: FEE_COUNTER Charlie logs fee payment for School A student...');
    const res = await fetch(`${BASE_URL}/fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': charlie.cookie },
      body: JSON.stringify({ student_id: schoolAStudentId, amount: 2500.0, payment_status: 'PAID', fee_type: 'LAB_FEE' })
    });
    if (res.status === 201) {
      console.log('✅ PASS: Fee payment recorded successfully.');
      passed++;
    } else {
      console.log(`❌ FAIL: Expected 201, got ${res.status}: ${await res.text()}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: Exception occurred: ${err.message}`);
    failed++;
  }

  // Test Case 4: FEE_COUNTER Charlie attempts to record a fee for School B student (Should fail tenant check)
  // Student B1: 'stud-b1-uuid' (belongs to Pinecrest High, School B)
  try {
    console.log('Test 4: FEE_COUNTER Charlie records fee for School B student (expected to fail)...');
    const res = await fetch(`${BASE_URL}/fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': charlie.cookie },
      body: JSON.stringify({ student_id: 'stud-b1-uuid', amount: 1500.0, payment_status: 'PAID', fee_type: 'TUITION' })
    });
    if (res.status === 404) {
      console.log('✅ PASS: Correctly blocked with 404 (Student not found in School A tenant).');
      passed++;
    } else {
      console.log(`❌ FAIL: Expected 404, got ${res.status}: ${await res.text()}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: Exception occurred: ${err.message}`);
    failed++;
  }

  // Test Case 5: CUSTOM user Eve (scope: LAB) appends log to LAB scope (Should succeed)
  try {
    console.log('Test 5: CUSTOM user Eve (scope LAB) logs to LAB scope...');
    const res = await fetch(`${BASE_URL}/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': eve.cookie },
      body: JSON.stringify({ scope: 'LAB', log_entry: 'Inventory audit: All microscopes accounted for.' })
    });
    if (res.status === 201) {
      console.log('✅ PASS: Custom record appended successfully.');
      passed++;
    } else {
      console.log(`❌ FAIL: Expected 201, got ${res.status}: ${await res.text()}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: Exception occurred: ${err.message}`);
    failed++;
  }

  // Test Case 6: CUSTOM user Eve (scope: LAB) attempts to write to SPORTS scope (Should fail scope check)
  try {
    console.log('Test 6: CUSTOM user Eve (scope LAB) logs to SPORTS scope (expected to fail)...');
    const res = await fetch(`${BASE_URL}/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': eve.cookie },
      body: JSON.stringify({ scope: 'SPORTS', log_entry: 'Football inventory update.' })
    });
    if (res.status === 403) {
      console.log('✅ PASS: Correctly blocked with 403 (Scope violation).');
      passed++;
    } else {
      console.log(`❌ FAIL: Expected 403, got ${res.status}: ${await res.text()}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: Exception occurred: ${err.message}`);
    failed++;
  }

  // Test Case 7: Teacher Bob writes to SPORTS scope (Should succeed, teachers bypass specific scope locks)
  try {
    console.log('Test 7: TEACHER Bob logs to SPORTS scope...');
    const res = await fetch(`${BASE_URL}/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': bob.cookie },
      body: JSON.stringify({ scope: 'SPORTS', log_entry: 'Coach validated new athletic gear.' })
    });
    if (res.status === 201) {
      console.log('✅ PASS: Teacher successfully recorded log in sports scope.');
      passed++;
    } else {
      console.log(`❌ FAIL: Expected 201, got ${res.status}: ${await res.text()}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ FAIL: Exception occurred: ${err.message}`);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`API Verification Complete: ${passed} passed, ${failed} failed.`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
