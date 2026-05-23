-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- 1. EXPECTED FAILURE: Insert user with invalid role
-- This should fail the role check constraint: CHECK(role IN ('SUPER_ADMIN', 'TEACHER', 'FEE_COUNTER', 'LIBRARIAN', 'CUSTOM'))
INSERT INTO users (id, school_id, email, name, role, custom_role_scope)
VALUES ('bad-user-1', '11111111-1111-1111-1111-111111111111', 'bad1@oakridge.edu', 'Bad User', 'VISITOR', NULL);

-- 2. EXPECTED FAILURE: Insert custom user without custom_role_scope
-- This should fail the check: CHECK ((role = 'CUSTOM' AND custom_role_scope IS NOT NULL) OR (role != 'CUSTOM' AND custom_role_scope IS NULL))
INSERT INTO users (id, school_id, email, name, role, custom_role_scope)
VALUES ('bad-user-2', '11111111-1111-1111-1111-111111111111', 'bad2@oakridge.edu', 'Bad User 2', 'CUSTOM', NULL);

-- 3. EXPECTED FAILURE: Insert non-custom user with custom_role_scope
-- This should also fail the role/scope check constraint
INSERT INTO users (id, school_id, email, name, role, custom_role_scope)
VALUES ('bad-user-3', '11111111-1111-1111-1111-111111111111', 'bad3@oakridge.edu', 'Bad User 3', 'TEACHER', 'MATH');

-- 4. EXPECTED FAILURE: Insert fee payment referencing mismatched student (Student is School B, Fee is School A)
-- This should fail because FOREIGN KEY(school_id, student_id) references students(school_id, id)
INSERT INTO fee_payments (id, school_id, student_id, amount, payment_status, fee_type, created_by_user_id)
VALUES ('bad-fee-1', '11111111-1111-1111-1111-111111111111', 'stud-b1-uuid', 500.0, 'PENDING', 'TUITION', 'fc-a-uuid');

-- 5. EXPECTED FAILURE: Insert custom log entry for a scope the custom user does not hold (Eve has 'LAB', writing to 'SPORTS')
-- This should fail because FOREIGN KEY(school_id, user_id, scope) references users(school_id, id, custom_role_scope)
INSERT INTO custom_records (id, school_id, user_id, scope, log_entry)
VALUES ('bad-custom-1', '11111111-1111-1111-1111-111111111111', 'c-a-uuid', 'SPORTS', 'Attempted to log sports data');

-- 6. EXPECTED FAILURE: Insert custom log entry for a non-custom user (Bob is a TEACHER, scope is NULL)
-- This should fail the foreign key check
INSERT INTO custom_records (id, school_id, user_id, scope, log_entry)
VALUES ('bad-custom-2', '11111111-1111-1111-1111-111111111111', 't-a-uuid', 'LAB', 'Attempted lab entry by teacher');
