import sql from 'mssql';
import DatabaseConnection from '../config/database';

async function initializeSMSDatabase() {
  const dbConnection = DatabaseConnection.getInstance();
  
  try {
    const pool = await dbConnection.connect();
    console.log('Connected to database. Creating SMS tables...');

    // Create SMS connection configurations table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sms_connection_configs' AND xtype='U')
      BEGIN
        CREATE TABLE sms_connection_configs (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL,
          connection_string NVARCHAR(500) NOT NULL,
          phone_number NVARCHAR(20) NOT NULL,
          endpoint NVARCHAR(200) NOT NULL,
          is_active BIT NOT NULL DEFAULT 1,
          is_default BIT NOT NULL DEFAULT 0,
          environment NVARCHAR(20) NOT NULL DEFAULT 'development',
          created_at DATETIME NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME NOT NULL DEFAULT GETDATE(),
          
          CONSTRAINT UC_sms_config_name UNIQUE (name),
          CONSTRAINT UC_sms_config_default UNIQUE (is_default) WHERE is_default = 1
        );
        
        CREATE INDEX IX_sms_connection_configs_active ON sms_connection_configs(is_active);
        CREATE INDEX IX_sms_connection_configs_environment ON sms_connection_configs(environment);
        
        PRINT 'SMS connection configurations table created successfully.';
      END
      ELSE
      BEGIN
        PRINT 'SMS connection configurations table already exists.';
      END
    `);

    // Create SMS message logs table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sms_message_logs' AND xtype='U')
      BEGIN
        CREATE TABLE sms_message_logs (
          id INT IDENTITY(1,1) PRIMARY KEY,
          connection_config_id INT NOT NULL,
          to_number NVARCHAR(20) NOT NULL,
          message NVARCHAR(1000) NOT NULL,
          message_id NVARCHAR(100),
          status NVARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
          error_message NVARCHAR(500),
          sent_at DATETIME NOT NULL,
          
          CONSTRAINT FK_sms_message_logs_config 
            FOREIGN KEY (connection_config_id) 
            REFERENCES sms_connection_configs(id)
            ON DELETE CASCADE
        );
        
        CREATE INDEX IX_sms_message_logs_config ON sms_message_logs(connection_config_id);
        CREATE INDEX IX_sms_message_logs_status ON sms_message_logs(status);
        CREATE INDEX IX_sms_message_logs_sent_at ON sms_message_logs(sent_at);
        CREATE INDEX IX_sms_message_logs_to_number ON sms_message_logs(to_number);
        
        PRINT 'SMS message logs table created successfully.';
      END
      ELSE
      BEGIN
        PRINT 'SMS message logs table already exists.';
      END
    `);

    // Create SMS templates table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='sms_templates' AND xtype='U')
      BEGIN
        CREATE TABLE sms_templates (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100) NOT NULL,
          content NVARCHAR(1000) NOT NULL,
          variables NVARCHAR(500), -- JSON array of variable names
          category NVARCHAR(50) NOT NULL DEFAULT 'general',
          is_active BIT NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT GETDATE(),
          updated_at DATETIME NOT NULL DEFAULT GETDATE(),
          
          CONSTRAINT UC_sms_templates_name UNIQUE (name)
        );
        
        CREATE INDEX IX_sms_templates_category ON sms_templates(category);
        CREATE INDEX IX_sms_templates_active ON sms_templates(is_active);
        
        PRINT 'SMS templates table created successfully.';
      END
      ELSE
      BEGIN
        PRINT 'SMS templates table already exists.';
      END
    `);

    // Insert default templates
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sms_templates WHERE name = 'Activity Reminder')
      BEGIN
        INSERT INTO sms_templates (name, content, variables, category, is_active)
        VALUES 
        ('Activity Reminder', 'Hi {parentName}! Reminder: {childName} has {activityName} on {date} at {time}. Location: {location}', 
         '["parentName", "childName", "activityName", "date", "time", "location"]', 
         'reminders', 1);
         
        INSERT INTO sms_templates (name, content, variables, category, is_active)
        VALUES 
        ('Connection Request', 'Hi {parentName}! {requesterName} would like to connect with you for playdates and activities. Reply YES to accept or NO to decline.', 
         '["parentName", "requesterName"]', 
         'connections', 1);
         
        INSERT INTO sms_templates (name, content, variables, category, is_active)
        VALUES 
        ('Activity Invitation', 'Hi {parentName}! {hostParent} is organizing {activityName} on {date} at {time}. Would {childName} like to join? Reply YES or NO.', 
         '["parentName", "hostParent", "activityName", "date", "time", "childName"]', 
         'invitations', 1);
         
        PRINT 'Default SMS templates inserted successfully.';
      END
      ELSE
      BEGIN
        PRINT 'Default SMS templates already exist.';
      END
    `);

    // Update users table to include role column if it doesn't exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'role')
      BEGIN
        ALTER TABLE users ADD role NVARCHAR(20) NOT NULL DEFAULT 'user';
        ALTER TABLE users ADD CONSTRAINT CHK_user_role CHECK (role IN ('user', 'admin', 'super_admin'));
        PRINT 'Added role column to users table';
      END
      ELSE
      BEGIN
        PRINT 'Role column already exists in users table';
      END
    `);

    // Update users table to include is_active column if it doesn't exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'is_active')
      BEGIN
        ALTER TABLE users ADD is_active BIT NOT NULL DEFAULT 1;
        PRINT 'Added is_active column to users table';
      END
      ELSE
      BEGIN
        PRINT 'is_active column already exists in users table';
      END
    `);

    // Insert a sample development configuration (if none exists)
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sms_connection_configs)
      BEGIN
        INSERT INTO sms_connection_configs (name, connection_string, phone_number, endpoint, is_active, is_default, environment)
        VALUES 
        ('Development Config', 
         'endpoint=https://your-resource.communication.azure.com/;accesskey=your-access-key-here', 
         '+1234567890', 
         'https://your-resource.communication.azure.com', 
         0, -- Inactive by default until configured
         1, -- Set as default
         'development');
         
        PRINT 'Sample development SMS configuration inserted. Please update with your actual Azure Communication Services credentials.';
      END
    `);

    // Create a default admin user if none exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM users WHERE role = 'admin' OR role = 'super_admin')
      BEGIN
        INSERT INTO users (username, email, phone, password_hash, role, is_active)
        VALUES 
        ('admin', 'admin@parentactivityapp.com', '+1234567890', 'temp_password_hash', 'super_admin', 1);
        
        PRINT 'Default admin user created. Username: admin, Please change the password!';
      END
    `);

    console.log('SMS database initialization completed successfully!');
    
    // Display setup instructions
    console.log(`
    ========================================
    SMS Configuration Setup Instructions:
    ========================================
    
    1. Update the sample configuration with your Azure Communication Services credentials:
       - Connection String: Get from Azure Portal > Communication Services > Keys
       - Phone Number: Your ACS phone number in E.164 format
       - Endpoint: Your ACS endpoint URL
    
    2. You can manage configurations via the API endpoints:
       - GET /api/sms-config - List all configurations
       - POST /api/sms-config - Create new configuration
       - PUT /api/sms-config/:id - Update configuration
       - DELETE /api/sms-config/:id - Delete configuration
    
    3. Test your configuration:
       - POST /api/sms-config/:id/test - Test connection
       - POST /api/sms-config/validate - Validate configuration
    
    4. Send SMS using the configured service:
       - POST /api/sms/send - Send SMS using default config
    
    ========================================
    `);

  } catch (error) {
    console.error('Error initializing SMS database:', error);
    throw error;
  } finally {
    await dbConnection.close();
  }
}

// Run the initialization if this file is executed directly
if (require.main === module) {
  initializeSMSDatabase()
    .then(() => {
      console.log('SMS database initialization completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('SMS database initialization failed:', error);
      process.exit(1);
    });
}

export default initializeSMSDatabase;