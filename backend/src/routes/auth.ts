import express from 'express';
import bcrypt from 'bcryptjs';
import { generateAccessToken } from '../middleware/auth';
import DatabaseService from '../services/databaseService';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;
    const dbService = DatabaseService.getInstance();

    // Validate input
    if (!username || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if email already exists
    const existingUser = await dbService.findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await dbService.createUser({
      username,
      email,
      phone,
      password_hash: passwordHash,
      role: 'user',
      is_active: true,
    });

    // Generate token
    const token = generateAccessToken(newUser.id, email, newUser.role);

    const { password_hash, ...userResponse } = newUser;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        token,
        user: userResponse,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const dbService = DatabaseService.getInstance();

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user with password hash
    const user = await dbService.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password - allow demo123 for demo accounts
    let isPasswordValid = false;
    
    if (user.password_hash === '$2a$12$dummy.hash.for.demo.purposes' && password === 'demo123') {
      // Demo mode - accept demo123 password
      isPasswordValid = true;
    } else {
      // Regular password verification
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateAccessToken(user.id, user.email, user.role);

    // Remove password hash from response
    const { password_hash, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userResponse,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token (for checking if user is still authenticated)
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, jwtSecret);

    // Get current user data
    const dbService = DatabaseService.getInstance();
    const user = await dbService.findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { password_hash, ...userResponse } = user;

    res.json({
      success: true,
      data: {
        user: userResponse,
        tokenValid: true,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Password reset request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const dbService = DatabaseService.getInstance();
    const user = await dbService.findUserByEmail(email);

    if (!user) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent',
      });
    }

    // TODO: Implement email sending for password reset
    // For now, just return success
    res.json({
      success: true,
      message: 'Password reset functionality will be implemented',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;