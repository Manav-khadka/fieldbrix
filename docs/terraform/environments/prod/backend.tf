# Remote state — S3 bucket + DynamoDB lock.
# Update bucket name after running scripts/bootstrap.sh
terraform {
  backend "s3" {
    bucket         = "fieldbrix-tfstate-059763918790"
    key            = "prod/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "fieldbrix-terraform-locks"
    encrypt        = true
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.7"
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project     = "fieldbrix"
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}
