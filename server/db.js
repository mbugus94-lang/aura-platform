const Database = require('better-sqlite3');
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, 'aura.db');
const db = new Database(dbPath);

console.log('Connected to SQLite database');

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

// Initialize tables
function initDatabase() {
  console.log('Initializing database...');

  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      businessName TEXT,
      bio TEXT,
      role TEXT DEFAULT 'professional',
      subscriptionTier TEXT DEFAULT 'free',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    // Clients table
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professionalId INTEGER NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      dateOfBirth TEXT,
      healthGoals TEXT,
      fitnessLevel TEXT DEFAULT 'beginner',
      medicalHistory TEXT,
      measurements TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Appointments table
    `CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      professionalId INTEGER NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      type TEXT DEFAULT 'session',
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      remindersSet INTEGER DEFAULT 0,
      reminderSent INTEGER DEFAULT 0,
      googleCalendarEventId TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Session notes table
    `CREATE TABLE IF NOT EXISTS session_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointmentId INTEGER NOT NULL,
      clientId INTEGER NOT NULL,
      notes TEXT,
      performance TEXT,
      nextSteps TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    )`,
    // Progress tracking table
    `CREATE TABLE IF NOT EXISTS progress_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      date TEXT NOT NULL,
      weight REAL,
      bodyFat REAL,
      measurements TEXT,
      workoutMetrics TEXT,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    )`,
    // Programs table
    `CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      professionalId INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'workout',
      description TEXT,
      duration INTEGER,
      content TEXT,
      status TEXT DEFAULT 'active',
      startDate TEXT,
      endDate TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Chat messages table
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER,
      professionalId INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      context TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Analytics events table
    `CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professionalId INTEGER NOT NULL,
      eventType TEXT NOT NULL,
      metadata TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Nutrition plans table
    `CREATE TABLE IF NOT EXISTS nutrition_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      professionalId INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      dailyCalories INTEGER,
      proteinGrams INTEGER,
      carbsGrams INTEGER,
      fatGrams INTEGER,
      meals TEXT,
      status TEXT DEFAULT 'active',
      startDate TEXT,
      endDate TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Nutrition logs table
    `CREATE TABLE IF NOT EXISTS nutrition_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      date TEXT NOT NULL,
      mealType TEXT NOT NULL,
      foodName TEXT NOT NULL,
      portionSize TEXT,
      calories INTEGER,
      protein REAL,
      carbs REAL,
      fat REAL,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    )`,
    // Notification preferences table
    `CREATE TABLE IF NOT EXISTS notification_prefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      emailEnabled INTEGER DEFAULT 1,
      whatsappEnabled INTEGER DEFAULT 0,
      telegramEnabled INTEGER DEFAULT 0,
      phone TEXT,
      chatId TEXT,
      appointmentReminders INTEGER DEFAULT 1,
      progressReminders INTEGER DEFAULT 1,
      marketingMessages INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    )`,
    // Notification logs table
    `CREATE TABLE IF NOT EXISTS notification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      type TEXT NOT NULL,
      channel TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      error TEXT,
      sentAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    )`,
    // Exercise library table
    `CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professionalId INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      muscleGroups TEXT,
      equipment TEXT,
      difficulty TEXT DEFAULT 'beginner',
      instructions TEXT,
      videoUrl TEXT,
      imageUrl TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Invoices table
    `CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      professionalId INTEGER NOT NULL,
      invoiceNumber TEXT NOT NULL,
      amount REAL NOT NULL,
      tax REAL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      dueDate TEXT,
      paidDate TEXT,
      lastReminder TEXT,
      items TEXT,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Goals table
    `CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      professionalId INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      targetDate TEXT,
      targetValue REAL,
      currentValue REAL,
      unit TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Attendance/check-ins table
    `CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      appointmentId INTEGER,
      professionalId INTEGER NOT NULL,
      checkInTime TEXT NOT NULL,
      checkOutTime TEXT,
      status TEXT DEFAULT 'present',
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE SET NULL,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Marketing campaigns table
    `CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professionalId INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      targetAudience TEXT,
      status TEXT DEFAULT 'draft',
      scheduledAt TEXT,
      sentAt TEXT,
      recipientCount INTEGER DEFAULT 0,
      openCount INTEGER DEFAULT 0,
      clickCount INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Workout templates table
    `CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professionalId INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      exercises TEXT,
      estimatedDuration INTEGER,
      difficulty TEXT DEFAULT 'beginner',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Professional settings table for Google Calendar tokens
    `CREATE TABLE IF NOT EXISTS professional_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professionalId INTEGER NOT NULL UNIQUE,
      googleCalendarTokens TEXT,
      emailSettings TEXT,
      notificationPreferences TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Scheduled emails table
    `CREATE TABLE IF NOT EXISTS scheduled_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professionalId INTEGER NOT NULL,
      recipientEmail TEXT NOT NULL,
      subject TEXT NOT NULL,
      htmlContent TEXT NOT NULL,
      scheduledTime TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled',
      sentAt TEXT,
      error TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )`
  ];

  for (const tableSql of tables) {
    try {
      db.exec(tableSql);
    } catch (err) {
      console.error('Error creating table:', err.message);
    }
  }

  console.log('Tables created successfully');
}

// Insert sample data
function insertSampleData() {
  console.log('Inserting sample data...');

  // Check if user exists
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get('demo@aura.com');
  if (!existingUser) {
    try {
      db.prepare(`INSERT INTO users (id, email, password, name, businessName, bio, role)
         VALUES (1, 'demo@aura.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrjlL8QlH2zQF3hYI3gEU8Y7R1tVC', 'Demo Professional', 'Aura Fitness', 'Professional fitness coach specializing in strength training and nutrition', 'professional')`).run();
      console.log('Created demo user');
    } catch (err) {
      console.error('Error inserting user:', err.message);
    }
  }

  // Check if clients exist
  const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get();
  if (clientCount.count === 0) {
    const clients = [
      { professionalId: 1, email: 'john.doe@example.com', name: 'John Doe', phone: '+254700123456', dateOfBirth: '1990-05-15', healthGoals: JSON.stringify(['lose weight', 'build muscle']), fitnessLevel: 'intermediate', medicalHistory: JSON.stringify(['no allergies']), measurements: JSON.stringify({ weight: 85, height: 180, bodyFat: 22 }) },
      { professionalId: 1, email: 'jane.smith@example.com', name: 'Jane Smith', phone: '+254700987654', dateOfBirth: '1985-08-22', healthGoals: JSON.stringify(['improve flexibility', 'reduce stress']), fitnessLevel: 'beginner', medicalHistory: JSON.stringify(['mild asthma']), measurements: JSON.stringify({ weight: 65, height: 165, bodyFat: 28 }) },
      { professionalId: 1, email: 'mike.johnson@example.com', name: 'Mike Johnson', phone: '+254711223344', dateOfBirth: '1988-03-10', healthGoals: JSON.stringify(['build muscle', 'strength training']), fitnessLevel: 'advanced', medicalHistory: JSON.stringify(['no conditions']), measurements: JSON.stringify({ weight: 90, height: 185, bodyFat: 15 }) },
      { professionalId: 1, email: 'sarah.williams@example.com', name: 'Sarah Williams', phone: '+254722556677', dateOfBirth: '1992-11-28', healthGoals: JSON.stringify(['run marathon', 'endurance']), fitnessLevel: 'intermediate', medicalHistory: JSON.stringify(['no conditions']), measurements: JSON.stringify({ weight: 60, height: 170, bodyFat: 20 }) },
      { professionalId: 1, email: 'david.brown@example.com', name: 'David Brown', phone: '+254733889900', dateOfBirth: '1980-07-15', healthGoals: JSON.stringify(['posture correction', 'back health']), fitnessLevel: 'beginner', medicalHistory: JSON.stringify(['lower back pain']), measurements: JSON.stringify({ weight: 78, height: 175, bodyFat: 25 }) },
    ];

    const insertClient = db.prepare(`INSERT INTO clients (professionalId, email, name, phone, dateOfBirth, healthGoals, fitnessLevel, medicalHistory, measurements)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    for (const client of clients) {
      try {
        insertClient.run(client.professionalId, client.email, client.name, client.phone, client.dateOfBirth, client.healthGoals, client.fitnessLevel, client.medicalHistory, client.measurements);
      } catch (err) {
        console.error('Error inserting client:', err.message);
      }
    }
    console.log(`Inserted ${clients.length} clients`);
  }

  console.log('✅ Sample data insertion complete!');
}

// Initialize
initDatabase();
insertSampleData();

// Export database interface
module.exports = db;
