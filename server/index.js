const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'aura-demo-secret-key-change-in-production';

// Security warning for production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'aura-demo-secret-key-change-in-production') {
  console.warn('[SECURITY] JWT_SECRET is using the default value. Set JWT_SECRET in production.');
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

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Aura Platform API',
    version: '1.0.3',
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
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
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
        bio: user.bio,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, name, password, businessName, bio } = req.body;

    // Validate required fields
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user with password
    const result = db.prepare('INSERT INTO users (email, password, name, businessName, bio, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      email, hashedPassword, name, businessName || '', bio || '', 'professional'
    );

    const userId = result.lastInsertRowid;

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
        bio: bio || '',
        role: 'professional',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      businessName: user.businessName,
      bio: user.bio,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clients routes
app.get('/api/clients', authenticateToken, (req, res) => {
  try {
    const clients = db.prepare('SELECT * FROM clients WHERE professionalId = ? ORDER BY createdAt DESC').all(req.user.id);

    // Parse JSON fields
    clients.forEach(client => {
      if (client.healthGoals) client.healthGoals = JSON.parse(client.healthGoals);
      if (client.medicalHistory) client.medicalHistory = JSON.parse(client.medicalHistory);
      if (client.measurements) client.measurements = JSON.parse(client.measurements);
    });

    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clients/:id', authenticateToken, (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ? AND professionalId = ?').get(req.params.id, req.user.id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (client.healthGoals) client.healthGoals = JSON.parse(client.healthGoals);
    if (client.medicalHistory) client.medicalHistory = JSON.parse(client.medicalHistory);
    if (client.measurements) client.measurements = JSON.parse(client.measurements);

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', authenticateToken, (req, res) => {
  try {
    const { email, name, phone, healthGoals, fitnessLevel, medicalHistory, measurements } = req.body;

    const result = db.prepare(`INSERT INTO clients (professionalId, email, name, phone, healthGoals, fitnessLevel, medicalHistory, measurements)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      req.user.id,
      email,
      name,
      phone || '',
      healthGoals ? JSON.stringify(healthGoals) : null,
      fitnessLevel || 'beginner',
      medicalHistory ? JSON.stringify(medicalHistory) : null,
      measurements ? JSON.stringify(measurements) : null
    );

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Appointments routes
app.get('/api/appointments', authenticateToken, (req, res) => {
  try {
    const appointments = db.prepare('SELECT * FROM appointments WHERE professionalId = ? ORDER BY startTime DESC').all(req.user.id);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/appointments/:id', authenticateToken, (req, res) => {
  try {
    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ? AND professionalId = ?').get(req.params.id, req.user.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', authenticateToken, (req, res) => {
  try {
    const { clientId, startTime, endTime, type, notes } = req.body;

    const result = db.prepare(`INSERT INTO appointments (professionalId, clientId, startTime, endTime, type, notes)
         VALUES (?, ?, ?, ?, ?, ?)`).run(
      req.user.id, clientId, startTime, endTime, type || 'session', notes || ''
    );

    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Progress tracking routes
app.get('/api/progress/:clientId', authenticateToken, (req, res) => {
  try {
    const progress = db.prepare('SELECT * FROM progress_tracking WHERE clientId = ? ORDER BY date DESC').all(req.params.clientId);
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/progress', authenticateToken, (req, res) => {
  try {
    const { clientId, date, weight, bodyFat, measurements, workoutMetrics, notes } = req.body;

    const result = db.prepare(`INSERT INTO progress_tracking (clientId, date, weight, bodyFat, measurements, workoutMetrics, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      clientId,
      date || new Date().toISOString().slice(0, 10),
      weight || null,
      bodyFat || null,
      measurements ? JSON.stringify(measurements) : null,
      workoutMetrics ? JSON.stringify(workoutMetrics) : null,
      notes || ''
    );

    const progress = db.prepare('SELECT * FROM progress_tracking WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Programs routes
app.get('/api/programs', authenticateToken, (req, res) => {
  try {
    const programs = db.prepare('SELECT * FROM programs WHERE professionalId = ? ORDER BY createdAt DESC').all(req.user.id);
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/programs/:id', authenticateToken, (req, res) => {
  try {
    const program = db.prepare('SELECT * FROM programs WHERE id = ? AND professionalId = ?').get(req.params.id, req.user.id);

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/programs', authenticateToken, (req, res) => {
  try {
    const { clientId, name, type, description, duration, content, status, startDate, endDate } = req.body;

    const result = db.prepare(`INSERT INTO programs (clientId, professionalId, name, type, description, duration, content, status, startDate, endDate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      clientId, req.user.id, name, type || 'workout', description, duration, content, status || 'active', startDate, endDate
    );

    const program = db.prepare('SELECT * FROM programs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat routes
app.post('/api/chat', authenticateToken, (req, res) => {
  try {
    const { clientId, message } = req.body;

    // Store user message
    db.prepare('INSERT INTO chat_messages (clientId, professionalId, role, content) VALUES (?, ?, ?, ?)').run(
      clientId || null, req.user.id, 'user', message
    );

    // Simple AI response (mock for now)
    const responses = [
      "That's a great question! I recommend focusing on consistency in your workouts.",
      "Based on your progress, you're doing well! Keep tracking your measurements.",
      "For nutrition, try to include more protein and vegetables in your meals.",
      "Make sure you're getting enough rest between workout sessions.",
      "Consider increasing the intensity of your workouts gradually.",
    ];
    const aiResponse = responses[Math.floor(Math.random() * responses.length)];

    // Store AI response
    db.prepare('INSERT INTO chat_messages (clientId, professionalId, role, content) VALUES (?, ?, ?, ?)').run(
      clientId || null, req.user.id, 'assistant', aiResponse
    );

    res.json({ response: aiResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics routes
app.get('/api/analytics', authenticateToken, (req, res) => {
  try {
    const clients = db.prepare('SELECT * FROM clients WHERE professionalId = ?').all(req.user.id);
    const appointments = db.prepare('SELECT * FROM appointments WHERE professionalId = ?').all(req.user.id);

    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const scheduledAppointments = appointments.filter(apt => apt.status === 'scheduled').length;

    const totalRevenue = 0; // Simplified for demo

    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const clientRetention = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 100;

    res.json({
      totalClients,
      activeClients,
      totalAppointments: appointments.length,
      completedAppointments,
      scheduledAppointments,
      totalRevenue,
      avgRevenuePerClient: totalClients > 0 ? totalRevenue / totalClients : 0,
      clientRetention,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Aura Platform API running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`\n📝 Sample login credentials:\n   Email: demo@aura.com\n   Password: demo123\n`);
});

module.exports = app;
