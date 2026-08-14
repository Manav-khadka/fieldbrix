# Fieldbrix — Client User Stories (brief)

*Sourced from `firstdoc_fable_5.md` (A2 segments, D1/D5/D6 client role+portal, E1 sites, E3 AMC, G edge-case catalog), MVP Requirements docx (no-account confirmation). One line per story. "Client" = end-customer of the tenant (not the tenant business).*

**Client size bands** (from E1 "a facility client may have 40 buildings" + D5 B2B rollup):
- **Small** — single site, one-off or occasional job, no contract, pays cash/UPI on the spot
- **Medium** — single/few sites, AMC contract, wants GST invoices, WhatsApp-first
- **Large** — multi-site B2B (facility mgmt, franchise, enterprise), SLA reporting, own ERP/CRM, consolidated billing

---

## 1. Core journey (all sizes)

| ID | Story |
|---|---|
| CJ1 | As a client, I want to raise a request via phone/WhatsApp without installing an app, so that getting help is zero-friction. |
| CJ2 | As a client, I want a booking confirmation and technician ETA, so that I know someone's coming. |
| CJ3 | As a client, I want a no-login live-tracking link on visit day, so that I can see the technician approach. |
| CJ4 | As a client, I want to see what's free vs. billable before work starts, so that there's no on-site dispute. |
| CJ5 | As a client, I want to confirm completion by signature or OTP without creating an account, so that sign-off takes seconds. |
| CJ6 | As a client, I want a PDF service report sent automatically, so that I have proof of service. |
| CJ7 | As a client, I want to pay digitally (UPI/link/card) or hand over cash with a photo receipt, so that payment is simple either way. |
| CJ8 | As a client, I want to rate the visit, so that quality issues get seen. |

## 2. Small client

| ID | Story |
|---|---|
| SM1 | As a small client, I want to book a one-off visit with no contract and no account, so that I'm not forced into a subscription relationship. |
| SM2 | As a small client, I want to pay cash on the spot with a photo receipt, so that I don't need a bank app. |
| SM3 | As a small client, I want a simple WhatsApp confirmation and report, so that I don't need to learn a portal. |
| SM4 | As a small client, I want the option to later start an AMC contract from a completed one-off job, so that upgrading is a nudge, not a re-sale. |
| SM5 | As a small client with a language barrier, I want the service summary in my language, so that I understand what I'm signing off on. |
| SM6 | As a small client, I want a receipt even if the technician's phone was offline all day, so that a bad-connectivity day doesn't cost me my proof of service. |

## 3. Medium client (AMC, single/few sites)

| ID | Story |
|---|---|
| MD1 | As a medium client, I want to see my AMC contract's coverage and visit history per asset, so that I trust what I'm paying for. |
| MD2 | As a medium client, I want renewal reminders at 90/60/30/7 days and to e-accept the quote via WhatsApp, so that my cover never lapses unnoticed. |
| MD3 | As a medium client, I want GST-compliant invoices matched to my billing schedule (per-job/monthly), so that my accounts team can reconcile without chasing paper. |
| MD4 | As a medium client, I want to add an asset mid-contract (e.g. one more AC unit) and get pro-rated billing, so that small changes don't need a whole new contract. |
| MD5 | As a medium client, I want to dispute "the technician never came," so that I get resolution, not an argument — I expect the vendor to show me geofenced check-in, timestamped photos, and signature/OTP as proof either way. |
| MD6 | As a medium client, I want an overpayment/advance applied automatically to my next invoice, so that I don't have to track credit manually. |

## 4. Large client (multi-site B2B)

| ID | Story |
|---|---|
| LG1 | As a large B2B client, I want a multi-site rollup dashboard and SLA compliance reports, so that I can report performance to my own stakeholders. |
| LG2 | As a large client with 40+ sites, I want per-site contacts with distinct roles (security guard vs. billing head), so that the right person gets the right notification. |
| LG3 | As a large client running my own ERP/CRM, I want jobs and completions to sync via webhook/API (thin-layer mode), so that your system doesn't replace my system of record. |
| LG4 | As a large client, I want a consolidated monthly invoice across all sites instead of one per job, so that my AP team processes one document, not hundreds. |
| LG5 | As a large client, I want a credit limit with auto-warning to the dispatcher when I'm over it, so that service isn't unexpectedly refused mid-relationship. |
| LG6 | As a large franchise/enterprise client, I want a time-boxed read-only auditor role, so that my compliance team can review service records without a shared login. |
| LG7 | As a large client, I want custom fields on my asset records (license no., load capacity, refrigerant type), so that the platform fits my equipment, not a generic template. |
| LG8 | As a large client demanding a feature unique to us, I want it delivered as configuration, not a code fork, so that I stay on the same upgrade path as everyone else. |

