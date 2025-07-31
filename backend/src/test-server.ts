import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic test route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Test server is running!',
    timestamp: new Date().toISOString()
  });
});

// Test auth route
app.post('/test-register', (req, res) => {
  const { username, email } = req.body;
  res.json({
    success: true,
    message: 'Test registration endpoint working',
    data: { username, email }
  });
});

app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log(`🔗 Try: http://localhost:${PORT}/health`);
});