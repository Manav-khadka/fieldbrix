variable "env" { type = string }
variable "region" { type = string }
variable "github_repo_sub" {
  type        = string
  description = <<-EOT
    The OIDC `sub` claim's repo segment GitHub actually issues — NOT plain
    "owner/repo". GitHub embeds immutable numeric owner/repo IDs:
    "owner_login@owner_id/repo_name@repo_id" (e.g.
    "Manav-khadka@96826294/fieldbrix@1333637235"). Get the exact value by
    decoding a real token's `sub` claim from a workflow run (curl
    $ACTIONS_ID_TOKEN_REQUEST_URL, decode the JWT) — a plain "owner/repo"
    trust condition silently never matches and every AssumeRoleWithWebIdentity
    call fails with a generic "Not authorized", not a helpful mismatch error.
  EOT
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
