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
  description = "Private deployment artifact bucket used by the SSM deployment pipeline."
}
output "instance_id" {
  value       = module.compute.instance_id
  description = "EC2 instance managed through AWS Systems Manager."
}
output "admin_url" {
  value       = "https://${var.admin_domain}"
  description = "TLS-protected admin hostname after its A record points to static_ip."
}
output "api_url" {
  value       = "https://${var.api_domain}"
  description = "TLS-protected API hostname after its A record points to static_ip."
}
output "github_deploy_role_arn" {
  value       = module.ci_deploy.deploy_role_arn
  description = "Set as the AWS_DEPLOY_ROLE_ARN GitHub Actions repo secret: gh secret set AWS_DEPLOY_ROLE_ARN --body \"$(terraform output -raw github_deploy_role_arn)\""
}
output "queue_urls" {
  description = "Application queue endpoints used by the API and workers."
  value = {
    pdf                  = module.queues.pdf_queue_url
    notifications        = module.queues.notif_queue_url
    scheduler            = module.queues.scheduler_queue_url
    media                = module.queues.media_queue_url
    fifo_dead_letter     = module.queues.fifo_dlq_url
    standard_dead_letter = module.queues.standard_dlq_url
  }
}
