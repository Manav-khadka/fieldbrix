output "endpoint" {
  value     = aws_db_instance.postgres.endpoint
  sensitive = true
}
output "address" {
  value       = aws_db_instance.postgres.address
  description = "Private RDS hostname used by the EC2 application."
}
output "db_name" { value = aws_db_instance.postgres.db_name }
output "port" { value = aws_db_instance.postgres.port }
