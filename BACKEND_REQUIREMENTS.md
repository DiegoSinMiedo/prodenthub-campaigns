# Backend Implementation Requirements

This document outlines the backend infrastructure requirements to support the 5 new campaign types. These should be implemented in the `prodenthub-infrastructure` repository.

---

## Overview

The new campaigns require:
- **9 new DynamoDB tables**
- **6 new Lambda functions**
- **1 Stripe webhook handler**
- **5 new Stripe products**
- **1 S3 bucket for file uploads**

---

## 1. DynamoDB Tables

### Table 1: `prodenthub-teams`

**Purpose:** Store team creation data for team-based subscriptions.

```terraform
resource "aws_dynamodb_table" "teams" {
  name           = "prodenthub-teams"
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
}
```

**Sample Record:**
```json
{
  "teamId": "team_abc123",
  "campaignId": "team-creation",
  "leaderEmail": "leader@example.com",
  "leaderFirstName": "John",
  "leaderLastName": "Doe",
  "country": "Australia",
  "members": [
    {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "status": "paid",
      "shareAmount": 99.67,
      "stripePaymentIntentId": "pi_xxx"
    }
  ],
  "totalMembers": 3,
  "planType": "full-6months",
  "totalAmount": 299.00,
  "pricePerMember": 99.67,
  "status": "fully_paid",
  "createdAt": "2025-01-06T10:30:00Z",
  "activatedAt": "2025-01-06T11:00:00Z",
  "expiresAt": "2025-07-06T11:00:00Z",
  "stripeCheckoutSessionId": "cs_xxx"
}
```

---

### Table 2: `prodenthub-scholarships`

**Purpose:** Store scholarship applications and calculations.

```terraform
resource "aws_dynamodb_table" "scholarships" {
  name           = "prodenthub-scholarships"
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
}
```

---

### Table 3: `prodenthub-coupons`

**Purpose:** Store discount coupon configurations.

```terraform
resource "aws_dynamodb_table" "coupons" {
  name           = "prodenthub-coupons"
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
}
```

**Sample Record:**
```json
{
  "couponCode": "SAVE20",
  "type": "percentage",
  "value": 20,
  "minPurchase": 100,
  "maxDiscount": 50,
  "validFrom": "2025-01-01T00:00:00Z",
  "validUntil": "2025-12-31T23:59:59Z",
  "usageLimit": 100,
  "usageCount": 45,
  "perUserLimit": 1,
  "applicablePlans": ["standard", "full", "premium"],
  "status": "active"
}
```

---

### Table 4: `prodenthub-coupon-usage`

**Purpose:** Track coupon usage per user to enforce limits.

```terraform
resource "aws_dynamodb_table" "coupon_usage" {
  name           = "prodenthub-coupon-usage"
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
}
```

---

### Table 5: `prodenthub-discount-purchases`

**Purpose:** Store purchases made with discount coupons.

```terraform
resource "aws_dynamodb_table" "discount_purchases" {
  name           = "prodenthub-discount-purchases"
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

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }
}
```

---

### Table 6: `prodenthub-personalized-plans`

**Purpose:** Store personalized study plans based on performance clusters.

```terraform
resource "aws_dynamodb_table" "personalized_plans" {
  name           = "prodenthub-personalized-plans"
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

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "selectedCluster-index"
    hash_key        = "selectedCluster"
    projection_type = "ALL"
  }
}
```

---

### Table 7: `prodenthub-mock-exams`

**Purpose:** Store mock exam configurations and schedules.

```terraform
resource "aws_dynamodb_table" "mock_exams" {
  name           = "prodenthub-mock-exams"
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

  global_secondary_index {
    name            = "examDate-index"
    hash_key        = "examDate"
    projection_type = "ALL"
  }
}
```

---

### Table 8: `prodenthub-mock-registrations`

**Purpose:** Store mock exam registrations.

```terraform
resource "aws_dynamodb_table" "mock_registrations" {
  name           = "prodenthub-mock-registrations"
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
}
```

---

### Table 9: `prodenthub-mock-statistics`

**Purpose:** Store aggregate statistics for each mock exam.

