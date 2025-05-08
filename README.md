# Scalable-Task-Manager

A full-stack task management app deployed to AWS EC2 using Terraform and Github Actions CI/CD

## Features
 - Add/View tasks via Flask API
 - Frontend: HTML/CSS/JavaScript
 - Backend: Flask + Gunicorn
 - Infra: Terraform on AWS EC2
 - CI/CD: Github Actions auto-deploy no push

## Architecture
[Github] -> [CI/CD] -> [EC2 via SSH] -> [Flask API on Gunicorn]

## How to Use
1. Clone the repo
2. `cd backend && pip install -r requirements.txt`
3. Run with `gunicorn` or `[python app.py]`