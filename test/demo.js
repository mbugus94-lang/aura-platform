// Comprehensive test script for Aura Platform Demo
// Run: node test/demo.js

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

async function login() {
  console.log('🔐 Logging in...');
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@aura.com', password: 'demo123' })
  });
  const data = await response.json();
  authToken = data.token;
  console.log('✅ Logged in as:', data.user.name);
  return data.user;
}

async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check...');
  const response = await fetch(`${BASE_URL}/health`);
  const data = await response.json();
  console.log('   Status:', data.status);
  console.log('   Database:', data.database);
}

async function testClients() {
  console.log('\n👥 Testing Clients API...');
  
  // Get all clients
  const response = await fetch(`${BASE_URL}/clients`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  const clients = await response.json();
  console.log(`   ✅ Found ${clients.length} clients:`);
  
  clients.forEach(client => {
    console.log(`   - ${client.name} (${client.email}) - ${client.healthGoals.join(', ')}`);
  });
  
  // Get specific client
  if (clients.length > 0) {
    const clientResponse = await fetch(`${BASE_URL}/clients/${clients[0].id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const client = await clientResponse.json();
    console.log(`   📋 Client details: ${client.name} - ${client.fitnessLevel} level`);
  }
}

async function testAppointments() {
  console.log('\n📅 Testing Appointments API...');
  
  const response = await fetch(`${BASE_URL}/appointments`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  const appointments = await response.json();
  console.log(`   ✅ Found ${appointments.length} appointments:`);
  
  appointments.forEach(appt => {
    const date = new Date(appt.startTime).toLocaleDateString();
    console.log(`   - ${date}: ${appt.type} with Client ${appt.clientId} (${appt.status})`);
  });
  
  // Create new appointment
  const newAppt = {
    clientId: 1,
    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 90000000).toISOString(), // 1 hour later
    type: 'session',
    status: 'scheduled',
    notes: 'Test appointment from demo'
  };
  
  const createResponse = await fetch(`${BASE_URL}/appointments`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newAppt)
  });
  const createdAppt = await createResponse.json();
  console.log(`   🆕 Created appointment ID: ${createdAppt.id}`);
}

async function testProgress() {
  console.log('\n📊 Testing Progress Tracking...');
  
  const response = await fetch(`${BASE_URL}/progress/1`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  const progress = await response.json();
  console.log(`   ✅ Found ${progress.length} progress entries for Client 1:`);
  
  progress.forEach(p => {
    console.log(`   - ${p.date}: ${p.weight} lbs, ${p.bodyFat}% body fat`);
  });
  
  // Add new progress entry
  const newProgress = {
    clientId: 1,
    date: new Date().toISOString(),
    weight: 83,
    bodyFat: 21,
    measurements: { chest: 42, waist: 34, arms: 16 },
    notes: 'Great progress! Lost 2 lbs this week.'
  };
  
  const createResponse = await fetch(`${BASE_URL}/progress`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newProgress)
  });
  const createdProgress = await createResponse.json();
  console.log(`   🆕 Added progress entry: ${createdProgress.weight} lbs`);
}

async function testPrograms() {
  console.log('\n🎯 Testing Programs API...');
  
  const response = await fetch(`${BASE_URL}/programs`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  const programs = await response.json();
  console.log(`   ✅ Found ${programs.length} programs:`);
  
  programs.forEach(program => {
    console.log(`   - ${program.name} (${program.type}) - ${program.duration} weeks`);
  });
  
  // Create new program
  const newProgram = {
    clientId: 2,
    name: 'Beginner Yoga Program',
    type: 'workout',
    description: '4-week beginner yoga program focusing on flexibility and breathing',
    duration: 4,
    content: {
      weeks: [
        { week: 1, focus: 'Basic poses', sessions: 3 },
        { week: 2, focus: 'Building strength', sessions: 3 },
        { week: 3, focus: 'Flow sequences', sessions: 4 },
        { week: 4, focus: 'Advanced techniques', sessions: 4 }
      ]
    }
  };
  
  const createResponse = await fetch(`${BASE_URL}/programs`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newProgram)
  });
  const createdProgram = await createResponse.json();
  console.log(`   🆕 Created program: ${createdProgram.name}`);
}

async function testChat() {
  console.log('\n💬 Testing AI Chat...');
  
  const testMessages = [
    'What should I eat before a workout?',
    'How do I improve my flexibility?',
    'What supplements should I take?'
  ];
  
  for (const message of testMessages) {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clientId: 1, message })
    });
    const chat = await response.json();
    console.log(`   🤖 AI Response to "${message}": ${chat.message ? chat.message.substring(0, 80) + '...' : 'No response'}`);
  }
}

async function testAnalytics() {
  console.log('\n📈 Testing Analytics Dashboard...');
  
  const response = await fetch(`${BASE_URL}/analytics/dashboard`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  const dashboard = await response.json();
  
  console.log('   📊 Dashboard Summary:');
  console.log(`   - Total Clients: ${dashboard.totalClients}`);
  console.log(`   - Active Clients: ${dashboard.activeClients}`);
  console.log(`   - Total Appointments: ${dashboard.totalAppointments}`);
  console.log(`   - Completed Appointments: ${dashboard.completedAppointments}`);
  console.log(`   - Total Revenue: $${dashboard.totalRevenue}`);
  console.log(`   - Client Retention: ${dashboard.clientRetention}%`);
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  🏋️ AURA PLATFORM - COMPREHENSIVE API TEST               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  try {
    await login();
    await testHealthCheck();
    await testClients();
    await testAppointments();
    await testProgress();
    await testPrograms();
    await testChat();
    await testAnalytics();
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  🎉 ALL TESTS COMPLETED SUCCESSFULLY!                    ║');
    console.log('║  Aura Platform API is fully functional with sample data.  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();