import express from 'express';
import DatabaseService, { DatabaseConfig } from '../services/databaseService';
import { enhancedAuthMiddleware, requireSuperAdmin } from '../middleware/adminAuth';

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: 'user' | 'admin' | 'super_admin';
  };
}

const router = express.Router();

// Apply authentication and super admin middleware to all routes
router.use(enhancedAuthMiddleware);
router.use(requireSuperAdmin);

// GET /api/database/status - Get current database status
router.get('/status', async (req, res) => {
  try {
    const dbService = DatabaseService.getInstance();
    const currentMode = dbService.getCurrentMode();
    const currentConfig = dbService.getCurrentConfig();
    const availableConfigs = Array.from(dbService.getDatabaseConfigs().entries()).map(([id, config]) => ({
      id,
      name: config.name,
      environment: config.environment,
      description: config.description
    }));
    
    res.json({
      success: true,
      data: {
        currentMode,
        currentConfig: currentConfig ? {
          name: currentConfig.name,
          environment: currentConfig.environment,
          server: currentConfig.server,
          database: currentConfig.database
        } : null,
        availableConfigs,
        isConnected: currentMode !== 'mock',
        message: currentMode === 'mock' 
          ? 'Using mock database for demo purposes' 
          : `Connected to ${currentConfig?.name || 'SQL Database'}`
      }
    });
  } catch (error) {
    console.error('Error getting database status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database status'
    });
  }
});

