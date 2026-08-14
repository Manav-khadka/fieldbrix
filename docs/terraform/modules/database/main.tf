# Password from SSM Parameter Store (free, encrypted)
data "aws_ssm_parameter" "db_password" {
  name            = "/fieldbrix/${var.env}/db_password"
  with_decryption = true
}

resource "aws_db_subnet_group" "main" {
  name       = "fieldbrix-${var.env}-subnet-group"
  subnet_ids = var.subnet_ids
  tags       = { Name = "fieldbrix-${var.env}-subnet-group" }
}

resource "aws_db_parameter_group" "pg16" {
  name   = "fieldbrix-${var.env}-pg16"
  family = "postgres16"
  # Log slow queries (>1s) — useful for performance debugging
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
  # Log all connections — useful for security auditing
  parameter {
    name  = "log_connections"
    value = "1"
  }
  # Require SSL — always encrypt connections to RDS
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_db_instance" "postgres" {
  identifier        = "fieldbrix-${var.env}"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = var.instance_class # db.t3.micro
  allocated_storage = 20
  storage_type      = "gp2"
  storage_encrypted = true # encrypt at rest

  db_name  = "fieldbrix"
  username = "fieldbrix_admin"
  password = data.aws_ssm_parameter.db_password.value

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]
  parameter_group_name   = aws_db_parameter_group.pg16.name

  # Automated backups: 7 days PITR at 2am UTC
  backup_retention_period = 7
  backup_window           = "02:00-03:00"
  maintenance_window      = "Mon:03:00-Mon:04:00"

  # Prod safety: prevent accidental destruction
  deletion_protection       = var.env == "prod" ? true : false
  skip_final_snapshot       = var.env == "prod" ? false : true
  final_snapshot_identifier = var.env == "prod" ? "fieldbrix-prod-final-snapshot" : null

  tags = { Name = "fieldbrix-${var.env}-postgres", Env = var.env }

  lifecycle {
    prevent_destroy = true
    # Password managed in SSM — don't let Terraform overwrite it on re-apply
    ignore_changes = [password]
  }
}
