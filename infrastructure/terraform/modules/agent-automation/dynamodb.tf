# DynamoDB tables for Agent Automation System
# This module defines tables for content management, analytics, and audit logs

# Table 1: Content Repository
resource "aws_dynamodb_table" "content" {
  name           = "${var.environment}-prodenthub-content"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "contentId"

  attribute {
    name = "contentId"
    type = "S"
  }

  attribute {
    name = "type"
    type = "S"
  }

  attribute {
    name = "campaignId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  attribute {
    name = "scheduledAt"
    type = "S"
  }

  # GSI for filtering by content type
  global_secondary_index {
    name            = "type-createdAt-index"
    hash_key        = "type"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # GSI for filtering by campaign
  global_secondary_index {
    name            = "campaignId-index"
    hash_key        = "campaignId"
    projection_type = "ALL"
  }

  # GSI for filtering by status (draft/scheduled/published)
  global_secondary_index {
    name            = "status-scheduledAt-index"
    hash_key        = "status"
    range_key       = "scheduledAt"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "ProDentHub Content Repository"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Table 2: Campaign Management
resource "aws_dynamodb_table" "campaigns" {
  name           = "${var.environment}-prodenthub-campaigns-metadata"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "campaignId"

  attribute {
    name = "campaignId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  # GSI for filtering active/inactive campaigns
  global_secondary_index {
    name            = "status-createdAt-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  tags = {
    Name        = "ProDentHub Campaign Metadata"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Table 3: Content Analytics
resource "aws_dynamodb_table" "content_analytics" {
  name           = "${var.environment}-prodenthub-content-analytics"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "analyticsId"

  attribute {
    name = "analyticsId"
    type = "S"
  }

  attribute {
    name = "contentId"
    type = "S"
  }

  attribute {
    name = "platform"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  # GSI for getting analytics by content
  global_secondary_index {
    name            = "contentId-date-index"
    hash_key        = "contentId"
    range_key       = "date"
    projection_type = "ALL"
  }

  # GSI for getting analytics by platform
  global_secondary_index {
    name            = "platform-date-index"
    hash_key        = "platform"
    range_key       = "date"
    projection_type = "ALL"
  }

  tags = {
    Name        = "ProDentHub Content Analytics"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Table 4: Publishing History
resource "aws_dynamodb_table" "publishing_history" {
  name           = "${var.environment}-prodenthub-publishing-history"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "publishId"

  attribute {
    name = "publishId"
    type = "S"
  }

  attribute {
    name = "contentId"
    type = "S"
  }

  attribute {
    name = "platform"
    type = "S"
  }

  attribute {
    name = "publishedAt"
    type = "S"
  }

  # GSI for content publishing history
  global_secondary_index {
    name            = "contentId-publishedAt-index"
    hash_key        = "contentId"
    range_key       = "publishedAt"
    projection_type = "ALL"
  }

  # GSI for platform publishing history
  global_secondary_index {
    name            = "platform-publishedAt-index"
    hash_key        = "platform"
    range_key       = "publishedAt"
    projection_type = "ALL"
  }

  tags = {
    Name        = "ProDentHub Publishing History"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Table 5: Social Media Targets
resource "aws_dynamodb_table" "social_targets" {
  name           = "${var.environment}-prodenthub-social-targets"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "targetId"

  attribute {
    name = "targetId"
    type = "S"
  }

  attribute {
    name = "platform"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # GSI for filtering by platform
  global_secondary_index {
    name            = "platform-status-index"
    hash_key        = "platform"
    range_key       = "status"
    projection_type = "ALL"
  }

  tags = {
    Name        = "ProDentHub Social Media Targets"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Table 6: Agent Prompts and Templates
resource "aws_dynamodb_table" "agent_templates" {
  name           = "${var.environment}-prodenthub-agent-templates"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "templateId"

  attribute {
    name = "templateId"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  # GSI for filtering by category
  global_secondary_index {
    name            = "category-index"
    hash_key        = "category"
    projection_type = "ALL"
  }

  tags = {
    Name        = "ProDentHub Agent Templates"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Table 7: Audit Logs
resource "aws_dynamodb_table" "audit_logs" {
  name           = "${var.environment}-prodenthub-audit-logs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "logId"

  attribute {
    name = "logId"
    type = "S"
  }

  attribute {
    name = "action"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  # GSI for filtering by action type
  global_secondary_index {
    name            = "action-timestamp-index"
    hash_key        = "action"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  # GSI for filtering by user
  global_secondary_index {
    name            = "userId-timestamp-index"
    hash_key        = "userId"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "ProDentHub Audit Logs"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Table 8: API Keys for Agent Authentication
resource "aws_dynamodb_table" "api_keys" {
  name           = "${var.environment}-prodenthub-api-keys"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "keyId"

  attribute {
    name = "keyId"
    type = "S"
  }

  attribute {
    name = "apiKey"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # GSI for API key lookup
  global_secondary_index {
    name            = "apiKey-index"
    hash_key        = "apiKey"
    projection_type = "ALL"
  }

  # GSI for filtering by status
  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    projection_type = "ALL"
  }

  tags = {
    Name        = "ProDentHub API Keys"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
