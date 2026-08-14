# Fieldbrix — Case Study (illustrative, pre-launch)

**Status: composite, not a real customer.** Fieldbrix has no shipped product and no customers yet — this is a forward-looking case study built from the beachhead ICP (`firstdoc_fable_5.md` A2), the research-backed pain points marked `[R]` in the blueprint, and the product's actual designed capabilities (leak panel, entitlement engine, offline-first sync, renewal ladder). Use it for pitch decks / sales enablement, not as a customer testimonial. Replace with a real pilot's numbers the moment one exists — see gap note at the bottom.

---

## Company snapshot

**"Apex Elevator Services"** (composite, representative of the #1 priority beachhead category)

| | |
|---|---|
| Sector | Elevator/Lift AMC contractor |
| Size | 45 field technicians, 3 branches (Bengaluru, Hyderabad, Chennai) |
| Revenue band | ₹18 Cr/year — squarely in the ₹2–100 Cr target band |
| Customers | ~1,100 AMC contracts (residential societies + commercial buildings), avg 8 lifts/site for B2B facility clients |
| Prior tooling | Excel AMC register + WhatsApp groups per branch + paper job sheets signed on-site |
| Buyer | Founder/Operations Head (co-champions, per ICP's 50–200-staff buying pattern) |

## Before Fieldbrix — the pain

- **Payroll leakage:** no way to verify travel time or attendance beyond technician self-report; industry range for this profile is 15–22% of field payroll lost to time theft and route overlap `[R]`.
- **AMC renewal leakage:** renewals tracked in a spreadsheet nobody reliably reviewed; contracts lapsed and the branch kept servicing sites anyway, off the books, for months before anyone noticed.
- **On-site disputes:** technicians and building facility managers argued over what was covered vs. billable — no shared record of contract entitlements at the point of service.
- **Repeat visits:** failed first-time-fixes doubled the effective cost per call and risked the 30-day repeat-complaint penalty common in franchise/OEM service contracts.
- **Paper trail:** signed job sheets lived in a filing cabinet per branch; a customer dispute ("nobody came") took days to investigate, if it could be resolved at all.
- **Connectivity:** most work happens in lift shafts and basements — the worst GPS/signal environment in the building — so any tool assuming constant connectivity failed daily.

## What was implemented

- **Config, not custom build:** Lift/Elevator AMC vertical template applied at signup — asset registry pre-fielded for make/model/serial/load-capacity/AMC-visit-frequency, no schema work needed.
- **Entitlement engine:** every job card shows what's covered under that site's contract before the technician starts, ending the on-site billing argument.
- **Offline-first mobile app:** full day's work — checklist, photos, parts, signature — captured locally in a lift shaft with zero signal; syncs in order once the technician steps back into range.
- **Leak panel:** owner dashboard surfaces verified-vs-claimed travel km and attendance anomalies from day one — this screen alone was the sales-close moment.
- **Renewal ladder:** 90/60/30/7-day AMC renewal reminders with auto-drafted quotes and WhatsApp e-acceptance; "lapsed but still being serviced" now triggers an alarm instead of silence.
- **Evidence bundle:** geofenced check-in/out, timestamped photos, and signature/OTP turn a service dispute into a one-click lookup instead of a multi-day investigation.
- **Same-day onboarding:** live on the platform the day of signup — no 3-month implementation, the documented gap vs. ServiceTitan-class competitors.

## After Fieldbrix — target outcomes

*Framed as targets the product is designed to hit for this profile, not measured results — no pilot has run yet.*

| Metric | Before | Target after | Driven by |
|---|---|---|---|
| Payroll leakage from unverifiable time/travel | ~18% of field payroll | Low single digits | Leak panel + GPS-verified TA/DA |
| Lapsed-but-uncontacted AMC accounts | Untracked | Near-zero | Renewal ladder + dashboard alarm |
| On-site billing disputes | Frequent, anecdotal | Rare | Entitlement engine on job card |
| Service-dispute resolution time | Days (paper search) | Minutes | One-click evidence bundle |
| Onboarding time to go-live | N/A (custom builds elsewhere run 3 months) | Same day | Vertical template, no schema work |
| Field data loss from no-signal sites | Occasional gaps | None | Offline-first sync, atomic batches |

## Illustrative voices (hypothetical, not real quotes)

> "The leak panel showed us where the money was actually going in week one. That's the whole pitch." — *Owner, composite persona*

> "I don't fight with building managers about what's covered anymore — it's right there on my screen before I start." — *Field Technician, composite persona*

> "Renewals used to fall through the cracks between branches. Now the app tells me who's about to lapse before the customer even calls." — *Operations Head, composite persona*

## Why this generalizes

Apex is a stand-in for the #1 beachhead category, but the same template mechanism (`D2`/`C7` in the blueprint) applies to the other six launch verticals — Pest Control, CCTV/Security AMC, Plumbing & Electrical, Appliance/RO franchises, Facility Management, IT/Networking AMC — by swapping the asset registry fields and checklist templates, not the underlying product.

---

*Gap note: every number above is a design target inferred from ICP research (`[R]`-tagged claims in the blueprint), not a measured result. Before this document is used externally, replace it with actuals from the first real pilot cohort — or clearly keep the "illustrative" label if used pre-launch.*
