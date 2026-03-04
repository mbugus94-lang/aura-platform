# Aura Platform - AI-Powered Wellness Business Management

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/Node.js-18+-yellow" alt="Node.js">
</p>

## 🎯 Features

- ✅ **Beautiful Web UI** - Modern, responsive dashboard interface
- ✅ **Client Management (CRM)** - Manage client profiles, health goals, and measurements
- ✅ **Appointment Scheduling** - Schedule sessions, consultations, and assessments
- ✅ **Progress Tracking** - Track client progress with weight, body fat, and measurements
- ✅ **Program Management** - Create and manage workout/nutrition programs
- ✅ **AI Chat Assistant** - 24/7 AI-powered health and fitness guidance
- ✅ **Analytics Dashboard** - Business metrics and performance tracking
- ✅ **Sample Data** - Pre-loaded with 5 clients, appointments, progress entries, and programs

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ installed
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/aura-platform.git
cd aura-platform

# Install dependencies
npm install

# Start the server
npm run dev
```

Open your browser and visit: **http://localhost:3000**

### Login Credentials

```
Email: demo@aura.com
Password: demo123
```

## 📸 Screenshots

The platform includes a beautiful web UI with:
- Login page with gradient background
- Dashboard with stats cards
- Client management table
- Appointment scheduling
- Progress tracking
- AI chat assistant
- And more!

## 📖 API Documentation

### Authentication

```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@aura.com","password":"demo123"}'
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | User login |
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create new client |
| GET | `/api/appointments` | List appointments |
| POST | `/api/appointments` | Create appointment |
| GET | `/api/progress/:clientId` | Get client progress |
| POST | `/api/progress` | Add progress entry |
| GET | `/api/programs` | List programs |
| POST | `/api/chat` | Send message to AI |
| GET | `/api/analytics/dashboard` | Dashboard stats |

## 🗄️ Database

Uses SQLite for persistent storage:
- Database file: `server/aura.db`
- Auto-created on first run
- Pre-loaded with sample data

## 🧪 Testing

```bash
# Run comprehensive API tests
node test/demo.js
```

## 📁 Project Structure

```
aura-platform/
├── public/
│   └── index.html          # Frontend UI
├── server/
│   ├── index.js            # API Server
│   ├── db.js               # Database operations
│   └── aura.db             # SQLite database
├── test/
│   └── demo.js             # API tests
├── README.md               # Documentation
├── LICENSE                 # MIT License
└── package.json            # Dependencies
```

## 🌟 Key Features

### 1. Client Management
- Add, edit, and delete clients
- Track health goals and fitness levels
- Store medical history and measurements

### 2. Appointment Scheduling
- Schedule training sessions
- Track appointment status (scheduled, completed, cancelled)
- Add notes for each session

### 3. Progress Tracking
- Record weight and body fat
- Track measurements
- Add progress notes

### 4. Program Management
- Create workout programs
- Set duration and goals
- Track program status

### 5. AI Chat Assistant
- 24/7 fitness guidance
- Nutrition advice
- Workout recommendations

### 6. Analytics Dashboard
- Total clients
- Appointment statistics
- Revenue tracking
- Completion rates

## 🔧 Configuration

Edit `server/index.js` to customize:

```javascript
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';
```

## 🧪 Running Tests

```bash
node test/demo.js
```

Expected output:
```
╔═══════════════════════════════════════════════════════════╗
║  🏋️ AURA PLATFORM - COMPREHENSIVE API TEST               ║
╚═══════════════════════════════════════════════════════════╝

🔐 Logging in...
✅ Logged in as: Demo Professional

🏥 Testing Health Check...
   Status: ok
   Database: connected

👥 Testing Clients API...
   ✅ Found 5 clients...
...
╔═══════════════════════════════════════════════════════════╗
║  🎉 ALL TESTS COMPLETED SUCCESSFULLY!                    ║
╚═══════════════════════════════════════════════════════════╝
```

## 🎓 Usage Example

### Using the Web UI

1. Open http://localhost:3000 in your browser
2. Login with demo credentials
3. Explore the dashboard, add clients, schedule appointments

### Using the API

```javascript
// Login
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@aura.com', password: 'demo123' })
});
const { token } = await loginRes.json();

// Get clients
const clientsRes = await fetch('/api/clients', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const clients = await clientsRes.json();
console.log(clients);
```

## 📝 Sample Data

The demo comes pre-loaded with:

- **5 Clients**: John Doe, Jane Smith, Mike Johnson, Sarah Williams, David Brown
- **6 Appointments**: Mix of scheduled and completed sessions
- **5 Progress Entries**: For tracking client improvements
- **3 Programs**: Yoga, muscle building, weight loss programs
- **10 Chat Messages**: AI responses to common fitness questions

## 🔮 Future Enhancements

- [ ] User registration and email verification
- [ ] File uploads for client documents
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Email notifications
- [ ] Mobile responsive UI improvements
- [ ] API rate limiting
- [ ] Advanced search and filtering
- [ ] Export reports (PDF, Excel)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

- **Your Name** - [Your Website](https://yourwebsite.com)

---

<p align="center">Built with ❤️ using Node.js, Express, SQLite, and vanilla JavaScript</p>

<p align="center">
  <a href="https://github.com/"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"></a>
</p>