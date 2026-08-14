# Fieldbrix — Platform User Stories (all roles)

*Sourced from `firstdoc_fable_5.md` (D1 role/permission model, D2 web dashboards, D3-D4 mobile apps, D5-D6 customer surfaces, E1-E9 functional modules, G-A..G-E edge-case catalog) and `Configurable_Field_Service_MVP_Requirements.docx`. One line per story. Phase tags: `[MVP]` in the no-account confirmation build now; `[Growth+]` later phase.*

*Customer/client role is covered in depth in `USER_STORIES.md` and `CLIENT_USER_STORIES.md` (39 stories, journey, small/medium/large segmentation). This document adds Customer only as a condensed section for roster completeness — everything else here is new.*

---

## 1. Role roster

### Platform-internal (us, the SaaS operator)

| Role | Who | Core powers | Guardrails |
|---|---|---|---|
| Platform Super Admin | Runs the SaaS | Tenant lifecycle, billing, region migration, feature flags | 2-person rule on destructive ops; all actions audit-logged |
| Support Agent | Handles tenant support | Read-only tenant view; config fixes | Impersonation only with tenant admin's time-boxed consent token; banner visible; every action tagged |
| Compliance Officer (internal) | Handles regulatory obligations | DSAR/DPDP tooling, deletion jobs, audit exports | — |

### Tenant-side (the customer org)

| Role | Who | Core powers | Cannot |
|---|---|---|---|
| Owner / Admin | Proprietor, director | Everything incl. billing, config, user mgmt, export/delete | — |
| Operations / Service Manager | Daily runner of the business | Dispatch board, all jobs/customers, approvals, reports, config except billing/roles | Billing, role design, tenant delete |
| Dispatcher / Coordinator | Back-office scheduler | Create/assign/reassign jobs, customer comms, live map | Pricing overrides, HR data, config |
| Supervisor / Team Lead | Area/branch lead | Own-team jobs, approve regularizations, back-check queue | Other branches, payroll data |
| Field Technician / "Field Agent" | Mobile-app user | Own schedule/jobs/checklists/photos/parts/payment, own attendance | Other techs' pay/jobs; edit completed records past config window |
| Back Office / Accounts | Billing clerk | Quotes, invoices, payments, credit notes, Tally/QuickBooks export | Dispatch, HR |
| Inventory / Storekeeper | Stores | Stock master, GRN, issue-to-van, returns, reorder, cycle counts | Financial docs beyond stock value |
| HR / Payroll (lite) | HR clerk | Attendance summaries, shifts, leave policy, payroll export | Job/financial data |
| Auditor / Compliance (read-only) | External CA, franchise auditor | Read-only + audit-trail access, time-boxed | Any write |
| Subcontractor / Gig worker | Seasonal bench technician | Assigned jobs only, masked customer numbers, no pricing | Everything else |
| Customer (portal) | The AMC client | See `USER_STORIES.md` / `CLIENT_USER_STORIES.md` | Anything cross-customer |

---

## 2. Brief per-role journey

**Platform Super Admin** — provisions and manages tenants (create, suspend, migrate region), controls billing config and feature-flag rollout across the whole platform. Never touches a single tenant's day-to-day data. Every destructive action needs a second approver and lands in the global audit log.

**Support Agent** — picks up a tenant's support ticket, views their data read-only to diagnose it. If acting *as* a user is needed, requests a time-boxed consent token from the tenant admin first; an impersonation banner stays visible the whole time, and every impersonated action is tagged separately in the tenant's own audit trail.

**Compliance Officer (internal)** — processes DSAR/DPDP data-subject requests, runs deletion jobs once retention windows lapse, and pulls audit exports for regulators, legal, or an acquirer's due-diligence pack.

**Owner / Admin** — opens the day on the "business at a glance" home screen (jobs done/pending/overdue, the leak panel, AMC health, receivables aging). Approves leave/expense/discount/quote requests from the mobile app or a WhatsApp reply. Owns billing, full config, user management, and is the only role that can export or delete tenant data.

**Operations / Service Manager** — the daily runner: works the dispatch board, sees every job and customer, approves within policy, pulls reports — everything except billing and role design.