## 5. Edge cases, corners, exceptions

| ID | Story | From |
|---|---|---|
| EX1 | As a client, if the technician is offline underground/rural all day, I still want my job captured and reported once they resync — not silently lost. | G-A1 |
| EX2 | As a client, if I cancel a job while the technician is already offline and working, I want the job marked "needs review" (bill/goodwill/partial), not auto-voided or auto-charged. | G-B2 |
| EX3 | As a client, if I'm accidentally entered twice (web + mobile), I want my two histories merged, not lost or duplicated. | G-B4 |
| EX4 | As a client, if I'm charged twice by accident (offline retry), I want the duplicate caught and reconciled, not silently refunded or ignored. | G-B5 |
| EX5 | As a client, if my invoice needs correcting after I received it, I want a credit note + reissue, not a silently edited invoice. | G-B6 |
| EX6 | As a client, if my technician no-shows on an SLA-timed ticket, I want proactive notice of a revised ETA, not silence. | G-C4 |
| EX7 | As a client, if I dispute a visit, I want a one-click evidence bundle (check-in/out, photos, signature/OTP, route) to settle it fast. | G-C5 |
| EX8 | As an AMC client whose contract lapsed but I kept calling for service, I want the vendor to flag this internally and offer renewal/per-call billing — not just keep servicing me off the books. | G-D1 |
| EX9 | As a client, if there's a dispute over what's included vs. billable, I want the contract terms visible on the technician's device before work starts, with e-approval required for any extra charge. | G-D3 |
| EX10 | As a client, if a technician offers a discount beyond policy, I want it to require manager approval, so that pricing stays fair and consistent. | G-D4 |
| EX11 | As a client, if the GST e-invoice system is down at billing time, I want a provisional invoice now and the final one once it clears — not a blocked transaction. | G-D6 |
| EX12 | As a client, if my technician quits mid-contract, I want my open jobs and site notes handed to someone else seamlessly, not lost with the person. | G-C1 |
| EX13 | As a client during a seasonal surge (e.g. AC season), I want service capacity to flex (gig technicians) without my data/number being exposed to unvetted workers. | G-C2 |
| EX14 | As a client, if the vendor's tenant stops paying the platform, I want assurance my active job/safety data is never cut off mid-service. | G-B12 |
| EX15 | As a client, I want my confirmation respected even if I refuse or am unavailable — a reason gets logged and a supervisor reviews it, rather than a forced fake confirmation. | MVP doc |

## 6. Flexibility / configurability

| ID | Story |
|---|---|
| FX1 | As a client in a different vertical (pest control vs. lift AMC vs. CCTV), I want forms/checklists relevant to my service type, so that the report isn't generic boilerplate. |
| FX2 | As a client, I want terminology on my documents to match my industry (e.g. "AMC" vs. "service contract"), so that reports read naturally to me. |
| FX3 | As a client outside India (UK/US expansion), I want tax handling (VAT/sales-tax) and currency correct for my region automatically. |
| FX4 | As a client, I want communications in my preferred channel (WhatsApp in India, SMS/email in UK/US), so that I'm not missing updates sent the wrong way. |
| FX5 | As a client, I want a white-labeled portal under my vendor's brand (Growth+), so that the experience feels like part of their business, not a third-party tool. |
| FX6 | As a client whose vendor serves multiple lines of business (e.g. pest control + CCTV), I want one unified record across both, not two separate customer accounts. |

---

*Gap note: built entirely from existing specs, no new research. Small/medium/large bands are inferred from contract/site-count signals in the blueprint (E1, D5, A2's pricing tiers describe the tenant, not the client) — validate against real client interviews before treating band definitions as final.*
