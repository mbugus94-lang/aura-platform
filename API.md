# Aura Platform - Demo API Documentation

## Base URL
`http://localhost:3000`

## Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "demo@aura.com",
  "password": "any-password"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "demo@aura.com",
    "name": "Demo Professional",
    "businessName": "Aura Fitness",
    "bio": "Professional fitness coach...",
    "role": "professional",
    "subscriptionTier": "free"
  }
}
```

**Note:** For demo purposes, any password works with `demo@aura.com`

---

## Clients

### Get all clients
```http
GET /api/clients
Authorization: Bearer <token>
```

### Get client by ID
```http
GET /api/clients/:id
Authorization: Bearer <token>
```

### Create new client
```http
POST /api/clients
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "john@example.com",
  "name": "John Doe",
  "phone": "+254700123456",
  "healthGoals": ["lose weight", "build muscle"],
  "fitnessLevel": "intermediate",
  "medicalHistory": ["no allergies"],
  "measurements": {
    "weight": 85,
    "height": 180,
    "bodyFat": 22
  }
}
```

---

## Appointments

### Get all appointments
```http
GET /api/appointments
Authorization: Bearer <token>
```

### Get appointment by ID
```http
GET /api/appointments/:id
Authorization: Bearer <token>
```

### Create appointment
```http
POST /api/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": 1,
  "startTime": "2026-03-05 10:00:00",
  "endTime": "2026-03-05 11:00:00",
  "type": "session",
  "notes": "Initial consultation"
}
```

---

## Progress Tracking

### Get progress entries for client
```http
GET /api/progress/:clientId
Authorization: Bearer <token>
```

### Create progress entry
```http
POST /api/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": 1,
  "date": "2026-03-05",
  "weight": 84,
  "bodyFat": 21,
  "measurements": {
    "chest": 100,
    "waist": 85,
    "hips": 95
  },
  "workoutMetrics": {
    "exercises": 5,
    "sets": 20,
    "reps": 80
  },
  "notes": "Good progress this week"
}
```

---

## Programs

### Get all programs
```http
GET /api/programs
Authorization: Bearer <token>
```

### Get program by ID
```http
GET /api/programs/:id
Authorization: Bearer <token>
```

### Create program
```http
POST /api/programs
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": 1,
  "name": "Weight Loss Program",
  "type": "workout",
  "description": "Comprehensive weight loss program",
  "duration": 12,
  "content": {
    "weeks": [
      {
        "week": 1,
        "exercises": ["Running 3x/week", "Weight training 2x/week"]
      }
    ]
  },
  "status": "active",
  "startDate": "2026-03-05",
  "endDate": "2026-06-05"
}
```

---

## AI Chat

### Send message to AI assistant
```http
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": 1,
  "content": "How is my weight loss progress going?"
}
```

**Response:**
```json
{
  "message": "Great progress! You've lost 1kg this week and your body fat has decreased by 1%. Keep up the good work..."
}
```

### Get chat history
```http
GET /api/chat/history
Authorization: Bearer <token>
```

---

## Analytics

### Get dashboard statistics
```http
GET /api/analytics/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "totalClients": 5,
  "activeClients": 5,
  "totalAppointments": 10,
  "completedAppointments": 5,
  "scheduledAppointments": 5,
  "totalRevenue": 0,
  "avgRevenuePerClient": 0
}
```

---

## Sample Data

The demo includes:
- ✅ 5 sample clients
- ✅ 10 appointments
- ✅ 5 progress entries
- ✅ 3 programs
- ✅ 10 chat messages
- ✅ Analytics events

---

## Testing with curl

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@aura.com","password":"any"}' | jq -r '.token')

# 2. Get clients
curl http://localhost:3000/api/clients \
  -H "Authorization: Bearer $TOKEN"

# 3. Create appointment
curl -X POST http://localhost:3000/api/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": 1,
    "startTime": "2026-03-05 10:00:00",
    "endTime": "2026-03-05 11:00:00"
  }'
```

---

## License

MIT
