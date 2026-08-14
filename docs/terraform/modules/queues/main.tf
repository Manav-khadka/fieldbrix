resource "aws_sqs_queue" "dlq" {
  name                      = "fieldbrix-${var.env}-dlq"
  message_retention_seconds = 1209600 # 14 days to investigate
  tags                      = { Name = "fieldbrix-${var.env}-dlq" }
}

resource "aws_sqs_queue" "pdf" {
  name                        = "fieldbrix-${var.env}-pdf-generation.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 60
  message_retention_seconds   = 86400
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
  tags = { Name = "fieldbrix-${var.env}-pdf" }
}

resource "aws_sqs_queue" "notifications" {
  name                        = "fieldbrix-${var.env}-notifications.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 30
  message_retention_seconds   = 86400
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
  tags = { Name = "fieldbrix-${var.env}-notifications" }
}

resource "aws_sqs_queue" "scheduler" {
  name                        = "fieldbrix-${var.env}-scheduler.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 60
  message_retention_seconds   = 86400
  tags                        = { Name = "fieldbrix-${var.env}-scheduler" }
}

resource "aws_sqs_queue" "media" {
  name                       = "fieldbrix-${var.env}-media-processing"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 3600
  tags                       = { Name = "fieldbrix-${var.env}-media" }
}
