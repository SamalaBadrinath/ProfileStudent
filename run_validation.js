import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const testCases = [
  {
    name: '1. Invalid role check constraint (VISITOR role)',
    sql: `INSERT INTO users (id, school_id, email, name, role, custom_role_scope) VALUES ('bad-user-1', '11111111-1111-1111-1111-111111111111', 'bad1@oakridge.edu', 'Bad User', 'VISITOR', NULL);`,
    expectedError: 'CHECK constraint failed'
  },
  {
    name: '2. Custom user missing custom_role_scope',
    sql: `INSERT INTO users (id, school_id, email, name, role, custom_role_scope) VALUES ('bad-user-2', '11111111-1111-1111-1111-111111111111', 'bad2@oakridge.edu', 'Bad User 2', 'CUSTOM', NULL);`,
    expectedError: 'CHECK constraint failed'
  },
  {
    name: '3. Non-custom user with custom_role_scope set',
    sql: `INSERT INTO users (id, school_id, email, name, role, custom_role_scope) VALUES ('bad-user-3', '11111111-1111-1111-1111-111111111111', 'bad3@oakridge.edu', 'Bad User 3', 'TEACHER', 'MATH');`,
    expectedError: 'CHECK constraint failed'
  },
  {
    name: '4. Tenant leakage: Fee payment for mismatched student (School A fee for School B student)',
    sql: `INSERT INTO fee_payments (id, school_id, student_id, amount, payment_status, fee_type, created_by_user_id) VALUES ('bad-fee-1', '11111111-1111-1111-1111-111111111111', 'stud-b1-uuid', 500.0, 'PENDING', 'TUITION', 'fc-a-uuid');`,
    expectedError: 'FOREIGN KEY constraint failed'
  },
  {
    name: '5. Custom scope bounds: Eve (LAB scope) attempting to log to SPORTS scope',
    sql: `INSERT INTO custom_records (id, school_id, user_id, scope, log_entry) VALUES ('bad-custom-1', '11111111-1111-1111-1111-111111111111', 'c-a-uuid', 'SPORTS', 'Attempted to log sports data');`,
    expectedError: 'FOREIGN KEY constraint failed'
  },
  {
    name: '6. Custom records restrictions: Librarian (David, role LIBRARIAN) attempting to append custom record',
    sql: `INSERT INTO custom_records (id, school_id, user_id, scope, log_entry) VALUES ('bad-custom-2', '11111111-1111-1111-1111-111111111111', 'l-a-uuid', 'LAB', 'Attempted lab entry by librarian');`,
    expectedError: 'FOREIGN KEY constraint failed'
  }
];

async function runTests() {
  console.log('Starting Multi-Tenant School Profile System Constraint Verification...');
  console.log('=====================================================================');

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    console.log(`\nRunning: ${test.name}`);
    
    // Construct command to run under Node 22/nvm environment
    const cmd = `source ~/.nvm/nvm.sh && nvm use 22 && npx wrangler d1 execute DB --local --command="${test.sql.replace(/"/g, '\\"')}"`;

    try {
      await execAsync(cmd);
      // If execution succeeded without throwing, it means the constraint failed to trigger!
      console.log(`❌ FAIL: Expected constraint violation error but query succeeded.`);
      failed++;
    } catch (error) {
      const errorMsg = error.stderr || error.stdout || error.message;
      if (errorMsg.includes(test.expectedError)) {
        console.log(`✅ PASS: Correctly rejected. Error matched expected pattern: "${test.expectedError}"`);
        passed++;
      } else {
        console.log(`❌ FAIL: Rejected, but with unexpected error:`);
        console.log(errorMsg);
        failed++;
      }
    }
  }

  console.log('\n=====================================================================');
  console.log(`Verification Complete: ${passed} passed, ${failed} failed.`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
