const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');
const openaiService = require('./services/openaiService');
const emailService = require('./services/emailService');

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
    version: require('../package.json').version,
    services: {
      ai: openaiService.isAvailable,
      email: emailService.isConfigured
    }
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

    // Send welcome email if configured
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (user) {
      emailService.sendWelcomeEmail(client, user).catch(console.error);
    }

    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update client
app.put('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    const { name, phone, healthGoals, fitnessLevel, status } = req.body;

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE clients SET name = ?, phone = ?, healthGoals = ?, fitnessLevel = ?, status = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ? AND professionalId = ?`,
        [name, phone || '', healthGoals || '', fitnessLevel || 'beginner', status || 'active', req.params.id, req.user.id],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    const client = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM clients WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete client
app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM clients WHERE id = ? AND professionalId = ?',
        [req.params.id, req.user.id],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({ message: 'Client deleted successfully' });
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
    const { name, description, type, duration, sessions, clientId } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO programs (professionalId, clientId, name, description, type, duration, content, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, clientId || 0, name, description, type, duration, JSON.stringify(sessions || []), 'active'],
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

// Update appointment
app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const { startTime, endTime, type, notes, status } = req.body;

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE appointments SET startTime = ?, endTime = ?, type = ?, notes = ?, status = ?, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ? AND professionalId = ?`,
        [startTime, endTime, type, notes, status, req.params.id, req.user.id],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    const appointment = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM appointments WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete appointment
app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM appointments WHERE id = ? AND professionalId = ?',
        [req.params.id, req.user.id],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AI CHAT ROUTES (ENHANCED WITH OPENAI)
// ============================================================================

// AI Chat endpoint
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { message, clientId } = req.body;
    
    // Get context if clientId provided
    let context = {};
    if (clientId) {
      const client = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM clients WHERE id = ? AND professionalId = ?', [clientId, req.user.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (client) {
        context = {
          clientName: client.name,
          goals: client.healthGoals,
          fitnessLevel: client.fitnessLevel
        };
      }
    }

    // Get AI response from OpenAI service
    const response = await openaiService.getChatResponse(message, context);
    
    // Store chat message in database
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO chat_messages (clientId, professionalId, role, content, context)
         VALUES (?, ?, ?, ?, ?)`,
        [clientId || null, req.user.id, 'assistant', response.message, JSON.stringify(context)],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
    
    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate AI workout program
app.post('/api/ai/generate-program', authenticateToken, async (req, res) => {
  try {
    const { clientId, fitnessLevel, goals, timePerSession, frequency } = req.body;
    
    const clientProfile = {
      name: 'Client',
      fitnessLevel: fitnessLevel || 'beginner',
      goals: goals || 'general fitness',
      timePerSession: timePerSession || '45 minutes',
      frequency: frequency || '3 days per week'
    };

    // Get client name if clientId provided
    if (clientId) {
      const client = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM clients WHERE id = ? AND professionalId = ?', [clientId, req.user.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (client) {
        clientProfile.name = client.name;
        clientProfile.fitnessLevel = fitnessLevel || client.fitnessLevel;
        clientProfile.goals = goals || client.healthGoals;
      }
    }

    const program = await openaiService.generateWorkoutProgram(clientProfile);
    
    res.json(program);
  } catch (error) {
    console.error('Program generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate nutrition advice
app.post('/api/ai/nutrition', authenticateToken, async (req, res) => {
  try {
    const { goal, preferences, allergies, activityLevel } = req.body;
    
    const params = {
      goal: goal || 'maintenance',
      preferences: preferences || 'none',
      allergies: allergies || 'none',
      activityLevel: activityLevel || 'moderate'
    };

    const advice = await openaiService.generateNutritionAdvice(params);
    
    res.json(advice);
  } catch (error) {
    console.error('Nutrition advice error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze client progress
app.post('/api/ai/analyze-progress', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.body;
    
    // Get client's progress data
    const progressData = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM progress_tracking WHERE clientId = ? ORDER BY date ASC',
        [clientId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const analysis = await openaiService.analyzeProgress(progressData);
    
    res.json(analysis);
  } catch (error) {
    console.error('Progress analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

// Get dashboard analytics
app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get total clients
    const clientStats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN createdAt >= date('now', '-30 days') THEN 1 END) as new_this_month
         FROM clients WHERE professionalId = ?`,
        [req.user.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Get appointment stats
    const appointmentStats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'scheduled' AND startTime >= date('now') THEN 1 END) as upcoming,
          COUNT(CASE WHEN startTime >= date('now', '-7 days') THEN 1 END) as this_week
         FROM appointments WHERE professionalId = ?`,
        [req.user.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    // Get revenue (from invoices)
    const revenueStats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          COALESCE(SUM(total), 0) as total,
          COALESCE(SUM(CASE WHEN paidDate IS NOT NULL THEN total END), 0) as collected,
          COALESCE(SUM(CASE WHEN createdAt >= date('now', '-30 days') THEN total END), 0) as this_month
         FROM invoices WHERE professionalId = ?`,
        [req.user.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({
      clients: clientStats,
      appointments: appointmentStats,
      revenue: revenueStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PROGRESS TRACKING ROUTES
// ============================================================================

// Get client progress
app.get('/api/clients/:id/progress', authenticateToken, async (req, res) => {
  try {
    const progress = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM progress_tracking WHERE clientId = ? ORDER BY date DESC',
        [req.params.id],
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

// Add progress entry
app.post('/api/clients/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { date, weight, bodyFat, measurements, workoutMetrics, notes } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO progress_tracking (clientId, date, weight, bodyFat, measurements, workoutMetrics, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.params.id, date, weight, bodyFat, JSON.stringify(measurements || {}), JSON.stringify(workoutMetrics || {}), notes],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    const entry = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM progress_tracking WHERE id = ?', [result.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Send progress update email if configured
    const client = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM clients WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (client) {
      emailService.sendProgressUpdate(client, { weight, bodyFat }).catch(console.error);
    }

    res.status(201).json(entry);
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
    const invoices = await new Promise((resolve, reject) => {
      db.all(
        `SELECT i.*, c.name as clientName, c.email as clientEmail 
         FROM invoices i 
         JOIN clients c ON i.clientId = c.id 
         WHERE i.professionalId = ? 
         ORDER BY i.createdAt DESC`,
        [req.user.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice
app.post('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const { clientId, items, amount, tax, total, dueDate, notes } = req.body;
    
    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO invoices (clientId, professionalId, invoiceNumber, amount, tax, total, dueDate, items, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [clientId, req.user.id, invoiceNumber, amount, tax || 0, total, dueDate, JSON.stringify(items), notes, 'pending'],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
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

// Send invoice via email
app.post('/api/invoices/:id/send', authenticateToken, async (req, res) => {
  try {
    const invoice = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM invoices WHERE id = ? AND professionalId = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const client = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM clients WHERE id = ?', [invoice.clientId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const professional = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const result = await emailService.sendInvoice(invoice, client, professional);
    
    if (result.success) {
      res.json({ message: 'Invoice sent successfully' });
    } else {
      res.status(500).json({ error: result.error || 'Failed to send invoice' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

// Send appointment reminder
app.post('/api/appointments/:id/remind', authenticateToken, async (req, res) => {
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

    const client = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM clients WHERE id = ?', [appointment.clientId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const result = await emailService.sendAppointmentReminder(appointment, client);
    
    if (result.success) {
      res.json({ message: 'Reminder sent successfully' });
    } else {
      res.status(500).json({ error: result.error || 'Failed to send reminder' });
    }
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
  console.log(`\n🚀 ${APP_NAME} v${require('../package.json').version} API running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI Service: ${openaiService.isAvailable ? '✅ Connected' : '⚠️ Using fallback responses'}`);
  console.log(`✉️ Email Service: ${emailService.isConfigured ? '✅ Configured' : '⚠️ Not configured'}`);
  console.log(`\n📝 Sample login credentials:\n   Email: demo@aura.com\n   Password: demo123\n`);
});

module.exports = app;