**Dispatcher / Coordinator** — works a single intake queue merging phone calls, WhatsApp, portal tickets, and parsed emails. Assigns and reassigns jobs by drag-drop on the day/week calendar, watches the live map, and runs the reassignment wizard when a technician goes on leave or quits.

**Supervisor / Team Lead** — owns a team scoreboard (jobs, first-time-fix %, ratings, punctuality), works an auto-selected back-check queue for QA, approves regularizations, and reviews anything flagged "customer unavailable" or "customer refused confirmation."

**Field Technician ("Field Agent")** — clocks in with geo+selfie attendance, follows an optimized route, opens each job card (customer, site notes, asset history, entitlements), executes with checklist+photos+parts, captures signature/OTP for completion, collects payment, and clocks out with a GPS-verified day summary and expense claims.

**Back Office / Accounts** — runs invoices (per-job, per-schedule, or consolidated monthly), reconciles payments across gateway/cash/cheque/bank-transfer, works the dunning ladder, and monitors the Tally/QuickBooks/Xero sync queue for errors.

**Inventory / Storekeeper** — tracks stock by warehouse and van, processes GRNs/issues/returns, acts on reorder alerts from consumption velocity, and runs mobile cycle counts against a shrinkage report.

**HR / Payroll (lite)** — maintains the geo-verified attendance register, shift roster, and leave calendar; exports payroll files in GreytHR/Keka/Tally formats; tracks the DPDP consent register; fast-onboards seasonal gig workers.

**Auditor / Compliance (read-only)** — gets a time-boxed account scoped to exactly what's being audited, reviews records plus the immutable audit trail, and exports evidence packs per job — never writes anything.

**Subcontractor / Gig worker** — onboarded fast via phone-number invite, sees only jobs assigned to them, calls customers through masked numbers, has no pricing visibility, and loses access automatically when the engagement ends.

**Customer (portal)** — see the dedicated client journey in `USER_STORIES.md` / `CLIENT_USER_STORIES.md`.

---

## 3. User stories per role

### Platform Super Admin (PSA)

| ID | Story |
|---|---|
| PSA1 | As Platform Super Admin, I want to provision a new tenant with region and starting plan, so that onboarding a customer takes minutes. |
| PSA2 | As Platform Super Admin, I want to suspend or migrate a tenant to another region without data loss. |
| PSA3 | As Platform Super Admin, I want to toggle feature flags per tenant, so that rollouts are staged, not all-or-nothing. |
| PSA4 | As Platform Super Admin, I want every destructive tenant action gated behind a 2-person rule, so that no single actor can damage a tenant unilaterally. |
| PSA5 | As Platform Super Admin, I want a global audit log across all platform-level actions. |
| PSA6 | As Platform Super Admin, I want to manage platform billing configuration and pricing plans centrally. |
| PSA7 | As Platform Super Admin, I want a non-paying tenant walked down the grace→read-only→export→archive ladder automatically, never hard-cut mid-shift. |
| PSA8 | As Platform Super Admin, I want visibility into cross-tenant automation/rate-limit incidents, so that one noisy tenant never degrades its neighbors. |

### Support Agent (SA)

| ID | Story |
|---|---|
| SA1 | As Support Agent, I want read-only access to a tenant's data to diagnose a ticket without needing to log in as them. |
| SA2 | As Support Agent, I want to request a time-boxed impersonation consent token from the tenant admin before acting as a user. |
| SA3 | As Support Agent, I want a persistent impersonation banner visible while impersonating, so nothing I do looks like the real user did it. |
| SA4 | As Support Agent, I want every impersonated action tagged distinctly in the tenant's own audit log. |
| SA5 | As Support Agent, I want to apply config fixes on a tenant's behalf within my granted scope. |
| SA6 | As Support Agent, I want to escalate a bug with repro context attached directly to engineering. |

### Compliance Officer, internal (CO)

| ID | Story |
|---|---|
| CO1 | As Compliance Officer, I want to process a DSAR/DPDP access or deletion request end-to-end. |
| CO2 | As Compliance Officer, I want scheduled deletion jobs to run automatically once retention windows expire. |
| CO3 | As Compliance Officer, I want to pull an audit export for a regulator or legal request on demand. |
| CO4 | As Compliance Officer, I want to verify the consent register is complete across tenants before a compliance review. |

