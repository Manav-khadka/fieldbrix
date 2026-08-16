# GitHub Actions OIDC federation for the "Deploy Applications" workflow.
# Short-lived, no long-term access keys stored in GitHub — the workflow
# assumes this role via aws-actions/configure-aws-credentials, scoped by
# the `sub` claim to this exact repo (any branch/workflow within it).
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role" "deploy" {
  name = "fieldbrix-${var.env}-github-deploy-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
        }
      }
    }]
  })
}

# Scoped to exactly what terraform/scripts/deploy-apps.sh does: read/write
# the remote state bucket (terraform init + `terraform output`), upload the
# two release artifacts, and push the deploy command to the one app
# instance via SSM. Nothing else — no wildcard EC2/S3/SSM actions.
resource "aws_iam_role_policy" "deploy" {
  name = "fieldbrix-${var.env}-github-deploy-policy"
  role = aws_iam_role.deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TerraformRemoteState"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.tfstate_bucket}",
          "arn:aws:s3:::${var.tfstate_bucket}/*",
        ]
      },
      {
        Sid      = "ListDeploymentBucket"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = var.deployment_bucket_arn
      },
      {
        Sid      = "UploadDeploymentArtifacts"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${var.deployment_bucket_arn}/*"
      },
      {
        Sid    = "RunDeployCommand"
        Effect = "Allow"
        Action = ["ssm:SendCommand"]
        Resource = [
          "arn:aws:ec2:${var.region}:${data.aws_caller_identity.current.account_id}:instance/${var.instance_id}",
          "arn:aws:ssm:${var.region}::document/AWS-RunShellScript",
        ]
      },
      {
        Sid      = "ReadDeployCommandStatus"
        Effect   = "Allow"
        Action   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
        Resource = "*"
      },
    ]
  })
}
