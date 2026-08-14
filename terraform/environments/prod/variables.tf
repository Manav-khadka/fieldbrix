variable "env" {
  type    = string
  default = "prod"
}
variable "region" {
  type    = string
  default = "ap-south-1"
}
variable "vpc_cidr" { type = string }
variable "public_subnet_cidr_a" { type = string }
variable "public_subnet_cidr_b" { type = string }
variable "private_subnet_cidr_a" { type = string }
variable "private_subnet_cidr_b" { type = string }
variable "ec2_instance_type" {
  type    = string
  default = "t4g.small"
}
variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}
variable "db_engine_version" {
  type    = string
  default = "18.4"
}
variable "ami_id" {
  type        = string
  description = "Amazon Linux 2023 ARM64 AMI from the public SSM parameter al2023-ami-kernel-default-arm64"
}
variable "cors_allowed_origins" { type = list(string) }
variable "admin_domain" {
  type    = string
  default = "admin.fieldbrix.com"
}
variable "api_domain" {
  type    = string
  default = "api.fieldbrix.com"
}
variable "tls_contact_email" {
  type        = string
  default     = ""
  description = "Optional ACME contact address; renewal monitoring does not depend on email"

  validation {
    condition     = var.tls_contact_email == "" || can(regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$", var.tls_contact_email))
    error_message = "tls_contact_email must be empty or a valid email address."
  }
}
variable "protect_database" {
  type        = bool
  default     = false
  description = "Enable deletion protection and final snapshots after the disposable bootstrap phase."
}

variable "alert_email" {
  type        = string
  description = "Operations email for CloudWatch and billing alerts. AWS requires recipient confirmation."

  validation {
    condition     = can(regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$", var.alert_email))
    error_message = "alert_email must be a valid email address."
  }
}

variable "database_password" {
  type        = string
  sensitive   = true
  description = "RDS password injected by protected CI; never commit it to tfvars."
}

variable "backend_sentry_dsn" {
  type        = string
  sensitive   = true
  description = "NestJS Sentry DSN injected by protected CI; never commit it to tfvars."
}
