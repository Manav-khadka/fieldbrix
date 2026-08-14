# Fieldbrix — User Story Document

*Compiled from `firstdoc_fable_5.md` (Parts D, E), `Configurable_Field_Service_MVP_Requirements.docx`, and `field_service_platform_schema.sql` (customer_confirmations, target_registration_requests, notifications tables). Source of truth for product scope remains the handbook/blueprint — update there first, then re-sync this file.*

**Phase tags used below:**
- `[MVP]` — in the no-account, signature/OTP confirmation build (MVP Requirements doc)
- `[Growth+]` — full white-label Customer Portal (Blueprint Part D5), later phase

---

## 1. Personas (brief)

| Persona | Who | MVP access |
|---|---|---|
| **Client / Customer** | The AMC client or one-off service recipient — a facility manager, homeowner, or site contact | No login required; confirms via signature/OTP at point of service `[MVP]`; full self-service portal `[Growth+]` |
| Field Technician | Mobile-app user who executes the visit | Full app |
| Dispatcher / Coordinator | Back-office scheduler | Web console |
| Owner / Admin | Business owner | Web console + mobile digest |

This document focuses on the **Client** persona.

---

## 2. Brief Client User Journey

1. **Request raised** — Client calls in, messages on WhatsApp, or (later) logs into the portal to report an issue or request a scheduled AMC visit. A ticket is created; duplicate-ticket detection catches repeat reports of the same site+asset+issue.
2. **Confirmation & ETA** — Client gets a booking confirmation. On visit day, a technician-assigned card arrives (name, photo, ETA) with an expiring, no-login live-tracking link, Uber-style.
3. **Visit in progress** — Technician arrives, works the job against the contract's entitlements (client sees upfront what's free vs. billable — no on-site pricing disputes). Client can watch technician approach via the tracking link.
4. **Completion & confirmation** — At visit end, technician shows a short summary (target/area, complaint, work done, parts used, result, follow-up recommendation). Client confirms by **signature** (offline-capable) or **OTP** (needs connectivity) — **no account needed** `[MVP]`. If client is unavailable, a reason is logged and a supervisor review flag is raised.
5. **Report & invoice** — An auto-generated service report (AI-drafted from checklist+photos, editable by the tech) is sent as a PDF via WhatsApp/email once the device syncs. Invoice follows per the contract's billing schedule.
6. **Payment** — Client pays via UPI/QR, payment link, card, or records cash/cheque with the technician (photo evidence); receipt sent digitally.
7. **Rating & feedback** — Client rates the visit (CSAT); can escalate directly if unhappy.
8. **Renewal (AMC clients)** — 90/60/30/7-day renewal ladder: client receives an auto-drafted renewal quote, e-accepts via WhatsApp or portal; lapsed-but-uncontacted accounts are flagged internally so no one falls through.
9. **Self-service (Growth+)** — Once the white-label portal ships, the client can log in directly to raise/track tickets, approve quotes, view AMC contract + full visit history per asset, see invoices, pay online, and — for B2B facility clients — see a multi-site rollup dashboard and SLA reports.

---

## 3. User Stories

### Epic: Service Request / Ticketing

- **US-1** `[MVP]` As a client, I want to report an issue or request a visit through a channel I already use (phone/WhatsApp), so that I don't need to learn a new system to get service.
  - AC: Ticket created from phone-call logging, WhatsApp, or email parse.
  - AC: Duplicate detection — same site+asset+issue within N hours triggers a merge prompt instead of a second ticket.
- **US-2** `[Growth+]` As a client, I want to raise and track a ticket myself with photos attached, so that I don't have to call and explain the problem verbally.

### Epic: Visit Day / Live Tracking

- **US-3** `[MVP/Growth+]` As a client, I want to know who is coming and when, so that I can plan my day around the visit.
  - AC: Technician-assigned card shows name, photo, ETA.
  - AC: Live-tracking link works with no login and expires after the visit.
- **US-4** As a client, I want to see what's covered under my contract before work starts, so that there are no surprise charges.
  - AC: Entitlement engine shows free-vs-billable at job time, visible to both tech and client via the service report.

### Epic: Completion Confirmation

- **US-5** `[MVP]` As a client, I want to confirm the work was done without creating an account, so that giving feedback is fast and frictionless.
  - AC: Confirmation via signature (captures signer name, designation/relationship, date/time — works fully offline) or OTP (short-lived code, requires connectivity).
  - AC: If I'm unavailable, the system records a reason and flags the job for supervisor review instead of forcing a false confirmation.
- **US-6** As a client, I want a clear summary before I confirm, so that I know exactly what I'm signing off on.
  - AC: Summary includes target/area, complaint, work performed, parts/materials used, final result, follow-up recommendation.

### Epic: Service Report & Invoicing

- **US-7** As a client, I want a written record of the visit sent to me automatically, so that I have proof of service for warranty/audit purposes.
  - AC: PDF service report delivered via WhatsApp/email once the technician's device syncs.
- **US-8** As a client, I want to receive and pay my invoice digitally, so that I don't need to handle cash or chase down a bill.
  - AC: UPI/QR, payment link, or card supported (region-dependent); cash/cheque payments recorded with photo evidence.
  - AC: Invoice types match my billing arrangement — per-job, per-contract-schedule, or consolidated monthly.

### Epic: AMC Contract & Renewal

- **US-9** As an AMC client, I want to see my contract's coverage and visit history per asset, so that I trust what I'm paying for.
- **US-10** As an AMC client, I want to be notified well before my contract lapses, so that I can renew without a service gap.
  - AC: Renewal ladder at 90/60/30/7 days; auto-drafted renewal quote; e-acceptance via WhatsApp or portal.

### Epic: Feedback & Escalation

- **US-11** As a client, I want to rate the service after each visit, so that quality issues get surfaced.
- **US-12** As a client, I want a direct way to escalate if I'm unhappy, so that I'm not stuck waiting for the next scheduled contact.

### Epic: Self-Service Portal (Growth+, future)

- **US-13** `[Growth+]` As a client, I want to log into a portal to see all my sites, assets, contracts, and invoices in one place, so that I don't have to call for information I could look up myself.
- **US-14** `[Growth+]` As a B2B facility-management client, I want a multi-site rollup dashboard with SLA reports, so that I can report compliance to my own stakeholders.

---

## 4. Supporting touchpoints (other roles, for context)

- **Technician**: presents the completion summary, captures signature/OTP, cannot alter a confirmed record beyond a config-set window.
- **Dispatcher**: sees ticket intake from all client channels in one queue; resolves duplicate-ticket merges.
- **Supervisor**: reviews any job flagged "customer unavailable" or "customer refused confirmation."

---

*Gap note: this document is built entirely from existing specs — no new product decisions were made. If client-side research (interviews, support tickets, NPS verbatims) exists elsewhere, fold it in to replace the `[R]`-sourced assumptions inherited from the blueprint.*
