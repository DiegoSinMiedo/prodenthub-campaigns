# =============================================================================
# API Gateway Configuration for ProDentHub Campaigns
# =============================================================================

# -----------------------------------------------------------------------------
# REST API
# -----------------------------------------------------------------------------
resource "aws_api_gateway_rest_api" "campaigns" {
  name        = "${var.project_name}-campaigns-api-${var.environment}"
  description = "ProDentHub Campaigns API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "Campaigns API"
  }
}

# -----------------------------------------------------------------------------
# API Resources
# -----------------------------------------------------------------------------

# /checkout resource
resource "aws_api_gateway_resource" "checkout" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  parent_id   = aws_api_gateway_rest_api.campaigns.root_resource_id
  path_part   = "checkout"
}

# /checkout/create
resource "aws_api_gateway_resource" "checkout_create" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  parent_id   = aws_api_gateway_resource.checkout.id
  path_part   = "create"
}

# /checkout/verify
resource "aws_api_gateway_resource" "checkout_verify" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  parent_id   = aws_api_gateway_resource.checkout.id
  path_part   = "verify"
}

# /webhook resource
resource "aws_api_gateway_resource" "webhook" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  parent_id   = aws_api_gateway_rest_api.campaigns.root_resource_id
  path_part   = "webhook"
}

# /webhook/stripe
resource "aws_api_gateway_resource" "webhook_stripe" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  parent_id   = aws_api_gateway_resource.webhook.id
  path_part   = "stripe"
}

# /teams resource
resource "aws_api_gateway_resource" "teams" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  parent_id   = aws_api_gateway_rest_api.campaigns.root_resource_id
  path_part   = "teams"
}

# /teams/create
resource "aws_api_gateway_resource" "teams_create" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  parent_id   = aws_api_gateway_resource.teams.id
  path_part   = "create"
}

# /teams/{teamId}
resource "aws_api_gateway_resource" "teams_id" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  parent_id   = aws_api_gateway_resource.teams.id
  path_part   = "{teamId}"
}

# -----------------------------------------------------------------------------
# API Methods & Integrations
# -----------------------------------------------------------------------------

# POST /checkout/create
module "checkout_create_post" {
  source = "./modules/api-lambda-integration"

  rest_api_id   = aws_api_gateway_rest_api.campaigns.id
  resource_id   = aws_api_gateway_resource.checkout_create.id
  http_method   = "POST"
  lambda_arn    = aws_lambda_function.checkout_session.invoke_arn
  authorization = "NONE"
}

# POST /checkout/verify
module "checkout_verify_post" {
  source = "./modules/api-lambda-integration"

  rest_api_id   = aws_api_gateway_rest_api.campaigns.id
  resource_id   = aws_api_gateway_resource.checkout_verify.id
  http_method   = "POST"
  lambda_arn    = aws_lambda_function.checkout_session.invoke_arn
  authorization = "NONE"
}

# POST /webhook/stripe
module "webhook_stripe_post" {
  source = "./modules/api-lambda-integration"

  rest_api_id   = aws_api_gateway_rest_api.campaigns.id
  resource_id   = aws_api_gateway_resource.webhook_stripe.id
  http_method   = "POST"
  lambda_arn    = aws_lambda_function.stripe_webhook.invoke_arn
  authorization = "NONE"
}

# POST /teams/create
module "teams_create_post" {
  source = "./modules/api-lambda-integration"

  rest_api_id   = aws_api_gateway_rest_api.campaigns.id
  resource_id   = aws_api_gateway_resource.teams_create.id
  http_method   = "POST"
  lambda_arn    = aws_lambda_function.team_creation.invoke_arn
  authorization = "NONE"
}

# GET /teams/{teamId}
module "teams_get" {
  source = "./modules/api-lambda-integration"

  rest_api_id   = aws_api_gateway_rest_api.campaigns.id
  resource_id   = aws_api_gateway_resource.teams_id.id
  http_method   = "GET"
  lambda_arn    = aws_lambda_function.team_creation.invoke_arn
  authorization = "NONE"
}

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
resource "aws_api_gateway_method" "cors_checkout_create" {
  rest_api_id   = aws_api_gateway_rest_api.campaigns.id
  resource_id   = aws_api_gateway_resource.checkout_create.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "cors_checkout_create" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  resource_id = aws_api_gateway_resource.checkout_create.id
  http_method = aws_api_gateway_method.cors_checkout_create.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "cors_checkout_create" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  resource_id = aws_api_gateway_resource.checkout_create.id
  http_method = aws_api_gateway_method.cors_checkout_create.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "cors_checkout_create" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  resource_id = aws_api_gateway_resource.checkout_create.id
  http_method = aws_api_gateway_method.cors_checkout_create.http_method
  status_code = aws_api_gateway_method_response.cors_checkout_create.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# -----------------------------------------------------------------------------
# API Deployment
# -----------------------------------------------------------------------------
resource "aws_api_gateway_deployment" "campaigns" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_rest_api.campaigns.body,
      aws_api_gateway_resource.checkout.id,
      aws_api_gateway_resource.teams.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    module.checkout_create_post,
    module.teams_create_post,
    module.webhook_stripe_post,
  ]
}

resource "aws_api_gateway_stage" "campaigns" {
  deployment_id = aws_api_gateway_deployment.campaigns.id
  rest_api_id   = aws_api_gateway_rest_api.campaigns.id
  stage_name    = "v1"

  xray_tracing_enabled = true

  tags = {
    Name = "Campaigns API v1"
  }
}

# -----------------------------------------------------------------------------
# API Gateway Logging
# -----------------------------------------------------------------------------
resource "aws_api_gateway_method_settings" "campaigns" {
  rest_api_id = aws_api_gateway_rest_api.campaigns.id
  stage_name  = aws_api_gateway_stage.campaigns.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled        = true
    logging_level          = "INFO"
    data_trace_enabled     = true
    throttling_rate_limit  = 100
    throttling_burst_limit = 50
  }
}
