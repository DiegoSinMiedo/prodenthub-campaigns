# =============================================================================
# Terraform Outputs
# =============================================================================

output "api_gateway_url" {
  description = "API Gateway URL"
  value       = "${aws_api_gateway_stage.campaigns.invoke_url}"
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_api_gateway_rest_api.campaigns.id
}

output "dynamodb_tables" {
  description = "DynamoDB Table Names"
  value = {
    teams                = aws_dynamodb_table.teams.name
    scholarships         = aws_dynamodb_table.scholarships.name
    coupons              = aws_dynamodb_table.coupons.name
    coupon_usage         = aws_dynamodb_table.coupon_usage.name
    discount_purchases   = aws_dynamodb_table.discount_purchases.name
    personalized_plans   = aws_dynamodb_table.personalized_plans.name
    mock_exams           = aws_dynamodb_table.mock_exams.name
    mock_registrations   = aws_dynamodb_table.mock_registrations.name
    mock_statistics      = aws_dynamodb_table.mock_statistics.name
  }
}

output "lambda_functions" {
  description = "Lambda Function Names"
  value = {
    checkout_session = aws_lambda_function.checkout_session.function_name
    stripe_webhook   = aws_lambda_function.stripe_webhook.function_name
    team_creation    = aws_lambda_function.team_creation.function_name
  }
}

output "s3_buckets" {
  description = "S3 Bucket Names"
  value = {
    score_reports = aws_s3_bucket.score_reports.id
  }
}

output "webhook_endpoint" {
  description = "Stripe Webhook Endpoint URL"
  value       = "${aws_api_gateway_stage.campaigns.invoke_url}/webhook/stripe"
}
