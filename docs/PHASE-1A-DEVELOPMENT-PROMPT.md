# Phase 1A Development Prompt — OurCloud Service Desk

Use this prompt to implement or continue Phase 1A systematically.

## Context

OurCloud Service Desk is an ITSM platform. Phase 1A delivers core ticketing for the **Agent Console**. See the full specification and [DECISIONS.md](./DECISIONS.md) for product decisions.

## Stack

- Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Prisma ORM — SQLite for local dev, PostgreSQL for production
- Auth.js (NextAuth v5) with credentials provider
- Zod validation; domain logic in `src/domain/`

## Route structure

```
src/app/
  (auth)/login/
  (agent)/app/           # Agent console (protected)
    dashboard/
    tickets/
    tickets/[id]/
    tickets/new/
    customers/
    customers/[id]/
    admin/users/
  api/v1/                # REST endpoints
  portal/                # Stub only in 1A (redirect or coming soon)
```

## Database (Prisma)

Implement with `tenant_id` on all business tables:

- tenants, users, roles, permissions, role_permissions, user_roles
- teams, team_members
- organisations, contacts
- workflows, workflow_statuses, workflow_transitions
- ticket_types, priorities
- tickets, ticket_comments, ticket_internal_notes, ticket_attachments, ticket_activity
- ticket_sequences (for OCSD-#### numbers)

Seed: one tenant, default workflow, priorities, types (Incident, Service Request), system roles, demo users (admin, agent), sample organisation and tickets.

## Domain services (`src/domain/`)

- `tickets.ts` — CRUD, transitions, ticket number generation
- `comments.ts` — public replies only
- `internal-notes.ts` — separate from comments
- `activity.ts` — append-only timeline
- `attachments.ts` — StorageProvider interface, local filesystem impl
- `permissions.ts` — check user permission keys
- `organisations.ts`, `contacts.ts`, `users.ts`

## API endpoints (minimum)

```
POST   /api/v1/auth/login
GET    /api/v1/tickets
POST   /api/v1/tickets
GET    /api/v1/tickets/:id
PATCH  /api/v1/tickets/:id
POST   /api/v1/tickets/:id/transition
GET    /api/v1/tickets/:id/activity
GET/POST /api/v1/tickets/:id/comments
GET/POST /api/v1/tickets/:id/internal-notes
GET/POST /api/v1/tickets/:id/attachments
GET    /api/v1/organisations
GET    /api/v1/organisations/:id
GET    /api/v1/users/me
```

## UI priorities (build order)

1. **Ticket detail** — workstation: header (status, priority, assignee), timeline, reply vs internal note compose, transitions, attachments
2. **Ticket list** — views: All, My, Unassigned, Open, In Progress, Waiting, Resolved
3. **Create ticket** — form with org, contact, type, priority, subject, description
4. **Dashboard** — my open tickets, unassigned count
5. **Customers** — organisation list and detail with contacts/tickets tabs
6. **Login**

## UX rules

- Blue = Reply to Customer; Amber = Internal Note; Grey = system events
- Separate compose buttons — never one box with a checkbox
- Status badges colour-coded consistently
- Left sidebar navigation per specification IA (Queues stubbed as "Coming in 1B")

## Permissions (enforce in API)

Seed roles: administrator, agent, senior_agent, team_leader, manager, customer.

Phase 1A minimum: `tickets.*`, `customers.view`, `admin.users` for admin routes.

## Demo credentials (seed)

| Email | Password | Role |
|-------|----------|------|
| admin@ourcloud.local | admin123 | Administrator |
| agent@ourcloud.local | agent123 | Agent |

## Definition of done

- [ ] Login works; unauthenticated users redirected
- [ ] Create, view, list, update tickets
- [ ] Workflow transitions with required fields (resolution on resolve)
- [ ] Public comments and internal notes isolated
- [ ] Activity timeline records all changes
- [ ] File upload/download for attachments
- [ ] Dashboard shows counts and recent tickets
- [ ] README with setup instructions
