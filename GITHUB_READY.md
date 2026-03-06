# Fluxora - GitHub Ready

## Current status
- Repository structure is clean and runnable.
- Product language has been generalized for service-industry use.
- Security baseline improved (real password verification, env-based runtime config).

## Included
- `server/index.js` API server
- `server/db.js` SQLite schema + seed data
- `public/index.html` web app UI
- `README.md` setup + usage
- `API.md` endpoint reference
- `.env.example` runtime configuration template
- `test/demo.js` API smoke test

## Quick run
```bash
npm install
npm run dev
node test/demo.js
```

## Demo credentials
- Email: `demo@aura.com`
- Password: `demo123`

## Pre-publish checklist
1. Set `JWT_SECRET` in production.
2. Set `CORS_ORIGINS` for your deployed frontend.
3. Remove or replace demo seed data in `server/db.js` for production rollout.
4. Add CI pipeline for lint/test/build/deploy.
5. Set `APP_NAME=Fluxora` (or your custom brand) in production environment.