```terraform
resource "aws_dynamodb_table" "mock_statistics" {
  name           = "prodenthub-mock-statistics"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "mockExamId"

  attribute {
    name = "mockExamId"
    type = "S"
  }
}
```

---

## 2. Lambda Functions

### Lambda 1: `team-creation-handler`

**Purpose:** Handle team creation and Stripe checkout session creation.

**Endpoints:**
- `POST /teams/create`
- `GET /teams/{teamId}`

**Environment Variables:**
```bash
DYNAMODB_TEAMS_TABLE=prodenthub-teams
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_TEAM_PRODUCT_ID=prod_xxx
```

**Key Logic:**
```javascript
// Create team record in DynamoDB
// Calculate price per member
// Create Stripe Checkout Session with metadata
// Return sessionId to frontend
```

---

### Lambda 2: `scholarship-handler`

**Purpose:** Calculate scholarship eligibility and process applications.

**Endpoints:**
- `POST /scholarships/calculate` (real-time calculation)
- `POST /scholarships/apply`
- `GET /scholarships/{scholarshipId}`

**Key Logic:**
```javascript
// Implement scholarship calculation algorithm from CAMPAIGNS_DESIGN.md
// Create Stripe Checkout with dynamic pricing
// Store application in DynamoDB
```

---

### Lambda 3: `discount-purchase-handler`

**Purpose:** Validate coupons and process purchases.

**Endpoints:**
- `POST /coupons/validate`
- `POST /purchases/create`
- `GET /purchases/{purchaseId}`

**Key Logic:**
```javascript
// Query coupon from DynamoDB
// Validate: expiry date, usage limits, minimum purchase
// Check per-user limit via coupon-usage table
// Calculate discount
// Create Stripe Checkout
// Record usage in coupon-usage table
```

---

### Lambda 4: `personalized-plan-handler`

**Purpose:** Determine performance cluster and create personalized plans.

**Endpoints:**
- `POST /personalized-plans/assess`
- `POST /personalized-plans/create`
- `GET /personalized-plans/{planId}`

**Key Logic:**
```javascript
// Implement cluster determination algorithm
// Upload score report to S3
// Create Stripe Checkout for appropriate cluster product
// Store plan in DynamoDB
```

---

### Lambda 5: `mock-exam-handler`

**Purpose:** Manage mock exam registrations and statistics.

**Endpoints:**
- `GET /mock-exams` (list upcoming exams)
- `POST /mock-exams/register`
- `GET /mock-exams/{mockExamId}/stats`
- `POST /mock-exams/{mockExamId}/calculate-stats`

**Key Logic:**
```javascript
// For free registrations: direct DynamoDB insert
// For premium: create Stripe Checkout
// After exam completion: calculate aggregate statistics
```

---

### Lambda 6: `checkout-session-handler`

**Purpose:** Create Stripe Checkout sessions for all campaigns.

**Endpoints:**
- `POST /checkout/create`
- `POST /checkout/verify`

**Key Logic:**
```javascript
// Universal handler for creating Stripe Checkout Sessions
// Takes: campaignId, amount, currency, metadata
// Returns: sessionId and checkoutUrl
```

---

### Lambda 7: `stripe-webhook-handler`

**Purpose:** Handle Stripe webhook events.

**Endpoint:**
- `POST /webhook/stripe`

**Events to Handle:**
```javascript
const events = [
  'checkout.session.completed',    // Activate access
  'payment_intent.succeeded',      // Confirm payment
  'payment_intent.payment_failed', // Send retry email
  'charge.refunded'                // Revoke access
];
```

**Key Logic:**
```javascript
// Verify Stripe signature
// Parse event type
// Update DynamoDB status based on campaignId in metadata
// Trigger email notifications via SES
// Activate user access in main ProDentHub database
```

---

## 3. API Gateway Configuration

### Base URL Structure
```
https://api.prodenthub.com.au/v1
```

### Routes to Create

