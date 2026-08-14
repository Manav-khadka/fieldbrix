# modules/networking/

VPC, subnets, internet gateway, and security groups.

## What this creates

```
VPC 10.0.0.0/16
├── Public Subnet A (10.0.1.0/24) ap-south-1a — EC2 lives here
├── Public Subnet B (10.0.2.0/24) ap-south-1b — RDS needs 2 AZs
├── Private Subnet A (10.0.3.0/24) — RDS
├── Private Subnet B (10.0.4.0/24) — RDS
├── Internet Gateway
└── Security Groups:
    ├── EC2: HTTPS/HTTP from anywhere; administration through SSM
    └── RDS: PostgreSQL from EC2 security group ONLY
```

## Security rule: no SSH ingress

Administrative access uses AWS Systems Manager. No SSH ingress rule or key pair
is created, so changing a developer IP address never requires a Terraform
change.

## Security rule: RDS has no public access

RDS only accepts connections from the EC2 security group. 
It cannot be reached from the internet regardless of the password.
Use `./scripts/db-tunnel.sh prod` for local access.
