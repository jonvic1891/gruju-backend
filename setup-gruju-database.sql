-- Database setup script for gruju_test database
-- Run this in your Azure SQL Database to create the required schema

-- Users table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
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

-- Insert demo admin user (if not exists)
IF NOT EXISTS (SELECT * FROM users WHERE email = 'admin@parentactivityapp.com')
INSERT INTO users (username, email, phone, password_hash, role, is_active, created_at, updated_at)
VALUES ('admin', 'admin@parentactivityapp.com', '+1555000001', '$2a$12$dummy.hash.for.demo.purposes', 'super_admin', 1, GETDATE(), GETDATE());

-- Insert demo regular user (if not exists)
IF NOT EXISTS (SELECT * FROM users WHERE email = 'john@example.com')
INSERT INTO users (username, email, phone, password_hash, role, is_active, family_name, created_at, updated_at)
VALUES ('john', 'john@example.com', '+1555000003', '$2a$12$dummy.hash.for.demo.purposes', 'user', 1, 'Johnson Family', GETDATE(), GETDATE());

-- Children table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='children' AND xtype='U')
CREATE TABLE children (
    id INT IDENTITY(1,1) PRIMARY KEY,
    parent_id INT NOT NULL,
    name NVARCHAR(100) NOT NULL,
    birth_date DATE,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activities table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='activities' AND xtype='U')
CREATE TABLE activities (
    id INT IDENTITY(1,1) PRIMARY KEY,
    child_id INT NOT NULL,
    title NVARCHAR(200) NOT NULL,
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
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='connection_requests' AND xtype='U')
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
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='connections' AND xtype='U')
CREATE TABLE connections (
    id INT IDENTITY(1,1) PRIMARY KEY,
    child1_id INT NOT NULL,
    child2_id INT NOT NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'active',
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (child1_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (child2_id) REFERENCES children(id) ON DELETE NO ACTION
);

-- Insert some demo data for the John user
DECLARE @johnUserId INT;
SELECT @johnUserId = id FROM users WHERE email = 'john@example.com';

-- Insert demo children for John (if not exists)
IF @johnUserId IS NOT NULL AND NOT EXISTS (SELECT * FROM children WHERE parent_id = @johnUserId)
BEGIN
    INSERT INTO children (parent_id, name, birth_date, created_at, updated_at)
    VALUES 
        (@johnUserId, 'Emma Johnson', '2016-03-15', GETDATE(), GETDATE()),
        (@johnUserId, 'Alex Johnson', '2012-08-22', GETDATE(), GETDATE());
        
    -- Get the child IDs for activities
    DECLARE @emmaId INT, @alexId INT;
    SELECT @emmaId = id FROM children WHERE parent_id = @johnUserId AND name = 'Emma Johnson';
    SELECT @alexId = id FROM children WHERE parent_id = @johnUserId AND name = 'Alex Johnson';
    
    -- Insert demo activities
    IF @emmaId IS NOT NULL
    INSERT INTO activities (child_id, title, start_date, start_time, end_time, created_at, updated_at)
    VALUES 
        (@emmaId, 'Soccer Practice', CAST(GETDATE() AS DATE), '16:00:00', '17:30:00', GETDATE(), GETDATE()),
        (@emmaId, 'Piano Lesson', CAST(DATEADD(day, 2, GETDATE()) AS DATE), '15:00:00', '16:00:00', GETDATE(), GETDATE());
        
    IF @alexId IS NOT NULL
    INSERT INTO activities (child_id, title, start_date, start_time, end_time, created_at, updated_at)
    VALUES 
        (@alexId, 'Basketball Training', CAST(DATEADD(day, 1, GETDATE()) AS DATE), '17:00:00', '18:30:00', GETDATE(), GETDATE());
END

PRINT 'Database schema setup completed successfully!';
PRINT 'Demo users created:';
PRINT '  - admin@parentactivityapp.com (Super Admin)';
PRINT '  - john@example.com (Regular User with demo data)';
PRINT 'You can now connect the Parent Activity App to this database.';