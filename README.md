# Fluxora - Service Business Management

Fluxora is an open-source platform for running service businesses across verticals like consulting, agencies, clinics, training, and maintenance services.

It ships with:
- Client CRM
- Appointment scheduling
- Service delivery notes (progress tracking)
- Program/work package management
- Invoicing
- Basic marketing workflows
- AI operations assistant (mock responses)

## Production-oriented updates in this build
- Removed insecure demo password bypass
- Added environment-based runtime config (`PORT`, `JWT_SECRET`, `APP_NAME`, `CORS_ORIGINS`)
- Added auth route rate limiting
- Added `system/summary` and `system/export` operational endpoints
- Added UI enhancements: theme toggle, client search, one-click JSON backup export
- Added `.env.example`
- Updated UI and docs to be service-industry generic

## Quick start
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Demo credentials:
- Email: `demo@aura.com`
- Password: `demo123`

## Environment configuration
Copy `.env.example` values into your environment:

- `NODE_ENV=development|production`
- `PORT=3000`
- `APP_NAME=Fluxora`
- `JWT_SECRET=<strong secret in production>`
- `CORS_ORIGINS=<comma-separated origins, optional>`

## API docs
See [API.md](API.md).

## Project structure
```
aura-platform/
|-- public/index.html
|-- server/index.js
|-- server/db.js
|-- test/demo.js
```

## Notes
- Database is SQLite and is created/seeded automatically.
- Some legacy fitness-oriented endpoints/tables remain for backward compatibility, but the default product language and workflow are now service-industry focused.
