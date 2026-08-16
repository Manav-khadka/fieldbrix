module "networking" {
  source                = "../../modules/networking"
  env                   = var.env
  region                = var.region
  vpc_cidr              = var.vpc_cidr
  public_subnet_cidr_a  = var.public_subnet_cidr_a
  public_subnet_cidr_b  = var.public_subnet_cidr_b
  private_subnet_cidr_a = var.private_subnet_cidr_a
  private_subnet_cidr_b = var.private_subnet_cidr_b
}

module "storage" {
  source               = "../../modules/storage"
  env                  = var.env
  cors_allowed_origins = var.cors_allowed_origins
}

module "database" {
  source            = "../../modules/database"
  env               = var.env
  subnet_ids        = [module.networking.private_subnet_a, module.networking.private_subnet_b]
  rds_sg_id         = module.networking.rds_sg_id
  instance_class    = var.db_instance_class
  engine_version    = var.db_engine_version
  protect_database  = var.protect_database
  database_password = var.database_password
}

resource "aws_ssm_parameter" "backend_sentry_dsn" {
  name        = "/fieldbrix/${var.env}/sentry_dsn"
  description = "FieldBrix NestJS Sentry DSN"
  type        = "SecureString"
  tier        = "Standard"
  value       = var.backend_sentry_dsn

  lifecycle {
    # A CI-protected variable is the source of truth. Avoid unexpected updates
    # from routine infrastructure applies once the parameter has been created.
    ignore_changes = [value]
  }
}

module "queues" {
  source = "../../modules/queues"
  env    = var.env
}

module "compute" {
  source                           = "../../modules/compute"
  env                              = var.env
  region                           = var.region
  ami_id                           = var.ami_id
  instance_type                    = var.ec2_instance_type
  subnet_id                        = module.networking.public_subnet_a
  ec2_sg_id                        = module.networking.ec2_sg_id
  application_bucket_arns          = module.storage.application_bucket_arns
  deployment_bucket_arn            = module.storage.web_bucket_arn
  queue_arns                       = module.queues.all_queue_arns
  rds_address                      = module.database.address
  rds_port                         = module.database.port
  application_bucket               = module.storage.photos_bucket
  application_queue_url            = module.queues.media_queue_url
  admin_domain                     = var.admin_domain
  api_domain                       = var.api_domain
  tls_contact_email                = var.tls_contact_email
  database_password_parameter_name = "/fieldbrix/${var.env}/db_password"
  sentry_dsn_parameter_name        = aws_ssm_parameter.backend_sentry_dsn.name
  runtime_parameter_arns = [
    "arn:aws:ssm:${var.region}:*:parameter/fieldbrix/${var.env}/db_password",
    aws_ssm_parameter.backend_sentry_dsn.arn,
  ]
}

module "monitoring" {
  source = "../../modules/monitoring"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }
  env             = var.env
  ec2_instance_id = module.compute.instance_id
  db_identifier   = "fieldbrix-${var.env}"
  alert_email     = var.alert_email
}

module "ci_deploy" {
  source                = "../../modules/ci-deploy"
  env                   = var.env
  region                = var.region
  github_repo_sub       = var.github_repo_sub
  tfstate_bucket        = "fieldbrix-tfstate-059763918790" # matches backend.tf
  deployment_bucket_arn = module.storage.web_bucket_arn
  instance_id           = module.compute.instance_id
}
