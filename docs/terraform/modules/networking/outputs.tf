output "vpc_id" { value = aws_vpc.main.id }
output "public_subnet_a" { value = aws_subnet.public_a.id }
output "public_subnet_b" { value = aws_subnet.public_b.id }
output "private_subnet_a" { value = aws_subnet.private_a.id }
output "ec2_sg_id" { value = aws_security_group.ec2.id }
output "rds_sg_id" { value = aws_security_group.rds.id }
