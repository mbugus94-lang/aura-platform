# Fluxora Launch Package

## 1) Release Commit Message

### Commit title
`feat: rebrand Aura Platform to Fluxora and ship service-OS production baseline`

### Commit body
```
- Rebranded product/UI/docs from Aura Platform to Fluxora
- Shifted positioning from fitness-specific to service-industry focused
- Added env-based runtime configuration (PORT, JWT_SECRET, APP_NAME, CORS_ORIGINS)
- Removed insecure demo password bypass; enforced bcrypt credential checks
- Added auth route rate limiting for login/register
- Added new system ops endpoints:
  - GET /api/system/summary
  - GET /api/system/export
- Redesigned frontend dashboard:
  - theme toggle
  - backup export action
  - quick insights KPIs
  - client search/filter
- Updated docs and metadata:
  - README, API docs, launch notes, env example, package metadata
- Updated test scripts to align with secure login and service-ops flows
```

## 2) GitHub Repository Description

### Primary description (recommended)
`Fluxora is an open-source service business OS for client management, scheduling, invoicing, analytics, and AI-assisted operations.`

### Short alternative
`Open-source service business OS with CRM, scheduling, invoicing, analytics, and AI ops assistant.`

## 3) Suggested GitHub Topics

Use these as repository topics:

`service-business`
`crm`
`scheduling`
`invoicing`
`operations`
`small-business`
`saas-boilerplate`
`open-source`
`nodejs`
`express`
`sqlite`
`jwt-auth`
`dashboard`
`analytics`
`ai-assistant`

## 4) Suggested GitHub Release Title

`Fluxora v1.1.0 - Service Business OS Launch`

## 5) Suggested GitHub Release Notes

```
Fluxora is now launch-ready as a service-industry platform.

Highlights:
- Full rebrand from Aura Platform to Fluxora
- Product focus expanded beyond fitness to multi-service use cases
- Security improvements (credential validation hardening + auth rate limiting)
- Operational intelligence endpoints for summary + full data export
- Improved dashboard UX with theme toggle, quick insights, and client filtering
- Updated documentation and env-based production configuration

This release is ideal for teams shipping a self-hosted, open-source service business stack with a practical API-first architecture.
```
