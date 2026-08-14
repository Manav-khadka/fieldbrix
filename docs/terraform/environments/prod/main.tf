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
  source           = "../../modules/database"
  env              = var.env
  subnet_ids       = [module.networking.private_subnet_a, module.networking.private_subnet_b]
  rds_sg_id        = module.networking.rds_sg_id
  instance_class   = var.db_instance_class
  engine_version   = var.db_engine_version
  protect_database = var.protect_database
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
  rds_address             = module.database.address
  rds_port                = module.database.port
  admin_domain            = var.admin_domain
  api_domain              = var.api_domain
  tls_contact_email       = var.tls_contact_email
}
