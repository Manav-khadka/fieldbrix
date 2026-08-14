variable "env" { type = string }
variable "subnet_ids" {
  type        = list(string)
  description = "At least 2 subnets in different AZs (required by RDS)"
}
variable "rds_sg_id" { type = string }
variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}
variable "engine_version" {
  type    = string
  default = "18.4"
}
variable "protect_database" {
  type        = bool
  default     = false
  description = "Use deletion protection and a final snapshot for durable production data."
}
