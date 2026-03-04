const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'aura-demo-secret-key-change-in-production';

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

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // For demo, we accept any password if email exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (email, name, businessName, bio, role) VALUES (?, ?, ?, ?, ?)',
        [email, name, businessName || '', bio || '', 'professional'],
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
        bio: bio || '',
        role: 'professional',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

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
app.get('/api/clients', authenticateToken, async (req, res) => {
  try {
    const clients = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM clients WHERE professionalId = ? ORDER BY createdAt DESC', [req.user.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

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

    if (client.healthGoals) client.healthGoals = JSON.parse(client.healthGoals);
    if (client.medicalHistory) client.medicalHistory = JSON.parse(client.medicalHistory);
    if (client.measurements) client.measurements = JSON.parse(client.measurements);

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', authenticateToken, async (req, res) => {
  try {
    const { email, name, phone, healthGoals, fitnessLevel, medicalHistory, measurements } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO clients (professionalId, email, name, phone, healthGoals, fitnessLevel, medicalHistory, measurements)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          email,
          name,
          phone || '',
          healthGoals ? JSON.stringify(healthGoals) : null,
          fitnessLevel || 'beginner',
          medicalHistory ? JSON.stringify(medicalHistory) : null,
          measurements ? JSON.stringify(measurements) : null,
        ],
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

// Appointments routes
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

app.get('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM appointments WHERE id = ? AND professionalId = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { clientId, startTime, endTime, type, notes } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO appointments (professionalId, clientId, startTime, endTime, type, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, clientId, startTime, endTime, type || 'session', notes || ''],
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

// Progress tracking routes
app.get('/api/progress/:clientId', authenticateToken, async (req, res) => {
  try {
    const progress = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM progress_tracking WHERE clientId = ? ORDER BY date DESC',
        [req.params.clientId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/progress', authenticateToken, async (req, res) => {
  try {
    const { clientId, date, weight, bodyFat, measurements, workoutMetrics, notes } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO progress_tracking (clientId, date, weight, bodyFat, measurements, workoutMetrics, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          clientId,
          date || new Date().toISOString().slice(0, 10),
          weight || null,
          bodyFat || null,
          measurements ? JSON.stringify(measurements) : null,
          workoutMetrics ? JSON.stringify(workoutMetrics) : null,
          notes || '',
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    const progress = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM progress_tracking WHERE id = ?', [result.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Programs routes
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

app.get('/api/programs/:id', authenticateToken, async (req, res) => {
  try {
    const program = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM programs WHERE id = ? AND professionalId = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json(program);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/programs', authenticateToken, async (req, res) => {
  try {
    const { clientId, name, type, description, duration, content, status, startDate, endDate } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO programs (professionalId, clientId, name, type, description, duration, content, status, startDate, endDate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          clientId,
          name,
          type || 'workout',
          description || '',
          duration || null,
          content ? JSON.stringify(content) : null,
          status || 'active',
          startDate || new Date().toISOString().slice(0, 10),
          endDate || null,
        ],
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

// Chat routes
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { clientId, content } = req.body;

    // Store user message
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO chat_messages (professionalId, clientId, role, content)
         VALUES (?, ?, ?, ?)`,
        [req.user.id, clientId || null, 'user', content],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    // Get conversation context
    const history = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM chat_messages WHERE professionalId = ? AND (clientId = ? OR clientId IS NULL) ORDER BY createdAt DESC LIMIT 10',
        [req.user.id, clientId || null],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const messages = history.reverse().map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // AI response (mock)
    const response = generateAIResponse(content, messages);

    // Store assistant response
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO chat_messages (professionalId, clientId, role, content)
         VALUES (?, ?, ?, ?)`,
        [req.user.id, clientId || null, 'assistant', response],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({ message: response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chat/history', authenticateToken, async (req, res) => {
  try {
    const history = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM chat_messages WHERE professionalId = ? ORDER BY createdAt ASC',
        [req.user.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI response generator (mock)
function generateAIResponse(content, history) {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('weight') || lowerContent.includes('weight loss')) {
    return "Based on your progress tracking, you're making great progress! Keep up the cardio and strength training routine. I recommend focusing on a calorie deficit of 500 calories per day for optimal results.";
  } else if (lowerContent.includes('yoga') || lowerContent.includes('flexibility')) {
    return "Yoga is excellent for flexibility and balance. I recommend starting with sun salutations to warm up, then working on standing poses for balance, and finishing with restorative poses to relax. Consistency is key!";
  } else if (lowerContent.includes('strength') || lowerContent.includes('muscle')) {
    return "For muscle building, focus on progressive overload - gradually increase the weight or reps over time. Make sure you're getting enough protein (1.6-2.2g per kg of body weight) and getting adequate rest between workouts.";
  } else if (lowerContent.includes('nutrition') || lowerContent.includes('diet')) {
    return "A balanced diet is crucial for your fitness goals. Focus on whole foods, lean proteins, complex carbohydrates, and healthy fats. Stay hydrated and avoid processed foods and excessive sugar.";
  } else if (lowerContent.includes('posture') || lowerContent.includes('back pain')) {
    return "For posture correction, practice shoulder blade retractions, engage your core, and avoid slouching. I've created a specific program for you that includes exercises to strengthen your core and improve your posture throughout the day.";
  } else {
    return "I'd be happy to help with that! Based on your goals and current progress, here's what I recommend: Focus on consistency and listen to your body. Small, consistent efforts lead to big results over time. Let me know if you need more specific advice!";
  }
}

// Analytics routes
app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    const clients = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM clients WHERE professionalId = ?', [req.user.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const appointments = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM appointments WHERE professionalId = ?', [req.user.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const scheduledAppointments = appointments.filter(apt => apt.status === 'scheduled').length;

    const totalRevenue = 0; // Simplified for demo

    res.json({
      totalClients: clients.length,
      activeClients: clients.filter(c => c.status === 'active').length,
      totalAppointments: appointments.length,
      completedAppointments,
      scheduledAppointments,
      totalRevenue,
      avgRevenuePerClient: clients.length > 0 ? totalRevenue / clients.length : 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Aura Platform API running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`\n📝 Sample login credentials:\n   Email: demo@aura.com\n   Password: (any password)\n`);
});
