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