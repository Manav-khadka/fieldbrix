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
variable "admin_cidr" {
  type        = string
  description = "Your IP/CIDR for SSH — run: curl ifconfig.me"
}
variable "ec2_instance_type" {
  type    = string
  default = "t4g.medium"
}
variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}
variable "ami_id" {
  type        = string
  description = "Amazon Linux 2023 ARM64 AMI from the public SSM parameter al2023-ami-kernel-default-arm64"
}
variable "ssh_public_key_path" {
  type        = string
  description = "Path to your local .pub key file (~/.ssh/fieldbrix_prod.pub)"
}
variable "cors_allowed_origins" { type = list(string) }
variable "cloudflare_zone_id" { type = string }
variable "alert_email" { type = string }
