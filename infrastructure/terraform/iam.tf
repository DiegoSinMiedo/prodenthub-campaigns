# =============================================================================
# IAM Roles and Policies for Lambda Functions
# =============================================================================

# -----------------------------------------------------------------------------
# Lambda Execution Role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-campaigns-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "Campaigns Lambda Execution Role"
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Logs Policy
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_logging" {
  name = "lambda-logging-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/${var.project_name}-*"
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# DynamoDB Access Policy
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "lambda-dynamodb-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.teams.arn,
          "${aws_dynamodb_table.teams.arn}/index/*",
          aws_dynamodb_table.scholarships.arn,
          "${aws_dynamodb_table.scholarships.arn}/index/*",
          aws_dynamodb_table.coupons.arn,
          "${aws_dynamodb_table.coupons.arn}/index/*",
          aws_dynamodb_table.coupon_usage.arn,
          "${aws_dynamodb_table.coupon_usage.arn}/index/*",
          aws_dynamodb_table.discount_purchases.arn,
          "${aws_dynamodb_table.discount_purchases.arn}/index/*",
          aws_dynamodb_table.personalized_plans.arn,
          "${aws_dynamodb_table.personalized_plans.arn}/index/*",
          aws_dynamodb_table.mock_exams.arn,
          "${aws_dynamodb_table.mock_exams.arn}/index/*",
          aws_dynamodb_table.mock_registrations.arn,
          "${aws_dynamodb_table.mock_registrations.arn}/index/*",
          aws_dynamodb_table.mock_statistics.arn,
          "${aws_dynamodb_table.mock_statistics.arn}/index/*"
        ]
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# S3 Access Policy
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_s3" {
  name = "lambda-s3-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.score_reports.arn,
          "${aws_s3_bucket.score_reports.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = [
          "arn:aws:s3:::prodenthub-campaign-pdfs-production/*"
        ]
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# SES Email Policy
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_ses" {
  name = "lambda-ses-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:SendTemplatedEmail"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ses:FromAddress" = var.ses_from_email
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# X-Ray Tracing Policy (Optional but recommended)
# -----------------------------------------------------------------------------
resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}
