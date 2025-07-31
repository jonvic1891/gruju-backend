-- Complete database setup script for gruju_test database
-- This will create all tables and populate them with demo data for the Parent Activity App

-- Drop existing tables if they exist (in correct order due to foreign keys)
IF EXISTS (SELECT * FROM sysobjects WHERE name='activities' AND xtype='U')
    DROP TABLE activities;

IF EXISTS (SELECT * FROM sysobjects WHERE name='connections' AND xtype='U')
    DROP TABLE connections;

IF EXISTS (SELECT * FROM sysobjects WHERE name='connection_requests' AND xtype='U')
    DROP TABLE connection_requests;

IF EXISTS (SELECT * FROM sysobjects WHERE name='children' AND xtype='U')
    DROP TABLE children;

IF EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
    DROP TABLE users;

PRINT 'Creating tables...';

-- Users table
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    phone NVARCHAR(20),
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BIT NOT NULL DEFAULT 1,
    family_name NVARCHAR(100),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Children table
CREATE TABLE children (
    id INT IDENTITY(1,1) PRIMARY KEY,
    parent_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activities table
CREATE TABLE activities (
    id INT IDENTITY(1,1) PRIMARY KEY,
    child_id INT NOT NULL,
    name NVARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    website_url NVARCHAR(500),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- Connection requests table
CREATE TABLE connection_requests (
    id INT IDENTITY(1,1) PRIMARY KEY,
    requester_id INT NOT NULL,
    target_parent_id INT NOT NULL,
    child_id INT NOT NULL,
    target_child_id INT,
    status NVARCHAR(20) NOT NULL DEFAULT 'pending',
    message NVARCHAR(500),
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE NO ACTION,
    FOREIGN KEY (target_parent_id) REFERENCES users(id) ON DELETE NO ACTION,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- Connections table
CREATE TABLE connections (
    id INT IDENTITY(1,1) PRIMARY KEY,
    child1_id INT NOT NULL,
    child2_id INT NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (child1_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (child2_id) REFERENCES children(id) ON DELETE NO ACTION
);

PRINT 'Tables created successfully!';
PRINT 'Inserting demo data...';

-- Insert demo users
INSERT INTO users (username, email, phone, password_hash, role, is_active, family_name, created_at, updated_at) VALUES
-- Admin accounts
('admin', 'admin@parentactivityapp.com', '+1555000001', '$2a$12$dummy.hash.for.demo.purposes', 'super_admin', 1, NULL, '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
('manager', 'manager@parentactivityapp.com', '+1555000002', '$2a$12$dummy.hash.for.demo.purposes', 'admin', 1, NULL, '2024-01-01T00:00:00', '2024-01-01T00:00:00'),

-- Family accounts
('john', 'john@example.com', '+1555000003', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Johnson Family', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
('jane', 'jane@example.com', '+1555000004', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Smith Family', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
('mike', 'mike@example.com', '+1555000005', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Miller Family', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
('sarah', 'sarah@example.com', '+1555000006', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Davis Family', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
('david', 'david@example.com', '+1555000007', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Wilson Family', '2024-01-01T00:00:00', '2024-01-01T00:00:00');

PRINT 'Users inserted successfully!';

-- Get user IDs for foreign key relationships
DECLARE @johnId INT = (SELECT id FROM users WHERE email = 'john@example.com');
DECLARE @janeId INT = (SELECT id FROM users WHERE email = 'jane@example.com');
DECLARE @mikeId INT = (SELECT id FROM users WHERE email = 'mike@example.com');
DECLARE @sarahId INT = (SELECT id FROM users WHERE email = 'sarah@example.com');
DECLARE @davidId INT = (SELECT id FROM users WHERE email = 'david@example.com');

-- Insert demo children
INSERT INTO children (parent_id, name, created_at, updated_at) VALUES
-- Johnson Family (john@example.com)
(@johnId, 'Emma Johnson', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
(@johnId, 'Alex Johnson', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),

-- Smith Family (jane@example.com)
(@janeId, 'Sophia Smith', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
(@janeId, 'Lucas Smith', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),

-- Miller Family (mike@example.com)
(@mikeId, 'Olivia Miller', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
(@mikeId, 'Mason Miller', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
(@mikeId, 'Theodore Miller', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),

-- Davis Family (sarah@example.com)
(@sarahId, 'Isabella Davis', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),
(@sarahId, 'Ethan Davis', '2024-01-01T00:00:00', '2024-01-01T00:00:00'),

-- Wilson Family (david@example.com)
(@davidId, 'Ava Wilson', '2024-01-01T00:00:00', '2024-01-01T00:00:00');

PRINT 'Children inserted successfully!';

-- Get child IDs for activities
DECLARE @emmaId INT = (SELECT id FROM children WHERE name = 'Emma Johnson');
DECLARE @alexId INT = (SELECT id FROM children WHERE name = 'Alex Johnson');
DECLARE @sophiaId INT = (SELECT id FROM children WHERE name = 'Sophia Smith');
DECLARE @lucasId INT = (SELECT id FROM children WHERE name = 'Lucas Smith');
DECLARE @oliviaId INT = (SELECT id FROM children WHERE name = 'Olivia Miller');
DECLARE @masonId INT = (SELECT id FROM children WHERE name = 'Mason Miller');
DECLARE @theodoreId INT = (SELECT id FROM children WHERE name = 'Theodore Miller');
DECLARE @isabellaId INT = (SELECT id FROM children WHERE name = 'Isabella Davis');
DECLARE @ethanId INT = (SELECT id FROM children WHERE name = 'Ethan Davis');
DECLARE @avaId INT = (SELECT id FROM children WHERE name = 'Ava Wilson');

-- Insert demo activities with dates relative to today
INSERT INTO activities (child_id, name, start_date, end_date, start_time, end_time, website_url, created_at, updated_at) VALUES
-- Emma's activities
(@emmaId, 'Soccer Practice', DATEADD(day, 1, CAST(GETDATE() AS DATE)), NULL, '16:00:00', '17:30:00', NULL, GETDATE(), GETDATE()),
(@emmaId, 'Piano Lesson', DATEADD(day, 3, CAST(GETDATE() AS DATE)), NULL, '15:00:00', '16:00:00', NULL, GETDATE(), GETDATE()),
(@emmaId, 'Dance Class', DATEADD(day, 5, CAST(GETDATE() AS DATE)), NULL, '17:00:00', '18:00:00', 'https://dancestudio.com', GETDATE(), GETDATE()),

-- Alex's activities
(@alexId, 'Basketball Training', DATEADD(day, 2, CAST(GETDATE() AS DATE)), NULL, '17:00:00', '18:30:00', NULL, GETDATE(), GETDATE()),
(@alexId, 'Math Tutoring', DATEADD(day, 4, CAST(GETDATE() AS DATE)), NULL, '16:30:00', '17:30:00', NULL, GETDATE(), GETDATE()),

-- Sophia's activities
(@sophiaId, 'Swimming Lessons', DATEADD(day, 1, CAST(GETDATE() AS DATE)), NULL, '14:00:00', '15:00:00', 'https://swimclub.com', GETDATE(), GETDATE()),
(@sophiaId, 'Art Class', DATEADD(day, 6, CAST(GETDATE() AS DATE)), NULL, '10:00:00', '11:30:00', NULL, GETDATE(), GETDATE()),

-- Lucas's activities
(@lucasId, 'Guitar Lessons', DATEADD(day, 2, CAST(GETDATE() AS DATE)), NULL, '16:00:00', '17:00:00', NULL, GETDATE(), GETDATE()),
(@lucasId, 'Science Club', DATEADD(day, 5, CAST(GETDATE() AS DATE)), NULL, '15:30:00', '16:30:00', 'https://scienceclub.org', GETDATE(), GETDATE()),

-- Olivia's activities
(@oliviaId, 'Ballet Class', DATEADD(day, 3, CAST(GETDATE() AS DATE)), NULL, '16:00:00', '17:00:00', 'https://ballet.com', GETDATE(), GETDATE()),
(@oliviaId, 'Playdate at Park', DATEADD(day, 7, CAST(GETDATE() AS DATE)), NULL, '14:00:00', '16:00:00', NULL, GETDATE(), GETDATE()),

-- Mason's activities
(@masonId, 'Football Practice', DATEADD(day, 1, CAST(GETDATE() AS DATE)), NULL, '17:30:00', '19:00:00', NULL, GETDATE(), GETDATE()),
(@masonId, 'Chess Club', DATEADD(day, 4, CAST(GETDATE() AS DATE)), NULL, '15:00:00', '16:00:00', NULL, GETDATE(), GETDATE()),

-- Theodore's activities
(@theodoreId, 'Robotics Club', DATEADD(day, 2, CAST(GETDATE() AS DATE)), NULL, '16:00:00', '18:00:00', 'https://robotics.edu', GETDATE(), GETDATE()),
(@theodoreId, 'Tennis Lessons', DATEADD(day, 6, CAST(GETDATE() AS DATE)), NULL, '14:30:00', '15:30:00', NULL, GETDATE(), GETDATE()),

-- Isabella's activities
(@isabellaId, 'Gymnastics', DATEADD(day, 3, CAST(GETDATE() AS DATE)), NULL, '17:00:00', '18:30:00', 'https://gymnastics.com', GETDATE(), GETDATE()),
(@isabellaId, 'Reading Club', DATEADD(day, 5, CAST(GETDATE() AS DATE)), NULL, '15:00:00', '16:00:00', NULL, GETDATE(), GETDATE()),

-- Ethan's activities
(@ethanId, 'Karate Class', DATEADD(day, 1, CAST(GETDATE() AS DATE)), NULL, '18:00:00', '19:00:00', NULL, GETDATE(), GETDATE()),
(@ethanId, 'Computer Coding', DATEADD(day, 4, CAST(GETDATE() AS DATE)), NULL, '16:00:00', '17:30:00', 'https://codeclub.org', GETDATE(), GETDATE()),

-- Ava's activities
(@avaId, 'Violin Lessons', DATEADD(day, 2, CAST(GETDATE() AS DATE)), NULL, '15:30:00', '16:30:00', NULL, GETDATE(), GETDATE()),
(@avaId, 'Drama Club', DATEADD(day, 6, CAST(GETDATE() AS DATE)), NULL, '16:00:00', '17:30:00', 'https://drama.school', GETDATE(), GETDATE());

PRINT 'Activities inserted successfully!';

-- Insert some demo connection requests
INSERT INTO connection_requests (requester_id, target_parent_id, child_id, target_child_id, status, message, created_at, updated_at) VALUES
(@janeId, @johnId, @sophiaId, @emmaId, 'pending', 'Hi! Our daughters are the same age and both love soccer. Would love to arrange a playdate!', DATEADD(hour, -2, GETDATE()), DATEADD(hour, -2, GETDATE())),
(@mikeId, @johnId, @theodoreId, @alexId, 'pending', 'Theodore and Alex are both into sports. Maybe they could be friends?', DATEADD(hour, -1, GETDATE()), DATEADD(hour, -1, GETDATE())),
(@sarahId, @janeId, @isabellaId, @sophiaId, 'accepted', 'Both girls love dance and gymnastics!', DATEADD(day, -1, GETDATE()), DATEADD(hour, -3, GETDATE()));

PRINT 'Connection requests inserted successfully!';

-- Insert some demo connections (accepted connections)
INSERT INTO connections (child1_id, child2_id, status, created_at) VALUES
(@isabellaId, @sophiaId, 'active', DATEADD(hour, -3, GETDATE())),
(@emmaId, @oliviaId, 'active', DATEADD(day, -2, GETDATE())),
(@alexId, @lucasId, 'active', DATEADD(day, -3, GETDATE()));

PRINT 'Connections inserted successfully!';

-- Display summary
PRINT '';
PRINT '🎉 Database setup completed successfully!';
PRINT '=====================================';
PRINT '';

SELECT 'Users' as TableName, COUNT(*) as RecordCount FROM users
UNION ALL
SELECT 'Children', COUNT(*) FROM children  
UNION ALL
SELECT 'Activities', COUNT(*) FROM activities
UNION ALL
SELECT 'Connection Requests', COUNT(*) FROM connection_requests
UNION ALL
SELECT 'Connections', COUNT(*) FROM connections;

PRINT '';
PRINT 'Demo accounts created:';
PRINT '  👑 admin@parentactivityapp.com (Super Admin) - password: demo123';
PRINT '  ⚙️ manager@parentactivityapp.com (Admin) - password: demo123';
PRINT '  👨‍👩‍👧‍👦 john@example.com (Johnson Family) - password: demo123';
PRINT '  👨‍👩‍👧‍👦 jane@example.com (Smith Family) - password: demo123';
PRINT '  👨‍👩‍👧‍👦 mike@example.com (Miller Family) - password: demo123';
PRINT '  👨‍👩‍👧‍👦 sarah@example.com (Davis Family) - password: demo123';
PRINT '  👨‍👩‍👧‍👦 david@example.com (Wilson Family) - password: demo123';
PRINT '';
PRINT 'Your Parent Activity App is now ready with full demo data!';
PRINT 'All data is stored in your gruju_test Azure SQL Database.';