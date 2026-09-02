# OurCloud Service Desk

A web-based IT Service Management (ITSM) platform for service desk technicians, customers, managers, and administrators.

**Design principle:** *Familiar first. Powerful second.*

## Phase 1A — Core Ticketing

- Authentication with role-based permissions
- Users, teams, organisations, contacts
- Ticket CRUD with auto-generated ticket numbers (`OCSD-####`)
- Configurable workflow with status transitions
- Public replies and internal notes (separate, visually distinct)
- Activity timeline
- File attachments (local storage)
- Agent dashboard and ticket views
- Customer organisation management

## Phase 1B — Service Desk

- Filter-based queues with pinning
- Ticket search and filter panel
- Ticket types (Incident, Service Request, Task) and categories
- Asset reference model with ticket linking
- Time tracking (quick log from ticket detail)
- Customer portal (create, view, reply to tickets)
- Basic SLA (due dates, at-risk dashboard widget)
- In-app notifications (email logged in dev console)
- Manager dashboard SLA widgets
- Board view with drag-and-drop status changes
- Editable dashboard layout
- User role assignment in admin

## Phase 1C — Advanced Service Management (current)

- Workflow builder with transition conditions
- Full SLA engine (business hours, holidays, pause/resume, escalation)
- Email-to-ticket worker (`npm run email:worker`)
- Automation rules (triggers, conditions, actions)
- Knowledge base (articles, categories)
- Service agreements with time allowance
- Reports and CSV export
- Admin-defined custom fields
- Problem and Change ticket types
- Custom roles with configurable permissions
- **Customer portal** — passwordless public support (submit tickets, email magic links for updates)

## Tech stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, domain services
- **Database:** SQLite (dev) / PostgreSQL (production) via Prisma
- **Auth:** Auth.js (NextAuth v5) with credentials

## Getting started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
npm run db:setup   # safe to re-run — skips if already seeded
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317) (use this URL consistently — do not mix with `localhost`).

If `npm run dev` reports port 4317 is in use, the server is already running — just open the URL above.

To wipe and re-seed the database:

```bash
npm run db:reset
```

To seed Phase 1B or 1C data on an existing database:

```bash
npm run db:seed:phase1b
npm run db:seed:phase1c
```

To process inbound emails and SLA escalations:

```bash
npm run email:worker
```

### Customer portal (no sign-in)

Customers submit support requests without creating an account. After submission they receive an email with a secure link to view the ticket, reply, and see status updates. Your team is notified in the agent console as usual.

| Page | URL |
|------|-----|
| Support home | `http://127.0.0.1:4317/support` |
| Submit request | `http://127.0.0.1:4317/support/submit` |
| Embed widget | `http://127.0.0.1:4317/embed/support` |

Copy integration links and embed code from **Administration → System**.

**Email notifications** (logged to the server console in development):

- Ticket created — confirmation with magic link
- Agent reply — preview and link to conversation
- Status change — updated status with link

Set `PORTAL_BASE_URL` in production so email links use your public domain.

### Demo accounts

| Email | Password | Role |
|-------|----------|------|
| admin@ourcloud.local | admin123 | Administrator |
| agent@ourcloud.local | agent123 | Agent |
| john.smith@abc-limited.example | customer123 | Customer (legacy portal login) |

## Project structure

```
src/
  app/
    app/          # Agent console
    login/        # Authentication
    api/v1/       # REST API
  components/     # UI components
  domain/         # Business logic
  lib/            # Auth, Prisma, permissions
docs/
  DECISIONS.md    # Pre-implementation decisions
  SIGN-OFF.md     # MVP scope approval
  PHASE-1A-DEVELOPMENT-PROMPT.md
  WIREFRAMES.md
prisma/
  schema.prisma   # Data model
  seed.ts         # Demo data
```

## Documentation

- [Product decisions](docs/DECISIONS.md)
- [Phase 1A development prompt](docs/PHASE-1A-DEVELOPMENT-PROMPT.md)
- [Wireframes](docs/WIREFRAMES.md)

## Roadmap

- **Phase 1A–1C:** Core ticketing through advanced service management (complete)
- **Phase 2:** Multi-tenancy, data centre deployment, integrations, SSO

## Production database

For production, set `DATABASE_URL` to a PostgreSQL connection string in `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/ourcloud_service_desk"
```

Then run `npx prisma migrate deploy`.
