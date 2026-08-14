data "aws_caller_identity" "current" {}

# Preserve the existing deployment-bucket versioning state while expanding the
# same configuration to every bucket. This is a Terraform state address move,
# not an AWS delete/recreate operation.
moved {
  from = aws_s3_bucket_versioning.web
  to   = aws_s3_bucket_versioning.all["web"]
}

locals {
  bucket_prefix = "fieldbrix-${var.env}-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket" "photos" {
  bucket = "${local.bucket_prefix}-photos"
  # Stateful customer data must never be deleted as a side effect of an IaC change.
  force_destroy = false
  tags          = { Env = var.env }
}
resource "aws_s3_bucket" "pdfs" {
  bucket        = "${local.bucket_prefix}-pdfs"
  force_destroy = false
  tags          = { Env = var.env }
}
resource "aws_s3_bucket" "exports" {
  bucket        = "${local.bucket_prefix}-exports"
  force_destroy = false
  tags          = { Env = var.env }
}
resource "aws_s3_bucket" "web" {
  bucket = "${local.bucket_prefix}-deployments"
  # Deployment versions are retained so a release can be rolled back safely.
  force_destroy = false
  tags          = { Env = var.env }
}

# Block all public access on private buckets
resource "aws_s3_bucket_public_access_block" "photos" {
  bucket                  = aws_s3_bucket.photos.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_public_access_block" "pdfs" {
  bucket                  = aws_s3_bucket.pdfs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_public_access_block" "exports" {
  bucket                  = aws_s3_bucket.exports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_public_access_block" "web" {
  bucket                  = aws_s3_bucket.web.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Encrypt all buckets at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "pdfs" {
  bucket = aws_s3_bucket.pdfs.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "web" {
  bucket = aws_s3_bucket.web.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

# Versioning protects user data and makes SPA deploys reversible.
resource "aws_s3_bucket_versioning" "all" {
  for_each = {
    photos  = aws_s3_bucket.photos.id
    pdfs    = aws_s3_bucket.pdfs.id
    exports = aws_s3_bucket.exports.id
    web     = aws_s3_bucket.web.id
  }

  bucket = each.value
  versioning_configuration { status = "Enabled" }
}

# Lifecycle: photos get cheaper over time (keep forever, pay less)
resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id
  rule {
    id     = "archive"
    status = "Enabled"
    filter {}
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    } # 46% cheaper
    transition {
      days          = 365
      storage_class = "GLACIER_IR"
    } # 83% cheaper
  }
}

# Exports auto-delete after 30 days
resource "aws_s3_bucket_lifecycle_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id
  rule {
    id     = "auto-delete"
    status = "Enabled"
    filter {}
    expiration { days = 30 }
  }
}

# Retain recent deployment versions for rollback, then expire stale noncurrent assets.
resource "aws_s3_bucket_lifecycle_configuration" "web" {
  bucket = aws_s3_bucket.web.id
  rule {
    id     = "retain-rollback-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration { noncurrent_days = 90 }
  }
}

# CORS for photos: mobile app uploads directly (bypassing EC2)
resource "aws_s3_bucket_cors_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = var.cors_allowed_origins
    max_age_seconds = 3000
  }
}
