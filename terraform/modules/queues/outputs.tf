output "pdf_queue_url" { value = aws_sqs_queue.pdf.url }
output "notif_queue_url" { value = aws_sqs_queue.notifications.url }
output "scheduler_queue_url" { value = aws_sqs_queue.scheduler.url }
output "media_queue_url" { value = aws_sqs_queue.media.url }
output "fifo_dlq_url" { value = aws_sqs_queue.fifo_dlq.url }
output "standard_dlq_url" { value = aws_sqs_queue.standard_dlq.url }
output "all_queue_arns" { value = [
  aws_sqs_queue.pdf.arn,
  aws_sqs_queue.notifications.arn,
  aws_sqs_queue.scheduler.arn,
  aws_sqs_queue.media.arn,
] }