### Owner / Admin (OA)

| ID | Story |
|---|---|
| OA1 | As Owner/Admin, I want a "business at a glance" home screen (jobs done/pending/overdue, technicians active/idle, revenue, complaints) every morning. |
| OA2 | As Owner/Admin, I want a leak panel — verified vs claimed travel km, attendance anomalies, idle-time heatmap — so I can trust the numbers I'm shown. |
| OA3 | As Owner/Admin, I want AMC health at a glance: contracts expiring 30/60/90 days, renewal pipeline value, lapsed-and-uncontacted accounts. |
| OA4 | As Owner/Admin, I want to approve leave/expense/discount/quote requests from my phone, including by WhatsApp reply. |
| OA5 | As Owner/Admin, I want sole ownership of billing, full config, user management, and data export/delete. |
| OA6 | As Owner/Admin, I want a 7am WhatsApp daily digest and instant alerts for SLA breaches, big payments, and complaints. |
| OA7 | As Owner/Admin, I want break-glass emergency access with a mandatory reason, notifying every other admin when I use it. |
| OA8 | As Owner/Admin, I want to compare branch performance and drill from any exception straight into its record and audit trail. |

### Operations / Service Manager (OM)

| ID | Story |
|---|---|
| OM1 | As Ops Manager, I want the dispatch board and visibility into every job and customer, so I can run the business day to day. |
| OM2 | As Ops Manager, I want to approve leave/expense/discount requests within policy without needing the owner. |
| OM3 | As Ops Manager, I want cross-team reports without owner-level account access. |
| OM4 | As Ops Manager, I want to configure day-to-day settings, excluding billing and role design. |

### Dispatcher / Coordinator (DP)

| ID | Story |
|---|---|
| DP1 | As Dispatcher, I want one unified queue merging phone, WhatsApp, portal, and email-parsed tickets. |
| DP2 | As Dispatcher, I want a duplicate-ticket prompt when the same site+asset+issue repeats within N hours. |
| DP3 | As Dispatcher, I want to drag-drop assign jobs on a day/week calendar with skill/parts/proximity match suggestions. |
| DP4 | As Dispatcher, I want conflict warnings (double-booked, on leave, outside shift) before I confirm an assignment. |
| DP5 | As Dispatcher, I want a live map with a "nearest qualified tech" finder for breakdown calls. |
| DP6 | As Dispatcher, I want to replay a technician's route for a day to resolve a dispute. |
| DP7 | As Dispatcher, I want a reassignment wizard (bulk move + batched customer notification) when a tech goes on leave or quits. |
| DP8 | As Dispatcher, I want tomorrow's capacity forecast so I catch overbooking before it happens. |

### Supervisor / Team Lead (SV)

| ID | Story |
|---|---|
| SV1 | As Supervisor, I want a team scoreboard (jobs, FTF %, ratings, punctuality) scoped to my own team. |
| SV2 | As Supervisor, I want an auto-selected back-check queue for QA sampling, including anomaly-flagged jobs. |
| SV3 | As Supervisor, I want to approve or reject regularization requests from my team. |
| SV4 | As Supervisor, I want a live map limited to my own team, not other branches. |
| SV5 | As Supervisor, I want to leave coaching notes tied to a technician's record. |
| SV6 | As Supervisor, I want to be routed any "customer unavailable" or "customer refused confirmation" flag for review. |

### Field Technician / "Field Agent" (FT)

