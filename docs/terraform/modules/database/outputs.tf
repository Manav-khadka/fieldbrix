output "endpoint" {
  value     = aws_db_instance.postgres.endpoint
  sensitive = true
}
output "db_name" { value = aws_db_instance.postgres.db_name }
output "port" { value = aws_db_instance.postgres.port }
