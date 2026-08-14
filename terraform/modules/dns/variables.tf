variable "env" { type = string }
variable "ec2_public_ip" {
  type        = string
  description = "Elastic IP from compute module (static, never changes)"
}
variable "cloudflare_zone_id" { type = string }