| ID | Story |
|---|---|
| FT1 | As a field technician, I want geo+selfie attendance with liveness/mock-location checks at day start. |
| FT2 | As a field technician, I want an optimized route with one-tap navigation handoff to each job. |
| FT3 | As a field technician, I want the job card to show site notes, asset history, and contract entitlements before I start, so I never over- or under-charge by mistake. |
| FT4 | As a field technician, I want geofence-verified check-in with an override+reason when GPS is poor. |
| FT5 | As a field technician, I want to run the checklist with photos and log parts by scanning barcode/QR from van stock. |
| FT6 | As a field technician, I want to capture signature or OTP for completion, working fully offline via signature. |
| FT7 | As a field technician, I want to collect payment (UPI/link/card/cash/cheque+photo) and have it reconcile automatically on sync. |
| FT8 | As a field technician, I want an AI-drafted, editable service report generated for me, not written from scratch. |
| FT9 | As a field technician, I want to clock out with a GPS-verified day summary and file expense claims with receipt photos. |
| FT10 | As a field technician, I want a panic/SOS button that sends live location+audio to my supervisor in an emergency. |
| FT11 | As a field technician, I want to see my own attendance, pay, and location history — and never another technician's. |
| FT12 | As a field technician, I want to dispute an attendance or expense rejection in one tap, without it feeling like an accusation. |

### Back Office / Accounts (AC)

| ID | Story |
|---|---|
| AC1 | As Accounts, I want to run invoices per-job, per-contract-schedule, or consolidated monthly per client. |
| AC2 | As Accounts, I want GST/VAT summaries and reconciliation across gateway, cash, cheque, and bank transfer. |
| AC3 | As Accounts, I want a dunning ladder (gentle → firm → owner-alert) for overdue receivables. |
| AC4 | As Accounts, I want credit notes to require an approval chain before issuing. |
| AC5 | As Accounts, I want to monitor and fix errors in the Tally/QuickBooks/Xero sync queue. |
| AC6 | As Accounts, I never want to edit a sent invoice directly — only issue a credit note and reissue. |

### Inventory / Storekeeper (IN)

| ID | Story |
|---|---|
| IN1 | As Storekeeper, I want stock visibility by warehouse and by van. |
| IN2 | As Storekeeper, I want to process GRNs, issue-to-van, and returns across good/defective/warranty-claim lanes. |
| IN3 | As Storekeeper, I want reorder alerts driven by consumption velocity, not manual guesswork. |
| IN4 | As Storekeeper, I want mobile cycle counts checked against a shrinkage report (issued vs consumed vs returned). |
| IN5 | As Storekeeper, I want van-stock recommendations for tomorrow's route based on the day's scheduled jobs. |
| IN6 | As Storekeeper, I want an offboarding technician's van-stock return processed with a variance report. |

### HR / Payroll, lite (HR)

| ID | Story |
|---|---|
| HR1 | As HR, I want a geo-verified attendance register and shift roster. |
| HR2 | As HR, I want to manage the leave calendar and approve leave types/balances. |
| HR3 | As HR, I want to export payroll files in GreytHR/Keka/Tally-compatible formats. |
| HR4 | As HR, I want a consent-status register tracking who has/hasn't accepted tracking consent (DPDP artifact). |
| HR5 | As HR, I want fast onboarding for a seasonal gig worker: phone-invite plus document checklist. |
| HR6 | As HR, I want overtime reports without visibility into job or financial data outside HR scope. |

### Auditor / Compliance, read-only (AU)

| ID | Story |
|---|---|
| AU1 | As Auditor, I want a time-boxed, read-only account scoped to exactly what I'm auditing. |
| AU2 | As Auditor, I want to review records plus the full audit trail, with no write access anywhere. |
| AU3 | As Auditor, I want to export an evidence pack per job for a franchise-brand or external audit. |
| AU4 | As Auditor, I want visibility into approval-pattern anomalies (e.g. regularization approval rate vs peers) to flag collusion risk. |

### Subcontractor / Gig worker (GW)

| ID | Story |
|---|---|
| GW1 | As a gig worker, I want to be onboarded fast via phone-number invite and a document checklist. |
| GW2 | As a gig worker, I want to see only the jobs assigned to me, nothing else on the board. |
| GW3 | As a gig worker, I want to contact customers through a masked number, never seeing their real one. |
| GW4 | As a gig worker, I want my access to auto-expire when the engagement ends. |
| GW5 | As a gig worker, I want to track my own per-job payout as I complete work. |
| GW6 | As a gig worker, I never want visibility into pricing or discount controls. |

### Customer (portal) — condensed

