# OurCloud Service Desk — Wireframes (Phase 1A)

ASCII wireframes for key screens. Visual design uses OurCloud teal/blue palette, shadcn/ui components, left sidebar layout.

---

## Agent Console — Layout Shell

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [OC] OurCloud Service Desk          [Search...]              [User ▼]   │
├────────────┬─────────────────────────────────────────────────────────────┤
│ Dashboard  │                                                             │
│ Queues *   │                    MAIN CONTENT                             │
│ Tickets ▼  │                                                             │
│ Customers  │                                                             │
│ Admin      │                                                             │
│            │                                                             │
│ * Phase 1B │                                                             │
└────────────┴─────────────────────────────────────────────────────────────┘
```

---

## Ticket List

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Tickets › My Tickets                                    [+ New Ticket]  │
├─────────────────────────────────────────────────────────────────────────┤
│ Views: [All] [My] [Unassigned] [Open] [In Progress] [Waiting] [Resolved]│
├──────┬────────────────────────┬──────────────┬──────────┬───────┬───────┤
│ #    │ Subject                │ Customer     │ Status   │ Pri   │ Agent │
├──────┼────────────────────────┼──────────────┼──────────┼───────┼───────┤
│1042  │ Printer not printing   │ ABC Ltd      │●In Prog  │ High  │ Jane  │
│1041  │ New laptop request     │ XYZ Corp     │○ Open    │ Med   │ —     │
│1040  │ VPN connection issue   │ ABC Ltd      │◐ Waiting │ Low   │ Mike  │
└──────┴────────────────────────┴──────────────┴──────────┴───────┴───────┘
```

---

## Ticket Detail (primary workstation)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ OCSD-1042  Printer not printing                                         │
│ ABC Limited · John Smith                                                │
├────────────────────────────────────┬────────────────────────────────────┤
│ STATUS [In Progress ▼]  PRI [High ▼] │ ASSIGNEE [Jane Smith ▼]           │
│ TYPE Incident   TEAM [Service Desk]  │                                   │
├────────────────────────────────────┴────────────────────────────────────┤
│ [ Reply to Customer ]    [ Add Internal Note ]    [ Attach ] [ ••• ]   │
├─────────────────────────────────────────────────────────────────────────┤
│ Timeline: [ All ] [ Customer ] [ Internal ] [ System ]                  │
├─────────────────────────────────────────────────────────────────────────┤
│ 🔵 Agent Reply — Jane — Today 14:30                                     │
│    We've restarted the print spooler. Please try again.                 │
│                                                                         │
│ 🟡 Internal Note — Mike — Today 14:15                                   │
│    Confirmed AD account not locked. Spooler was stuck.                  │
│                                                                         │
│ ⚪ System — Status changed Open → In Progress (Jane)                    │
│                                                                         │
│ 🔵 Customer — John — Today 09:00                                        │
│    Printer on 3rd floor shows offline since this morning.               │
├─────────────────────────────────────────────────────────────────────────┤
│ Description                                                             │
│ HP LaserJet on 3rd floor shows offline. Tried rebooting, no change.     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Colour key:** Blue border = customer-visible · Amber border = internal only · Grey = system

---

## Dashboard (Technician)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Good morning, Jane                                                      │
├─────────────────────┬─────────────────────┬─────────────────────────────┤
│ My Open Tickets     │ Unassigned          │ Recently Updated            │
│       7             │       3             │                             │
├─────────────────────┴─────────────────────┴─────────────────────────────┤
│ My Open Tickets                                                         │
│ OCSD-1042  Printer not printing        In Progress   High               │
│ OCSD-1038  Email sync issue            Open          Medium             │
│ ...                                                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Customer Portal (Phase 1B — reference)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ABC Limited Support                              [John Smith ▼]         │
├────────────┬────────────────────────────────────────────────────────────┤
│ Home       │  Welcome back, John                                        │
│ Create     │                                                            │
│ My Tickets │  Open tickets: 2          [ Create New Ticket ]            │
│ Profile    │                                                            │
│            │  Recent tickets                                            │
│            │  OCSD-1042  Printer issue     In Progress                  │
│            │  OCSD-1035  Password reset    Resolved                     │
└────────────┴────────────────────────────────────────────────────────────┘
```

Customer portal is out of Phase 1A scope; included for design continuity.

---

## Create Ticket

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Create Ticket                                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ Customer *        [ ABC Limited          ▼ ]                            │
│ Contact           [ John Smith           ▼ ]                            │
│ Type *            [ Incident             ▼ ]                            │
│ Priority *        [ Medium               ▼ ]                            │
│ Subject *         [________________________________]                      │
│ Description *     [                                    ]                │
│                   [                                    ]                │
│ Assignee          [ Jane Smith (me)       ▼ ]                            │
│ Team              [ Service Desk          ▼ ]                            │
│                                                                         │
│                              [ Cancel ]  [ Create Ticket ]              │
└─────────────────────────────────────────────────────────────────────────┘
```
