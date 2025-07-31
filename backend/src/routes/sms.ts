import express from 'express';
import { SMSService } from '../services/smsService';
import { SendSMSRequest } from '../types/sms';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();
const smsService = new SMSService();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// POST /api/sms/send - Send SMS using configured service
router.post('/send', async (req, res) => {
  try {
    const { to, message, configId } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    const request: SendSMSRequest = {
      to,
      message,
      configId
    };

    const result = await smsService.sendSMS(request);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }

  } catch (error) {
    console.error('SMS API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while sending SMS'
    });
  }
});

// GET /api/sms/logs - Get SMS message logs
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const configId = req.query.configId ? parseInt(req.query.configId as string) : undefined;

    let logs;
    if (configId) {
      logs = await smsService.getMessageLogsByConfig(configId, limit);
    } else {
      logs = await smsService.getMessageLogs(limit, offset);
    }

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching SMS logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS logs'
    });
  }
});

// GET /api/sms/stats - Get SMS statistics
router.get('/stats', async (req, res) => {
  try {
    const configId = req.query.configId ? parseInt(req.query.configId as string) : undefined;
    const stats = await smsService.getMessageStats(configId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching SMS stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS statistics'
    });
  }
});

// POST /api/sms/send-bulk - Send SMS to multiple recipients
router.post('/send-bulk', async (req, res) => {
  try {
    const { recipients, message, configId } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recipients array is required and must not be empty'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    if (recipients.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 recipients allowed per request'
      });
    }

    const results = [];
    const errors = [];

    // Send SMS to each recipient
    for (const recipient of recipients) {
      try {
        const request: SendSMSRequest = {
          to: recipient,
          message,
          configId
        };

        const result = await smsService.sendSMS(request);
        results.push({
          to: recipient,
          ...result
        });
      } catch (error) {
        errors.push({
          to: recipient,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount + errors.length;

    res.json({
      success: errors.length === 0 && failureCount === 0,
      data: {
        results,
        errors,
        summary: {
          total: recipients.length,
          successful: successCount,
          failed: failureCount
        }
      }
    });

  } catch (error) {
    console.error('Bulk SMS API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while sending bulk SMS'
    });
  }
});

export default router;