# modules/storage/

Four S3 buckets for different data types.

| Bucket | Purpose | Public? | Lifecycle |
|--------|---------|---------|-----------|
| fieldbrix-{env}-photos | Job photos, receipts, evidence | No | → IA after 90d → Glacier after 365d |
| fieldbrix-{env}-pdfs | Generated invoices, reports | No | None |
| fieldbrix-{env}-exports | Tenant data exports | No | Auto-delete after 30d |
| fieldbrix-{env}-web | Versioned React SPA deployment artifacts | No (served by the application deployment path) | None |

## How photos work (presigned URLs)

Photos never go through your EC2 server.
1. Mobile app asks API for a presigned URL (EC2 generates it, takes 0.5ms)
2. App uploads directly to S3 using the URL
3. EC2 never touches the photo bytes — zero bandwidth cost

## Cost

Photos ~50KB each after compression:
- 30,000 photos/month × 50KB = 1.5GB
- Storage: $0.035/month
- PUT requests: $0.069/month
- Total: ~$0.10/month for photos