```yaml
/teams:
  POST /create
  GET /{teamId}

/scholarships:
  POST /calculate
  POST /apply
  GET /{scholarshipId}

/coupons:
  POST /validate

/purchases:
  POST /create
  GET /{purchaseId}

/personalized-plans:
  POST /assess
  POST /create
  GET /{planId}

/mock-exams:
  GET /
  POST /register
  GET /{mockExamId}/stats

/checkout:
  POST /create
  POST /verify

/webhook:
  POST /stripe
```

---

## 4. Stripe Products Setup

Create these products in Stripe Dashboard:

### Product 1: Team Plan
```
Name: ProDentHub Full Version - 6 Months (Team Plan)
Price: $299 AUD
Type: One-time payment
Metadata:
  - planType: full-6months
  - campaignId: team-creation
```

### Product 2: Scholarship Access
```
Name: ProDentHub Scholarship Access - 3 Months
Price: Variable (set dynamically via API)
Type: One-time payment
Metadata:
  - planType: scholarship-3months
  - campaignId: scholarship-application
```

### Product 3-6: Standard Plans
```
Basic - 1 Month: $49 AUD
Standard - 3 Months: $129 AUD
Full - 6 Months: $199 AUD
Premium - 12 Months: $299 AUD
```

### Product 7-10: Personalized Plans
```
Cluster 1 - Clinical Knowledge Gap: $179 AUD (3 months)
Cluster 2 - Theory Fundamentals: $199 AUD (4 months)
Cluster 3 - Time Management: $149 AUD (2 months)
Cluster 4 - Comprehensive Review: $249 AUD (6 months)
```

### Product 11: Mock Exam Premium
```
Name: Mock Exam Premium Access
Price: $29 AUD
Type: One-time payment
```

---

## 5. S3 Buckets

### Bucket 1: `prodenthub-score-reports`

**Purpose:** Store uploaded score reports for personalized plans.

```terraform
resource "aws_s3_bucket" "score_reports" {
  bucket = "prodenthub-score-reports"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    enabled = true
    expiration {
      days = 90
    }
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}
```

---

## 6. IAM Roles and Permissions

### Lambda Execution Role

```terraform
resource "aws_iam_role" "campaigns_lambda_role" {
  name = "prodenthub-campaigns-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "campaigns_lambda_policy" {
  role = aws_iam_role.campaigns_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          "arn:aws:dynamodb:*:*:table/prodenthub-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = [
          "arn:aws:s3:::prodenthub-score-reports/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
}
```

---

## 7. Environment Variables (All Lambdas)

```bash
# DynamoDB Tables
DYNAMODB_TEAMS_TABLE=prodenthub-teams
DYNAMODB_SCHOLARSHIPS_TABLE=prodenthub-scholarships
DYNAMODB_COUPONS_TABLE=prodenthub-coupons
DYNAMODB_COUPON_USAGE_TABLE=prodenthub-coupon-usage
DYNAMODB_DISCOUNT_PURCHASES_TABLE=prodenthub-discount-purchases
DYNAMODB_PERSONALIZED_PLANS_TABLE=prodenthub-personalized-plans
DYNAMODB_MOCK_EXAMS_TABLE=prodenthub-mock-exams
DYNAMODB_MOCK_REGISTRATIONS_TABLE=prodenthub-mock-registrations
DYNAMODB_MOCK_STATISTICS_TABLE=prodenthub-mock-statistics

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Stripe Product IDs
STRIPE_TEAM_PRODUCT_ID=prod_xxx
STRIPE_SCHOLARSHIP_PRODUCT_ID=prod_xxx
STRIPE_CLUSTER1_PRODUCT_ID=prod_xxx
STRIPE_CLUSTER2_PRODUCT_ID=prod_xxx
STRIPE_CLUSTER3_PRODUCT_ID=prod_xxx
STRIPE_CLUSTER4_PRODUCT_ID=prod_xxx
STRIPE_MOCK_PREMIUM_PRODUCT_ID=prod_xxx

# S3
S3_SCORE_REPORTS_BUCKET=prodenthub-score-reports

# SES
SES_FROM_EMAIL=noreply@prodenthub.com.au

# API
API_BASE_URL=https://api.prodenthub.com.au/v1
FRONTEND_URL=https://campaigns.prodenthub.com.au
```

---

## 8. Email Templates (SES)

Create HTML email templates for:

