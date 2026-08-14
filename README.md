# EduBonke College Portal Prototype

EduBonke is a controlled, full-stack prototype for testing shared college administration workflows with South African private colleges. The working name has not yet completed formal company-name, trade-mark, domain or representative cultural clearance.

## What is implemented

- Sign-in-gated portal using the hosting platform's authenticated identity
- Separate institution workspaces with administrator, lecturer and viewer roles
- Shared learner register, attendance capture and announcements
- POPIA request register for access, correction, deletion and objection requests
- Institution-scoped queries and server-side permission checks
- Audit history for important write actions
- Managed relational storage and separate object-storage backup snapshots
- Portable JSON export for migration and recovery testing
- Database health endpoint and protective response headers
- Responsive public site and portal for desktop, tablet and mobile

## Prototype restriction

Use synthetic information only. Do not enter real learner names, identity numbers, contact details, results, disability information or other personal information. External pilot access should not begin until the responsible party, Information Officer, operator agreement, retention schedule, incident procedure and access list are approved.

## Hosting reality

GitHub can store this source code and GitHub Pages can publish the public static introduction. GitHub Pages cannot run the protected API routes, authentication, database or backup service. The working portal therefore requires a separate hosted application/backend.

The current test deployment uses:

- dispatch-owned sign-in for authentication;
- a managed D1 database for structured records;
- R2 object storage for on-demand backup snapshots; and
- server-side membership checks for institution and role access.

For a later GitHub Pages arrangement, keep the public landing page on Pages and point the portal link to the secure hosted application. Do not expose database credentials or service-role keys in the GitHub Pages bundle.

See [`docs/production-readiness.md`](docs/production-readiness.md) for the production migration gates.

## Local development

Requirements: Node.js 22.13 or newer, GNU `timeout`, `flock` and `curl`.

```bash
npm run install:ci
npm run db:generate
npm run dev
```

Useful checks:

```bash
npm run lint
npm test
```

Database migrations are stored under `drizzle/`. Logical platform bindings are declared in `.openai/hosting.json` as `DB` and `BUCKET`.

## Main routes

- `/` — public product introduction
- `/portal` — protected shared workspace
- `/privacy` — prototype privacy notice
- `/api/health` — non-sensitive database reachability check
- `/api/export` — administrator-only portable export
- `/api/backups` — administrator-only recovery snapshots
