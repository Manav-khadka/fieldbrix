resource "aws_db_subnet_group" "main" {
  name       = "fieldbrix-${var.env}-subnet-group"
  subnet_ids = var.subnet_ids
  tags       = { Name = "fieldbrix-${var.env}-subnet-group" }
}

resource "aws_db_parameter_group" "postgres" {
  name   = "fieldbrix-${var.env}-pg${split(".", var.engine_version)[0]}"
  family = "postgres${split(".", var.engine_version)[0]}"
  # Log slow queries (>1s) — useful for performance debugging
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }
  # Log all connections — useful for security auditing
  parameter {
    name  = "log_connections"
    value = "authentication"
  }
  # Require SSL — always encrypt connections to RDS
  parameter {
    name         = "rds.force_ssl"
    value        = "1"
    apply_method = "pending-reboot"
  }
}

resource "aws_db_instance" "postgres" {
  identifier            = "fieldbrix-${var.env}"
  engine                = "postgres"
  engine_version        = var.engine_version
  instance_class        = var.instance_class
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "fieldbrix"
  username = "fieldbrix_admin"
  password = var.database_password

  db_subnet_group_name       = aws_db_subnet_group.main.name
  vpc_security_group_ids     = [var.rds_sg_id]
  parameter_group_name       = aws_db_parameter_group.postgres.name
  publicly_accessible        = false
  multi_az                   = false
  auto_minor_version_upgrade = true

  # Automated backups: 7 days PITR at 2am UTC
  backup_retention_period = 7
  backup_window           = "02:00-03:00"
  maintenance_window      = "Mon:03:00-Mon:04:00"

  # Bootstrap is disposable. Set protect_database=true before storing durable data.
  deletion_protection       = var.protect_database
  skip_final_snapshot       = !var.protect_database
  final_snapshot_identifier = var.protect_database ? "fieldbrix-${var.env}-final-snapshot" : null

  tags = { Name = "fieldbrix-${var.env}-postgres", Env = var.env }

  lifecycle {
    # Password is rotated in SSM and intentionally not reset on routine applies.
    ignore_changes = [password]
  }
}
