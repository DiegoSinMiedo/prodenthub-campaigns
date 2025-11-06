# =============================================================================
# Lambda Functions for ProDentHub Campaigns
# =============================================================================

# Note: Lambda deployment packages should be built separately
# See scripts/deploy-lambdas.sh

# -----------------------------------------------------------------------------
# Lambda Function: Checkout Session Handler
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "checkout_session" {
  filename      = "../lambda/checkout-session/deployment.zip"
  function_name = "${var.project_name}-checkout-session-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "src/index.handler"
  runtime       = var.lambda_runtime
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout

  environment {
    variables = {
      AWS_REGION        = var.aws_region
      ENVIRONMENT       = var.environment
      PROJECT_NAME      = var.project_name
      STRIPE_SECRET_KEY = var.stripe_secret_key
      FRONTEND_URL      = var.frontend_url
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = {
    Name = "Checkout Session Handler"
  }
}

resource "aws_cloudwatch_log_group" "checkout_session" {
  name              = "/aws/lambda/${aws_lambda_function.checkout_session.function_name}"
  retention_in_days = 14
}

# -----------------------------------------------------------------------------
# Lambda Function: Stripe Webhook Handler
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "stripe_webhook" {
  filename      = "../lambda/stripe-webhook/deployment.zip"
  function_name = "${var.project_name}-stripe-webhook-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "src/index.handler"
  runtime       = var.lambda_runtime
  memory_size   = var.lambda_memory_size
  timeout       = 60 # Webhooks may need more time

  environment {
    variables = {
      AWS_REGION             = var.aws_region
      ENVIRONMENT            = var.environment
      PROJECT_NAME           = var.project_name
      STRIPE_SECRET_KEY      = var.stripe_secret_key
      STRIPE_WEBHOOK_SECRET  = var.stripe_webhook_secret
      SES_FROM_EMAIL         = var.ses_from_email
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = {
    Name = "Stripe Webhook Handler"
  }
}

resource "aws_cloudwatch_log_group" "stripe_webhook" {
  name              = "/aws/lambda/${aws_lambda_function.stripe_webhook.function_name}"
  retention_in_days = 14
}

# -----------------------------------------------------------------------------
# Lambda Function: Team Creation Handler
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "team_creation" {
  filename      = "../lambda/team-creation/deployment.zip"
  function_name = "${var.project_name}-team-creation-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "src/index.handler"
  runtime       = var.lambda_runtime
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout

  environment {
    variables = {
      AWS_REGION   = var.aws_region
      ENVIRONMENT  = var.environment
      PROJECT_NAME = var.project_name
      FRONTEND_URL = var.frontend_url
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = {
    Name = "Team Creation Handler"
  }
}

resource "aws_cloudwatch_log_group" "team_creation" {
  name              = "/aws/lambda/${aws_lambda_function.team_creation.function_name}"
  retention_in_days = 14
}

# -----------------------------------------------------------------------------
# Lambda Permissions for API Gateway
# -----------------------------------------------------------------------------
resource "aws_lambda_permission" "checkout_session_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.checkout_session.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.campaigns.execution_arn}/*/*"
}

resource "aws_lambda_permission" "stripe_webhook_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stripe_webhook.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.campaigns.execution_arn}/*/*"
}

resource "aws_lambda_permission" "team_creation_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.team_creation.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.campaigns.execution_arn}/*/*"
}

# Note: Add similar Lambda function definitions for:
# - scholarship-handler
# - discount-purchase-handler
# - personalized-plan-handler
# - mock-exam-handler
# Follow the same pattern as above
