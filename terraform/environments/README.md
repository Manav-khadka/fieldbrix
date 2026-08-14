# environments/

Each subfolder is a complete Terraform workspace for one environment.

## environments/prod/
Production stack. This is what your customers use.

## Adding a dev environment

```bash
cp -r environments/prod environments/dev
# In environments/dev/backend.tf: change key to "dev/terraform.tfstate"  
# In environments/dev/terraform.tfvars: use smaller instances
#   ec2_instance_type = "t4g.small"   ($8/month instead of $16)
#   db_instance_class = "db.t3.micro" (same)
./scripts/plan.sh dev && ./scripts/apply.sh dev
```

Dev and prod are completely independent stacks. Destroying dev never touches prod.
