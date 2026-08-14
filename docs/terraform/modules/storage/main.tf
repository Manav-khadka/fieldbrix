resource "aws_s3_bucket" "photos" {
  bucket = "fieldbrix-${var.env}-photos"
  tags   = { Env = var.env }
}
resource "aws_s3_bucket" "pdfs" {
  bucket = "fieldbrix-${var.env}-pdfs"
  tags   = { Env = var.env }
}
resource "aws_s3_bucket" "exports" {
  bucket = "fieldbrix-${var.env}-exports"
  tags   = { Env = var.env }
}
resource "aws_s3_bucket" "web" {
  bucket = "fieldbrix-${var.env}-web"
  tags   = { Env = var.env }
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

# Versioning on web bucket (easy rollback of SPA deploys)
resource "aws_s3_bucket_versioning" "web" {
  bucket = aws_s3_bucket.web.id
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
