# =============================================================================
# DynamoDB Tables for ProDentHub Campaigns
# =============================================================================

# -----------------------------------------------------------------------------
# Table 1: Teams
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "teams" {
  name           = "${var.project_name}-teams-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "teamId"

  attribute {
    name = "teamId"
    type = "S"
  }

  attribute {
    name = "leaderEmail"
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

  global_secondary_index {
    name            = "leaderEmail-index"
    hash_key        = "leaderEmail"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-createdAt-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Teams Table"
  }
}

# -----------------------------------------------------------------------------
# Table 2: Scholarships
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "scholarships" {
  name           = "${var.project_name}-scholarships-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "scholarshipId"

  attribute {
    name = "scholarshipId"
    type = "S"
  }

  attribute {
    name = "email"
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

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-createdAt-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Scholarships Table"
  }
}

# -----------------------------------------------------------------------------
# Table 3: Coupons
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "coupons" {
  name           = "${var.project_name}-coupons-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "couponCode"

  attribute {
    name = "couponCode"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Coupons Table"
  }
}

# -----------------------------------------------------------------------------
# Table 4: Coupon Usage
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "coupon_usage" {
  name           = "${var.project_name}-coupon-usage-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "usageId"

  attribute {
    name = "usageId"
    type = "S"
  }

  attribute {
    name = "couponCode"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "couponCode-email-index"
    hash_key        = "couponCode"
    range_key       = "email"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Coupon Usage Table"
  }
}

# -----------------------------------------------------------------------------
# Table 5: Discount Purchases
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "discount_purchases" {
  name           = "${var.project_name}-discount-purchases-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "purchaseId"

  attribute {
    name = "purchaseId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Discount Purchases Table"
  }
}

# -----------------------------------------------------------------------------
# Table 6: Personalized Plans
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "personalized_plans" {
  name           = "${var.project_name}-personalized-plans-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "planId"

  attribute {
    name = "planId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "selectedCluster"
    type = "N"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "selectedCluster-createdAt-index"
    hash_key        = "selectedCluster"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Personalized Plans Table"
  }
}

# -----------------------------------------------------------------------------
# Table 7: Mock Exams
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "mock_exams" {
  name           = "${var.project_name}-mock-exams-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "mockExamId"

  attribute {
    name = "mockExamId"
    type = "S"
  }

  attribute {
    name = "examDate"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "examDate-index"
    hash_key        = "examDate"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Mock Exams Table"
  }
}

# -----------------------------------------------------------------------------
# Table 8: Mock Registrations
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "mock_registrations" {
  name           = "${var.project_name}-mock-registrations-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "registrationId"

  attribute {
    name = "registrationId"
    type = "S"
  }

  attribute {
    name = "mockExamId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "mockExamId-index"
    hash_key        = "mockExamId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Mock Registrations Table"
  }
}

# -----------------------------------------------------------------------------
# Table 9: Mock Statistics
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "mock_statistics" {
  name           = "${var.project_name}-mock-statistics-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "mockExamId"

  attribute {
    name = "mockExamId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "Mock Statistics Table"
  }
}
