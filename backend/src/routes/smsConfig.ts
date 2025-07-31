import express from 'express';
import { SMSConfigService } from '../services/smsConfigService';
import { ACSConnectionConfig } from '../types/sms';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin, enhancedAuthMiddleware } from '../middleware/adminAuth';

const router = express.Router();
const smsConfigService = new SMSConfigService();

// Apply authentication and admin middleware to all routes
router.use(enhancedAuthMiddleware);
router.use(requireAdmin);

// GET /api/sms-config - Get all SMS configurations
router.get('/', async (req, res) => {
  try {
    const configs = await smsConfigService.getAllConfigs();
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Error fetching SMS configs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS configurations'
    });
  }
});

// GET /api/sms-config/default - Get default SMS configuration
router.get('/default', async (req, res) => {
  try {
    const config = await smsConfigService.getDefaultConfig();
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'No default SMS configuration found'
      });
    }
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching default SMS config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default SMS configuration'
    });
  }
});

// GET /api/sms-config/:id - Get SMS configuration by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration ID'
      });
    }

    const config = await smsConfigService.getConfigById(id);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'SMS configuration not found'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching SMS config by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS configuration'
    });
  }
});

// POST /api/sms-config - Create new SMS configuration
router.post('/', async (req, res) => {
  try {
    const configData: Omit<ACSConnectionConfig, 'id' | 'created_at' | 'updated_at'> = {
      name: req.body.name,
      connectionString: req.body.connectionString,
      phoneNumber: req.body.phoneNumber,
      endpoint: req.body.endpoint,
      isActive: req.body.isActive ?? true,
      isDefault: req.body.isDefault ?? false,
      environment: req.body.environment || 'development'
    };

    // Validate the configuration
    const validation = await smsConfigService.validateConfig(configData as ACSConnectionConfig);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration',
        details: {
          errors: validation.errors,
          warnings: validation.warnings
        }
      });
    }

    const config = await smsConfigService.createConfig(configData);
    res.status(201).json({
      success: true,
      data: config,
      validation: validation
    });
  } catch (error) {
    console.error('Error creating SMS config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create SMS configuration'
    });
  }
});

// PUT /api/sms-config/:id - Update SMS configuration
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration ID'
      });
    }

    const updates: Partial<ACSConnectionConfig> = {};
    
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.connectionString !== undefined) updates.connectionString = req.body.connectionString;
    if (req.body.phoneNumber !== undefined) updates.phoneNumber = req.body.phoneNumber;
    if (req.body.endpoint !== undefined) updates.endpoint = req.body.endpoint;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
    if (req.body.isDefault !== undefined) updates.isDefault = req.body.isDefault;
    if (req.body.environment !== undefined) updates.environment = req.body.environment;

    // Get the current config to validate the complete configuration
    const currentConfig = await smsConfigService.getConfigById(id);
    if (!currentConfig) {
      return res.status(404).json({
        success: false,
        error: 'SMS configuration not found'
      });
    }

    const updatedConfigForValidation = { ...currentConfig, ...updates };
    const validation = await smsConfigService.validateConfig(updatedConfigForValidation);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration updates',
        details: {
          errors: validation.errors,
          warnings: validation.warnings
        }
      });
    }

    const config = await smsConfigService.updateConfig(id, updates);
    res.json({
      success: true,
      data: config,
      validation: validation
    });
  } catch (error) {
    console.error('Error updating SMS config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update SMS configuration'
    });
  }
});

// DELETE /api/sms-config/:id - Delete SMS configuration
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration ID'
      });
    }

    await smsConfigService.deleteConfig(id);
    res.json({
      success: true,
      message: 'SMS configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting SMS config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete SMS configuration'
    });
  }
});

// POST /api/sms-config/:id/test - Test SMS configuration
router.post('/:id/test', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration ID'
      });
    }

    const config = await smsConfigService.getConfigById(id);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'SMS configuration not found'
      });
    }

    const testResult = await smsConfigService.testConnection(config);
    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    console.error('Error testing SMS config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test SMS configuration'
    });
  }
});

// POST /api/sms-config/validate - Validate SMS configuration without saving
router.post('/validate', async (req, res) => {
  try {
    const configData: ACSConnectionConfig = {
      name: req.body.name,
      connectionString: req.body.connectionString,
      phoneNumber: req.body.phoneNumber,
      endpoint: req.body.endpoint,
      isActive: req.body.isActive ?? true,
      isDefault: req.body.isDefault ?? false,
      environment: req.body.environment || 'development'
    };

    const validation = await smsConfigService.validateConfig(configData);
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating SMS config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate SMS configuration'
    });
  }
});

export default router;