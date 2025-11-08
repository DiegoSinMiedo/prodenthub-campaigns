# Quick Start Guide

Get ProDentHub Campaigns infrastructure up and running in 30 minutes.

## 🚀 Prerequisites (5 min)

```bash
# 1. Install required tools
brew install awscli terraform node
# or: apt-get install awscli terraform nodejs

# 2. Configure AWS
aws configure

# 3. Verify
aws sts get-caller-identity
terraform --version
node --version
```

## 📧 Setup SES (2 min)

```bash
# Verify email
aws ses verify-email-identity --email-address noreply@prodenthub.com.au

# Check your email and click verification link
```

## 💳 Setup Stripe (5 min)

```bash
cd infrastructure/scripts
./setup-stripe.sh
# Enter your Stripe secret key when prompted
# Save the product IDs displayed at the end
```

## ⚙️ Configure Variables (3 min)

```bash
cd ../terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Fill in your values
```

Required values:
- `stripe_secret_key` (from Stripe Dashboard)
- `stripe_public_key` (from Stripe Dashboard)
- `stripe_team_product_id` (from setup-stripe.sh output)
- `stripe_scholarship_product_id` (from setup-stripe.sh output)
- `stripe_mock_premium_product_id` (from setup-stripe.sh output)

## 🏗️ Build & Deploy (10 min)

```bash
# 1. Build Lambda functions
cd ../scripts
./deploy-lambdas.sh

# 2. Initialize Terraform
cd ../terraform
terraform init

# 3. Deploy infrastructure
terraform plan
terraform apply
# Type 'yes' when prompted

# 4. Note the outputs (especially webhook_endpoint)
```

## 🔗 Configure Webhook (3 min)

1. Copy webhook URL from Terraform output
2. Go to https://dashboard.stripe.com/webhooks
3. Click **+ Add Endpoint**
4. Paste webhook URL
5. Select events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
6. Copy webhook signing secret
7. Add to `terraform.tfvars`: `stripe_webhook_secret = "whsec_xxx"`
8. Re-run: `terraform apply`

## 🎨 Update Frontend (2 min)

```bash
# Update Stripe public key in all campaign HTML files
cd ../../landing-pages

# Replace in these files:
# team-creation/index.html
# scholarship-application/index.html
# discount-purchase/index.html
# personalized-plan/index.html
# mock-exam-registration/index.html

# Find: <meta name="stripe-public-key" content="pk_test_...">
# Replace with: <meta name="stripe-public-key" content="pk_live_YOUR_KEY">
```

## ✅ Test (5 min)

```bash
# Test checkout endpoint
curl -X POST https://YOUR_API_URL/v1/checkout/create \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "team-creation",
    "email": "test@example.com",
    "amount": 299,
    "currency": "AUD"
  }'

# Test in browser
open https://campaigns.prodenthub.com.au/team-creation/

# Use test card: 4242 4242 4242 4242
```

## 📊 Monitor

```bash
# View Lambda logs
aws logs tail /aws/lambda/prodenthub-checkout-session-production --follow

# View API Gateway logs
aws logs tail /aws/apigateway/prodenthub-campaigns-api-production --follow
```

## 🔥 Common Issues

### Webhook not receiving events
```bash
# Test locally
stripe listen --forward-to http://localhost:3000/webhook/stripe
stripe trigger checkout.session.completed
```

### Lambda permission errors
```bash
# Check IAM role
aws iam get-role --role-name prodenthub-campaigns-lambda-role-production
```

### DynamoDB access errors
```bash
# Verify table exists
aws dynamodb list-tables | grep prodenthub-teams
```

## 📚 Next Steps

- Read [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed guide
- Read [STRIPE_SETUP.md](docs/STRIPE_SETUP.md) for Stripe configuration
- See [../BACKEND_REQUIREMENTS.md](../BACKEND_REQUIREMENTS.md) for full specifications
- See [../CAMPAIGNS_DESIGN.md](../CAMPAIGNS_DESIGN.md) for campaign details

## 💡 Tips

- Use **test mode** first (test API keys)
- Monitor CloudWatch logs for errors
- Set up CloudWatch alarms for production
- Test all campaigns before going live
- Back up DynamoDB tables regularly

## 🆘 Get Help

- CloudWatch Logs: Check Lambda and API Gateway logs
- Stripe Dashboard: View webhook events and payments
- AWS Support: For infrastructure issues
- Email: d.villagran.castro@gmail.com

---

**Total Setup Time**: ~30 minutes
**Last Updated**: 2025-01-06
