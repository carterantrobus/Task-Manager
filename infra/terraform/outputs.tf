output "instance_public_ip" {
    value = aws_instance.task_manager.public_ip
}