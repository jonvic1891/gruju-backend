import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
// import DatabaseConnection from './config/database'; // Disabled for demo
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import childrenRoutes from './routes/children';
import activitiesRoutes from './routes/activities';
import calendarRoutes from './routes/calendar';
import connectionsRoutes from './routes/connections';
import adminRoutes from './routes/admin';
import smsRoutes from './routes/sms';
import databaseRoutes from './routes/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000', 
      'http://localhost:3001',
      'http://127.0.0.1:3001'
    ];
    
    // Allow file:// protocol for local HTML files
    if (origin.startsWith('file://') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(null, true); // Allow all for development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get('/health', async (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Parent Activity App API is running (Demo Mode)',
    database: 'mock-database'
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/children', childrenRoutes);
app.use('/activities', activitiesRoutes);
app.use('/calendar', calendarRoutes);
app.use('/connections', connectionsRoutes);
app.use('/admin', adminRoutes);
app.use('/sms', smsRoutes);
app.use('/database', databaseRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Parent Activity App API is running on port ${PORT}`);
  console.log(`📊 Using mock database for demo purposes`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;