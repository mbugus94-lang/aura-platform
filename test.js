const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
let token = '';

async function testAPI() {
  console.log('🧪 Testing Aura Platform API...\n');

  try {
    // 1. Login
    console.log('1️⃣  Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'demo@aura.com',
      password: 'any-password'
    });
    token = loginResponse.data.token;
    console.log('✅ Login successful!');
    console.log(`   User: ${loginResponse.data.user.name}`);
    console.log(`   Email: ${loginResponse.data.user.email}`);
    console.log(`   Role: ${loginResponse.data.user.role}`);
    console.log('');

    // 2. Get clients
    console.log('2️⃣  Testing get clients...');
    const clientsResponse = await axios.get(`${BASE_URL}/api/clients`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Got ${clientsResponse.data.length} clients:`);
    clientsResponse.data.forEach(client => {
      console.log(`   - ${client.name} (${client.email})`);
    });
    console.log('');

    // 3. Get appointments
    console.log('3️⃣  Testing get appointments...');
    const appointmentsResponse = await axios.get(`${BASE_URL}/api/appointments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Got ${appointmentsResponse.data.length} appointments:`);
    appointmentsResponse.data.forEach(apt => {
      console.log(`   - ${apt.type}: ${apt.startTime} (${apt.status})`);
    });
    console.log('');

    // 4. Get progress
    console.log('4️⃣  Testing get progress...');
    const progressResponse = await axios.get(`${BASE_URL}/api/progress/1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Got ${progressResponse.data.length} progress entries:`);
    progressResponse.data.forEach(entry => {
      console.log(`   - ${entry.date}: ${entry.weight}kg, ${entry.bodyFat}% body fat`);
    });
    console.log('');

    // 5. Get programs
    console.log('5️⃣  Testing get programs...');
    const programsResponse = await axios.get(`${BASE_URL}/api/programs`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Got ${programsResponse.data.length} programs:`);
    programsResponse.data.forEach(program => {
      console.log(`   - ${program.name} (${program.type}) - ${program.status}`);
    });
    console.log('');

    // 6. Get chat history
    console.log('6️⃣  Testing get chat history...');
    const chatResponse = await axios.get(`${BASE_URL}/api/chat/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`✅ Got ${chatResponse.data.length} chat messages:`);
    chatResponse.data.slice(-3).forEach(msg => {
      console.log(`   - ${msg.role.toUpperCase()}: ${msg.content.substring(0, 60)}...`);
    });
    console.log('');

    // 7. AI Chat
    console.log('7️⃣  Testing AI chat...');
    const chatResponse2 = await axios.post(`${BASE_URL}/api/chat`, {
      clientId: 1,
      content: 'How is my weight loss progress going?'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ AI Response:');
    console.log(`   ${chatResponse2.data.message}`);
    console.log('');

    // 8. Analytics dashboard
    console.log('8️⃣  Testing analytics dashboard...');
    const analyticsResponse = await axios.get(`${BASE_URL}/api/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Dashboard Statistics:');
    console.log(`   Total Clients: ${analyticsResponse.data.totalClients}`);
    console.log(`   Active Clients: ${analyticsResponse.data.activeClients}`);
    console.log(`   Total Appointments: ${analyticsResponse.data.totalAppointments}`);
    console.log(`   Completed: ${analyticsResponse.data.completedAppointments}`);
    console.log(`   Scheduled: ${analyticsResponse.data.scheduledAppointments}`);
    console.log('');

    // 9. Create new client
    console.log('9️⃣  Testing create client...');
    const newClientResponse = await axios.post(`${BASE_URL}/api/clients`, {
      email: 'test@example.com',
      name: 'Test Client',
      phone: '+254700000000',
      healthGoals: ['test goal'],
      fitnessLevel: 'beginner',
      medicalHistory: ['no conditions'],
      measurements: { weight: 70, height: 165, bodyFat: 25 }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Created new client:');
    console.log(`   ${newClientResponse.data.name} (${newClientResponse.data.email})`);
    console.log('');

    // 10. Create appointment
    console.log('🔟 Testing create appointment...');
    const newAppointmentResponse = await axios.post(`${BASE_URL}/api/appointments`, {
      clientId: newClientResponse.data.id,
      startTime: new Date(Date.now() + 86400000).toISOString().slice(0, 19).replace('T', ' '),
      endTime: new Date(Date.now() + 90000000).toISOString().slice(0, 19).replace('T', ' '),
      type: 'session',
      notes: 'Test appointment'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Created new appointment:');
    console.log(`   ID: ${newAppointmentResponse.data.id}`);
    console.log(`   Type: ${newAppointmentResponse.data.type}`);
    console.log('');

    console.log('🎉 All tests passed!');
    console.log('');
    console.log('📚 API Documentation: http://localhost:3000');
    console.log('✅ Health check: http://localhost:3000/api/health');

  } catch (error) {
    console.error('❌ Test failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Run tests
testAPI();
