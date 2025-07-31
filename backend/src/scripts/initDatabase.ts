import sql from 'mssql';
import DatabaseConnection from '../config/database';

const createTables = async (): Promise<void> => {
  const dbConnection = DatabaseConnection.getInstance();
  
  try {
    const pool = await dbConnection.connect();

    // Users table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
      CREATE TABLE Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) NOT NULL UNIQUE,
        email NVARCHAR(100) NOT NULL UNIQUE,
        phone NVARCHAR(20) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE()
      )
    `);

    // Children table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Children' AND xtype='U')
      CREATE TABLE Children (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        parent_id INT NOT NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (parent_id) REFERENCES Users(id) ON DELETE CASCADE
      )
    `);

    // Connections table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Connections' AND xtype='U')
      CREATE TABLE Connections (
        id INT IDENTITY(1,1) PRIMARY KEY,
        child1_id INT NOT NULL,
        child2_id INT NOT NULL,
        status NVARCHAR(20) DEFAULT 'active',
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (child1_id) REFERENCES Children(id) ON DELETE CASCADE,
        FOREIGN KEY (child2_id) REFERENCES Children(id),
        CONSTRAINT UQ_Connection UNIQUE (child1_id, child2_id),
        CONSTRAINT CHK_DifferentChildren CHECK (child1_id != child2_id)
      )
    `);

    // Activities table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Activities' AND xtype='U')
      CREATE TABLE Activities (
        id INT IDENTITY(1,1) PRIMARY KEY,
        child_id INT NOT NULL,
        name NVARCHAR(200) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        website_url NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (child_id) REFERENCES Children(id) ON DELETE CASCADE,
        CONSTRAINT CHK_ValidDates CHECK (end_date >= start_date),
        CONSTRAINT CHK_ValidTimes CHECK (
          (start_date = end_date AND end_time >= start_time) OR 
          (end_date > start_date)
        )
      )
    `);

    // ConnectionRequests table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ConnectionRequests' AND xtype='U')
      CREATE TABLE ConnectionRequests (
        id INT IDENTITY(1,1) PRIMARY KEY,
        requester_id INT NOT NULL,
        target_parent_id INT NOT NULL,
        child_id INT NOT NULL,
        target_child_id INT,
        status NVARCHAR(20) DEFAULT 'pending',
        message NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (requester_id) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_parent_id) REFERENCES Users(id),
        FOREIGN KEY (child_id) REFERENCES Children(id) ON DELETE CASCADE,
        FOREIGN KEY (target_child_id) REFERENCES Children(id),
        CONSTRAINT CHK_RequestStatus CHECK (status IN ('pending', 'accepted', 'rejected')),
        CONSTRAINT CHK_DifferentParents CHECK (requester_id != target_parent_id)
      )
    `);

    // Create indexes for better performance
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Email')
      CREATE INDEX IX_Users_Email ON Users(email)
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Phone')
      CREATE INDEX IX_Users_Phone ON Users(phone)
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Activities_Child_Date')
      CREATE INDEX IX_Activities_Child_Date ON Activities(child_id, start_date, end_date)
    `);

    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ConnectionRequests_Target')
      CREATE INDEX IX_ConnectionRequests_Target ON ConnectionRequests(target_parent_id, status)
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
};

// Run the script if called directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

export { createTables };