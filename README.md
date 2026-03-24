# Aura Platform - AI-Powered Wellness Business Management

<p align="center">
  <a href="https://github.com/mbugus94-lang/aura-platform/stargazers">
    <img src="https://img.shields.io/github/stars/mbugus94-lang/aura-platform?style=social" alt="Stars">
  </a>
  <a href="https://github.com/mbugus94-lang/aura-platform/fork">
    <img src="https://img.shields.io/github/forks/mbugus94-lang/aura-platform?style=social" alt="Forks">
  </a>
  <img src="https://img.shields.io/badge/Version-1.0.7-blue" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/Node.js-18+-yellow" alt="Node.js">
</p>

<p align="center">
  <strong>🏋️ The open source alternative to Mindbody, Glofox, and Trainerize</strong><br>
  <em>AI-powered wellness business management - completely FREE</em>
</p>

---

## 🎯 Why Aura Platform?

| Feature | Aura Platform | Mindbody | Glofox | Trainerize |
|---------|---------------|----------|--------|------------|
| **Price** | 🆓 Free | $99/mo | $79/mo | $79/mo |
| **AI Assistant** | ✅ Built-in | ❌ | ❌ | ❌ |
| **Open Source** | ✅ | ❌ | ❌ | ❌ |
| **Setup Time** | 2 min | 2 weeks | 1 week | 3 days |
| **Self-Hosted** | ✅ | ❌ | ❌ | ❌ |

---

## ✨ Features

- 🤖 **AI Chat Assistant** - 24/7 AI-powered fitness & nutrition guidance
- 👥 **Client Management** - Full CRM with health goals, measurements, notes
- 📅 **Scheduling** - Appointment booking with calendar sync
- 📈 **Progress Tracking** - Weight, body fat, measurements over time
- 🎯 **Program Builder** - Create workout & nutrition programs
- 📊 **Analytics Dashboard** - Revenue, retention, and performance metrics
- 🔐 **Authentication** - JWT-based secure login system
- 💾 **Database** - SQLite (no setup required, ships with sample data)

---

## 🚀 Quick Start

### Installation (2 minutes!)

```bash
# Clone the repository
git clone https://github.com/mbugus94-lang/aura-platform.git
cd aura-platform

# Install dependencies
npm install

# Start the server
npm run dev
```

**Done!** Open http://localhost:3000 and login with:
- 📧 Email: `demo@aura.com`
- 🔑 Password: `demo123`

---

## 📸 Screenshots

### Login Page
Clean, modern authentication interface with secure JWT-based login.

### Dashboard
Comprehensive overview showing:
- Client statistics
- Revenue metrics  
- Upcoming appointments
- Recent activity feed

### AI Chat
Interactive AI assistant for:
- Fitness guidance
- Nutrition advice
- Business insights

> 💡 **Note:** See the live demo at `http://localhost:3000` after running the application.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite (better-sqlite3)
- **Authentication:** JWT, bcrypt
- **Frontend:** Vanilla JavaScript, HTML, CSS
- **API:** RESTful JSON API

---

## 📖 API Documentation

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@aura.com","password":"demo123"}'

# Get Clients (use token from login)
curl http://localhost:3000/api/clients \
  -H "Authorization: Bearer YOUR_TOKEN"

# AI Chat
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"What should I eat before a workout?"}'
```

See [API.md](API.md) for full documentation.

---

## 🔍 Health Checks

The API includes a health check endpoint for monitoring:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.7"
}
```

---

## 🎓 Use Cases

### For Personal Trainers
- Manage 20+ clients without spreadsheets
- AI assistant answers client questions 24/7
- Track progress automatically

### For Yoga Studios
- Simple scheduling system
- Member management
- Focus on teaching, not admin

### For Fitness Startups
- MVP for your business idea
- Extend with your own features
- Deploy anywhere

### For Developers
- Full-stack boilerplate
- Learn Node.js & SQLite
- Build your own fitness app

---

## 🏆 Why Open Source?

1. **No Vendor Lock-in** - Your data, your server, your rules
2. **Free Forever** - No monthly fees, ever
3. **Fully Customizable** - Change anything you want
4. **Community Driven** - Built by developers, for developers

---

## 📦 What's Included

```
aura-platform/
├── public/
│   └── index.html       # Beautiful web UI
├── server/
│   ├── index.js         # Express API server
│   ├── db.js            # SQLite database
│   └── aura.db          # Pre-loaded sample data
├── test/
│   └── demo.js          # API test suite
├── README.md            # This file
├── API.md               # Full API docs
└── package.json         # Dependencies
```

---

## 🧪 Testing

```bash
# Run comprehensive API tests
node test/demo.js
```

---

## 🐛 Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Change the port
PORT=3001 npm run dev
```

**Database locked:**
```bash
# Stop the server and delete lock files
rm server/aura.db-shm server/aura.db-wal
```

**Authentication errors:**
- Ensure you're using demo credentials: `demo@aura.com` / `demo123`
- Check JWT_SECRET is set in production

**npm install fails:**
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**SQLite errors:**
- Ensure better-sqlite3 is compatible with your Node version
- On Windows, you may need Visual Studio Build Tools

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE)

---

## 🔮 Roadmap

- [ ] User registration & roles
- [ ] File uploads for client documents
- [ ] Google Calendar integration
- [ ] Email notifications
- [ ] Payment processing (Stripe)
- [ ] Mobile app (React Native)
- [ ] Multi-language support

---

## 💬 Connect

- ⭐ Star this repo if you found it useful!
- 🐛 Report bugs via GitHub Issues
- 💡 Request features via GitHub Issues
- 📢 Share with your network!

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/mbugus94-lang">David Gakere</a>
</p>