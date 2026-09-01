# OurCloud Service Desk

A web-based IT Service Management (ITSM) platform for service desk technicians, customers, managers, and administrators.

**Design principle:** *Familiar first. Powerful second.*

## Phase 1A — Core Ticketing (current)

- Authentication with role-based permissions
- Users, teams, organisations, contacts
- Ticket CRUD with auto-generated ticket numbers (`OCSD-####`)
- Configurable workflow with status transitions
- Public replies and internal notes (separate, visually distinct)
- Activity timeline
- File attachments (local storage)
- Agent dashboard and ticket views
- Customer organisation management

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
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317)

### Demo accounts

| Email | Password | Role |
|-------|----------|------|
| admin@ourcloud.local | admin123 | Administrator |
| agent@ourcloud.local | agent123 | Agent |

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

- **Phase 1B:** Queues, search, time tracking, assets, customer portal, notifications, basic SLA
- **Phase 1C:** Full workflows, SLA engine, email-to-ticket, automation, knowledge base, reports
- **Phase 2:** Multi-tenancy, data centre deployment, integrations

## Production database

For production, set `DATABASE_URL` to a PostgreSQL connection string in `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/ourcloud_service_desk"
```

Then run `npx prisma migrate deploy`.
