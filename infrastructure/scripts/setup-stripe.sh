#!/bin/bash
# Setup Stripe Products Script

set -e

echo "🎯 Setting up Stripe Products..."
echo ""
echo "⚠️  This script will create products in your Stripe account"
echo "   Make sure you have Stripe CLI installed: https://stripe.com/docs/stripe-cli"
echo ""

read -p "Enter your Stripe Secret Key: " STRIPE_KEY

export STRIPE_API_KEY=$STRIPE_KEY

echo ""
echo "Creating products..."
echo ""

# Product 1: Team Plan
echo "1. Creating Team Plan product..."
TEAM_PRODUCT=$(stripe products create \
  --name "ProDentHub Full Version - 6 Months (Team Plan)" \
  --description "Full access for your study team (6 months)" \
  --metadata[campaignId]=team-creation \
  --format json)

TEAM_PRODUCT_ID=$(echo $TEAM_PRODUCT | jq -r '.id')

TEAM_PRICE=$(stripe prices create \
  --product "$TEAM_PRODUCT_ID" \
  --unit-amount 29900 \
  --currency aud \
  --metadata[campaignId]=team-creation \
  --format json)

TEAM_PRICE_ID=$(echo $TEAM_PRICE | jq -r '.id')

echo "   ✅ Team Product ID: $TEAM_PRODUCT_ID"
echo "   ✅ Team Price ID: $TEAM_PRICE_ID"
echo ""

# Product 2: Scholarship
echo "2. Creating Scholarship product..."
SCHOLAR_PRODUCT=$(stripe products create \
  --name "ProDentHub Scholarship Access - 3 Months" \
  --description "Scholarship-subsidized access (3 months)" \
  --metadata[campaignId]=scholarship-application \
  --format json)

SCHOLAR_PRODUCT_ID=$(echo $SCHOLAR_PRODUCT | jq -r '.id')

echo "   ✅ Scholarship Product ID: $SCHOLAR_PRODUCT_ID"
echo "   ℹ️  Prices will be created dynamically via API"
echo ""

# Product 3: Mock Exam Premium
echo "3. Creating Mock Exam Premium product..."
MOCK_PRODUCT=$(stripe products create \
  --name "Universal Mock Exam - Premium Access" \
  --description "Premium analytics and statistics" \
  --metadata[campaignId]=mock-exam-registration \
  --format json)

MOCK_PRODUCT_ID=$(echo $MOCK_PRODUCT | jq -r '.id')

MOCK_PRICE=$(stripe prices create \
  --product "$MOCK_PRODUCT_ID" \
  --unit-amount 2900 \
  --currency aud \
  --metadata[campaignId]=mock-exam-registration \
  --format json)

MOCK_PRICE_ID=$(echo $MOCK_PRICE | jq -r '.id')

echo "   ✅ Mock Exam Product ID: $MOCK_PRODUCT_ID"
echo "   ✅ Mock Exam Price ID: $MOCK_PRICE_ID"
echo ""

# Create standard plans
echo "4. Creating Standard Plans..."

for plan in "Basic:1month:4900" "Standard:3months:12900" "Full:6months:19900" "Premium:12months:29900"; do
    IFS=':' read -r name duration amount <<< "$plan"

    PRODUCT=$(stripe products create \
      --name "ProDentHub $name - ${duration/month/Month}" \
      --description "$name plan for ADC exam preparation" \
      --metadata[planType]=$name \
      --format json)

    PRODUCT_ID=$(echo $PRODUCT | jq -r '.id')

    PRICE=$(stripe prices create \
      --product "$PRODUCT_ID" \
      --unit-amount $amount \
      --currency aud \
      --format json)

    PRICE_ID=$(echo $PRICE | jq -r '.id')

    echo "   ✅ $name Plan - Product ID: $PRODUCT_ID, Price ID: $PRICE_ID"
done

echo ""
echo "✅ All Stripe products created successfully!"
echo ""
echo "📝 Add these to your terraform.tfvars:"
echo ""
echo "stripe_team_product_id           = \"$TEAM_PRODUCT_ID\""
echo "stripe_scholarship_product_id    = \"$SCHOLAR_PRODUCT_ID\""
echo "stripe_mock_premium_product_id   = \"$MOCK_PRODUCT_ID\""
echo ""
echo "📝 Update these in your Lambda environment variables as well"
