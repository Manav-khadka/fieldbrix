# environments/prod/

Production Terraform workspace.

## Files

| File | Purpose | Committed? |
|------|---------|-----------|
| `backend.tf` | S3 state + DynamoDB lock location | ✅ |
| `main.tf` | Calls all modules | ✅ |
| `variables.tf` | All input variable declarations | ✅ |
| `outputs.tf` | Static IP, bucket names, SSH command | ✅ |
| `terraform.tfvars.example` | Template with placeholders | ✅ |
| `terraform.tfvars` | YOUR actual values | ❌ gitignored |

## After apply

The most important output is `static_ip`. This is your Elastic IP — 
a permanent public IP address that never changes even when you stop and 
start the EC2 instance. Set this as your Cloudflare DNS A record once 
and never touch it again.

```bash
terraform output static_ip      # your permanent IP
terraform output ssh_command    # how to SSH in
terraform output rds_endpoint   # RDS connection string (sensitive)
```
