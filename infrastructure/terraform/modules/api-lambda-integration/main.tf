# API Gateway Lambda Integration Module

variable "rest_api_id" {
  description = "API Gateway REST API ID"
}

variable "resource_id" {
  description = "API Gateway Resource ID"
}

variable "http_method" {
  description = "HTTP Method"
}

variable "lambda_arn" {
  description = "Lambda Function ARN"
}

variable "authorization" {
  description = "Authorization type"
  default     = "NONE"
}

# Method
resource "aws_api_gateway_method" "method" {
  rest_api_id   = var.rest_api_id
  resource_id   = var.resource_id
  http_method   = var.http_method
  authorization = var.authorization
}

# Integration
resource "aws_api_gateway_integration" "integration" {
  rest_api_id             = var.rest_api_id
  resource_id             = var.resource_id
  http_method             = aws_api_gateway_method.method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_arn
}
