output "photos_bucket" { value = aws_s3_bucket.photos.id }
output "pdfs_bucket" { value = aws_s3_bucket.pdfs.id }
output "exports_bucket" { value = aws_s3_bucket.exports.id }
output "web_bucket" { value = aws_s3_bucket.web.id }
output "photos_bucket_arn" { value = aws_s3_bucket.photos.arn }
output "pdfs_bucket_arn" { value = aws_s3_bucket.pdfs.arn }
output "exports_bucket_arn" { value = aws_s3_bucket.exports.arn }
