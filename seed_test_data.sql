-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- 1. Insert Schools
INSERT INTO schools (id, name) VALUES 
('11111111-1111-1111-1111-111111111111', 'Oakridge Academy'),
('22222222-2222-2222-2222-222222222222', 'Pinecrest High');

-- 2. Insert Users for School A (Oakridge Academy)
INSERT INTO users (id, school_id, email, name, role, custom_role_scope) VALUES
('sa-a-uuid', '11111111-1111-1111-1111-111111111111', 'superadmin.a@oakridge.edu', 'Alice Smith', 'SUPER_ADMIN', NULL),
('t-a-uuid', '11111111-1111-1111-1111-111111111111', 'teacher.a@oakridge.edu', 'Bob Jones', 'TEACHER', NULL),
('fc-a-uuid', '11111111-1111-1111-1111-111111111111', 'feecounter.a@oakridge.edu', 'Charlie Brown', 'FEE_COUNTER', NULL),
('l-a-uuid', '11111111-1111-1111-1111-111111111111', 'librarian.a@oakridge.edu', 'David Miller', 'LIBRARIAN', NULL),
('c-a-uuid', '11111111-1111-1111-1111-111111111111', 'custom.a@oakridge.edu', 'Eve Davis', 'CUSTOM', 'LAB');

-- 3. Insert Users for School B (Pinecrest High)
INSERT INTO users (id, school_id, email, name, role, custom_role_scope) VALUES
('sa-b-uuid', '22222222-2222-2222-2222-222222222222', 'superadmin.b@pinecrest.edu', 'Zachary Taylor', 'SUPER_ADMIN', NULL),
('t-b-uuid', '22222222-2222-2222-2222-222222222222', 'teacher.b@pinecrest.edu', 'Yvonne Carter', 'TEACHER', NULL),
('fc-b-uuid', '22222222-2222-2222-2222-222222222222', 'feecounter.b@pinecrest.edu', 'Xavier Martinez', 'FEE_COUNTER', NULL),
('l-b-uuid', '22222222-2222-2222-2222-222222222222', 'librarian.b@pinecrest.edu', 'William Davis', 'LIBRARIAN', NULL),
('c-b-uuid', '22222222-2222-2222-2222-222222222222', 'custom.b@pinecrest.edu', 'Victoria Hall', 'CUSTOM', 'SPORTS');

-- 4. Insert Students for School A (Oakridge Academy)
INSERT INTO students (id, school_id, first_name, last_name, email, enrollment_status) VALUES
('stud-a1-uuid', '11111111-1111-1111-1111-111111111111', 'Alex', 'Johnson', 'alex.j@oakridge.edu', 'ACTIVE'),
('stud-a2-uuid', '11111111-1111-1111-1111-111111111111', 'Bella', 'Gomez', 'bella.g@oakridge.edu', 'ACTIVE'),
('stud-a3-uuid', '11111111-1111-1111-1111-111111111111', 'Connor', 'Lee', 'connor.l@oakridge.edu', 'ACTIVE');

-- 5. Insert Students for School B (Pinecrest High)
INSERT INTO students (id, school_id, first_name, last_name, email, enrollment_status) VALUES
('stud-b1-uuid', '22222222-2222-2222-2222-222222222222', 'Diana', 'Prince', 'diana.p@pinecrest.edu', 'ACTIVE'),
('stud-b2-uuid', '22222222-2222-2222-2222-222222222222', 'Ethan', 'Hunt', 'ethan.h@pinecrest.edu', 'ACTIVE'),
('stud-b3-uuid', '22222222-2222-2222-2222-222222222222', 'Fiona', 'Gallagher', 'fiona.g@pinecrest.edu', 'ACTIVE');

-- 6. Insert Books for School A (Oakridge Academy)
INSERT INTO books (id, school_id, title, author, isbn, total_copies, available_copies) VALUES
('book-a1-uuid', '11111111-1111-1111-1111-111111111111', 'Introduction to Algorithms', 'Thomas H. Cormen', '978-0262033848', 5, 5),
('book-a2-uuid', '11111111-1111-1111-1111-111111111111', 'The Pragmatic Programmer', 'Andy Hunt', '978-0135957059', 3, 3);

-- 7. Insert Books for School B (Pinecrest High)
INSERT INTO books (id, school_id, title, author, isbn, total_copies, available_copies) VALUES
('book-b1-uuid', '22222222-2222-2222-2222-222222222222', 'To Kill a Mockingbird', 'Harper Lee', '978-0446310789', 10, 10);

