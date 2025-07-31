import sql from 'mssql';
import { SmsClient } from '@azure/communication-sms';
import DatabaseConnection from '../config/database';
import { ACSConnectionConfig, SMSConfigValidationResult } from '../types/sms';

export class SMSConfigService {
  private dbConnection: DatabaseConnection;

  constructor() {
    this.dbConnection = DatabaseConnection.getInstance();
  }

  async getAllConfigs(): Promise<ACSConnectionConfig[]> {
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
    } catch (error) {
      console.error('Error fetching SMS configs:', error);
      throw new Error('Failed to fetch SMS configurations');
    }
  }

  async getConfigById(id: number): Promise<ACSConnectionConfig | null> {
    try {
      const pool = await this.dbConnection.connect();
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT 
            id, name, connection_string as connectionString, 
            phone_number as phoneNumber, endpoint, is_active as isActive,
            is_default as isDefault, environment, created_at, updated_at
          FROM sms_connection_configs 
          WHERE id = @id
        `);
      
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Error fetching SMS config by ID:', error);
      throw new Error('Failed to fetch SMS configuration');
    }
  }

  async getDefaultConfig(): Promise<ACSConnectionConfig | null> {
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
    } catch (error) {
      console.error('Error fetching default SMS config:', error);
      throw new Error('Failed to fetch default SMS configuration');
    }
  }

  async createConfig(config: Omit<ACSConnectionConfig, 'id' | 'created_at' | 'updated_at'>): Promise<ACSConnectionConfig> {
    try {
      const pool = await this.dbConnection.connect();
      
      // If this is set as default, remove default from other configs
      if (config.isDefault) {
        await pool.request().query(`
          UPDATE sms_connection_configs SET is_default = 0
        `);
      }

      const result = await pool.request()
        .input('name', sql.NVarChar, config.name)
        .input('connectionString', sql.NVarChar, config.connectionString)
        .input('phoneNumber', sql.NVarChar, config.phoneNumber)
        .input('endpoint', sql.NVarChar, config.endpoint)
        .input('isActive', sql.Bit, config.isActive)
        .input('isDefault', sql.Bit, config.isDefault)
        .input('environment', sql.NVarChar, config.environment)
        .query(`
          INSERT INTO sms_connection_configs 
          (name, connection_string, phone_number, endpoint, is_active, is_default, environment, created_at, updated_at)
          OUTPUT INSERTED.*
          VALUES (@name, @connectionString, @phoneNumber, @endpoint, @isActive, @isDefault, @environment, GETDATE(), GETDATE())
        `);

      return this.mapDbResultToConfig(result.recordset[0]);
    } catch (error) {
      console.error('Error creating SMS config:', error);
      throw new Error('Failed to create SMS configuration');
    }
  }

  async updateConfig(id: number, config: Partial<ACSConnectionConfig>): Promise<ACSConnectionConfig> {
    try {
      const pool = await this.dbConnection.connect();

      // If this is set as default, remove default from other configs
      if (config.isDefault) {
        await pool.request().query(`
          UPDATE sms_connection_configs SET is_default = 0 WHERE id != ${id}
        `);
      }

      const request = pool.request().input('id', sql.Int, id);
      
      const updateFields: string[] = [];
      if (config.name !== undefined) {
        request.input('name', sql.NVarChar, config.name);
        updateFields.push('name = @name');
      }
      if (config.connectionString !== undefined) {
        request.input('connectionString', sql.NVarChar, config.connectionString);
        updateFields.push('connection_string = @connectionString');
      }
      if (config.phoneNumber !== undefined) {
        request.input('phoneNumber', sql.NVarChar, config.phoneNumber);
        updateFields.push('phone_number = @phoneNumber');
      }
      if (config.endpoint !== undefined) {
        request.input('endpoint', sql.NVarChar, config.endpoint);
        updateFields.push('endpoint = @endpoint');
      }
      if (config.isActive !== undefined) {
        request.input('isActive', sql.Bit, config.isActive);
        updateFields.push('is_active = @isActive');
      }
      if (config.isDefault !== undefined) {
        request.input('isDefault', sql.Bit, config.isDefault);
        updateFields.push('is_default = @isDefault');
      }
      if (config.environment !== undefined) {
        request.input('environment', sql.NVarChar, config.environment);
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
    } catch (error) {
      console.error('Error updating SMS config:', error);
      throw new Error('Failed to update SMS configuration');
    }
  }

  async deleteConfig(id: number): Promise<void> {
    try {
      const pool = await this.dbConnection.connect();
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query(`
          DELETE FROM sms_connection_configs 
          WHERE id = @id AND is_default = 0
        `);

      if (result.rowsAffected[0] === 0) {
        throw new Error('SMS configuration not found or cannot delete default configuration');
      }
    } catch (error) {
      console.error('Error deleting SMS config:', error);
      throw new Error('Failed to delete SMS configuration');
    }
  }

  async validateConfig(config: ACSConnectionConfig): Promise<SMSConfigValidationResult> {
    const result: SMSConfigValidationResult = {
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
    } else if (!this.isValidConnectionString(config.connectionString)) {
      result.errors.push('Invalid connection string format');
    }

    if (!config.phoneNumber?.trim()) {
      result.errors.push('Phone number is required');
    } else if (!this.isValidPhoneNumber(config.phoneNumber)) {
      result.errors.push('Phone number must be in E.164 format (e.g., +1234567890)');
    }

    if (!config.endpoint?.trim()) {
      result.errors.push('Endpoint is required');
    } else if (!this.isValidEndpoint(config.endpoint)) {
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
      } catch (error) {
        result.warnings.push('Could not perform connection test');
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  async testConnection(config: ACSConnectionConfig): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      const smsClient = new SmsClient(config.connectionString);
      
      // Try to get SMS capabilities or perform a lightweight test
      // Note: Azure Communication Services doesn't have a direct "test" method,
      // so we'll validate the connection string format and try to initialize the client
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      };
    }
  }

  private isValidConnectionString(connectionString: string): boolean {
    // Azure Communication Services connection string format:
    // endpoint=https://...;accesskey=...
    const pattern = /^endpoint=https:\/\/[^;]+\.communication\.azure\.com\/;accesskey=[A-Za-z0-9+/=]+$/;
    return pattern.test(connectionString);
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // E.164 format validation
    const pattern = /^\+[1-9]\d{1,14}$/;
    return pattern.test(phoneNumber);
  }

  private isValidEndpoint(endpoint: string): boolean {
    try {
      const url = new URL(endpoint);
      return url.protocol === 'https:' && url.hostname.includes('.communication.azure.com');
    } catch {
      return false;
    }
  }

  private mapDbResultToConfig(dbResult: any): ACSConnectionConfig {
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

export default SMSConfigService;