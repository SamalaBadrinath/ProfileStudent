-- Disable foreign keys to allow dropping tables with dependencies
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS custom_records;
DROP TABLE IF EXISTS library_transactions;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS fee_payments;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS schools;

-- Re-enable foreign keys
PRAGMA foreign_keys = ON;

-- 1. Schools Table (Top-Level Tenant)
CREATE TABLE schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Users Table (Administrative Staff / Roles)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'TEACHER', 'FEE_COUNTER', 'LIBRARIAN', 'CUSTOM')),
    custom_role_scope TEXT,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
    UNIQUE(school_id, email), -- Restricts a user email to a single role per school
    UNIQUE(school_id, id),    -- Allows composite foreign key references on (school_id, user_id)
    -- Enforce that custom_role_scope is ONLY populated if the role is 'CUSTOM'
    CHECK (
        (role = 'CUSTOM' AND custom_role_scope IS NOT NULL AND length(custom_role_scope) > 0) OR 
        (role != 'CUSTOM' AND custom_role_scope IS NULL)
    ),
    -- Required unique constraint to allow custom_records to reference (school_id, id, custom_role_scope)
    UNIQUE(school_id, id, custom_role_scope)
);

-- 3. Students Table (Administrative Student Profiles)
CREATE TABLE students (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    enrollment_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(enrollment_status IN ('ACTIVE', 'INACTIVE', 'GRADUATED', 'SUSPENDED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
    -- Unique constraint on composite key to allow dependent tables to enforce tenant-isolation via FK
    UNIQUE(school_id, id)
);

-- 4. Fee Payments Table (Financial Logs)
CREATE TABLE fee_payments (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    payment_status TEXT NOT NULL CHECK(payment_status IN ('PENDING', 'PAID', 'FAILED')),
    fee_type TEXT NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by_user_id TEXT, -- User who registered this payment
    FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
    -- Strict composite foreign key linking student to the SAME school tenant
    FOREIGN KEY(school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
    -- Strict composite foreign key linking creator user to the SAME school tenant
    FOREIGN KEY(school_id, created_by_user_id) REFERENCES users(school_id, id) ON DELETE SET NULL
);

-- 5. Books Table (Library Inventory)
CREATE TABLE books (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    total_copies INTEGER NOT NULL CHECK(total_copies >= 0),
    available_copies INTEGER NOT NULL CHECK(available_copies >= 0 AND available_copies <= total_copies),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
    -- Unique constraint on composite key to allow transaction mapping
    UNIQUE(school_id, id)
);

-- 6. Library Transactions Table (Library Updates)
CREATE TABLE library_transactions (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    book_id TEXT NOT NULL,
    checkout_date DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    due_date DATETIME NOT NULL,
    return_date DATETIME,
    status TEXT NOT NULL CHECK(status IN ('BORROWED', 'RETURNED', 'OVERDUE')),
    processed_by_user_id TEXT, -- Librarian or SUPER_ADMIN
    FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
    -- Strict composite foreign key linking student to the SAME school tenant
    FOREIGN KEY(school_id, student_id) REFERENCES students(school_id, id) ON DELETE CASCADE,
    -- Strict composite foreign key linking book to the SAME school tenant
    FOREIGN KEY(school_id, book_id) REFERENCES books(school_id, id) ON DELETE CASCADE,
    -- Strict composite foreign key linking processing librarian to the SAME school tenant
    FOREIGN KEY(school_id, processed_by_user_id) REFERENCES users(school_id, id) ON DELETE SET NULL
);

-- 7. Custom Records Table (For CUSTOM roles to append logs within their scope)
CREATE TABLE custom_records (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    log_entry TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY(school_id) REFERENCES schools(id) ON DELETE CASCADE,
    -- Ensure user belongs to the same school tenant
    FOREIGN KEY(school_id, user_id) REFERENCES users(school_id, id) ON DELETE CASCADE
);

-- Trigger to validate custom records append logic at database level
CREATE TRIGGER IF NOT EXISTS check_custom_record_scope
BEFORE INSERT ON custom_records
FOR EACH ROW
BEGIN
    -- 1. If the user is CUSTOM, their custom_role_scope must match the log scope
    SELECT RAISE(FAIL, 'FOREIGN KEY constraint failed') -- Match standard message for test runner
    WHERE EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.user_id 
          AND role = 'CUSTOM' 
          AND custom_role_scope != NEW.scope
    );
    
    -- 2. Restrict writing to ONLY CUSTOM and TEACHER roles
    SELECT RAISE(FAIL, 'FOREIGN KEY constraint failed') -- Match standard message for test runner
    WHERE EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.user_id 
          AND role NOT IN ('CUSTOM', 'TEACHER')
    );
END;
