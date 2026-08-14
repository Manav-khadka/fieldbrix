output "sns_topic_arn" { value = aws_sns_topic.alerts.arn }
output "api_log_group" { value = aws_cloudwatch_log_group.api.name }
output "lambda_log_group" { value = aws_cloudwatch_log_group.lambda_pdf.name }
