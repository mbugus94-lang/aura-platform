const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const APP_NAME = process.env.APP_NAME || 'Aura Platform';

// Secure JWT secret handling
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET environment variable is required in production');
    process.exit(1);
  } else {
    // Generate a random secret for development (will change on restart)
    JWT_SECRET = crypto.randomBytes(64).toString('hex');
    console.warn('[SECURITY] JWT_SECRET is using the default value. Using generated development secret.');
    console.warn('[SECURITY] Set JWT_SECRET environment variable for consistent sessions.');
  }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static('public'));

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: require('../package.json').version
  });
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password using bcrypt
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        businessName: user.businessName,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Register route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password, businessName } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password with bcrypt before storage
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (email, name, password, businessName, role) VALUES (?, ?, ?, ?, ?)',
        [email, name, hashedPassword, businessName || '', 'professional'],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    const userId = result.lastID;

    // Generate token
    const token = jwt.sign(
      { id: userId, email, role: 'professional' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        name,
        businessName: businessName || '',
        role: 'professional',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CLIENT ROUTES
// ============================================================================

// Get all clients
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const clients = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM clients WHERE professionalId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single client
app.get('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const client = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM clients WHERE id = ? AND professionalId = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create client
app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    const { email, name, phone, healthGoals, fitnessLevel } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO clients (professionalId, email, name, phone, healthGoals, fitnessLevel)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, email, name, phone || '', healthGoals || '', fitnessLevel || 'beginner'],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    const client = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM clients WHERE id = ?', [result.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PROGRAM ROUTES
// ============================================================================

// Get all programs
app.get('/api/programs', authenticateToken, async (req, res) => {
  try {
    const programs = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM programs WHERE professionalId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create program
app.post('/api/programs', authenticateToken, async (req, res) => {
  try {
    const { name, description, type, duration, sessions } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO programs (professionalId, name, description, type, duration, sessions)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, name, description, type, duration, JSON.stringify(sessions || [])],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    const program = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM programs WHERE id = ?', [result.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// APPOINTMENTS / SCHEDULING ROUTES
// ============================================================================

// Get all appointments
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const appointments = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM appointments WHERE professionalId = ? ORDER BY startTime DESC', [req.user.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create appointment (schedule)
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { clientId, startTime, endTime, type, notes } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO appointments (professionalId, clientId, startTime, endTime, type, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, clientId, startTime, endTime, type || 'session', notes || '', 'scheduled'],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    const appointment = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM appointments WHERE id = ?', [result.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AI CHAT ROUTES
// ============================================================================

// AI Chat endpoint
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    
    // Simple AI response simulation
    const responses = [
      "That's a great question! For pre-workout nutrition, focus on easily digestible carbs like bananas or oatmeal.",
      "I recommend staying hydrated! Drink at least 8 glasses of water daily.",
      "For muscle recovery, prioritize protein intake within 30 minutes after your workout.",
      "Consistency is key! Aim for at least 150 minutes of moderate activity per week.",
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    res.json({
      message: randomResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 404 ERROR HANDLER
// ============================================================================

// Handle 404 - not found
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', message: 'The requested resource was not found' });
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 ${APP_NAME} API running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`\n📝 Sample login credentials:\n   Email: demo@aura.com\n   Password: demo123\n`);
});

module.exports = app;
