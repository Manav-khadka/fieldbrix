# Cloudflare API token is kept in encrypted Standard-tier SSM Parameter Store;
# this optional module is not
# part of the current Sprint 01 apply path because DNS stays operator-managed.
data "aws_ssm_parameter" "cf_token" {
  name            = "/fieldbrix/${var.env}/cloudflare_token"
  with_decryption = true
}

provider "cloudflare" {
  api_token = data.aws_ssm_parameter.cf_token.value
}

# api.fieldbrix.in → EC2 static IP
resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = var.env == "prod" ? "api" : "api-${var.env}"
  value   = var.ec2_public_ip
  type    = "A"
  proxied = true # DDoS protection + hides real EC2 IP
  ttl     = 1    # automatic (managed by Cloudflare when proxied)
}

# fieldbrix.in → EC2 static IP
resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = var.env == "prod" ? "@" : var.env
  value   = var.ec2_public_ip
  type    = "A"
  proxied = true
  ttl     = 1
}

# SSL settings: Full strict = end-to-end encryption
resource "cloudflare_zone_settings_override" "ssl" {
  zone_id = var.cloudflare_zone_id
  settings {
    ssl                      = "strict" # validates EC2 cert too
    always_use_https         = "on"
    min_tls_version          = "1.2"
    automatic_https_rewrites = "on"
  }
}
