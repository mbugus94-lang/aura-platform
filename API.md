# Fluxora API

Base URL: `http://localhost:3000`

## Auth

### Login
`POST /api/auth/login`
```json
{
  "email": "demo@aura.com",
  "password": "demo123"
}
```

### Register
`POST /api/auth/register`

### Current user
`GET /api/auth/me`

All protected routes require:
`Authorization: Bearer <token>`

## Core resources

### Clients
- `GET /api/clients`
- `GET /api/clients/:id`
- `POST /api/clients`

Example create payload:
```json
{
  "email": "client@example.com",
  "name": "Client Name",
  "phone": "+1555000111",
  "healthGoals": ["fast support", "predictable delivery"]
}
```

Note: `healthGoals` is currently used as a generic "client needs" list for compatibility.

### Appointments
- `GET /api/appointments`
- `GET /api/appointments/:id`
- `POST /api/appointments`

### Service notes / progress
- `GET /api/progress/:clientId`
- `POST /api/progress`

Use this endpoint as service-delivery notes and KPI snapshots.

### Programs / work packages
- `GET /api/programs`
- `GET /api/programs/:id`
- `POST /api/programs`

### Chat assistant
- `POST /api/chat`
- `GET /api/chat/history`

### Analytics
- `GET /api/analytics/dashboard`

## Extended resources

These endpoints remain available:
- Nutrition (`/api/nutrition*`) - legacy compatibility
- Notifications (`/api/notifications*`)
- Exercises (`/api/exercises*`) - can be treated as task/procedure library
- Invoices (`/api/invoices*`)
- Goals (`/api/goals*`)
- Attendance (`/api/attendance*`)
- Marketing (`/api/marketing*`)

## Health
- `GET /api/health`

## System operations
- `GET /api/system/summary` (auth required)
  - Returns `upcomingAppointments`, `overdueInvoices`, `activeGoals`
- `GET /api/system/export` (auth required)
  - Returns a full JSON backup bundle for the signed-in professional

## Errors
Errors return JSON:
```json
{ "error": "message" }
```
