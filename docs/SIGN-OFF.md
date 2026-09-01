# OurCloud Service Desk — Specification Sign-Off Record

## Document

- **Specification:** OurCloud Service Desk Product & Technical Specification (Sections A–AF)
- **Version:** 1.0
- **Date:** 2026-09-01

## MVP scope approved

**Phase 1A — Core Ticketing** is approved for implementation with the following scope:

1. Project scaffold (Next.js, TypeScript, Tailwind, Prisma, auth)
2. Users, teams, roles, permissions (system roles)
3. Organisations and contacts
4. Ticket CRUD with auto ticket numbers and default workflow
5. Status transitions, priority, assignment
6. Public comments and internal notes (separate tables/APIs)
7. Activity timeline
8. Basic file attachments (local storage via StorageProvider abstraction)
9. Agent dashboard (my tickets, unassigned count)
10. Ticket list with default views

## Out of scope for Phase 1A

Queues, search, time tracking, assets, customer portal, SLA, notifications, knowledge base, reports, email-to-ticket, automation — deferred per feature matrix to Phase 1B/1C.

## Pre-implementation decisions

All "Decide now" items resolved in [DECISIONS.md](./DECISIONS.md).

## Approval status

| Role | Status | Notes |
|------|--------|-------|
| Product / Architecture | Approved | Proceed with Phase 1A implementation |
| Engineering | Approved | Stack: Next.js 14+, TypeScript, Tailwind, shadcn/ui, Prisma, SQLite (dev) / PostgreSQL (production) |

## Conditions

- `tenant_id` on all business tables from day one
- Internal notes must never be exposed via customer-facing APIs
- Permissions enforced at API layer, not UI only
