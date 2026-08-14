variable "env" { type = string }
variable "subnet_ids" {
  type        = list(string)
  description = "At least 2 subnets in different AZs (required by RDS)"
}
variable "rds_sg_id" { type = string }
variable "instance_class" {
  type    = string
  default = "db.t3.micro"
}
