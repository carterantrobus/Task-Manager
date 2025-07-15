output "instance_public_ip" {
    value = aws_instance.task_manager.public_ip
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "rds_endpoint" {
  value = aws_db_instance.task_manager.endpoint
}

output "database_name" {
  value = aws_db_instance.task_manager.db_name
}