const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Initialize database
const dbPath = path.join(__dirname, 'aura.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize tables
function initDatabase() {
  console.log('Initializing database...');

  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      businessName TEXT,
      bio TEXT,
      role TEXT DEFAULT 'professional',
      subscriptionTier TEXT DEFAULT 'free',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Clients table
  db.run(`
    CREATE TABLE IF NOT EXISTS clients (
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
    )
  `);

  // Appointments table
  db.run(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      professionalId INTEGER NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      type TEXT DEFAULT 'session',
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      remindersSet INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Session notes table
  db.run(`
    CREATE TABLE IF NOT EXISTS session_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointmentId INTEGER NOT NULL,
      clientId INTEGER NOT NULL,
      notes TEXT,
      performance TEXT,
      nextSteps TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointmentId) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  // Progress tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS progress_tracking (
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
    )
  `);

  // Programs table
  db.run(`
    CREATE TABLE IF NOT EXISTS programs (
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
    )
  `);

  // Chat messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER,
      professionalId INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      context TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Analytics events table
  db.run(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professionalId INTEGER NOT NULL,
      eventType TEXT NOT NULL,
      metadata TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (professionalId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Tables created successfully');
}

// Insert sample data
function insertSampleData() {
  console.log('Inserting sample data...');

  // Professional user
  const professionalId = 1;
  db.run(
    `INSERT OR IGNORE INTO users (id, email, name, businessName, bio, role)
     VALUES (1, 'demo@aura.com', 'Demo Professional', 'Aura Fitness', 'Professional fitness coach specializing in strength training and nutrition', 'professional')`,
    [],
    function(err) {
      if (err) console.error('Error inserting user:', err.message);
    }
  );

  // Sample clients
  const clients = [
    {
      professionalId: 1,
      email: 'john.doe@example.com',
      name: 'John Doe',
      phone: '+254700123456',
      dateOfBirth: '1990-05-15',
      healthGoals: JSON.stringify(['lose weight', 'build muscle']),
      fitnessLevel: 'intermediate',
      medicalHistory: JSON.stringify(['no allergies']),
      measurements: JSON.stringify({ weight: 85, height: 180, bodyFat: 22 }),
    },
    {
      professionalId: 1,
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      phone: '+254700987654',
      dateOfBirth: '1985-08-22',
      healthGoals: JSON.stringify(['improve flexibility', 'reduce stress']),
      fitnessLevel: 'beginner',
      medicalHistory: JSON.stringify(['mild asthma']),
      measurements: JSON.stringify({ weight: 65, height: 165, bodyFat: 28 }),
    },
    {
      professionalId: 1,
      email: 'mike.johnson@example.com',
      name: 'Mike Johnson',
      phone: '+254700555555',
      dateOfBirth: '1988-03-10',
      healthGoals: JSON.stringify(['gain muscle mass', 'increase strength']),
      fitnessLevel: 'advanced',
      medicalHistory: JSON.stringify(['no conditions']),
      measurements: JSON.stringify({ weight: 95, height: 175, bodyFat: 15 }),
    },
    {
      professionalId: 1,
      email: 'sarah.williams@example.com',
      name: 'Sarah Williams',
      phone: '+254700444444',
      dateOfBirth: '1992-11-30',
      healthGoals: JSON.stringify(['lose 10kg', 'improve endurance']),
      fitnessLevel: 'beginner',
      medicalHistory: JSON.stringify(['no allergies']),
      measurements: JSON.stringify({ weight: 75, height: 170, bodyFat: 30 }),
    },
    {
      professionalId: 1,
      email: 'david.brown@example.com',
      name: 'David Brown',
      phone: '+254700333333',
      dateOfBirth: '1987-07-20',
      healthGoals: JSON.stringify(['improve posture', 'reduce back pain']),
      fitnessLevel: 'intermediate',
      medicalHistory: JSON.stringify(['chronic back pain']),
      measurements: JSON.stringify({ weight: 80, height: 178, bodyFat: 20 }),
    },
  ];

  let clientCount = 0;
  clients.forEach((client) => {
    db.run(
      `INSERT INTO clients (professionalId, email, name, phone, dateOfBirth, healthGoals, fitnessLevel, medicalHistory, measurements)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client.professionalId,
        client.email,
        client.name,
        client.phone,
        client.dateOfBirth,
        client.healthGoals,
        client.fitnessLevel,
        client.medicalHistory,
        client.measurements,
      ],
      function(err) {
        if (err) {
          console.error(`Error inserting client ${client.name}:`, err.message);
        } else {
          clientCount++;
          if (clientCount === clients.length) {
            console.log(`Inserted ${clientCount} clients`);
            insertAppointments(professionalId);
          }
        }
      }
    );
  });
}

// Insert sample appointments
function insertAppointments(professionalId) {
  console.log('Inserting sample appointments...');

  const today = new Date();
  const appointments = [
    {
      professionalId: professionalId,
      clientId: 1,
      startTime: new Date(today.getTime() + 86400000).toISOString().slice(0, 19).replace('T', ' '),
      endTime: new Date(today.getTime() + 90000000).toISOString().slice(0, 19).replace('T', ' '),
      type: 'session',
      status: 'scheduled',
      notes: 'Initial consultation and assessment',
    },
    {
      professionalId: professionalId,
      clientId: 2,
      startTime: new Date(today.getTime() + 172800000).toISOString().slice(0, 19).replace('T', ' '),
      endTime: new Date(today.getTime() + 179000000).toISOString().slice(0, 19).replace('T', ' '),
      type: 'session',
      status: 'scheduled',
      notes: 'Yoga session for flexibility',
    },
    {
      professionalId: professionalId,
      clientId: 3,
      startTime: new Date(today.getTime() + 259200000).toISOString().slice(0, 19).replace('T', ' '),
      endTime: new Date(today.getTime() + 266000000).toISOString().slice(0, 19).replace('T', ' '),
      type: 'session',
      status: 'scheduled',
      notes: 'Strength training session',
    },
    {
      professionalId: professionalId,
      clientId: 1,
      startTime: new Date(today.getTime() + 345600000).toISOString().slice(0, 19).replace('T', ' '),
      endTime: new Date(today.getTime() + 353000000).toISOString().slice(0, 19).replace('T', ' '),
      type: 'assessment',
      status: 'scheduled',
      notes: 'Progress assessment',
    },
    {
      professionalId: professionalId,
      clientId: 4,
      startTime: new Date(today.getTime() + 432000000).toISOString().slice(0, 19).replace('T', ' '),
      endTime: new Date(today.getTime() + 440000000).toISOString().slice(0, 19).replace('T', ' '),
      type: 'session',
      status: 'completed',
      notes: 'Completed weight loss session',
    },
    {
      professionalId: professionalId,
      clientId: 5,
      startTime: new Date(today.getTime() + 518400000).toISOString().slice(0, 19).replace('T', ' '),
      endTime: new Date(today.getTime() + 526000000).toISOString().slice(0, 19).replace('T', ' '),
      type: 'session',
      status: 'scheduled',
      notes: 'Posture correction session',
    },
  ];

  let appointmentCount = 0;
  appointments.forEach((apt) => {
    db.run(
      `INSERT INTO appointments (professionalId, clientId, startTime, endTime, type, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        apt.professionalId,
        apt.clientId,
        apt.startTime,
        apt.endTime,
        apt.type,
        apt.status,
        apt.notes,
      ],
      function(err) {
        if (err) {
          console.error(`Error inserting appointment:`, err.message);
        } else {
          appointmentCount++;
          if (appointmentCount === appointments.length) {
            console.log(`Inserted ${appointmentCount} appointments`);
            insertProgressTracking(professionalId);
          }
        }
      }
    );
  });
}

// Insert sample progress tracking
function insertProgressTracking(professionalId) {
  console.log('Inserting sample progress tracking...');

  const progress = [
    {
      clientId: 1,
      date: new Date().toISOString().slice(0, 10),
      weight: 84,
      bodyFat: 21,
      measurements: JSON.stringify({ chest: 100, waist: 85, hips: 95 }),
      workoutMetrics: JSON.stringify({ exercises: 5, sets: 20, reps: 80 }),
      notes: 'Good progress this week',
    },
    {
      clientId: 2,
      date: new Date().toISOString().slice(0, 10),
      weight: 66,
      bodyFat: 27,
      measurements: JSON.stringify({ chest: 92, waist: 78, hips: 88 }),
      workoutMetrics: JSON.stringify({ exercises: 4, sets: 15, reps: 60 }),
      notes: 'Starting yoga routine',
    },
    {
      clientId: 3,
      date: new Date().toISOString().slice(0, 10),
      weight: 94,
      bodyFat: 14,
      measurements: JSON.stringify({ chest: 110, waist: 80, hips: 100 }),
      workoutMetrics: JSON.stringify({ exercises: 6, sets: 25, reps: 100 }),
      notes: 'Great strength gains',
    },
    {
      clientId: 4,
      date: new Date().toISOString().slice(0, 10),
      weight: 76,
      bodyFat: 29,
      measurements: JSON.stringify({ chest: 94, waist: 82, hips: 90 }),
      workoutMetrics: JSON.stringify({ exercises: 4, sets: 16, reps: 64 }),
      notes: 'Progress on weight loss goal',
    },
    {
      clientId: 5,
      date: new Date().toISOString().slice(0, 10),
      weight: 79,
      bodyFat: 19,
      measurements: JSON.stringify({ chest: 98, waist: 80, hips: 92 }),
      workoutMetrics: JSON.stringify({ exercises: 5, sets: 18, reps: 72 }),
      notes: 'Improving posture',
    },
  ];

  let progressCount = 0;
  progress.forEach((entry) => {
    db.run(
      `INSERT INTO progress_tracking (clientId, date, weight, bodyFat, measurements, workoutMetrics, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.clientId,
        entry.date,
        entry.weight,
        entry.bodyFat,
        entry.measurements,
        entry.workoutMetrics,
        entry.notes,
      ],
      function(err) {
        if (err) {
          console.error(`Error inserting progress entry:`, err.message);
        } else {
          progressCount++;
          if (progressCount === progress.length) {
            console.log(`Inserted ${progressCount} progress entries`);
            insertPrograms(professionalId);
          }
        }
      }
    );
  });
}

// Insert sample programs
function insertPrograms(professionalId) {
  console.log('Inserting sample programs...');

  const programs = [
    {
      professionalId: professionalId,
      clientId: 1,
      name: 'Weight Loss Program',
      type: 'workout',
      description: 'Comprehensive weight loss program with cardio and strength training',
      duration: 12,
      content: JSON.stringify({
        weeks: [
          { week: 1, exercises: ['Running 3x/week', 'Weight training 2x/week', 'Yoga 1x/week'] },
          { week: 2, exercises: ['Running 4x/week', 'HIIT 1x/week', 'Weight training 2x/week'] },
          { week: 3, exercises: ['Running 5x/week', 'Weight training 3x/week', 'Active recovery 1x/week'] },
        ],
      }),
      status: 'active',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 7776000000).toISOString().slice(0, 10),
    },
    {
      professionalId: professionalId,
      clientId: 2,
      name: 'Flexibility & Balance Program',
      type: 'workout',
      description: 'Yoga-based program to improve flexibility and balance',
      duration: 8,
      content: JSON.stringify({
        weeks: [
          { week: 1, exercises: ['Sun salutation 3x/week', 'Standing poses 2x/week', 'Restorative poses 1x/week'] },
          { week: 2, exercises: ['Sun salutation 4x/week', 'Backbends 2x/week', 'Restorative poses 1x/week'] },
          { week: 3, exercises: ['Sun salutation 5x/week', 'Balance poses 3x/week', 'Restorative poses 1x/week'] },
        ],
      }),
      status: 'active',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 6048000000).toISOString().slice(0, 10),
    },
    {
      professionalId: professionalId,
      clientId: 3,
      name: 'Muscle Building Program',
      type: 'workout',
      description: 'Intensive strength training program for muscle growth',
      duration: 16,
      content: JSON.stringify({
        weeks: [
          { week: 1, exercises: ['Bench press 3x/week', 'Squats 3x/week', 'Deadlifts 1x/week', 'Accessory exercises 3x/week'] },
          { week: 2, exercises: ['Bench press 4x/week', 'Squats 4x/week', 'Deadlifts 2x/week', 'Accessory exercises 4x/week'] },
          { week: 3, exercises: ['Bench press 4x/week', 'Squats 5x/week', 'Deadlifts 2x/week', 'Accessory exercises 5x/week'] },
        ],
      }),
      status: 'completed',
      startDate: new Date(Date.now() - 1209600000).toISOString().slice(0, 10),
      endDate: new Date(Date.now() - 604800000).toISOString().slice(0, 10),
    },
  ];

  let programCount = 0;
  programs.forEach((program) => {
    db.run(
      `INSERT INTO programs (professionalId, clientId, name, type, description, duration, content, status, startDate, endDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        program.professionalId,
        program.clientId,
        program.name,
        program.type,
        program.description,
        program.duration,
        program.content,
        program.status,
        program.startDate,
        program.endDate,
      ],
      function(err) {
        if (err) {
          console.error(`Error inserting program:`, err.message);
        } else {
          programCount++;
          if (programCount === programs.length) {
            console.log(`Inserted ${programCount} programs`);
            insertChatMessages(professionalId);
          }
        }
      }
    );
  });
}

// Insert sample chat messages
function insertChatMessages(professionalId) {
  console.log('Inserting sample chat messages...');

  const messages = [
    {
      professionalId: professionalId,
      clientId: 1,
      role: 'user',
      content: 'How is my weight loss progress going?',
      context: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
    },
    {
      professionalId: professionalId,
      clientId: 1,
      role: 'assistant',
      content: 'Great progress! You\'ve lost 1kg this week and your body fat has decreased by 1%. Keep up the good work with your cardio and strength training routine!',
    },
    {
      professionalId: professionalId,
      clientId: 2,
      role: 'user',
      content: 'What should I focus on in my yoga practice?',
    },
    {
      professionalId: professionalId,
      clientId: 2,
      role: 'assistant',
      content: 'Focus on your breath control and alignment. Start with sun salutations to warm up, then work on standing poses for balance, and finish with restorative poses to relax.',
    },
    {
      professionalId: professionalId,
      clientId: 3,
      role: 'user',
      content: 'My strength training routine is too intense. What should I do?',
    },
    {
      professionalId: professionalId,
      clientId: 3,
      role: 'assistant',
      content: 'It\'s important to listen to your body. You can reduce the volume by doing 2 sets instead of 3 for each exercise, or reduce the weight by 10-15%. Focus on form over intensity.',
    },
    {
      professionalId: professionalId,
      clientId: 4,
      role: 'user',
      content: 'Can you help me with my nutrition plan?',
    },
    {
      professionalId: professionalId,
      clientId: 4,
      role: 'assistant',
      content: 'Of course! I can create a personalized nutrition plan for you. Based on your goals, I recommend focusing on a calorie deficit of 500 calories per day, increasing protein intake, and eating more vegetables.',
    },
    {
      professionalId: professionalId,
      clientId: 5,
      role: 'user',
      content: 'How can I improve my posture?',
    },
    {
      professionalId: professionalId,
      clientId: 5,
      role: 'assistant',
      content: 'Good posture starts with awareness. Practice shoulder blade retractions, engage your core, and avoid slouching. I\'ve created a posture correction program for you that includes specific exercises and stretches.',
    },
  ];

  let messageCount = 0;
  messages.forEach((msg) => {
    db.run(
      `INSERT INTO chat_messages (professionalId, clientId, role, content, context)
       VALUES (?, ?, ?, ?, ?)`,
      [msg.professionalId, msg.clientId, msg.role, msg.content, msg.context],
      function(err) {
        if (err) {
          console.error(`Error inserting chat message:`, err.message);
        } else {
          messageCount++;
          if (messageCount === messages.length) {
            console.log(`Inserted ${messageCount} chat messages`);
            insertAnalyticsEvents(professionalId);
          }
        }
      }
    );
  });
}

// Insert sample analytics events
function insertAnalyticsEvents(professionalId) {
  console.log('Inserting sample analytics events...');

  const events = [
    {
      professionalId: professionalId,
      eventType: 'client_added',
      metadata: JSON.stringify({ count: 5 }),
    },
    {
      professionalId: professionalId,
      eventType: 'appointment_completed',
      metadata: JSON.stringify({ count: 1 }),
    },
    {
      professionalId: professionalId,
      eventType: 'program_created',
      metadata: JSON.stringify({ count: 3 }),
    },
    {
      professionalId: professionalId,
      eventType: 'message_sent',
      metadata: JSON.stringify({ count: 10 }),
    },
    {
      professionalId: professionalId,
      eventType: 'progress_updated',
      metadata: JSON.stringify({ count: 5 }),
    },
  ];

  let eventCount = 0;
  events.forEach((event) => {
    db.run(
      `INSERT INTO analytics_events (professionalId, eventType, metadata)
       VALUES (?, ?, ?)`,
      [event.professionalId, event.eventType, event.metadata],
      function(err) {
        if (err) {
          console.error(`Error inserting analytics event:`, err.message);
        } else {
          eventCount++;
          if (eventCount === events.length) {
            console.log('Sample data insertion complete!');
            console.log('Database is ready to use');
          }
        }
      }
    );
  });
}

// Initialize
initDatabase();
insertSampleData();

module.exports = db;
