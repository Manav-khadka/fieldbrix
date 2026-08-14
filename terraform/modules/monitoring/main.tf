# Billing alarms require us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_sns_topic" "alerts" {
  name = "fieldbrix-${var.env}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
  # You will receive a confirmation email — click the link to activate
}

resource "aws_cloudwatch_metric_alarm" "billing_50" {
  provider            = aws.us_east_1
  alarm_name          = "fieldbrix-billing-50usd"
  namespace           = "AWS/Billing"
  metric_name         = "EstimatedCharges"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  period              = 86400
  statistic           = "Maximum"
  threshold           = 50
  alarm_description   = "AWS spend > $50 — 25% of $200 credits used"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions          = { Currency = "USD" }
}

resource "aws_cloudwatch_metric_alarm" "billing_90" {
  provider            = aws.us_east_1
  alarm_name          = "fieldbrix-billing-90usd"
  namespace           = "AWS/Billing"
  metric_name         = "EstimatedCharges"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  period              = 86400
  statistic           = "Maximum"
  threshold           = 90
  alarm_description   = "AWS spend > $90 — credits nearly gone, add payment method NOW"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions          = { Currency = "USD" }
}

resource "aws_cloudwatch_metric_alarm" "ec2_cpu" {
  alarm_name          = "fieldbrix-${var.env}-ec2-cpu-high"
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 CPU > 80% for 15 min — consider upgrading to t4g.large"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions          = { InstanceId = var.ec2_instance_id }
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "fieldbrix-${var.env}-rds-connections"
  namespace           = "AWS/RDS"
  metric_name         = "DatabaseConnections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  period              = 300
  statistic           = "Average"
  threshold           = 70
  alarm_description   = "RDS connections > 70 (max 87) — check PgBouncer is running on EC2"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions          = { DBInstanceIdentifier = var.db_identifier }
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "fieldbrix-${var.env}-rds-storage-low"
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  period              = 3600
  statistic           = "Average"
  threshold           = 2147483648 # 2GB
  alarm_description   = "RDS free storage < 2GB — run: aws rds modify-db-instance to increase"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions          = { DBInstanceIdentifier = var.db_identifier }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/fieldbrix/${var.env}/api"
  retention_in_days = 30
  tags              = { Env = var.env }
}

resource "aws_cloudwatch_log_group" "lambda_pdf" {
  name              = "/fieldbrix/${var.env}/lambda/pdf"
  retention_in_days = 14
}
