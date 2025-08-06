"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const mssql_1 = __importDefault(require("mssql"));
const mockDatabase_1 = __importDefault(require("../utils/mockDatabase"));
class DatabaseService {
    constructor() {
        this.connectionPool = null;
        this.currentMode = 'production';
        this.databaseConfigs = new Map();
        this.currentConfig = null;
        this.mockDb = mockDatabase_1.default.getInstance();
        this.currentMode = process.env.DATABASE_MODE || 'production';
        this.loadConfigurationsFromEnv();
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    // Load database configurations from environment variables
    loadConfigurationsFromEnv() {
        // Demo/Test Database Configuration
        if (process.env.DEMO_SQL_SERVER) {
            this.databaseConfigs.set('demo', {
                server: process.env.DEMO_SQL_SERVER,
                database: process.env.DEMO_SQL_DATABASE || 'ParentActivityDB_Demo',
                user: process.env.DEMO_SQL_USER || '',
                password: process.env.DEMO_SQL_PASSWORD || '',
                environment: 'demo',
                name: 'Demo Database',
                description: 'Demo/Test database for development and testing',
                options: {
                    encrypt: true,
                    trustServerCertificate: false,
                    enableArithAbort: true,
                    connectionTimeout: 30000,
                    requestTimeout: 30000
                },
                pool: {
                    max: 5,
                    min: 0,
                    idleTimeoutMillis: 30000
                }
            });
        }
        // Production Database Configuration
        if (process.env.AZURE_SQL_SERVER) {
            this.databaseConfigs.set('production', {
                server: process.env.AZURE_SQL_SERVER,
                database: process.env.AZURE_SQL_DATABASE || 'ParentActivityDB',
                user: process.env.AZURE_SQL_USER || '',
                password: process.env.AZURE_SQL_PASSWORD || '',
                environment: 'production',
                name: 'Production Database',
                description: 'Production Azure SQL Database',
                options: {
                    encrypt: true,
                    trustServerCertificate: false,
                    enableArithAbort: true,
                    connectionTimeout: 30000,
                    requestTimeout: 30000
                },
                pool: {
                    max: 10,
                    min: 0,
                    idleTimeoutMillis: 30000
                }
            });
        }
        // Add Gruju Test Database as a pre-configured option
        this.databaseConfigs.set('gruju-test', {
            server: 'gruju.database.windows.net',
            database: 'gruju_test',
            user: 'jonathan.roberts',
            password: 'Gruju1891',
            environment: 'demo',
            name: 'Gruju Test Database',
            description: 'Live Azure SQL Database for testing the Parent Activity App',
            options: {
                encrypt: true,
                trustServerCertificate: false,
                enableArithAbort: true,
                connectionTimeout: 30000,
                requestTimeout: 30000
            },
            pool: {
                max: 5,
                min: 0,
                idleTimeoutMillis: 30000
            }
        });
    }
    // Multi-environment database management
    async addDatabaseConfig(configId, config) {
        try {
            // Test the configuration first
            const testPool = new mssql_1.default.ConnectionPool(config);
            await testPool.connect();
            await testPool.request().query('SELECT 1');
            await testPool.close();
            // Store the configuration
            this.databaseConfigs.set(configId, config);
            return true;
        }
        catch (error) {
            console.error(`Database configuration test failed for ${configId}:`, error);
            return false;
        }
    }
    getDatabaseConfigs() {
        return new Map(this.databaseConfigs);
    }
    getDatabaseConfig(configId) {
        return this.databaseConfigs.get(configId);
    }
    getCurrentConfig() {
        return this.currentConfig;
    }
    // Database connection management
    async setAzureConfig(config) {
        try {
            const testPool = new mssql_1.default.ConnectionPool(config);
            await testPool.connect();
            await testPool.request().query('SELECT 1');
            await testPool.close();
            return true;
        }
        catch (error) {
            console.error('Azure SQL connection test failed:', error);
            return false;
        }
    }
    async switchToEnvironment(environmentId) {
        const config = this.databaseConfigs.get(environmentId);
        if (!config) {
            throw new Error(`Database configuration not found for environment: ${environmentId}`);
        }
        try {
            // Close existing connection if any
            if (this.connectionPool) {
                await this.connectionPool.close();
            }
            // Create new connection
            this.connectionPool = new mssql_1.default.ConnectionPool(config);
            await this.connectionPool.connect();
            // Initialize tables
            await this.initializeAzureTables();
            this.currentMode = config.environment;
            this.currentConfig = config;
            return true;
        }
        catch (error) {
            console.error(`Failed to switch to ${environmentId}:`, error);
            return false;
        }
    }
    async switchToAzure() {
        // Legacy method - try to switch to production first, then any available SQL config
        if (this.databaseConfigs.has('production')) {
            return this.switchToEnvironment('production');
        }
        // Find any available SQL configuration
        for (const [id, config] of this.databaseConfigs) {
            if (config.environment !== 'mock') {
                return this.switchToEnvironment(id);
            }
        }
        throw new Error('No SQL database configuration available');
    }
    switchToMock() {
        if (this.connectionPool) {
            this.connectionPool.close().catch(console.error);
            this.connectionPool = null;
        }
        this.currentMode = 'mock';
        this.currentConfig = null;
    }
    getCurrentMode() {
        return this.currentMode;
    }
    // Initialize Azure SQL tables
    async initializeAzureTables() {
        if (!this.connectionPool)
            throw new Error('No Azure connection');
        const queries = [
            // Users table
            `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
       CREATE TABLE users (
         id INT IDENTITY(1,1) PRIMARY KEY,
         username NVARCHAR(50) UNIQUE NOT NULL,
         email NVARCHAR(255) UNIQUE NOT NULL,
         phone NVARCHAR(20),
         password_hash NVARCHAR(255) NOT NULL,
         role NVARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
         is_active BIT DEFAULT 1,
         family_name NVARCHAR(100),
         created_at DATETIME2 DEFAULT GETDATE(),
         updated_at DATETIME2 DEFAULT GETDATE()
       )`,
            // Children table
            `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='children' AND xtype='U')
       CREATE TABLE children (
         id INT IDENTITY(1,1) PRIMARY KEY,
         name NVARCHAR(100) NOT NULL,
         parent_id INT NOT NULL,
         age INT,
         grade NVARCHAR(20),
         school NVARCHAR(100),
         interests NVARCHAR(500),
         created_at DATETIME2 DEFAULT GETDATE(),
         updated_at DATETIME2 DEFAULT GETDATE(),
         FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
       )`,
            // Activities table
            `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='activities' AND xtype='U')
       CREATE TABLE activities (
         id INT IDENTITY(1,1) PRIMARY KEY,
         child_id INT NOT NULL,
         name NVARCHAR(200) NOT NULL,
         description NVARCHAR(1000),
         start_date DATE NOT NULL,
         end_date DATE,
         start_time TIME,
         end_time TIME,
         location NVARCHAR(200),
         website_url NVARCHAR(500),
         cost DECIMAL(10,2),
         max_participants INT,
         created_at DATETIME2 DEFAULT GETDATE(),
         updated_at DATETIME2 DEFAULT GETDATE(),
         FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
       )`,
            // Database configurations table
            `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='database_configurations' AND xtype='U')
       CREATE TABLE database_configurations (
         id INT IDENTITY(1,1) PRIMARY KEY,
         name NVARCHAR(100) NOT NULL,
         server_name NVARCHAR(255) NOT NULL,
         database_name NVARCHAR(100) NOT NULL,
         username NVARCHAR(100) NOT NULL,
         password NVARCHAR(255) NOT NULL,
         is_active BIT DEFAULT 0,
         connection_test_result NVARCHAR(500),
         last_tested DATETIME2,
         created_by INT NOT NULL,
         created_at DATETIME2 DEFAULT GETDATE(),
         updated_at DATETIME2 DEFAULT GETDATE(),
         FOREIGN KEY (created_by) REFERENCES users(id)
       )`
        ];
        for (const query of queries) {
            await this.connectionPool.request().query(query);
        }
    }
    // User management methods
    async findUserByEmail(email) {
        if (this.currentMode === 'mock') {
            return this.mockDb.findUserByEmail(email) || null;
        }
        if (!this.connectionPool)
            throw new Error('No Azure connection');
        const result = await this.connectionPool.request()
            .input('email', mssql_1.default.NVarChar, email)
            .query('SELECT * FROM users WHERE email = @email AND is_active = 1');
        return result.recordset[0] || null;
    }
    async findUserById(id) {
        if (this.currentMode === 'mock') {
            return this.mockDb.findUserById(id) || null;
        }
        if (!this.connectionPool)
            throw new Error('No Azure connection');
        const result = await this.connectionPool.request()
            .input('id', mssql_1.default.Int, id)
            .query('SELECT * FROM users WHERE id = @id');
        return result.recordset[0] || null;
    }
    async createUser(userData) {
        if (this.currentMode === 'mock') {
            return this.mockDb.createUser(userData);
        }
        if (!this.connectionPool)
            throw new Error('No Azure connection');
        const result = await this.connectionPool.request()
            .input('username', mssql_1.default.NVarChar, userData.username)
            .input('email', mssql_1.default.NVarChar, userData.email)
            .input('phone', mssql_1.default.NVarChar, userData.phone)
            .input('password_hash', mssql_1.default.NVarChar, userData.password_hash)
            .input('role', mssql_1.default.NVarChar, userData.role)
            .input('is_active', mssql_1.default.Bit, userData.is_active)
            .input('family_name', mssql_1.default.NVarChar, userData.family_name)
            .query(`
        INSERT INTO users (username, email, phone, password_hash, role, is_active, family_name)
        OUTPUT INSERTED.*
        VALUES (@username, @email, @phone, @password_hash, @role, @is_active, @family_name)
      `);
        return result.recordset[0];
    }
    async getAllUsers(page = 1, limit = 50, search = '') {
        if (this.currentMode === 'mock') {
            return this.mockDb.getAllUsers(page, limit, search);
        }
        if (!this.connectionPool)
            throw new Error('No Azure connection');
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        if (search) {
            whereClause += ` AND (username LIKE '%${search}%' OR email LIKE '%${search}%' OR phone LIKE '%${search}%' OR family_name LIKE '%${search}%')`;
        }
        const countResult = await this.connectionPool.request()
            .query(`SELECT COUNT(*) as total FROM users ${whereClause}`);
        const usersResult = await this.connectionPool.request()
            .query(`
        SELECT * FROM users 
        ${whereClause}
        ORDER BY created_at DESC
        OFFSET ${offset} ROWS
        FETCH NEXT ${limit} ROWS ONLY
      `);
        const total = countResult.recordset[0].total;
        const pages = Math.ceil(total / limit);
        return {
            users: usersResult.recordset,
            total,
            pages
        };
    }
    async updateUserRole(userId, role) {
        if (this.currentMode === 'mock') {
            return this.mockDb.updateUserRole(userId, role);
        }
        if (!this.connectionPool)
            throw new Error('No Azure connection');
        const result = await this.connectionPool.request()
            .input('userId', mssql_1.default.Int, userId)
            .input('role', mssql_1.default.NVarChar, role)
            .query(`
        UPDATE users 
        SET role = @role, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @userId
      `);
        return result.recordset[0] || null;
    }
    async updateUserStatus(userId, isActive) {
        if (this.currentMode === 'mock') {
            return this.mockDb.updateUserStatus(userId, isActive);
        }
        if (!this.connectionPool)
            throw new Error('No Azure connection');
        const result = await this.connectionPool.request()
            .input('userId', mssql_1.default.Int, userId)
            .input('isActive', mssql_1.default.Bit, isActive)
            .query(`
        UPDATE users 
        SET is_active = @isActive, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @userId
      `);
        return result.recordset[0] || null;
    }
    async deleteUser(userId) {
        if (this.currentMode === 'mock') {
            return this.mockDb.deleteUser(userId);
        }
        if (!this.connectionPool)
            throw new Error('No Azure connection');
        const result = await this.connectionPool.request()
            .input('userId', mssql_1.default.Int, userId)
            .query('DELETE FROM users WHERE id = @userId');
        return result.rowsAffected[0] > 0;
    }
    async getSystemStats() {
        if (this.currentMode === 'mock') {
            return this.mockDb.getSystemStats();
        }
        if (!this.connectionPool)
            throw new Error('No Azure connection');
        const stats = await this.connectionPool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= DATEADD(day, -7, GETDATE())) as new_users_week,
        (SELECT COUNT(*) FROM users WHERE role IN ('admin', 'super_admin')) as admin_users,
        (SELECT COUNT(*) FROM children) as total_children,
        (SELECT COUNT(*) FROM activities) as total_activities,
        (SELECT COUNT(*) FROM activities WHERE start_date >= CAST(GETDATE() AS DATE)) as upcoming_activities
    `);
        const result = stats.recordset[0];
        return {
            users: {
                total: result.total_users,
                active: result.active_users,
                new_users_week: result.new_users_week,
                admin_users: result.admin_users
            },
            children: {
                total: result.total_children
            },
            activities: {
                total: result.total_activities,
                upcoming_activities: result.upcoming_activities
            },
            connections: {
                total: 0,
                pending_connections: 0
            }
        };
    }
    // Migration methods
    async migrateFromMockToAzure() {
        if (this.currentMode === 'mock') {
            return { success: false, message: 'Not connected to SQL database' };
        }
        if (!this.connectionPool) {
            return { success: false, message: 'No Azure connection available' };
        }
        try {
            const mockData = this.mockDb.getAllUsers(1, 1000, '');
            let migratedUsers = 0;
            let errors = [];
            for (const user of mockData.users) {
                try {
                    // Check if user already exists
                    const existing = await this.findUserByEmail(user.email);
                    if (!existing) {
                        await this.createUser({
                            username: user.username,
                            email: user.email,
                            phone: user.phone,
                            password_hash: user.password_hash,
                            role: user.role,
                            is_active: user.is_active,
                            family_name: user.family_name
                        });
                        migratedUsers++;
                    }
                }
                catch (error) {
                    errors.push(`Failed to migrate user ${user.email}: ${error}`);
                }
            }
            return {
                success: true,
                message: `Migration completed. ${migratedUsers} users migrated.`,
                details: {
                    migratedUsers,
                    errors: errors.length > 0 ? errors : undefined
                }
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Migration failed: ${error}`,
                details: error
            };
        }
    }
}
exports.DatabaseService = DatabaseService;
exports.default = DatabaseService;
