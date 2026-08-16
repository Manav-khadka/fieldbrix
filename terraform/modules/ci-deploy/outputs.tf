output "deploy_role_arn" {
  value       = aws_iam_role.deploy.arn
  description = "Set this as the AWS_DEPLOY_ROLE_ARN GitHub Actions repo secret."
}
