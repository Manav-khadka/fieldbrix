variable "env" { type = string }
variable "region" { type = string }
variable "github_repo" {
  type        = string
  description = "GitHub \"owner/repo\" allowed to assume the deploy role — scopes the OIDC trust policy's sub claim."
}
variable "tfstate_bucket" {
  type        = string
  description = "S3 bucket backing the Terraform remote state (matches backend.tf)."
}
variable "deployment_bucket_arn" {
  type        = string
  description = "ARN of the private deployment-artifact bucket (module.storage.web_bucket_arn)."
}
variable "instance_id" {
  type        = string
  description = "EC2 instance ID the deploy command targets (module.compute.instance_id)."
}
