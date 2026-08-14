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

resource "aws_kms_key" "runtime_secrets" {
  description             = "FieldBrix ${var.env} runtime secret encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_kms_alias" "runtime_secrets" {
  name          = "alias/fieldbrix-${var.env}-runtime-secrets"
  target_key_id = aws_kms_key.runtime_secrets.key_id
}

resource "aws_secretsmanager_secret" "runtime" {
  name                    = "fieldbrix/${var.env}/runtime"
  description             = "FieldBrix runtime database and service secrets"
  kms_key_id              = aws_kms_key.runtime_secrets.arn
  recovery_window_in_days = 30
}

resource "aws_secretsmanager_secret_version" "runtime" {
  secret_id = aws_secretsmanager_secret.runtime.id
  secret_string = jsonencode({
    DB_PASSWORD = var.database_password
    SENTRY_DSN  = var.backend_sentry_dsn
  })

  lifecycle {
    # Operators rotate non-database runtime values through Secrets Manager;
    # Terraform must not overwrite that rotated secret on later applies.
    ignore_changes = [secret_string]
  }
}

module "queues" {
  source = "../../modules/queues"
  env    = var.env
}

module "compute" {
  source                  = "../../modules/compute"
  env                     = var.env
  region                  = var.region
  ami_id                  = var.ami_id
  instance_type           = var.ec2_instance_type
  subnet_id               = module.networking.public_subnet_a
  ec2_sg_id               = module.networking.ec2_sg_id
  application_bucket_arns = module.storage.application_bucket_arns
  deployment_bucket_arn   = module.storage.web_bucket_arn
  queue_arns              = module.queues.all_queue_arns
  rds_address             = module.database.address
  rds_port                = module.database.port
  admin_domain            = var.admin_domain
  api_domain              = var.api_domain
  tls_contact_email       = var.tls_contact_email
  runtime_secret_arn      = aws_secretsmanager_secret.runtime.arn
  runtime_kms_key_arn     = aws_kms_key.runtime_secrets.arn
}

module "monitoring" {
  source          = "../../modules/monitoring"
  env             = var.env
  ec2_instance_id = module.compute.instance_id
  db_identifier   = "fieldbrix-${var.env}"
  alert_email     = var.alert_email
}
