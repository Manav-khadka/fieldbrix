variable "env" { type = string }
variable "region" { type = string }
variable "ami_id" {
  type        = string
  description = "Amazon Linux 2023 ARM64 AMI for ap-south-1"
}
variable "instance_type" {
  type    = string
  default = "t4g.small"
}
variable "subnet_id" { type = string }
variable "ec2_sg_id" { type = string }
variable "application_bucket_arns" { type = list(string) }
variable "deployment_bucket_arn" { type = string }
variable "queue_arns" { type = list(string) }
variable "rds_address" { type = string }
variable "rds_port" { type = number }
variable "admin_domain" { type = string }
variable "api_domain" { type = string }
variable "tls_contact_email" {
  type        = string
  default     = ""
  description = "Optional ACME contact address; renewal monitoring does not depend on email"

  validation {
    condition     = var.tls_contact_email == "" || can(regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$", var.tls_contact_email))
    error_message = "tls_contact_email must be empty or a valid email address."
  }
}
