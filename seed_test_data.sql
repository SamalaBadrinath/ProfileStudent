-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- 1. Insert Schools
INSERT INTO schools (id, name) VALUES 
('11111111-1111-1111-1111-111111111111', 'Oakridge Academy'),
('22222222-2222-2222-2222-222222222222', 'Pinecrest High');

-- 2. Insert Users for School A (Oakridge Academy)
INSERT INTO users (id, school_id, email, name, role, custom_role_scope, password_hash, password_salt) VALUES
('sa-a-uuid', '11111111-1111-1111-1111-111111111111', 'superadmin.a@oakridge.edu', 'Alice Smith', 'SUPER_ADMIN', NULL, '8bbdbe023a4a4fe21e7dfd32c53024a0c9132624e64be8ab66c728d604c94436', '5118130a891574cd000fa2c4eca5cbcb'),
('t-a-uuid', '11111111-1111-1111-1111-111111111111', 'teacher.a@oakridge.edu', 'Bob Jones', 'TEACHER', NULL, 'e48bd7e4d31114b218093f14d53aff21a663b36bd7eaf36282f415ed935a5e5a', 'b6072627bc9e508336e5429b9b9ad758'),
('fc-a-uuid', '11111111-1111-1111-1111-111111111111', 'feecounter.a@oakridge.edu', 'Charlie Brown', 'FEE_COUNTER', NULL, '8f873eba392757c56a0e41f17672a857822e39b9813a08a2ff0bc1ad4e713fd2', 'c2c11cbead2356220f035f8321211de3'),
('l-a-uuid', '11111111-1111-1111-1111-111111111111', 'librarian.a@oakridge.edu', 'David Miller', 'LIBRARIAN', NULL, 'd076c3de966b413f823587de259ba99a185278803139b468ae7a3804a7d08ea9', '2d98fd447e65d95a839c047c18988e85'),
('c-a-uuid', '11111111-1111-1111-1111-111111111111', 'custom.a@oakridge.edu', 'Eve Davis', 'CUSTOM', 'LAB', 'e953e0046703b031515c98d59e687db02fa9cdabe23149d0c442875a045e071d', '40555ab76d3111b846fb8626331cfd1b');

-- 3. Insert Users for School B (Pinecrest High)
INSERT INTO users (id, school_id, email, name, role, custom_role_scope, password_hash, password_salt) VALUES
('sa-b-uuid', '22222222-2222-2222-2222-222222222222', 'superadmin.b@pinecrest.edu', 'Zachary Taylor', 'SUPER_ADMIN', NULL, 'eff8d902206dd353723009ad62155610d3410ade4d20a37315ea7a99926694a7', 'b1536b0fc7791515d6727b60fbbd5ce0'),
('t-b-uuid', '22222222-2222-2222-2222-222222222222', 'teacher.b@pinecrest.edu', 'Yvonne Carter', 'TEACHER', NULL, '2dc976515c0ff4a3eb3d437220d93b417c3b21d32d95ab4e61334d9ec43fd66d', 'dcb52ed2fa64ab76808bd23f54c4a123'),
('fc-b-uuid', '22222222-2222-2222-2222-222222222222', 'feecounter.b@pinecrest.edu', 'Xavier Martinez', 'FEE_COUNTER', NULL, '453a65d13b0323215f48298b685857e338349af83164e454ae6ac0c6a37e18db', '6df825fefc3132a7bf587703f0d5be2a'),
('l-b-uuid', '22222222-2222-2222-2222-222222222222', 'librarian.b@pinecrest.edu', 'William Davis', 'LIBRARIAN', NULL, '980a3adc4309c6686661a960aa62a24f339856cbc8f3c96d8cd54f2b23078aa4', 'bcc0200aa1a3bd7808e47d220a5adb7e'),
('c-b-uuid', '22222222-2222-2222-2222-222222222222', 'custom.b@pinecrest.edu', 'Victoria Hall', 'CUSTOM', 'SPORTS', '1fa8a8f0be4ffbf7fe759d329be0f709d2c4fa540d566159c6f3bb5396664322', '5cb96feefe3f06b68e8cfc026886196d');

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

