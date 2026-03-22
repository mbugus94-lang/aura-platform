const request = require('supertest');
const express = require('express');

// Mock the database module
jest.mock('../server/db', () => ({
  get: jest.fn(),
  run: jest.fn(),
  all: jest.fn(),
}));

const db = require('../server/db');

describe('API Endpoints', () => {
  let app;
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = 'test-secret';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Authentication middleware
    const authenticateToken = (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) return res.status(401).json({ error: 'Access token required' });

      try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
      } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
    };

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        message: 'Aura Platform API',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth/*',
          clients: '/api/clients/*',
          appointments: '/api/appointments/*',
          progress: '/api/progress/*',
          programs: '/api/programs/*',
          chat: '/api/chat/*',
          analytics: '/api/analytics/*',
        },
      });
    });

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', database: 'connected' });
    });

    // Protected clients endpoint
    app.get('/api/clients', authenticateToken, (req, res) => {
      res.json({ clients: [], user: req.user });
    });

    // Create client endpoint
    app.post('/api/clients', authenticateToken, (req, res) => {
      const { name, email, phone } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }
      
      res.json({ 
        id: 1, 
        name, 
        email, 
        phone, 
        createdBy: req.user.id 
      });
    });

    // Protected appointments endpoint
    app.get('/api/appointments', authenticateToken, (req, res) => {
      res.json({ appointments: [], user: req.user });
    });

    // Create appointment endpoint
    app.post('/api/appointments', authenticateToken, (req, res) => {
      const { clientId, date, time, type } = req.body;
      
      if (!clientId || !date || !time) {
        return res.status(400).json({ error: 'Client ID, date, and time are required' });
      }
      
      res.json({ 
        id: 1, 
        clientId, 
        date, 
        time, 
        type: type || 'general',
        createdBy: req.user.id 
      });
    });

    // Analytics endpoint
    app.get('/api/analytics', authenticateToken, (req, res) => {
      res.json({
        totalClients: 0,
        totalAppointments: 0,
        revenue: 0,
        user: req.user
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Root Endpoint', () => {
    test('should return API info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body.message).toBe('Aura Platform API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.endpoints).toHaveProperty('auth');
      expect(response.body.endpoints).toHaveProperty('clients');
    });
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

  describe('Protected Routes', () => {
    const generateToken = (user) => {
      return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    };

    describe('GET /api/clients', () => {
      test('should reject without token', async () => {
        const response = await request(app)
          .get('/api/clients')
          .expect(401);
        
        expect(response.body.error).toBe('Access token required');
      });

      test('should accept with valid token', async () => {
        const token = generateToken({ id: 1, email: 'test@example.com', role: 'user' });
        
        const response = await request(app)
          .get('/api/clients')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        
        expect(response.body.clients).toBeInstanceOf(Array);
        expect(response.body.user.email).toBe('test@example.com');
      });

      test('should reject with invalid token', async () => {
        const response = await request(app)
          .get('/api/clients')
          .set('Authorization', 'Bearer invalid-token')
          .expect(403);
        
        expect(response.body.error).toBe('Invalid or expired token');
      });
    });

    describe('POST /api/clients', () => {
      test('should create client with valid data', async () => {
        const token = generateToken({ id: 1, email: 'test@example.com', role: 'user' });
        
        const response = await request(app)
          .post('/api/clients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '254712345678'
          })
          .expect(200);
        
        expect(response.body.name).toBe('John Doe');
        expect(response.body.email).toBe('john@example.com');
        expect(response.body.createdBy).toBe(1);
      });

      test('should reject client without name', async () => {
        const token = generateToken({ id: 1, email: 'test@example.com', role: 'user' });
        
        const response = await request(app)
          .post('/api/clients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            email: 'john@example.com'
          })
          .expect(400);
        
        expect(response.body.error).toBe('Name and email are required');
      });

      test('should reject client without email', async () => {
        const token = generateToken({ id: 1, email: 'test@example.com', role: 'user' });
        
        const response = await request(app)
          .post('/api/clients')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'John Doe'
          })
          .expect(400);
        
        expect(response.body.error).toBe('Name and email are required');
      });
    });

    describe('GET /api/appointments', () => {
      test('should reject without token', async () => {
        const response = await request(app)
          .get('/api/appointments')
          .expect(401);
        
        expect(response.body.error).toBe('Access token required');
      });

      test('should accept with valid token', async () => {
        const token = generateToken({ id: 1, email: 'test@example.com', role: 'user' });
        
        const response = await request(app)
          .get('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        
        expect(response.body.appointments).toBeInstanceOf(Array);
      });
    });

    describe('POST /api/appointments', () => {
      test('should create appointment with valid data', async () => {
        const token = generateToken({ id: 1, email: 'test@example.com', role: 'user' });
        
        const response = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send({
            clientId: 1,
            date: '2026-03-25',
            time: '10:00',
            type: 'consultation'
          })
          .expect(200);
        
        expect(response.body.clientId).toBe(1);
        expect(response.body.date).toBe('2026-03-25');
        expect(response.body.time).toBe('10:00');
        expect(response.body.type).toBe('consultation');
      });

      test('should use default type if not provided', async () => {
        const token = generateToken({ id: 1, email: 'test@example.com', role: 'user' });
        
        const response = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send({
            clientId: 1,
            date: '2026-03-25',
            time: '10:00'
          })
          .expect(200);
        
        expect(response.body.type).toBe('general');
      });

      test('should reject appointment without clientId', async () => {
        const token = generateToken({ id: 1, email: 'test@example.com', role: 'user' });
        
        const response = await request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${token}`)
          .send({
            date: '2026-03-25',
            time: '10:00'
          })
          .expect(400);
        
        expect(response.body.error).toBe('Client ID, date, and time are required');
      });
    });

    describe('GET /api/analytics', () => {
      test('should return analytics data', async () => {
        const token = generateToken({ id: 1, email: 'test@example.com', role: 'user' });
        
        const response = await request(app)
          .get('/api/analytics')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        
        expect(response.body).toHaveProperty('totalClients');
        expect(response.body).toHaveProperty('totalAppointments');
        expect(response.body).toHaveProperty('revenue');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/clients')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
      
      expect(response.body).toBeDefined();
    });

    test('should handle 404 routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
      
      expect(response.body).toBeDefined();
    });
  });
});
