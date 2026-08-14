# Remote state — versioned S3 bucket + native S3 lock file.
terraform {
  backend "s3" {
    bucket       = "fieldbrix-tfstate-059763918790"
    key          = "prod/terraform.tfstate"
    region       = "ap-south-1"
    use_lockfile = true
    encrypt      = true
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
  required_version = ">= 1.15"
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

# AWS billing metrics are published only in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = {
      Project     = "fieldbrix"
      Environment = var.env
      ManagedBy   = "terraform"
    }
  }
}
