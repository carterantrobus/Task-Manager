variable "aws_region" {
    default = "ca-central-1"
}

variable "instance_type" {
    default = "t2.micro"
}

variable "key_name" {
    description = ""
}

variable "frontend_bucket_name" {
  description = "Name of the S3 bucket for frontend static site. Must be globally unique."
}

variable "db_instance_class" {
  description = "RDS instance class"
  default     = "db.t3.micro"
}

variable "db_username" {
  description = "Database master username"
  default     = "taskmanager"
}

variable "db_password" {
  description = "Database master password"
  sensitive   = true
}