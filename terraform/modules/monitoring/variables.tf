variable "env" { type = string }
variable "ec2_instance_id" { type = string }
variable "db_identifier" { type = string }
variable "alert_email" {
  type        = string
  description = "Email for billing alerts and CloudWatch alarms"
}
