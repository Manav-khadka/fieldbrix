# modules/networking/

VPC, subnets, internet gateway, and security groups.

## What this creates

```
VPC 10.0.0.0/16
├── Public Subnet A (10.0.1.0/24) ap-south-1a — EC2 lives here
├── Public Subnet B (10.0.2.0/24) ap-south-1b — RDS needs 2 AZs
├── Private Subnet A (10.0.3.0/24) — reserved for future use
├── Internet Gateway
└── Security Groups:
    ├── EC2: HTTPS/HTTP from anywhere, SSH from your IP only
    └── RDS: PostgreSQL from EC2 security group ONLY
```

## Security rule: SSH is locked to your IP

`admin_cidr` in terraform.tfvars is your IP address (e.g., "1.2.3.4/32").
Only that IP can SSH to the EC2. If your IP changes, update tfvars and re-apply.

## Security rule: RDS has no public access

RDS only accepts connections from the EC2 security group. 
It cannot be reached from the internet regardless of the password.
Use `./scripts/db-tunnel.sh prod` for local access.