| ID | Story |
|---|---|
| CU1 | `[MVP]` As a client, I want to raise/track a ticket and confirm completion by signature or OTP without creating an account. |
| CU2 | As a client, I want a no-login live-tracking link for the technician on visit day. |
| CU3 | `[Growth+]` As a client, I want to approve quotes, view invoices, and pay online through a portal. |
| CU4 | As a client, I want to see AMC contract coverage, per-asset visit history, and renewal reminders. |
| CU5 | As a client, I want to rate the service and escalate directly if unhappy. |

*Full client detail (39 stories, journey, small/medium/large segmentation): see `USER_STORIES.md`, `CLIENT_USER_STORIES.md`.*

---

## 4. Cross-role edge cases (full catalog, role-tagged)

### Connectivity, device & GPS — mainly Field Technician

| ID | Scenario → behavior | Roles |
|---|---|---|
| A1 | Offline all day → captured locally, "N pending" indicator, syncs in order, dashboard never fakes liveness | FT, OA |
| A2 | Flaky 2G mid-sync → resumable chunked sync, atomic batches, idempotent retries | FT |
| A3 | GPS unavailable indoors → check-in allowed with flag+reason+QR/Wi-Fi fallback, supervisor sees flag not a block | FT, SV |
| A4 | Mock-location detected → punch recorded but flagged (never silently rejected), pattern surfaces to supervisor | FT, SV |
| A5 | Device clock wrong → server time authoritative, skew logged, TA/DA computed server-side | FT, HR |
| A6 | Phone lost/stolen → remote deactivate+wipe, re-download on new device, re-entry checklist for last jobs | OA, FT |
| A7 | Shared login/moonlighting → single-active-device policy, new login logs out old, anomaly report | OA |
| A8 | App update mid-shift → never forced mid-job, staged rollout, old version keeps working | FT |
| A9 | Battery saver kills background sync → sync on app-foreground always, no background dependency | FT |
| A10 | Storage full during capture → pre-capture check, degrade resolution with warning | FT |

### Data conflicts & integrity

| ID | Scenario → behavior | Roles |
|---|---|---|
| B1 | Dispatcher reassigns while offline tech already started → started-work evidence wins on sync, reassignment reversed, both notified | DP, FT |
| B2 | Customer cancels while tech offline en route → job → "needs review", supervisor resolves bill/goodwill/partial | DP, SV |
| B3 | Two dispatchers edit same job → field-level merge; true collision → last-writer-wins + one-click revert | DP |
| B4 | Duplicate customer (web+mobile) → fuzzy dupe detection, merge tool preserves both histories, undo-merge supported | DP, AC |
| B5 | Payment recorded twice → idempotency + same-amount/job/day rule → reconciliation queue, never auto-delete | AC |
| B6 | Invoice edited after customer received it → forbidden; correction = credit note + reissue | AC |
| B7 | Tech back-dates or rushes a checklist → duration+timestamps recorded, anomaly flag to back-check queue, nothing blocked in field | SV |
| B8 | Import file 5,000 rows / 200 bad → dry-run report, good rows apply, bad quarantined, whole import undoable 7 days | OA, AC |
| B9 | Automation loop (rule A→B→A) → cycle detection at publish + runtime hop limit + rate cap, circuit breaker alerts admin | OA |
| B10 | Config changed while 300 live jobs use it → forced mapping wizard, archive-not-delete, version pinning for in-flight mobile work | OA |
| B11 | Timezone edges (IST/UK/DST) → storage UTC, display per site timezone, SLA clocks per site timezone | DP, OA |
| B12 | Tenant stops paying → grace(7d)→read-only(30d)→export-allowed(90d)→archive; field-safety data never cut mid-shift | PSA, OA |

### Workforce & operations

