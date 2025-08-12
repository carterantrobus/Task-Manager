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

variable "ssh_allowed_cidr" {
  description = "CIDR block allowed to SSH into EC2 (e.g., your office IP/32)"
  type        = string
  default     = "0.0.0.0/32"
}

variable "health_check_path" {
  description = "HTTP path for ALB target group health checks"
  type        = string
  default     = "/health"
}