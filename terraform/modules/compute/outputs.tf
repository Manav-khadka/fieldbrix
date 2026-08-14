output "instance_id" { value = aws_instance.api.id }
output "static_ip" {
  value       = aws_eip.api.public_ip
  description = "Permanent static IP — never changes on stop/start"
}
output "eip_id" { value = aws_eip.api.id }
