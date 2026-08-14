resource "aws_sqs_queue" "fifo_dlq" {
  name                        = "fieldbrix-${var.env}-fifo-dlq.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = 1209600 # 14 days to investigate
  sqs_managed_sse_enabled     = true
  tags                        = { Name = "fieldbrix-${var.env}-fifo-dlq" }
}

resource "aws_sqs_queue" "standard_dlq" {
  name                      = "fieldbrix-${var.env}-standard-dlq"
  message_retention_seconds = 1209600 # 14 days to investigate
  sqs_managed_sse_enabled   = true
  tags                      = { Name = "fieldbrix-${var.env}-standard-dlq" }
}

resource "aws_sqs_queue" "pdf" {
  name                        = "fieldbrix-${var.env}-pdf-generation.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  sqs_managed_sse_enabled     = true
  visibility_timeout_seconds  = 60
  message_retention_seconds   = 86400
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.fifo_dlq.arn
    maxReceiveCount     = 3
  })
  tags = { Name = "fieldbrix-${var.env}-pdf" }
}

resource "aws_sqs_queue" "notifications" {
  name                        = "fieldbrix-${var.env}-notifications.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  sqs_managed_sse_enabled     = true
  visibility_timeout_seconds  = 30
  message_retention_seconds   = 86400
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.fifo_dlq.arn
    maxReceiveCount     = 3
  })
  tags = { Name = "fieldbrix-${var.env}-notifications" }
}

resource "aws_sqs_queue" "scheduler" {
  name                        = "fieldbrix-${var.env}-scheduler.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  sqs_managed_sse_enabled     = true
  visibility_timeout_seconds  = 60
  message_retention_seconds   = 86400
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.fifo_dlq.arn
    maxReceiveCount     = 3
  })
  tags = { Name = "fieldbrix-${var.env}-scheduler" }
}

resource "aws_sqs_queue" "media" {
  name                       = "fieldbrix-${var.env}-media-processing"
  sqs_managed_sse_enabled    = true
  visibility_timeout_seconds = 60
  message_retention_seconds  = 3600
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.standard_dlq.arn
    maxReceiveCount     = 3
  })
  tags = { Name = "fieldbrix-${var.env}-media" }
}

resource "aws_sqs_queue_redrive_allow_policy" "fifo_dlq" {
  queue_url = aws_sqs_queue.fifo_dlq.id
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns = [
      aws_sqs_queue.pdf.arn,
      aws_sqs_queue.notifications.arn,
      aws_sqs_queue.scheduler.arn,
    ]
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "standard_dlq" {
  queue_url = aws_sqs_queue.standard_dlq.id
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.media.arn]
  })
}
