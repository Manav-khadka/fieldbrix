# Fieldbrix — AWS / Infrastructure Reference

*Extracted from `final-final/ENGINEERING_HANDBOOK.md` (Parts 1, 12, 18). Source of truth is the handbook — update there first, then re-sync this file.*

---

# 1. INFRASTRUCTURE (AWS ap-south-1 Mumbai)

## Compute

```
Service       : EC2 t4g.medium
vCPU          : 2 (ARM Graviton3)
RAM           : 4 GB
Network       : Up to 5 Gbps
Storage       : EBS Only (no local SSD)
Cost          : $0.0224/hr → $16.13/mo
Why ARM       : Graviton3 is 20-40% cheaper than
                equivalent x86 at same performance.
                NestJS + Node.js runs natively on ARM.
                Flutter builds happen on CI not EC2.
Swap file     : Add 2GB swap on EBS (free)
                protects against OOM on memory spikes
                sudo dd if=/dev/zero of=/swapfile bs=128M count=16
Process mgr   : PM2 (cluster mode uses both vCPUs)
```

## Database

```
Service       : RDS db.t3.micro
Engine        : PostgreSQL 16
RAM           : 1 GB
Storage       : 20 GB gp2 (free tier included)
Cost          : $12.24/mo
Backups       : Automated daily snapshots (free up to DB size)
PITR          : Point-in-time recovery up to 7 days
                (blueprint RPO ≤ 5 min)
Multi-AZ      : Off for MVP (add at Phase 3, doubles cost)
Why not EC2   : RDS handles backups, patching, crash recovery
                $12/mo is the cheapest insurance you'll buy
Upgrade path  : db.t3.micro → db.t4g.small ($23/mo) →
                db.t4g.medium ($47/mo) on CPU pressure
```

## Connection Pooling

```
Service       : PgBouncer (on EC2, not a separate server)
Cost          : $0 (runs alongside NestJS on same EC2)
Why           : db.t3.micro has max 87 connections
                NestJS + Prisma opens many connections per restart
                PgBouncer multiplies effective connections 5-10x
                without upgrading RDS
Mode          : Transaction pooling (best for API workloads)
Config        : max_client_conn = 200
                default_pool_size = 20
                reserve_pool_size = 5
```

## Object Storage

```
Service       : S3 (ap-south-1)
Cost          : $0.023/GB stored + $0.004/10K PUT requests
Estimated     : ~$0.50/mo at MVP scale
Buckets       :
  fieldbrix-photos-{env}    ← job photos, receipts (private)
  fieldbrix-pdfs-{env}      ← invoices, reports (private)
  fieldbrix-exports-{env}   ← tenant data exports (private)
  fieldbrix-web-{env}       ← React SPA static files (public)
Lifecycle     : Move photos to S3-IA after 90 days (60% cheaper)
                Move to Glacier after 1 year
Security      : All buckets private by default
                Photos served via presigned URLs (15 min expiry)
                PDFs served via presigned URLs (15 min expiry)
                Web bucket CloudFront only (no direct S3 access)
```

## CDN + DNS

```
Service       : Cloudflare (Free tier)
Cost          : $0
Replaces      : Route 53 ($0.50/mo saved)
Features used :
  DNS          : Unlimited, instant propagation
  SSL/TLS      : Auto-renewing, free certificates
  DDoS         : Always-on protection (free tier)
  CDN          : React SPA assets cached globally
                 India latency ~15-20ms vs ~80ms without CDN
  Proxy        : Hides EC2 IP (security)
  Page Rules   : Cache SPA assets 1 year, API never cached
```

## Async Layer

```
Service       : AWS SQS (Standard Queues)
Cost          : $0 (1M requests/mo always free, never expires)
Queues        :
  pdf-generation.fifo     ← invoice/report PDF jobs
  notifications.fifo      ← WhatsApp/SMS/email dispatch
  scheduler.fifo          ← renewal/SLA timer triggers
  media-processing        ← S3 photo compression triggers
FIFO vs Std   : Use FIFO for PDF + notifications
                (exactly-once, ordered - no duplicate invoices)
                Use Standard for media (order doesn't matter)

Service       : AWS Lambda
Cost          : $0 (1M requests + 400K GB-seconds/mo always free)
Runtime       : Python 3.12
Triggers      :
  SQS trigger  → PDF generation, notifications, scheduler
  S3 trigger   → media compression on photo upload
  EventBridge  → daily digest at 07:00 IST, weekly reports
Memory        : 512MB for PDF lambda (WeasyPrint needs it)
                128MB for notification/scheduler lambdas
Timeout       : 30s for PDF, 10s for others
Cold start    : ~0.5s for Python (acceptable - all async)
```

## Sync Engine

