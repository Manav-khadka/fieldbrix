# ── IAM Role for EC2 (least privilege) ──────────────────────────────────────

resource "aws_iam_role" "ec2" {
  name = "fieldbrix-${var.env}-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ec2" {
  name = "fieldbrix-${var.env}-ec2-policy"
  role = aws_iam_role.ec2.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3: specific buckets only — NOT s3:* wildcard
      {
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:GeneratePresignedUrl"]
        Resource = [
          "arn:aws:s3:::fieldbrix-${var.env}-photos/*",
          "arn:aws:s3:::fieldbrix-${var.env}-pdfs/*",
          "arn:aws:s3:::fieldbrix-${var.env}-exports/*",
        ]
      },
      # SQS: specific queues only
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = var.sqs_queue_arns
      },
      # SSM: read secrets under /fieldbrix/{env}/* only
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.region}:*:parameter/fieldbrix/${var.env}/*"
      },
      # KMS: needed to decrypt SSM SecureString parameters
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
      },
      # CloudWatch Logs: write to /fieldbrix/{env}/* log groups
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${var.region}:*:log-group:/fieldbrix/${var.env}/*"
      },
      # CloudWatch Metrics: read for Grafana CloudWatch data source
      {
        Effect   = "Allow"
        Action   = ["cloudwatch:GetMetricData", "cloudwatch:ListMetrics"]
        Resource = "*"
      },
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "fieldbrix-${var.env}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ── SSH Key Pair ─────────────────────────────────────────────────────────────

resource "aws_key_pair" "deploy" {
  key_name   = "fieldbrix-${var.env}-deploy"
  public_key = file(var.ssh_public_key_path)
  # The private key never leaves your machine — only the public key is here
}

# ── EC2 Instance ─────────────────────────────────────────────────────────────

resource "aws_instance" "api" {
  ami                    = var.ami_id
  instance_type          = var.instance_type # t4g.medium
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.ec2_sg_id]
  key_name               = aws_key_pair.deploy.key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    encrypted             = true
    delete_on_termination = true
  }

  # user_data runs once on first boot — installs Node.js, PM2, PgBouncer
  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    env          = var.env
    region       = var.region
    rds_endpoint = var.rds_endpoint
  })

  # IMDSv2: prevents SSRF attacks from stealing EC2 role credentials
  metadata_options { http_tokens = "required" }

  # user_data changes should trigger instance replacement only when explicitly updated
  lifecycle {
    ignore_changes = [user_data]
  }

  tags = { Name = "fieldbrix-${var.env}-api", Env = var.env }
}

# ── Elastic IP (Static IP) ───────────────────────────────────────────────────
# IMPORTANT: EIP allocation and EC2 association are SEPARATE resources.
# This means:
#   - The IP is permanently yours until you explicitly release it
#   - Stopping/starting EC2 does NOT change or lose the IP
#   - DNS never needs to be updated after stop/start
#   - EIP is FREE when EC2 is running, $0.005/hr when EC2 is stopped

resource "aws_eip" "api" {
  domain = "vpc"

  # prevent_destroy: never accidentally destroy your static IP
  # If Terraform tries to destroy this (e.g. on terraform destroy),
  # it will error with a clear message. Remove this line only when
  # you intentionally want to release the IP.
  lifecycle {
    prevent_destroy = true
  }

  tags = { Name = "fieldbrix-${var.env}-eip", Env = var.env }
}

resource "aws_eip_association" "api" {
  instance_id   = aws_instance.api.id
  allocation_id = aws_eip.api.id
  # This association re-establishes automatically when EC2 starts after being stopped
}
