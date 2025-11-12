# Outputs for Agent Automation Module

output "content_table_name" {
  description = "Name of the content repository table"
  value       = aws_dynamodb_table.content.name
}

output "content_table_arn" {
  description = "ARN of the content repository table"
  value       = aws_dynamodb_table.content.arn
}

output "campaigns_table_name" {
  description = "Name of the campaigns metadata table"
  value       = aws_dynamodb_table.campaigns.name
}

output "campaigns_table_arn" {
  description = "ARN of the campaigns metadata table"
  value       = aws_dynamodb_table.campaigns.arn
}

output "analytics_table_name" {
  description = "Name of the content analytics table"
  value       = aws_dynamodb_table.content_analytics.name
}

output "analytics_table_arn" {
  description = "ARN of the content analytics table"
  value       = aws_dynamodb_table.content_analytics.arn
}

output "publishing_history_table_name" {
  description = "Name of the publishing history table"
  value       = aws_dynamodb_table.publishing_history.name
}

output "social_targets_table_name" {
  description = "Name of the social targets table"
  value       = aws_dynamodb_table.social_targets.name
}

output "agent_templates_table_name" {
  description = "Name of the agent templates table"
  value       = aws_dynamodb_table.agent_templates.name
}

output "audit_logs_table_name" {
  description = "Name of the audit logs table"
  value       = aws_dynamodb_table.audit_logs.name
}

output "api_keys_table_name" {
  description = "Name of the API keys table"
  value       = aws_dynamodb_table.api_keys.name
}
