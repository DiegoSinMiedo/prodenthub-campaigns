# Stripe Setup Guide

Complete guide for setting up Stripe integration for ProDentHub campaigns.

## Prerequisites

- Stripe account (https://stripe.com)
- Stripe CLI installed (https://stripe.com/docs/stripe-cli)
- Verified business in Stripe Dashboard

## Step 1: Get API Keys

1. Log in to Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Developers > API Keys**
3. Copy your **Publishable key** (starts with `pk_`)
4. Copy your **Secret key** (starts with `sk_`)
5. Store these securely - you'll need them for `terraform.tfvars`

### Test vs Live Mode

- **Test mode**: Use for development
  - Test keys start with `pk_test_` and `sk_test_`
  - Use test card: `4242 4242 4242 4242`
- **Live mode**: Use for production
  - Live keys start with `pk_live_` and `sk_live_`
  - Processes real payments

## Step 2: Create Products

Run the provided script to create all products:

```bash
cd scripts
./setup-stripe.sh
```

This creates:
1. **Team Plan** - $299 AUD
2. **Scholarship Access** - Variable pricing
3. **Mock Exam Premium** - $29 AUD
4. **Standard Plans** - $49, $129, $199, $299 AUD
5. **Personalized Plans** - $149, $179, $199, $249 AUD

### Manual Product Creation (Alternative)

If you prefer to create products manually:

1. Go to **Products** in Stripe Dashboard
2. Click **+ Add Product**
3. Fill in details:
   - **Name**: ProDentHub Full Version - 6 Months (Team Plan)
   - **Description**: Full access for your study team (6 months)
   - **Price**: $299 AUD
   - **Metadata**: Add key `campaignId` with value `team-creation`
4. Repeat for all products
5. Copy Product IDs and add to `terraform.tfvars`

## Step 3: Configure Webhook

Webhooks are critical for processing payments asynchronously.

### 3.1 Get Webhook URL

After deploying infrastructure, get the webhook URL:

```bash
cd terraform
terraform output webhook_endpoint
```

Example output: `https://xxxxx.execute-api.ap-southeast-2.amazonaws.com/v1/webhook/stripe`

### 3.2 Create Webhook in Stripe

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **+ Add Endpoint**
3. Enter your webhook URL
4. Select events to listen to:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to `terraform.tfvars` as `stripe_webhook_secret`

### 3.3 Test Webhook

```bash
# Using Stripe CLI
stripe listen --forward-to https://your-api-url/v1/webhook/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

## Step 4: Update Terraform Variables

Add all values to `terraform.tfvars`:

```hcl
stripe_secret_key              = "sk_live_xxxxx"
stripe_public_key              = "pk_live_xxxxx"
stripe_webhook_secret          = "whsec_xxxxx"
stripe_team_product_id         = "prod_xxxxx"
stripe_scholarship_product_id  = "prod_xxxxx"
stripe_mock_premium_product_id = "prod_xxxxx"
```

## Step 5: Update Frontend

Update the Stripe public key in all campaign HTML files:

```html
<meta name="stripe-public-key" content="pk_live_YOUR_KEY_HERE">
```

Files to update:
- `landing-pages/team-creation/index.html`
- `landing-pages/scholarship-application/index.html`
- `landing-pages/discount-purchase/index.html`
- `landing-pages/personalized-plan/index.html`
- `landing-pages/mock-exam-registration/index.html`

## Step 6: Testing

### Test in Test Mode

1. Set test API keys in `terraform.tfvars`
2. Deploy infrastructure
3. Use test card numbers:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **Requires Auth**: `4000 0025 0000 3155`
4. Test each campaign type

### Test Webhook Locally

```bash
# Terminal 1: Start local server
stripe listen --forward-to http://localhost:3000/webhook/stripe

# Terminal 2: Trigger events
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
```

## Common Product Configurations

### Team Plan
- **Product Name**: ProDentHub Full Version - 6 Months (Team Plan)
- **Price**: $299 AUD (one-time)
- **Metadata**: `campaignId: team-creation`

### Scholarship Plan
- **Product Name**: ProDentHub Scholarship Access - 3 Months
- **Price**: Dynamic (created via API)
- **Metadata**: `campaignId: scholarship-application`

### Mock Exam Premium
- **Product Name**: Universal Mock Exam - Premium Access
- **Price**: $29 AUD (one-time)
- **Metadata**: `campaignId: mock-exam-registration`

### Standard Plans
| Name | Duration | Price | Metadata |
|------|----------|-------|----------|
| Basic | 1 month | $49 | `planType: basic` |
| Standard | 3 months | $129 | `planType: standard` |
| Full | 6 months | $199 | `planType: full` |
| Premium | 12 months | $299 | `planType: premium` |

### Personalized Plans
| Cluster | Duration | Price | Metadata |
|---------|----------|-------|----------|
| Clinical Knowledge Gap | 3 months | $179 | `cluster: 1` |
| Theory Fundamentals | 4 months | $199 | `cluster: 2` |
| Time Management | 2 months | $149 | `cluster: 3` |
| Comprehensive Review | 6 months | $249 | `cluster: 4` |

## Coupons/Promo Codes

Create discount coupons in Stripe Dashboard:

1. Go to **Products > Coupons**
2. Click **+ New**
3. Configure:
   - **Name**: SAVE20
   - **Type**: Percentage discount
   - **Value**: 20%
   - **Duration**: Once, Forever, or Repeating
   - **Redemption**: Limit total uses (optional)

Then add coupon to DynamoDB `prodenthub-coupons` table.

## Monitoring & Logs

### View Webhook Events
1. Go to **Developers > Webhooks**
2. Click on your endpoint
3. View **Recent events** tab

### View Payment Events
1. Go to **Payments**
2. Filter by status, date, customer
3. Click payment to see details and timeline

### Stripe Logs
All webhook attempts are logged in Stripe Dashboard with:
- Request body
- Response status
- Error messages
- Retry information

## Security Best Practices

1. **Never commit API keys** to git
2. **Use environment variables** for secrets
3. **Verify webhook signatures** (already implemented in Lambda)
4. **Use HTTPS only** for webhook endpoints
5. **Implement idempotency** for webhook handlers
6. **Monitor failed webhooks** and set up alerts
7. **Rotate keys periodically** (at least annually)
8. **Use restricted keys** when possible

## Troubleshooting

### Webhook Not Receiving Events
- Check webhook URL is publicly accessible
- Verify webhook secret matches Lambda env variable
- Check CloudWatch logs for Lambda errors
- Test with Stripe CLI: `stripe listen`

### Payment Failing
- Check card details are valid
- Verify product IDs are correct
- Check Lambda has correct IAM permissions
- Review Stripe Dashboard for decline reasons

### DynamoDB Not Updating
- Verify Lambda has DynamoDB write permissions
- Check table names match environment
- Review CloudWatch logs for Lambda errors
- Verify metadata includes correct IDs

## Support

- **Stripe Support**: https://support.stripe.com
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **Webhook Testing**: https://stripe.com/docs/webhooks/test

---

**Last Updated**: 2025-01-06
