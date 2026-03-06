// Comprehensive API smoke test
// Run: node test/demo.js

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path}: ${data.error || res.statusText}`);
  return data;
}

function authHeaders() {
  return { Authorization: `Bearer ${authToken}` };
}

async function login() {
  const data = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@aura.com', password: 'demo123' }),
  });
  authToken = data.token;
  console.log('Logged in as:', data.user.name);
}

async function run() {
  console.log('Aura Platform API test start\n');

  await login();

  const health = await request('/health');
  console.log('Health:', health.status);

  const clients = await request('/clients', { headers: authHeaders() });
  console.log('Clients:', clients.length);

  const appointments = await request('/appointments', { headers: authHeaders() });
  console.log('Appointments:', appointments.length);

  const progress = await request('/progress/1', { headers: authHeaders() });
  console.log('Service notes/progress entries for client 1:', progress.length);

  const programs = await request('/programs', { headers: authHeaders() });
  console.log('Programs:', programs.length);

  const chat = await request('/chat', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'How can I improve appointment attendance?' }),
  });
  console.log('Assistant response:', (chat.message || '').slice(0, 90));

  const dashboard = await request('/analytics/dashboard', { headers: authHeaders() });
  console.log('Dashboard total clients:', dashboard.totalClients);

  console.log('\nAPI test completed successfully.');
}

run().catch((err) => {
  console.error('API test failed:', err.message);
  process.exit(1);
});
