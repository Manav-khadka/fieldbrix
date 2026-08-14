module "networking" {
  source                = "../../modules/networking"
  env                   = var.env
  region                = var.region
  vpc_cidr              = var.vpc_cidr
  public_subnet_cidr_a  = var.public_subnet_cidr_a
  public_subnet_cidr_b  = var.public_subnet_cidr_b
  private_subnet_cidr_a = var.private_subnet_cidr_a
  admin_cidr            = var.admin_cidr
}

module "storage" {
  source               = "../../modules/storage"
  env                  = var.env
  cors_allowed_origins = var.cors_allowed_origins
}

module "queues" {
  source = "../../modules/queues"
  env    = var.env
}

module "database" {
  source         = "../../modules/database"
  env            = var.env
  subnet_ids     = [module.networking.public_subnet_a, module.networking.public_subnet_b]
  rds_sg_id      = module.networking.rds_sg_id
  instance_class = var.db_instance_class
}

module "compute" {
  source              = "../../modules/compute"
  env                 = var.env
  region              = var.region
  ami_id              = var.ami_id
  instance_type       = var.ec2_instance_type
  subnet_id           = module.networking.public_subnet_a
  ec2_sg_id           = module.networking.ec2_sg_id
  ssh_public_key_path = var.ssh_public_key_path
  sqs_queue_arns      = module.queues.all_queue_arns
  rds_endpoint        = module.database.endpoint
}

module "monitoring" {
  source          = "../../modules/monitoring"
  env             = var.env
  ec2_instance_id = module.compute.instance_id
  db_identifier   = "fieldbrix-${var.env}"
  alert_email     = var.alert_email
}

module "dns" {
  source             = "../../modules/dns"
  env                = var.env
  ec2_public_ip      = module.compute.static_ip
  cloudflare_zone_id = var.cloudflare_zone_id
}
