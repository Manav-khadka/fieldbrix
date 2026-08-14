variable "env" { type = string }
variable "region" { type = string }
variable "ami_id" {
  type        = string
  description = "Amazon Linux 2023 ARM64 AMI for ap-south-1"
}
variable "instance_type" {
  type    = string
  default = "t4g.medium"
}
variable "subnet_id" { type = string }
variable "ec2_sg_id" { type = string }
variable "ssh_public_key_path" {
  type        = string
  description = "Path to your LOCAL SSH public key (.pub file)"
}
variable "sqs_queue_arns" { type = list(string) }
variable "rds_endpoint" { type = string }