```
Service       : PowerSync Open Edition (self-hosted)
Cost          : $0 (FSL license, free to self-host)
Deployment    : Docker container on same EC2 as NestJS
                OR separate t4g.micro ($6.05/mo) for isolation
Connects to   : RDS PostgreSQL via logical replication
What it does  : Streams Postgres changes → SQLite on device
                Handles all offline sync complexity so you don't
Protocol      : WebSocket streaming (persistent connection)
Flutter SDK   : Apache 2.0 license (fully open source)
Alternative   : PowerSync Cloud Pro at $49/mo if self-hosting
                becomes a maintenance burden at scale
```

## CI/CD

```
Service       : GitHub Actions
Cost          : Free (2,000 min/mo on free plan)
                Enough for ~40 deploys/month
Pipeline      :
  Push to main →
    1. Run tests (Jest unit + integration)
    2. Build NestJS (tsc --noEmit type check)
    3. Build React (vite build)
    4. SSH to EC2 → git pull → pm2 restart
    5. Deploy React to S3 → CloudFront invalidation
    6. Deploy Lambdas (zip → aws lambda update)

Deploy time   : ~3-4 minutes end to end
Rollback      : pm2 restart with previous git commit
                (30 seconds)
```

---

# 2. LAMBDA FUNCTIONS — Python

## Runtime & Libraries

```
Runtime       : Python 3.12
Why Python    : WeasyPrint (PDF) is Python-only
                Same language across all 4 Lambda functions
                Good cold start (~0.5s vs Node 1-2s)
                Well suited for isolated stateless tasks

PDF Generation Lambda:
  weasyprint           0.62.x   HTML/CSS → PDF
  jinja2               3.x      HTML template engine
  boto3                1.x      S3 upload
  psycopg2-binary      2.x      Direct DB query for job data
  fonts: Noto Sans (bundled) → covers all Indian scripts

Scheduler Lambda (renewal ladder, SLA timers):
  boto3                1.x      SQS, SES
  psycopg2-binary      2.x      DB queries
  python-dateutil      2.x      Date arithmetic

Notification Lambda (WhatsApp, SMS, email):
  boto3                1.x      SES for email
  httpx                0.27.x   WhatsApp BSP API calls
  jinja2               3.x      Message templates

Media Processing Lambda (S3 trigger):
  Pillow               10.x     Image compression/resize
  boto3                1.x      S3 read/write
```

---

# 3. COMPLETE COST SUMMARY

```
INFRASTRUCTURE                          MONTHLY
──────────────────────────────────────────────────
EC2 t4g.medium (NestJS + PowerSync)    $16.13
RDS db.t3.micro (PostgreSQL 16)        $12.24
EBS gp3 30GB (EC2 root volume)          $2.40
S3 (photos + PDFs + SPA assets)         $0.50
Lambda (PDF + schedulers + webhooks)    $0.00  always free
SQS (job queues)                        $0.00  always free
CloudFront (React SPA CDN)              $0.00  free tier
Cloudflare (DNS + SSL + DDoS)           $0.00  free plan
GitHub Actions (CI/CD)                  $0.00  free tier
──────────────────────────────────────────────────
Total                                  $31.27/mo

AWS Credits: $200 → 6.4 months runway

THIRD PARTY (not AWS credits)          MONTHLY
──────────────────────────────────────────────────
WhatsApp BSP (Interakt/Wati)           ~$20-30  (volume)
MapLibre visit-tracking map             $0.00  (open-source; Sprint 22 only)
SMS fallback (MSG91)                   ~$5     (low volume)
Domain (.in or .com)                   ~$1     (~$12/year)
──────────────────────────────────────────────────
Total third party                      ~$26-36/mo

GRAND TOTAL MVP                        ~$57-67/mo

OPEN SOURCE PACKAGES                   $0.00
(NestJS, React, Flutter, Python —
 all open source, no license fees)
```

## Quick Reference — Infra + Lambda Row

```
Layer      | Technology          | Key reason
───────────┼─────────────────────┼──────────────────────────────
Infra      | EC2 t4g.medium      | ARM, cheapest for perf
           | RDS db.t3.micro     | Managed Postgres, backups
           | PgBouncer           | Connection pool, free
           | S3                  | Photos, PDFs, SPA hosting
           | Lambda + SQS        | Async jobs, always free
           | PowerSync           | Offline sync, self-hosted free
           | Cloudflare          | DNS + CDN + SSL, free
───────────┼─────────────────────┼──────────────────────────────
Lambda     | Python 3.12         | WeasyPrint PDF, schedulers
           | WeasyPrint          | HTML/CSS → PDF generation
           | Jinja2              | PDF template engine
           | EventBridge         | Cron triggers
```
