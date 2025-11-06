# ProDentHub Campaigns - Backend Infrastructure

This directory contains all the backend infrastructure code for the ProDentHub campaigns system.

## 📁 Structure

```
infrastructure/
├── terraform/           # Terraform configurations
│   ├── dynamodb.tf     # DynamoDB tables
│   ├── lambda.tf       # Lambda functions
│   ├── api-gateway.tf  # API Gateway configuration
│   ├── iam.tf          # IAM roles and policies
│   ├── s3.tf           # S3 buckets
│   ├── variables.tf    # Input variables
│   ├── outputs.tf      # Output values
│   └── main.tf         # Main Terraform config
├── lambda/             # Lambda function code
│   ├── team-creation/
│   ├── scholarship/
│   ├── discount-purchase/
│   ├── personalized-plan/
│   ├── mock-exam/
│   ├── checkout-session/
│   └── stripe-webhook/
├── docs/               # Additional documentation
└── scripts/            # Deployment and utility scripts
```

## 🚀 Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform v1.0+ installed
- Node.js 18.x (for Lambda functions)
- Stripe account with API keys

## 📦 Deployment Steps

### 1. Configure Variables

Create `terraform/terraform.tfvars`:

```hcl
aws_region = "ap-southeast-2"
environment = "production"
stripe_secret_key = "sk_live_xxx"
stripe_public_key = "pk_live_xxx"
stripe_webhook_secret = "whsec_xxx"
```

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Deploy Infrastructure

```bash
# Preview changes
terraform plan

# Apply changes
terraform apply
```

### 4. Deploy Lambda Functions

```bash
cd ../scripts
./deploy-lambdas.sh
```

### 5. Configure Stripe Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://api.prodenthub.com.au/v1/webhook/stripe`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy webhook signing secret to `terraform.tfvars`

## 🧪 Testing

```bash
# Run integration tests
cd scripts
./run-tests.sh

# Test individual Lambda function
./test-lambda.sh team-creation
```

## 📊 DynamoDB Tables

- `prodenthub-teams` - Team creation data
- `prodenthub-scholarships` - Scholarship applications
- `prodenthub-coupons` - Coupon configurations
- `prodenthub-coupon-usage` - Coupon usage tracking
- `prodenthub-discount-purchases` - Purchase records
- `prodenthub-personalized-plans` - Personalized study plans
- `prodenthub-mock-exams` - Mock exam schedules
- `prodenthub-mock-registrations` - Mock exam registrations
- `prodenthub-mock-statistics` - Aggregate statistics

## 🔧 Lambda Functions

- `team-creation-handler` - POST /teams/create, GET /teams/{id}
- `scholarship-handler` - POST /scholarships/*, GET /scholarships/{id}
- `discount-purchase-handler` - POST /coupons/validate, POST /purchases/create
- `personalized-plan-handler` - POST /personalized-plans/*
- `mock-exam-handler` - GET/POST /mock-exams/*
- `checkout-session-handler` - POST /checkout/create, POST /checkout/verify
- `stripe-webhook-handler` - POST /webhook/stripe

## 🔒 Security

- All Lambda functions have least-privilege IAM roles
- DynamoDB tables encrypted at rest
- API Gateway with AWS WAF enabled
- Stripe webhook signature verification
- Environment variables for sensitive data

## 💰 Cost Estimation

**Monthly costs (estimated for 1000 transactions/month):**
- DynamoDB: ~$10
- Lambda: ~$5
- API Gateway: ~$3.50
- S3: ~$2
- CloudWatch: ~$1
- **Total: ~$21.50/month**

## 📚 Additional Documentation

- See `../../BACKEND_REQUIREMENTS.md` for detailed specifications
- See `../../CAMPAIGNS_DESIGN.md` for campaign design details
- See `docs/` folder for specific implementation guides

## 🐛 Troubleshooting

### Lambda Function Errors
```bash
# View logs
aws logs tail /aws/lambda/team-creation-handler --follow

# Test function locally
sam local invoke team-creation-handler -e test-events/team-create.json
```

### DynamoDB Issues
```bash
# Check table status
aws dynamodb describe-table --table-name prodenthub-teams

# Scan table (dev only)
aws dynamodb scan --table-name prodenthub-teams --max-items 10
```

### API Gateway Issues
```bash
# Test endpoint
curl -X POST https://api.prodenthub.com.au/v1/teams/create \
  -H "Content-Type: application/json" \
  -d @test-data/team-payload.json
```

## 🔄 Updates and Maintenance

### Updating Lambda Functions
```bash
cd lambda/team-creation
npm run build
cd ../../scripts
./deploy-lambda.sh team-creation
```

### Updating DynamoDB Tables
```bash
cd terraform
terraform plan
terraform apply
```

## 📧 Support

For infrastructure issues: d.villagran.castro@gmail.com

---

**Last Updated:** 2025-01-06
**Version:** 1.0.0
