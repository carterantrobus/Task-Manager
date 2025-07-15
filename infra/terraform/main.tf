resource "aws_instance" "task_manager" {
    ami             = "ami-0443da5e1b05748c1"
    instance_type   = var.instance_type
    key_name        = var.key_name
    security_groups = [aws_security_group.task_manager_sg.name]

    tags =  {
        Name = "TaskManagerInstance"
    }
}

data "aws_vpc" "default" {
    default = true
}

resource "aws_security_group" "task_manager_sg" {
    name       = "task_manager_sg"
    description = "Allow SSH and HTTP access"

    ingress {
        description = "SSH access"
        from_port   = 22
        to_port     = 22
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    ingress {
        description = "HTTP"
        from_port   = 5000
        to_port     = 5000
        protocol    = "tcp"
        cidr_blocks = ["0.0.0.0/0"]
    }

    egress {
        from_port   = 0
        to_port     = 0
        protocol    = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }

    tags = {
        Name = "TaskManagerSG"
    }
}

# S3 bucket for frontend static site
resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name

  tags = {
    Name = "FrontendBucket"
  }
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "index.html"
  }
}

# Public read policy for S3 bucket
resource "aws_s3_bucket_policy" "frontend_public_read" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_public_read.json
  
  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

data "aws_iam_policy_document" "frontend_public_read" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    effect = "Allow"
  }
}

# CloudFront distribution for S3 bucket
resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "frontendS3Origin"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "frontendS3Origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    viewer_protocol_policy = "redirect-to-https"
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "FrontendCloudFront"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# RDS Subnet Group
resource "aws_db_subnet_group" "task_manager" {
  name       = "task-manager-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "TaskManagerDBSubnetGroup"
  }
}

# Get default subnets
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# RDS Security Group
resource "aws_security_group" "rds_sg" {
  name        = "task-manager-rds-sg"
  description = "Security group for RDS database"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.task_manager_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "TaskManagerRDSSG"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "task_manager" {
  identifier = "task-manager-db"

  engine         = "postgres"
  engine_version = "17.5"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true

  db_name  = "taskmanager"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.task_manager.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name = "TaskManagerDB"
  }
}

# Update EC2 security group to allow outbound database access
resource "aws_security_group_rule" "ec2_to_rds" {
  type                     = "egress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.task_manager_sg.id
  source_security_group_id = aws_security_group.rds_sg.id
  description              = "Allow EC2 to access RDS"
}