variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-southeast-2"
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "prodenthub"
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
}

variable "stripe_public_key" {
  description = "Stripe publishable key"
  type        = string
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
}

variable "stripe_team_product_id" {
  description = "Stripe product ID for team plan"
  type        = string
  default     = ""
}

variable "stripe_scholarship_product_id" {
  description = "Stripe product ID for scholarship"
  type        = string
  default     = ""
}

variable "stripe_mock_premium_product_id" {
  description = "Stripe product ID for mock exam premium"
  type        = string
  default     = ""
}

variable "ses_from_email" {
  description = "SES verified email address for sending emails"
  type        = string
  default     = "noreply@prodenthub.com.au"
}

variable "frontend_url" {
  description = "Frontend campaigns URL"
  type        = string
  default     = "https://campaigns.prodenthub.com.au"
}

variable "api_domain_name" {
  description = "API custom domain name"
  type        = string
  default     = "api.prodenthub.com.au"
}

variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "nodejs18.x"
}

variable "lambda_memory_size" {
  description = "Lambda memory size in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}