// POST /api/database/provision - Add new database configuration
router.post('/provision', async (req, res) => {
  try {
    const { configId, server, database, user, password, environment, name, description } = req.body;

    if (!configId || !server || !database || !user || !password || !environment || !name) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: configId, server, database, user, password, environment, name'
      });
    }

    if (!['demo', 'test', 'production'].includes(environment)) {
      return res.status(400).json({
        success: false,
        error: 'Environment must be one of: demo, test, production'
      });
    }

    const config: DatabaseConfig = {
      server,
      database,
      user,
      password,
      environment: environment as 'demo' | 'test' | 'production',
      name,
      description,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectionTimeout: 30000,
        requestTimeout: 30000
      },
      pool: {
        max: environment === 'production' ? 10 : 5,
        min: 0,
        idleTimeoutMillis: 30000
      }
    };

    const dbService = DatabaseService.getInstance();
    const isValid = await dbService.addDatabaseConfig(configId, config);

    if (isValid) {
      res.json({
        success: true,
        message: `Database configuration '${name}' added successfully`,
        data: {
          configId,
          name,
          environment,
          server,
          database
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Database configuration test failed. Please check your credentials and server settings.'
      });
    }
  } catch (error) {
    console.error('Database provision error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to provision database: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// POST /api/database/test-connection - Test Azure SQL connection
router.post('/test-connection', async (req, res) => {
  try {
    const { server, database, user, password } = req.body;

    if (!server || !database || !user || !password) {
      return res.status(400).json({
        success: false,
        error: 'All database connection fields are required'
      });
    }

    const config: DatabaseConfig = {
      server,
      database,
      user,
      password,
      environment: 'test',
      name: 'Test Connection',
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
    };

    const dbService = DatabaseService.getInstance();
    const isValid = await dbService.setAzureConfig(config);

    if (isValid) {
      res.json({
        success: true,
        message: 'Database connection test successful',
        data: {
          server,
          database,
          connectionTime: new Date().toISOString()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Database connection test failed. Please check your credentials and server settings.'
      });
    }
  } catch (error) {
    console.error('Database connection test error:', error);
    res.status(500).json({
      success: false,
      error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// POST /api/database/switch - Switch to specific database environment
router.post('/switch', async (req, res) => {
  try {
    const { environmentId } = req.body;

    if (!environmentId) {
      return res.status(400).json({
        success: false,
        error: 'Environment ID is required'
      });
    }

    const dbService = DatabaseService.getInstance();
    
    if (environmentId === 'mock') {
      dbService.switchToMock();
      res.json({
        success: true,
        message: 'Successfully switched to Mock Database (Demo Mode)',
        data: {
          currentMode: 'mock',
          switchedAt: new Date().toISOString()
        }
      });
      return;
    }

    const success = await dbService.switchToEnvironment(environmentId);
    const currentConfig = dbService.getCurrentConfig();

    if (success && currentConfig) {
      res.json({
        success: true,
        message: `Successfully switched to ${currentConfig.name}`,
        data: {
          currentMode: currentConfig.environment,
          configName: currentConfig.name,
          switchedAt: new Date().toISOString()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Failed to switch to ${environmentId}. Please check configuration.`
      });
    }
  } catch (error) {
    console.error('Database switch error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to switch database: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// POST /api/database/switch-to-azure - Switch to Azure SQL database (legacy)
router.post('/switch-to-azure', async (req, res) => {
  try {
    const dbService = DatabaseService.getInstance();
    const success = await dbService.switchToAzure();

    if (success) {
      res.json({
        success: true,
        message: 'Successfully switched to Azure SQL Database',
        data: {
          currentMode: dbService.getCurrentMode(),
          switchedAt: new Date().toISOString()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to switch to Azure SQL. Please test connection first.'
      });
    }
  } catch (error) {
    console.error('Database switch error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to switch database: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// POST /api/database/switch-to-mock - Switch to mock database
router.post('/switch-to-mock', async (req, res) => {
  try {
    const dbService = DatabaseService.getInstance();
    dbService.switchToMock();

    res.json({
      success: true,
      message: 'Successfully switched to Mock Database (Demo Mode)',
      data: {
        currentMode: 'mock',
        switchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Database switch error:', error);
    res.status(500).json({
      success: false,
      error: `Failed to switch database: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// POST /api/database/migrate - Migrate data from mock to Azure SQL
router.post('/migrate', async (req, res) => {
  try {
    const dbService = DatabaseService.getInstance();
    
    if (dbService.getCurrentMode() === 'mock') {
      return res.status(400).json({
        success: false,
        error: 'Must be connected to SQL database to perform migration'
      });
    }

    const result = await dbService.migrateFromMockToAzure();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.details
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message,
        details: result.details
      });
    }
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// GET /api/database/backup - Create database backup (placeholder)
router.post('/backup', async (req, res) => {
  try {
    const dbService = DatabaseService.getInstance();
    const currentMode = dbService.getCurrentMode();
    
    if (currentMode === 'mock') {
      return res.status(400).json({
        success: false,
        error: 'Cannot backup mock database. Switch to Azure SQL first.'
      });
    }

    // In a real implementation, you would trigger an actual backup process
    const backupId = `backup_${Date.now()}`;
    
    res.json({
      success: true,
      message: 'Database backup initiated successfully',
      data: {
        backupId,
        status: 'initiated',
        timestamp: new Date().toISOString(),
        note: 'This is a placeholder. Implement actual backup logic based on your Azure SQL setup.'
      }
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({
      success: false,
      error: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// GET /api/database/health - Comprehensive database health check
router.get('/health', async (req, res) => {
  try {
    const dbService = DatabaseService.getInstance();
    const currentMode = dbService.getCurrentMode();
    
    let healthData: any = {
      mode: currentMode,
      timestamp: new Date().toISOString()
    };

    if (currentMode === 'mock') {
      // Mock database health
      const stats = await dbService.getSystemStats();
      healthData = {
        ...healthData,
        status: 'healthy',
        type: 'Mock Database (Demo Mode)',
        userCount: stats.users.total,
        connectionStatus: 'active'
      };
    } else {
      // Azure SQL health check
      try {
        const stats = await dbService.getSystemStats();
        healthData = {
          ...healthData,
          status: 'healthy',
          type: 'Azure SQL Database',
          userCount: stats.users.total,
          connectionStatus: 'active',
          lastChecked: new Date().toISOString()
        };
      } catch (error) {
        healthData = {
          ...healthData,
          status: 'unhealthy',
          type: 'Azure SQL Database',
          connectionStatus: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    res.json({
      success: true,
      data: healthData
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

export default router;