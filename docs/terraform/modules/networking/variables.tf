variable "env" { type = string }
variable "region" { type = string }
variable "vpc_cidr" { type = string }
variable "public_subnet_cidr_a" { type = string }
variable "public_subnet_cidr_b" { type = string }
variable "private_subnet_cidr_a" { type = string }
variable "admin_cidr" {
  type        = string
  description = "Your IP for SSH. Format: x.x.x.x/32. Run: curl ifconfig.me"
}