1. **Team Creation Confirmation** - Sent to team leader
2. **Team Member Invitation** - Sent to each member
3. **Scholarship Application Received** - Confirmation email
4. **Scholarship Approved** - With access details
5. **Purchase Confirmation** - With coupon discount details
6. **Personalized Plan Activated** - With custom study roadmap
7. **Mock Exam Registration** - With exam details and access link
8. **Mock Exam Reminder** - 24 hours before exam
9. **Mock Exam Results** - With statistics and performance report

---

## 9. Stripe Webhook Configuration

In Stripe Dashboard:
1. Go to **Developers > Webhooks**
2. Add endpoint: `https://api.prodenthub.com.au/v1/webhook/stripe`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy webhook signing secret to Lambda environment variable

---

## 10. Testing Checklist

### Unit Tests
- [ ] Scholarship calculation logic
- [ ] Coupon validation logic
- [ ] Cluster determination logic
- [ ] Price calculations for all campaigns

### Integration Tests
- [ ] Team creation end-to-end flow
- [ ] Scholarship application with payment
- [ ] Coupon application and validation
- [ ] Personalized plan assessment and purchase
- [ ] Mock exam registration (free and premium)
- [ ] Stripe webhook handling

### Manual Testing
- [ ] Create test teams with 2-5 members
- [ ] Apply scholarships with various scores
- [ ] Validate multiple coupon scenarios
- [ ] Test all 4 personalized plan clusters
- [ ] Register for mock exams
- [ ] Verify email notifications
- [ ] Test Stripe checkout flows
- [ ] Verify webhook event handling

---

## 11. Deployment Steps

1. **Create DynamoDB Tables** (via Terraform)
2. **Deploy Lambda Functions** (with environment variables)
3. **Configure API Gateway** (routes and integrations)
4. **Create Stripe Products** (via Dashboard or API)
5. **Set up Stripe Webhook** (endpoint and events)
6. **Create SES Email Templates** (HTML templates)
7. **Configure S3 Bucket** (for score reports)
8. **Test All Endpoints** (Postman/Integration tests)
9. **Update Frontend API URLs** (point to production API)
10. **Deploy Frontend** (sync to S3, invalidate CloudFront)

---

## 12. Monitoring and Alerts

### CloudWatch Alarms
- Lambda error rates > 5%
- DynamoDB throttling events
- Stripe webhook failures
- SES bounce rate > 10%

### CloudWatch Logs
- All Lambda functions log to `/aws/lambda/<function-name>`
- Structured logging with correlation IDs
- Log retention: 30 days

### Metrics to Track
- Campaign conversion rates
- Payment success/failure rates
- Coupon usage statistics
- Mock exam registration numbers
- Average scholarship percentages

---

## 13. Security Considerations

- [ ] Validate Stripe webhook signatures
- [ ] Sanitize all user inputs
- [ ] Use parameterized DynamoDB queries
- [ ] Implement rate limiting on API Gateway
- [ ] Enable AWS WAF on API Gateway
- [ ] Use HTTPS only for all endpoints
- [ ] Implement CORS headers correctly
- [ ] Store sensitive data encrypted at rest
- [ ] Implement PII data retention policies
- [ ] Use presigned URLs for S3 uploads

---

## 14. Cost Estimation

**Monthly costs (estimated for 1000 registrations/month):**

- DynamoDB (on-demand): ~$10
- Lambda invocations: ~$5
- API Gateway: ~$3.50
- S3 storage: ~$2
- CloudWatch Logs: ~$1
- SES emails: ~$1 (for 10,000 emails)
- **Total: ~$22.50/month** (excluding Stripe fees)

**Stripe fees:**
- 1.75% + $0.30 per successful transaction
- Example: $199 payment = $3.48 + $0.30 = $3.78 fee

---

## Next Steps

1. Review this document and approve architecture
2. Set up Terraform configuration for infrastructure
3. Develop Lambda functions
4. Create Stripe products
5. Set up webhook handling
6. Test end-to-end flows
7. Deploy to production

---

**Document Version:** 1.0
**Last Updated:** 2025-01-06
**Contact:** d.villagran.castro@gmail.com
