import { SmsClient } from '@azure/communication-sms';
import sql from 'mssql';
import DatabaseConnection from '../config/database';
import { SMSConfigService } from './smsConfigService';
import { SendSMSRequest, SendSMSResponse, SMSMessageLog } from '../types/sms';

export class SMSService {
  private dbConnection: DatabaseConnection;
  private smsConfigService: SMSConfigService;

  constructor() {
    this.dbConnection = DatabaseConnection.getInstance();
    this.smsConfigService = new SMSConfigService();
  }

  async sendSMS(request: SendSMSRequest): Promise<SendSMSResponse> {
    try {
      // Get SMS configuration
      const config = request.configId 
        ? await this.smsConfigService.getConfigById(request.configId)
        : await this.smsConfigService.getDefaultConfig();

      if (!config) {
        throw new Error('No SMS configuration available');
      }

      if (!config.isActive) {
        throw new Error('SMS configuration is not active');
      }

      // Initialize SMS client
      const smsClient = new SmsClient(config.connectionString);

      // Clean and format phone number
      const phoneNumber = this.formatPhoneNumber(request.to);
      
      // Send SMS
      const sendResults = await smsClient.send({
        from: config.phoneNumber,
        to: [phoneNumber],
        message: request.message
      });

      const result = sendResults[0];
      
      // Log the message
      await this.logMessage({
        connectionConfigId: config.id!,
        to: phoneNumber,
        message: request.message,
        messageId: result.messageId,
        status: result.successful ? 'sent' : 'failed',
        errorMessage: result.successful ? undefined : result.errorMessage,
        sent_at: new Date().toISOString()
      });

      if (result.successful) {
        return {
          success: true,
          messageId: result.messageId,
          deliveryStatus: 'sent'
        };
      } else {
        return {
          success: false,
          error: result.errorMessage || 'Failed to send SMS'
        };
      }

    } catch (error) {
      console.error('SMS sending error:', error);
      
      // Log failed attempt if we have config info
      try {
        const config = request.configId 
          ? await this.smsConfigService.getConfigById(request.configId)
          : await this.smsConfigService.getDefaultConfig();
          
        if (config) {
          await this.logMessage({
            connectionConfigId: config.id!,
            to: request.to,
            message: request.message,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            sent_at: new Date().toISOString()
          });
        }
      } catch (logError) {
        console.error('Failed to log SMS error:', logError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS'
      };
    }
  }

  async getMessageLogs(limit: number = 100, offset: number = 0): Promise<SMSMessageLog[]> {
    try {
      const pool = await this.dbConnection.connect();
      const result = await pool.request()
        .input('limit', sql.Int, limit)
        .input('offset', sql.Int, offset)
        .query(`
          SELECT 
            sml.id, 
            sml.connection_config_id as connectionConfigId,
            sml.to_number as to,
            sml.message,
            sml.message_id as messageId,
            sml.status,
            sml.error_message as errorMessage,
            sml.sent_at
          FROM sms_message_logs sml
          ORDER BY sml.sent_at DESC
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('Error fetching message logs:', error);
      throw new Error('Failed to fetch message logs');
    }
  }

  async getMessageLogsByConfig(configId: number, limit: number = 100): Promise<SMSMessageLog[]> {
    try {
      const pool = await this.dbConnection.connect();
      const result = await pool.request()
        .input('configId', sql.Int, configId)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT 
            sml.id, 
            sml.connection_config_id as connectionConfigId,
            sml.to_number as to,
            sml.message,
            sml.message_id as messageId,
            sml.status,
            sml.error_message as errorMessage,
            sml.sent_at
          FROM sms_message_logs sml
          WHERE sml.connection_config_id = @configId
          ORDER BY sml.sent_at DESC
          OFFSET 0 ROWS
          FETCH NEXT @limit ROWS ONLY
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('Error fetching message logs by config:', error);
      throw new Error('Failed to fetch message logs');
    }
  }

  private async logMessage(logData: Omit<SMSMessageLog, 'id'>): Promise<void> {
    try {
      const pool = await this.dbConnection.connect();
      await pool.request()
        .input('connectionConfigId', sql.Int, logData.connectionConfigId)
        .input('to', sql.NVarChar, logData.to)
        .input('message', sql.NVarChar, logData.message)
        .input('messageId', sql.NVarChar, logData.messageId)
        .input('status', sql.NVarChar, logData.status)
        .input('errorMessage', sql.NVarChar, logData.errorMessage)
        .input('sentAt', sql.DateTime, new Date(logData.sent_at))
        .query(`
          INSERT INTO sms_message_logs 
          (connection_config_id, to_number, message, message_id, status, error_message, sent_at)
          VALUES (@connectionConfigId, @to, @message, @messageId, @status, @errorMessage, @sentAt)
        `);
    } catch (error) {
      console.error('Error logging SMS message:', error);
      // Don't throw here as it shouldn't fail the main SMS operation
    }
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Add +1 if it doesn't start with +
    if (!cleaned.startsWith('+')) {
      return `+1${cleaned}`;
    }
    
    return cleaned;
  }

  async getMessageStats(configId?: number): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    lastDay: number;
    lastWeek: number;
    lastMonth: number;
  }> {
    try {
      const pool = await this.dbConnection.connect();
      const request = pool.request();
      
      let whereClause = '';
      if (configId) {
        request.input('configId', sql.Int, configId);
        whereClause = 'WHERE connection_config_id = @configId';
      }

      const result = await request.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN sent_at >= DATEADD(day, -1, GETDATE()) THEN 1 ELSE 0 END) as lastDay,
          SUM(CASE WHEN sent_at >= DATEADD(week, -1, GETDATE()) THEN 1 ELSE 0 END) as lastWeek,
          SUM(CASE WHEN sent_at >= DATEADD(month, -1, GETDATE()) THEN 1 ELSE 0 END) as lastMonth
        FROM sms_message_logs
        ${whereClause}
      `);

      return result.recordset[0] || {
        total: 0, sent: 0, failed: 0, pending: 0,
        lastDay: 0, lastWeek: 0, lastMonth: 0
      };
    } catch (error) {
      console.error('Error fetching message stats:', error);
      throw new Error('Failed to fetch message statistics');
    }
  }
}

export default SMSService;