| ID | Scenario → behavior | Roles |
|---|---|---|
| C1 | Tech quits with 40 open jobs + van stock → offboarding wizard: bulk-reassign + batched customer notice, stock-return checklist with variance report | OM, IN |
| C2 | Seasonal surge (250→700 calls/day) → gig-worker role, fast onboarding, auto-expiring access, masked numbers, per-job payout tracking | OM, GW |
| C3 | Tech refuses tracking consent (DPDP) → app works consent-declined (manual attendance, no continuous GPS), consent register updated, no lockout | HR, FT |
| C4 | No-show tech on a 4hr-SLA ticket → unaccepted-job timer auto-escalates, nearest-qualified suggestion, customer proactively notified | DP |
| C5 | Customer disputes "tech never came" → one-click evidence bundle: geofenced check-in/out, timestamped photos, signature/OTP, route replay | SV, DP |
| C6 | Supervisor colludes with tech on fake regularizations → approval-pattern anomaly reports, immutable audit trail, owner exception digest | OA, AU |
| C7 | Lone-worker emergency → SOS 3-tap/shake → live location+audio to supervisor+configured contacts, SMS fallback | FT, SV |
| C8 | Language mismatch (tech vs admin) → per-user language, structured data language-neutral, free text gets on-demand AI translation | FT, OA |

### Business, contract & money

| ID | Scenario → behavior | Roles |
|---|---|---|
| D1 | AMC lapsed but customer keeps calling → "lapsed-but-serviced" alarm on dashboards, dispatcher warned at intake, one-tap convert-to-per-call/renewal | DP, OA |
| D2 | Customer wants mid-term contract change → amendment flow: pro-rata billing, regenerated visit calendar, contract version history | OA, AC |
| D3 | Included-vs-billable dispute on site → entitlement engine shows terms on job card pre-work, billable extras need customer e-approval | FT |
| D4 | Discount beyond policy given in field → price-book caps, over-cap triggers remote approval via WhatsApp reply, override logged with reason | FT, OM |
| D5 | Cash collected, not deposited → cash-in-hand ledger per tech, deposit reconciliation with photo of slip, 48h aging alert | AC, FT |
| D6 | GST e-invoice API down at invoice time → provisional invoice issued, IRN retry queue, watermarked until cleared, never blocks the business | AC |
| D7 | Customer overpays/advance payment → credit ledger per customer, auto-applied to next invoice with statement visibility | AC |
| D8 | Franchise brand audits service records → time-boxed read-only role, exportable evidence packs per job | AU |
| D9 | Multi-branch owner wants P&L separation → branch dimension on every record, branch-scoped roles, consolidated + per-branch reporting | OA, AC |
| D10 | Tenant pivots vertical (adds a service line) → multiple templates active concurrently, job types/forms per line of business, unified customer base | OA |

### Growth & scale edges

| ID | Scenario → behavior | Roles |
|---|---|---|
| E1 | Tenant grows 20→400 techs → dispatch board virtualizes, reports go async, rate limits scale by plan | PSA, OA |
| E2 | One tenant's automation storm degrades neighbors → per-tenant quotas + isolation, tenant-level circuit breakers | PSA |
| E3 | Marquee customer demands a custom feature → answer is config/template/API, never a fork | PSA, OA |
| E4 | Acquirer/DD requests security posture → role docs + audit trails + access reviews + pen-test pack | PSA, CO |

---

## 5. Flexibility — role & permission system itself

| ID | Story |
|---|---|
| RB1 | `[Growth+]` As Owner/Admin, I want to clone a prebuilt role and edit its permissions, so custom roles fit my org's actual structure. |
| RB2 | As any tenant role, I want scope dimensions (own-records / own-team / branch / all) enforced, so I only ever see what my role should see. |
| RB3 | As the platform, permission checks are enforced server-side (not just hidden in mobile UI), so a modified client can't bypass access control. |
| RB4 | As Owner/Admin, every permission grant/revoke is audit-logged, so role changes are traceable. |
| RB5 | As Owner/Admin, I want break-glass emergency access with a mandatory reason and notification to all other admins. |
| RB6 | As Support Agent, I can only impersonate a user with a tenant admin's time-boxed consent token, so support access can't quietly become surveillance. |
| RB7 | As Platform Super Admin, destructive platform-level ops require a 2-person rule, so no single internal actor can unilaterally damage a tenant. |
| RB8 | As Owner/Admin, deny-by-default is the baseline for every new permission, so nothing is accidentally over-exposed. |

---

*Gap note: built entirely from existing specs (blueprint + MVP doc), no new research or RBAC engineering review. Role→scenario tags in Section 4 are inferred from the blueprint's narrative, not a formal RACI — validate against the actual permission catalog (`module.entity.action.scope`) before treating this as an engineering spec rather than a story backlog.*
