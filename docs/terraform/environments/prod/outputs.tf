# These values are shown after terraform apply
output "static_ip" {
  value       = module.compute.static_ip
  description = "Your permanent static IP — set this in Cloudflare DNS A record. Never changes even after stop/start."
}
output "rds_endpoint" {
  value       = module.database.endpoint
  sensitive   = true
  description = "RDS connection endpoint. PgBouncer connects here. Run 'terraform output rds_endpoint' to see it."
}
output "photos_bucket" { value = module.storage.photos_bucket }
output "web_bucket" {
  value       = module.storage.web_bucket
  description = "Deploy React SPA: aws s3 sync dist/ s3://BUCKET --delete"
}
output "ssh_command" {
  value       = "./scripts/ssh.sh prod"
  description = "How to SSH into the EC2 instance"
}
