# modules/dns/

Cloudflare DNS records and SSL settings (free plan).

## What this creates

```
A record: api.fieldbrix.in → your static EC2 IP (proxied through Cloudflare)
A record: fieldbrix.in     → your static EC2 IP (proxied through Cloudflare)
SSL mode: Full (strict)  → end-to-end HTTPS, Cloudflare validates EC2 cert
```

## Why Cloudflare instead of Route 53?

Route 53 costs $0.50/hosted zone/month.
Cloudflare free plan: DNS + DDoS protection + CDN + SSL = $0.

## Proxied = true (orange cloud icon)

When proxied is on, traffic goes: Browser → Cloudflare → EC2
Your real EC2 IP is hidden. DDoS attacks hit Cloudflare, not your server.

## SSL strict mode

Traffic is encrypted all the way: Browser ⟷ Cloudflare ⟷ EC2.
Requires an SSL cert on EC2 (Let's Encrypt or self-signed both work).
Never use "Flexible" mode — it sends traffic from Cloudflare to EC2 in plain HTTP.

## Cloudflare API token

When this optional module is adopted, store it in Secrets Manager as
`fieldbrix/{env}/cloudflare` with an `API_TOKEN` JSON key. Sprint 01 keeps DNS
operator-managed in Cloudflare and does not apply this module.
Created via Cloudflare dashboard → My Profile → API Tokens.
Needs: Zone → DNS → Edit, scoped to your specific zone.
