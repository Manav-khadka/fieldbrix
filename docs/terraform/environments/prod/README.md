# Production environment

This environment creates the disposable pre-sprint stack in AWS account
`059763918790`, Region `ap-south-1`:

- one `t4g.small` EC2 instance managed through Systems Manager;
- one Elastic IP for both hostname-based nginx routes;
- Let's Encrypt TLS for both routes with automated renewal checks;
- private PostgreSQL 18.4 RDS across two Availability Zones;
- private encrypted S3 buckets for deployments and application objects.

Run Terraform with profile `fieldbrix`:

```bash
../../scripts/plan.sh prod
../../scripts/apply.sh prod
../../scripts/configure-tls.sh prod
../../scripts/deploy-apps.sh prod
```

Initial certificate issuance requires both public DNS A records to resolve to
`static_ip`. New instances retry issuance automatically if DNS is not ready;
`configure-tls.sh` applies and verifies the same setup on an existing instance.

`fieldbrix-tls.timer` runs twice daily with randomized delay. It does not
force a renewal every time: Certbot renews only when due, validates nginx, and
reloads it after a successful renewal. Inspect it through Session Manager with:

```bash
sudo systemctl list-timers fieldbrix-tls.timer
sudo systemctl status fieldbrix-tls.service
sudo certbot certificates
```

Important outputs:

```bash
AWS_PROFILE=fieldbrix terraform output static_ip
AWS_PROFILE=fieldbrix terraform output instance_id
AWS_PROFILE=fieldbrix terraform output -raw rds_endpoint
```

The Elastic IP survives EC2 stop/start. It is released by a full Terraform
destroy, so check `static_ip` again after recreating the stack.
