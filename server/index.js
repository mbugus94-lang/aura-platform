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

// ============================================================================
// NUTRITION ROUTES
// ============================================================================

// Get all nutrition plans
app.get('/api/nutrition', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.query;
    let query = 'SELECT * FROM nutrition_plans WHERE professionalId = ?';
    let params = [req.user.id];
    
    if (clientId) {
      query += ' AND clientId = ?';
      params.push(clientId);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const plans = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // Parse JSON fields
    plans.forEach(plan => {
      if (plan.meals) plan.meals = JSON.parse(plan.meals);
    });
    
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single nutrition plan
app.get('/api/nutrition/:id', authenticateToken, async (req, res) => {
  try {
    const plan = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM nutrition_plans WHERE id = ? AND professionalId = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!plan) {
      return res.status(404).json({ error: 'Nutrition plan not found' });
    }
    
    if (plan.meals) plan.meals = JSON.parse(plan.meals);
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create nutrition plan
app.post('/api/nutrition', authenticateToken, async (req, res) => {
  try {
    const { clientId, name, description, dailyCalories, proteinGrams, carbsGrams, fatGrams, meals, status, startDate, endDate } = req.body;
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO nutrition_plans (professionalId, clientId, name, description, dailyCalories, proteinGrams, carbsGrams, fatGrams, meals, status, startDate, endDate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, clientId, name, description, dailyCalories, proteinGrams, carbsGrams, fatGrams, meals ? JSON.stringify(meals) : null, status || 'active', startDate, endDate],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
    
    const plan = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM nutrition_plans WHERE id = ?', [result.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (plan.meals) plan.meals = JSON.parse(plan.meals);
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get nutrition logs
app.get('/api/nutrition/logs/:clientId', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM nutrition_logs WHERE clientId = ?';
    let params = [req.params.clientId];
    
    if (date) {
      query += ' AND date = ?';
      params.push(date);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const logs = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add nutrition log
app.post('/api/nutrition/logs', authenticateToken, async (req, res) => {
  try {
    const { clientId, date, mealType, foodName, portionSize, calories, protein, carbs, fat, notes } = req.body;
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO nutrition_logs (clientId, date, mealType, foodName, portionSize, calories, protein, carbs, fat, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [clientId, date, mealType, foodName, portionSize, calories, protein, carbs, fat, notes],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
    
    res.status(201).json({ id: result.lastID, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

// Get notification preferences
app.get('/api/notifications/prefs/:clientId', authenticateToken, async (req, res) => {
  try {
    const prefs = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM notification_prefs WHERE clientId = ?', [req.params.clientId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!prefs) {
      // Return default preferences
      return res.json({
        clientId: req.params.clientId,
        emailEnabled: true,
        whatsappEnabled: false,
        telegramEnabled: false,
        appointmentReminders: true,
        progressReminders: true,
        marketingMessages: false
      });
    }
    
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update notification preferences
app.put('/api/notifications/prefs/:clientId', authenticateToken, async (req, res) => {
  try {
    const { emailEnabled, whatsappEnabled, telegramEnabled, phone, chatId, appointmentReminders, progressReminders, marketingMessages } = req.body;
    
    // Check if prefs exist
    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM notification_prefs WHERE clientId = ?', [req.params.clientId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existing) {
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE notification_prefs SET emailEnabled = ?, whatsappEnabled = ?, telegramEnabled = ?, phone = ?, chatId = ?, appointmentReminders = ?, progressReminders = ?, marketingMessages = ?, updatedAt = CURRENT_TIMESTAMP
           WHERE clientId = ?`,
          [emailEnabled ? 1 : 0, whatsappEnabled ? 1 : 0, telegramEnabled ? 1 : 0, phone, chatId, appointmentReminders ? 1 : 0, progressReminders ? 1 : 0, marketingMessages ? 1 : 0, req.params.clientId],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    } else {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO notification_prefs (clientId, emailEnabled, whatsappEnabled, telegramEnabled, phone, chatId, appointmentReminders, progressReminders, marketingMessages)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.params.clientId, emailEnabled ? 1 : 0, whatsappEnabled ? 1 : 0, telegramEnabled ? 1 : 0, phone, chatId, appointmentReminders ? 1 : 0, progressReminders ? 1 : 0, marketingMessages ? 1 : 0],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    }
    
    const prefs = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM notification_prefs WHERE clientId = ?', [req.params.clientId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send notification (WhatsApp/Telegram simulation)
app.post('/api/notifications/send', authenticateToken, async (req, res) => {
  try {
    const { clientId, type, channel, message } = req.body;
    
    // Get client notification prefs
    const prefs = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM notification_prefs WHERE clientId = ?', [clientId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!prefs) {
      return res.status(400).json({ error: 'Client has no notification preferences set' });
    }
    
    // Check if channel is enabled
    if (channel === 'whatsapp' && !prefs.whatsappEnabled) {
      return res.status(400).json({ error: 'WhatsApp notifications are disabled for this client' });
    }
    if (channel === 'telegram' && !prefs.telegramEnabled) {
      return res.status(400).json({ error: 'Telegram notifications are disabled for this client' });
    }
    if (channel === 'email' && !prefs.emailEnabled) {
      return res.status(400).json({ error: 'Email notifications are disabled for this client' });
    }
    
    // In production, this would integrate with Twilio (WhatsApp) or Telegram Bot API
    // For demo, we simulate the notification
    const notificationResult = {
      success: true,
      channel,
      type,
      message,
      sentAt: new Date().toISOString(),
      note: `[DEMO] Notification would be sent via ${channel.toUpperCase()}`
    };
    
    // Log the notification
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO notification_logs (clientId, type, channel, message, status, sentAt)
         VALUES (?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP)`,
        [clientId, type, channel, message],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
    
    res.json(notificationResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notification history
app.get('/api/notifications/history/:clientId', authenticateToken, async (req, res) => {
  try {
    const history = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM notification_logs WHERE clientId = ? ORDER BY createdAt DESC', [req.params.clientId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// EXERCISE LIBRARY ROUTES
// ============================================================================

// Get all exercises
app.get('/api/exercises', authenticateToken, async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    let query = 'SELECT * FROM exercises WHERE professionalId = ?';
    let params = [req.user.id];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }
    
    query += ' ORDER BY category, name';
    
    const exercises = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    exercises.forEach(ex => {
      if (ex.muscleGroups) ex.muscleGroups = JSON.parse(ex.muscleGroups);
    });
    
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create exercise
app.post('/api/exercises', authenticateToken, async (req, res) => {
  try {
    const { name, category, muscleGroups, equipment, difficulty, instructions, videoUrl, imageUrl } = req.body;
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO exercises (professionalId, name, category, muscleGroups, equipment, difficulty, instructions, videoUrl, imageUrl)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, name, category, muscleGroups ? JSON.stringify(muscleGroups) : null, equipment, difficulty || 'beginner', instructions, videoUrl, imageUrl],
        function(err) { if (err) reject(err); else resolve(this); }
      );
    });
    
    const exercise = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM exercises WHERE id = ?', [result.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.status(201).json(exercise);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// INVOICE ROUTES
// ============================================================================

// Get all invoices
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const { clientId, status } = req.query;
    let query = 'SELECT * FROM invoices WHERE professionalId = ?';
    let params = [req.user.id];
    
    if (clientId) {
      query += ' AND clientId = ?';
      params.push(clientId);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const invoices = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    invoices.forEach(inv => {
      if (inv.items) inv.items = JSON.parse(inv.items);
    });
    
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice
app.post('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const { clientId, invoiceNumber, amount, tax, total, status, dueDate, items, notes } = req.body;
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO invoices (professionalId, clientId, invoiceNumber, amount, tax, total, status, dueDate, items, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, clientId, invoiceNumber, amount, tax || 0, total, status || 'pending', dueDate, items ? JSON.stringify(items) : null, notes],
        function(err) { if (err) reject(err); else resolve(this); }
      );
    });
    
    const invoice = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM invoices WHERE id = ?', [result.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark invoice as paid
app.put('/api/invoices/:id/pay', authenticateToken, async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE invoices SET status = 'paid', paidDate = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND professionalId = ?`,
        [req.params.id, req.user.id],
        function(err) { if (err) reject(err); else resolve(this); }
      );
    });
    
    const invoice = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GOALS ROUTES
// ============================================================================

// Get goals for a client
app.get('/api/goals/:clientId', authenticateToken, async (req, res) => {
  try {
    const goals = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM goals WHERE clientId = ? AND professionalId = ? ORDER BY createdAt DESC', [req.params.clientId, req.user.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create goal
app.post('/api/goals', authenticateToken, async (req, res) => {
  try {
    const { clientId, title, description, targetDate, targetValue, currentValue, unit, status } = req.body;
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO goals (professionalId, clientId, title, description, targetDate, targetValue, currentValue, unit, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, clientId, title, description, targetDate, targetValue, currentValue || 0, unit, status || 'active'],
        function(err) { if (err) reject(err); else resolve(this); }
      );
    });
    
    const goal = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM goals WHERE id = ?', [result.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update goal progress
app.put('/api/goals/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { currentValue } = req.body;
    
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE goals SET currentValue = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND professionalId = ?`,
        [currentValue, req.params.id, req.user.id],
        function(err) { if (err) reject(err); else resolve(this); }
      );
    });
    
    const goal = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM goals WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ATTENDANCE ROUTES
// ============================================================================

// Get attendance records
app.get('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { clientId, startDate, endDate } = req.query;
    let query = 'SELECT * FROM attendance WHERE professionalId = ?';
    let params = [req.user.id];
    
    if (clientId) {
      query += ' AND clientId = ?';
      params.push(clientId);
    }
    if (startDate) {
      query += ' AND date(checkInTime) >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date(checkInTime) <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY checkInTime DESC';
    
    const attendance = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check in client
app.post('/api/attendance/checkin', authenticateToken, async (req, res) => {
  try {
    const { clientId, appointmentId, notes } = req.body;
    const checkInTime = new Date().toISOString();
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO attendance (professionalId, clientId, appointmentId, checkInTime, status, notes)
         VALUES (?, ?, ?, ?, 'present', ?)`,
        [req.user.id, clientId, appointmentId || null, checkInTime, notes],
        function(err) { if (err) reject(err); else resolve(this); }
      );
    });
    
    res.status(201).json({ id: result.lastID, checkInTime, status: 'present' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check out client
app.post('/api/attendance/:id/checkout', authenticateToken, async (req, res) => {
  try {
    const checkOutTime = new Date().toISOString();
    
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE attendance SET checkOutTime = ? WHERE id = ? AND professionalId = ?`,
        [checkOutTime, req.params.id, req.user.id],
        function(err) { if (err) reject(err); else resolve(this); }
      );
    });
    
    const attendance = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM attendance WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// MARKETING CAMPAIGN ROUTES
// ============================================================================

// Get marketing campaigns
app.get('/api/marketing', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM marketing_campaigns WHERE professionalId = ?';
    let params = [req.user.id];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const campaigns = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create marketing campaign
app.post('/api/marketing', authenticateToken, async (req, res) => {
  try {
    const { name, type, subject, message, targetAudience, status, scheduledAt } = req.body;
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO marketing_campaigns (professionalId, name, type, subject, message, targetAudience, status, scheduledAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, name, type, subject, message, targetAudience, status || 'draft', scheduledAt],
        function(err) { if (err) reject(err); else resolve(this); }
      );
    });
    
    const campaign = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM marketing_campaigns WHERE id = ?', [result.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send marketing campaign (simulated)
app.post('/api/marketing/:id/send', authenticateToken, async (req, res) => {
  try {
    // Get client count for this professional
    const clients = await new Promise((resolve, reject) => {
      db.all('SELECT COUNT(*) as count FROM clients WHERE professionalId = ?', [req.user.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const recipientCount = clients[0]?.count || 0;
    
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE marketing_campaigns SET status = 'sent', sentAt = CURRENT_TIMESTAMP, recipientCount = ? WHERE id = ? AND professionalId = ?`,
        [recipientCount, req.params.id, req.user.id],
        function(err) { if (err) reject(err); else resolve(this); }
      );
    });
    
    const campaign = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM marketing_campaigns WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.json({ 
      ...campaign, 
      note: `[DEMO] Campaign would be sent to ${recipientCount} recipients` 
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
  console.log(`\n📝 Sample login credentials:\n   Email: demo@aura.com\n   Password: (any password)\n`);
});
