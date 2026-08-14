# modules/queues/

SQS queues for async processing. Cost: $0/month (always free tier).

| Queue | Type | Purpose | Why FIFO? |
|-------|------|---------|----------|
| pdf-generation.fifo | FIFO | Invoice and report PDF jobs | Prevent duplicate invoices |
| notifications.fifo | FIFO | WhatsApp, SMS, email | Prevent duplicate messages |
| scheduler.fifo | FIFO | Renewal reminders, SLA timers | Preserve order |
| media-processing | Standard | Photo compression | Order doesn't matter |
| fifo-dlq.fifo | FIFO | Failed FIFO messages | Preserves FIFO source compatibility |
| standard-dlq | Standard | Failed media messages | Matches the Standard media queue |

Every queue uses SQS-managed server-side encryption. Every worker queue has an
explicit redrive policy. Each DLQ accepts messages only from compatible source
queue ARNs: FIFO sources use the FIFO DLQ and the Standard media queue uses the
Standard DLQ.

## Dead-letter queue (DLQ)

If a Lambda fails to process a message 3 times, it moves to the DLQ.
Messages stay for 14 days. Inspect them, fix the bug, reprocess manually.
Nothing is ever silently lost.

## Cost

SQS Standard: 1 million requests/month free (never expires).
Your usage at 50 tenants: ~30,000 messages/month.
That is 3% of the free tier. You will not pay for SQS.
