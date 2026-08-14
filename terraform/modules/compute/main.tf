# IAM role used by the EC2 application and AWS Systems Manager.
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

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "ec2" {
  name = "fieldbrix-${var.env}-ec2-policy"
  role = aws_iam_role.ec2.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ListApplicationBuckets"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = concat(var.application_bucket_arns, [var.deployment_bucket_arn])
      },
      {
        Sid    = "UseApplicationBuckets"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = concat(
          [for arn in var.application_bucket_arns : "${arn}/*"],
          ["${var.deployment_bucket_arn}/*"],
        )
      },
      {
        Sid      = "ReadRuntimeConfiguration"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = var.runtime_parameter_arns
      },
      {
        Sid    = "UseApplicationQueues"
        Effect = "Allow"
        Action = [
          "sqs:ChangeMessageVisibility",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ReceiveMessage",
          "sqs:SendMessage",
        ]
        Resource = var.queue_arns
      },
      {
        Sid      = "WriteApplicationLogs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:${var.region}:*:log-group:/fieldbrix/${var.env}/*"
      },
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "fieldbrix-${var.env}-ec2-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_instance" "api" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.ec2_sg_id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    encrypted             = true
    delete_on_termination = true
  }

  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    env                              = var.env
    region                           = var.region
    rds_address                      = var.rds_address
    rds_port                         = var.rds_port
    admin_domain                     = var.admin_domain
    api_domain                       = var.api_domain
    tls_contact_email                = var.tls_contact_email
    database_password_parameter_name = var.database_password_parameter_name
    sentry_dsn_parameter_name        = var.sentry_dsn_parameter_name
    tls_installer_script_b64         = base64encode(file("${path.module}/install-tls.sh"))
    tls_maintainer_script_b64        = base64encode(file("${path.module}/tls-maintain.sh"))
  })
  # Bootstrap changes should not replace the server and discard deployed
  # release directories. Apply live operational changes through SSM.
  user_data_replace_on_change = false

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  monitoring = true

  tags = { Name = "fieldbrix-${var.env}-api", Env = var.env }
}

# The address remains stable across EC2 stop/start. A deliberate
# `terraform destroy` releases it, so DNS must be updated after a future re-create.
resource "aws_eip" "api" {
  domain = "vpc"
  tags   = { Name = "fieldbrix-${var.env}-eip", Env = var.env }
}

resource "aws_eip_association" "api" {
  instance_id   = aws_instance.api.id
  allocation_id = aws_eip.api.id
}
