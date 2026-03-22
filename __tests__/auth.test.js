const request = require('supertest');
const express = require('express');

// Mock the database module
jest.mock('../server/db', () => ({
  get: jest.fn(),
  run: jest.fn(),
  all: jest.fn(),
}));

const db = require('../server/db');

describe('Authentication', () => {
  let app;
  let JWT_SECRET;

  beforeEach(() => {
    JWT_SECRET = process.env.JWT_SECRET || 'aura-demo-secret-key-change-in-production';
    
    // Create a minimal express app for testing
    app = express();
    app.use(express.json());
    
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', database: 'connected' });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('connected');
    });
  });

  describe('Login Validation', () => {
    test('should require email and password', async () => {
      // Test login endpoint validation
      app.post('/api/auth/login', (req, res) => {
        const { email, password } = req.body;
        
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }
        
        res.json({ message: 'Login endpoint reached' });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);
      
      expect(response.body.error).toBe('Email and password are required');
    });

    test('should validate email format', async () => {
      app.post('/api/auth/login', (req, res) => {
        const { email } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Invalid email format' });
        }
        
        res.json({ message: 'Email format valid' });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400);
      
      expect(response.body.error).toBe('Invalid email format');
    });

    test('should accept valid email format', async () => {
      app.post('/api/auth/login', (req, res) => {
        const { email } = req.body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: 'Invalid email format' });
        }
        
        res.json({ message: 'Email format valid' });
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(200);
      
      expect(response.body.message).toBe('Email format valid');
    });
  });

  describe('JWT Token', () => {
    const jwt = require('jsonwebtoken');

    test('should generate valid JWT token', () => {
      const payload = { id: 1, email: 'test@example.com', role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.id).toBe(1);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('user');
    });

    test('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        jwt.verify(invalidToken, JWT_SECRET);
      }).toThrow();
    });

    test('JWT token should contain expiration', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
      const decoded = jwt.decode(token);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });

  describe('Authorization Middleware', () => {
    const jwt = require('jsonwebtoken');

    test('should reject requests without token', async () => {
      app.get('/api/protected', (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
          return res.status(401).json({ error: 'Access token required' });
        }
        
        next();
      }, (req, res) => {
        res.json({ message: 'Protected data' });
      });

      const response = await request(app)
        .get('/api/protected')
        .expect(401);
      
      expect(response.body.error).toBe('Access token required');
    });

    test('should reject requests with invalid token', async () => {
      app.get('/api/protected', (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
          return res.status(401).json({ error: 'Access token required' });
        }
        
        try {
          jwt.verify(token, JWT_SECRET);
          next();
        } catch (err) {
          return res.status(403).json({ error: 'Invalid or expired token' });
        }
      }, (req, res) => {
        res.json({ message: 'Protected data' });
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);
      
      expect(response.body.error).toBe('Invalid or expired token');
    });

    test('should accept requests with valid token', async () => {
      const token = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'user' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      app.get('/api/protected', (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
          return res.status(401).json({ error: 'Access token required' });
        }
        
        try {
          const user = jwt.verify(token, JWT_SECRET);
          req.user = user;
          next();
        } catch (err) {
          return res.status(403).json({ error: 'Invalid or expired token' });
        }
      }, (req, res) => {
        res.json({ message: 'Protected data', user: req.user });
      });

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.message).toBe('Protected data');
      expect(response.body.user.email).toBe('test@example.com');
    });
  });
});
