# OurCloud Service Desk — Pre-Implementation Decisions

Decisions recorded for the "Decide now" open questions (Section AD of the specification).

## 1. Ticket number format

**Decision:** `OCSD-{number}` (e.g. `OCSD-1042`)

- Human-readable and familiar to service desk technicians.
- Unique per tenant via a `ticket_sequences` counter table.
- Tenant prefix in number format deferred to Phase 2 multi-tenant commercial deployment.

## 2. Customer login model

**Decision:** Single user account linked to a contact record by email.

- A `users` row with role `customer` links to exactly one `contacts` row via `contact_id`.
- Portal login uses the same auth system as agents; role determines redirect (`/portal` vs `/app`).
- Contact email must be unique per tenant.

## 3. Default business hours timezone

**Decision:** `Europe/London` as the default tenant timezone.

- Stored in `tenants.settings.timezone` (JSON).
- Configurable per tenant in Administration → System Settings (Phase 1C UI; seeded in 1A).

## 4. Rich text editor

**Decision:** TipTap for ticket descriptions and public replies in Phase 1A.

- Internal notes use a plain textarea (faster, less risk of formatting leakage).
- Markdown stored as HTML in the database for descriptions/comments.

## 5. Soft delete policy

**Decision:**

| Action | Who |
|--------|-----|
| Archive (soft delete, `deleted_at` set) | Senior Agent, Team Leader, Manager, Administrator |
| Permanent delete | Administrator only (disabled in UI for MVP; archive only) |
| Customer | Cannot delete tickets; can close own tickets when policy allows (Phase 1B portal) |

## 6. Branding

**Decision:** Product name **OurCloud Service Desk** is confirmed.

- Agent console title: "OurCloud Service Desk"
- Customer portal title: "{Organisation Name} Support" with OurCloud footer attribution
- Co-branding via tenant `settings.branding` (logo URL, primary colour) — scaffolded in 1A, UI in 1C

## Phase 1B deferrals (recorded for reference)

- Timer auto-pause on Waiting status: **Yes** (default on)
- Max attachment size: **10 MB**; types: images, PDF, Office docs, txt, zip
- Customer-set priority: **Optional** (default Medium; customer can choose Low/Medium/High)
