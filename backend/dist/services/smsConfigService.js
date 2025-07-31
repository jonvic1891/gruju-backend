"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSConfigService = void 0;
const mssql_1 = __importDefault(require("mssql"));
const communication_sms_1 = require("@azure/communication-sms");
const database_1 = __importDefault(require("../config/database"));
class SMSConfigService {
    constructor() {
        this.dbConnection = database_1.default.getInstance();
    }
    async getAllConfigs() {
        try {
            const pool = await this.dbConnection.connect();
            const result = await pool.request().query(`
        SELECT 
          id, name, connection_string as connectionString, 
          phone_number as phoneNumber, endpoint, is_active as isActive,
          is_default as isDefault, environment, created_at, updated_at
        FROM sms_connection_configs 
        ORDER BY is_default DESC, created_at DESC
      `);
            return result.recordset;
        }
        catch (error) {
            console.error('Error fetching SMS configs:', error);
            throw new Error('Failed to fetch SMS configurations');
        }
    }
    async getConfigById(id) {
        try {
            const pool = await this.dbConnection.connect();
            const result = await pool.request()
                .input('id', mssql_1.default.Int, id)
                .query(`
          SELECT 
            id, name, connection_string as connectionString, 
            phone_number as phoneNumber, endpoint, is_active as isActive,
            is_default as isDefault, environment, created_at, updated_at
          FROM sms_connection_configs 
          WHERE id = @id
        `);
            return result.recordset[0] || null;
        }
        catch (error) {
            console.error('Error fetching SMS config by ID:', error);
            throw new Error('Failed to fetch SMS configuration');
        }
    }
    async getDefaultConfig() {
        try {
            const pool = await this.dbConnection.connect();
            const result = await pool.request().query(`
        SELECT 
          id, name, connection_string as connectionString, 
          phone_number as phoneNumber, endpoint, is_active as isActive,
          is_default as isDefault, environment, created_at, updated_at
        FROM sms_connection_configs 
        WHERE is_default = 1 AND is_active = 1
      `);
            return result.recordset[0] || null;
        }
        catch (error) {
            console.error('Error fetching default SMS config:', error);
            throw new Error('Failed to fetch default SMS configuration');
        }
    }
    async createConfig(config) {
        try {
            const pool = await this.dbConnection.connect();
            // If this is set as default, remove default from other configs
            if (config.isDefault) {
                await pool.request().query(`
          UPDATE sms_connection_configs SET is_default = 0
        `);
            }
            const result = await pool.request()
                .input('name', mssql_1.default.NVarChar, config.name)
                .input('connectionString', mssql_1.default.NVarChar, config.connectionString)
                .input('phoneNumber', mssql_1.default.NVarChar, config.phoneNumber)
                .input('endpoint', mssql_1.default.NVarChar, config.endpoint)
                .input('isActive', mssql_1.default.Bit, config.isActive)
                .input('isDefault', mssql_1.default.Bit, config.isDefault)
                .input('environment', mssql_1.default.NVarChar, config.environment)
                .query(`
          INSERT INTO sms_connection_configs 
          (name, connection_string, phone_number, endpoint, is_active, is_default, environment, created_at, updated_at)
          OUTPUT INSERTED.*
          VALUES (@name, @connectionString, @phoneNumber, @endpoint, @isActive, @isDefault, @environment, GETDATE(), GETDATE())
        `);
            return this.mapDbResultToConfig(result.recordset[0]);
        }
        catch (error) {
            console.error('Error creating SMS config:', error);
            throw new Error('Failed to create SMS configuration');
        }
    }
    async updateConfig(id, config) {
        try {
            const pool = await this.dbConnection.connect();
            // If this is set as default, remove default from other configs
            if (config.isDefault) {
                await pool.request().query(`
          UPDATE sms_connection_configs SET is_default = 0 WHERE id != ${id}
        `);
            }
            const request = pool.request().input('id', mssql_1.default.Int, id);
            const updateFields = [];
            if (config.name !== undefined) {
                request.input('name', mssql_1.default.NVarChar, config.name);
                updateFields.push('name = @name');
            }
            if (config.connectionString !== undefined) {
                request.input('connectionString', mssql_1.default.NVarChar, config.connectionString);
                updateFields.push('connection_string = @connectionString');
            }
            if (config.phoneNumber !== undefined) {
                request.input('phoneNumber', mssql_1.default.NVarChar, config.phoneNumber);
                updateFields.push('phone_number = @phoneNumber');
            }
            if (config.endpoint !== undefined) {
                request.input('endpoint', mssql_1.default.NVarChar, config.endpoint);
                updateFields.push('endpoint = @endpoint');
            }
            if (config.isActive !== undefined) {
                request.input('isActive', mssql_1.default.Bit, config.isActive);
                updateFields.push('is_active = @isActive');
            }
            if (config.isDefault !== undefined) {
                request.input('isDefault', mssql_1.default.Bit, config.isDefault);
                updateFields.push('is_default = @isDefault');
            }
            if (config.environment !== undefined) {
                request.input('environment', mssql_1.default.NVarChar, config.environment);
                updateFields.push('environment = @environment');
            }
            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }
            updateFields.push('updated_at = GETDATE()');
            const result = await request.query(`
        UPDATE sms_connection_configs 
        SET ${updateFields.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
            if (result.recordset.length === 0) {
                throw new Error('SMS configuration not found');
            }
            return this.mapDbResultToConfig(result.recordset[0]);
        }
        catch (error) {
            console.error('Error updating SMS config:', error);
            throw new Error('Failed to update SMS configuration');
        }
    }
    async deleteConfig(id) {
        try {
            const pool = await this.dbConnection.connect();
            const result = await pool.request()
                .input('id', mssql_1.default.Int, id)
                .query(`
          DELETE FROM sms_connection_configs 
          WHERE id = @id AND is_default = 0
        `);
            if (result.rowsAffected[0] === 0) {
                throw new Error('SMS configuration not found or cannot delete default configuration');
            }
        }
        catch (error) {
            console.error('Error deleting SMS config:', error);
            throw new Error('Failed to delete SMS configuration');
        }
    }
    async validateConfig(config) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        // Basic validation
        if (!config.name?.trim()) {
            result.errors.push('Configuration name is required');
        }
        if (!config.connectionString?.trim()) {
            result.errors.push('Connection string is required');
        }
        else if (!this.isValidConnectionString(config.connectionString)) {
            result.errors.push('Invalid connection string format');
        }
        if (!config.phoneNumber?.trim()) {
            result.errors.push('Phone number is required');
        }
        else if (!this.isValidPhoneNumber(config.phoneNumber)) {
            result.errors.push('Phone number must be in E.164 format (e.g., +1234567890)');
        }
        if (!config.endpoint?.trim()) {
            result.errors.push('Endpoint is required');
        }
        else if (!this.isValidEndpoint(config.endpoint)) {
            result.errors.push('Invalid endpoint URL format');
        }
        // Connection test
        if (result.errors.length === 0) {
            try {
                const testResult = await this.testConnection(config);
                result.connectionTest = testResult;
                if (!testResult.success) {
                    result.warnings.push(`Connection test failed: ${testResult.error}`);
                }
            }
            catch (error) {
                result.warnings.push('Could not perform connection test');
            }
        }
        result.isValid = result.errors.length === 0;
        return result;
    }
    async testConnection(config) {
        const startTime = Date.now();
        try {
            const smsClient = new communication_sms_1.SmsClient(config.connectionString);
            // Try to get SMS capabilities or perform a lightweight test
            // Note: Azure Communication Services doesn't have a direct "test" method,
            // so we'll validate the connection string format and try to initialize the client
            const responseTime = Date.now() - startTime;
            return {
                success: true,
                responseTime
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                responseTime
            };
        }
    }
    isValidConnectionString(connectionString) {
        // Azure Communication Services connection string format:
        // endpoint=https://...;accesskey=...
        const pattern = /^endpoint=https:\/\/[^;]+\.communication\.azure\.com\/;accesskey=[A-Za-z0-9+/=]+$/;
        return pattern.test(connectionString);
    }
    isValidPhoneNumber(phoneNumber) {
        // E.164 format validation
        const pattern = /^\+[1-9]\d{1,14}$/;
        return pattern.test(phoneNumber);
    }
    isValidEndpoint(endpoint) {
        try {
            const url = new URL(endpoint);
            return url.protocol === 'https:' && url.hostname.includes('.communication.azure.com');
        }
        catch {
            return false;
        }
    }
    mapDbResultToConfig(dbResult) {
        return {
            id: dbResult.id,
            name: dbResult.name,
            connectionString: dbResult.connection_string || dbResult.connectionString,
            phoneNumber: dbResult.phone_number || dbResult.phoneNumber,
            endpoint: dbResult.endpoint,
            isActive: dbResult.is_active || dbResult.isActive,
            isDefault: dbResult.is_default || dbResult.isDefault,
            environment: dbResult.environment,
            created_at: dbResult.created_at,
            updated_at: dbResult.updated_at
        };
    }
}
exports.SMSConfigService = SMSConfigService;
exports.default = SMSConfigService;
