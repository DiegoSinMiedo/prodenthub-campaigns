#!/bin/bash

# ProDentHub Agent Automation - Complete Deployment Script
# This script deploys all components of the agent automation system

set -e  # Exit on error

echo "🚀 ProDentHub Agent Automation - Complete Deployment"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-ap-southeast-2}"
ENVIRONMENT="${ENVIRONMENT:-production}"
AWS_PROFILE="${AWS_PROFILE:-default}"

echo "Configuration:"
echo "  AWS Region: $AWS_REGION"
echo "  Environment: $ENVIRONMENT"
echo "  AWS Profile: $AWS_PROFILE"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Step 1: Deploy Infrastructure
echo "Step 1: Deploying Infrastructure (DynamoDB, IAM, etc.)"
echo "-------------------------------------------------------"

cd ../../infrastructure/terraform/modules/agent-automation

if [ ! -d ".terraform" ]; then
    echo "Initializing Terraform..."
    terraform init
fi

echo "Applying Terraform configuration..."
terraform apply -auto-approve \
    -var="environment=$ENVIRONMENT" \
    -var="aws_region=$AWS_REGION"

print_status "Infrastructure deployed"
echo ""

# Go back to agent-automation directory
cd ../../../../agent-automation

# Step 2: Deploy Lambda Functions
echo "Step 2: Deploying Lambda Functions"
echo "-----------------------------------"

deploy_lambda() {
    local function_name=$1
    local lambda_dir="lambda/$function_name"

    echo "Deploying $function_name..."

    cd "$lambda_dir"

    # Install dependencies
    npm install --production

    # Create deployment package
    rm -f function.zip
    zip -r function.zip src/ node_modules/ > /dev/null

    # Update Lambda function
    aws lambda update-function-code \
        --function-name "${function_name}-handler" \
        --zip-file fileb://function.zip \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE" > /dev/null 2>&1 || {

        # If function doesn't exist, create it
        echo "Creating new Lambda function: ${function_name}-handler"

        # Get IAM role ARN from Terraform output
        ROLE_ARN=$(cd ../../../../infrastructure/terraform && terraform output -raw lambda_role_arn)

        aws lambda create-function \
            --function-name "${function_name}-handler" \
            --runtime nodejs18.x \
            --handler src/index.handler \
            --role "$ROLE_ARN" \
            --zip-file fileb://function.zip \
            --timeout 300 \
            --memory-size 512 \
            --region "$AWS_REGION" \
            --profile "$AWS_PROFILE" > /dev/null
    }

    print_status "$function_name deployed"

    cd ../..
}

deploy_lambda "content-generation"
deploy_lambda "campaign-manager"
deploy_lambda "facebook-integration"
deploy_lambda "analytics-collector"
deploy_lambda "auth-manager"

echo ""

# Step 3: Set up EventBridge Rules
echo "Step 3: Setting up EventBridge Schedules"
echo "-----------------------------------------"

# Analytics collection every 6 hours
aws events put-rule \
    --name prodenthub-analytics-collection \
    --schedule-expression "rate(6 hours)" \
    --state ENABLED \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" > /dev/null

aws events put-targets \
    --rule prodenthub-analytics-collection \
    --targets "Id"="1","Arn"="arn:aws:lambda:$AWS_REGION:$(aws sts get-caller-identity --query Account --output text):function:analytics-collector-handler" \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE" > /dev/null

print_status "EventBridge rules configured"
echo ""

# Step 4: Deploy Admin Dashboard
echo "Step 4: Deploying Admin Dashboard"
echo "----------------------------------"

cd admin-dashboard

# Install dependencies
npm install

# Build for production
VITE_API_BASE_URL="https://api.prodenthub.com.au/v1" npm run build

# Check if S3 bucket exists
DASHBOARD_BUCKET="${ENVIRONMENT}-prodenthub-agent-dashboard"

aws s3 ls "s3://$DASHBOARD_BUCKET" > /dev/null 2>&1 || {
    echo "Creating S3 bucket: $DASHBOARD_BUCKET"
    aws s3 mb "s3://$DASHBOARD_BUCKET" \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE"

    # Enable static website hosting
    aws s3 website "s3://$DASHBOARD_BUCKET" \
        --index-document index.html \
        --error-document index.html \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE"

    # Set bucket policy for public read
    cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$DASHBOARD_BUCKET/*"
    }
  ]
}
EOF

    aws s3api put-bucket-policy \
        --bucket "$DASHBOARD_BUCKET" \
        --policy file:///tmp/bucket-policy.json \
        --region "$AWS_REGION" \
        --profile "$AWS_PROFILE"
}

# Sync to S3
aws s3 sync dist/ "s3://$DASHBOARD_BUCKET/" \
    --delete \
    --region "$AWS_REGION" \
    --profile "$AWS_PROFILE"

print_status "Admin dashboard deployed to s3://$DASHBOARD_BUCKET"

# Get website URL
WEBSITE_URL=$(aws s3api get-bucket-website --bucket "$DASHBOARD_BUCKET" --region "$AWS_REGION" --profile "$AWS_PROFILE" 2>/dev/null | jq -r '.WebsiteURL' || echo "http://$DASHBOARD_BUCKET.s3-website-$AWS_REGION.amazonaws.com")

echo "  Dashboard URL: $WEBSITE_URL"
echo ""

cd ..

# Step 5: Create First API Key
echo "Step 5: Creating API Key"
echo "------------------------"

print_warning "API key creation requires manual step due to security"
echo "Run the following command to create an API key:"
echo ""
echo "  aws lambda invoke \\"
echo "    --function-name auth-manager-handler \\"
echo "    --payload '{\"httpMethod\":\"POST\",\"path\":\"/api-keys/create\",\"headers\":{\"x-master-key\":\"YOUR_MASTER_KEY\"},\"body\":\"{\\\"name\\\":\\\"Agent Service\\\",\\\"description\\\":\\\"Main agent API key\\\"}\"}' \\"
echo "    --region $AWS_REGION \\"
echo "    --profile $AWS_PROFILE \\"
echo "    response.json"
echo ""
echo "Then run: cat response.json"
echo ""

# Step 6: Display Next Steps
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "Next Steps:"
echo ""
echo "1. Create API Key (see command above)"
echo ""
echo "2. Store Facebook credentials in AWS Secrets Manager:"
echo "   aws secretsmanager create-secret \\"
echo "     --name prodenthub/facebook/credentials \\"
echo "     --secret-string '{\"access_token\":\"YOUR_TOKEN\",\"app_id\":\"YOUR_APP_ID\",\"app_secret\":\"YOUR_APP_SECRET\"}' \\"
echo "     --region $AWS_REGION \\"
echo "     --profile $AWS_PROFILE"
echo ""
echo "3. Set up environment variables for agent service:"
echo "   - API_KEY (from step 1)"
echo "   - ANTHROPIC_API_KEY or OPENAI_API_KEY"
echo "   - See .env.example for full list"
echo ""
echo "4. Start agent service:"
echo "   cd core"
echo "   npm install"
echo "   npm start"
echo ""
echo "5. Access admin dashboard at:"
echo "   $WEBSITE_URL"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Complete setup guide"
echo "   - SCHEMA_REFERENCE.md - DynamoDB schemas"
echo "   - API_DOCUMENTATION.md - API reference"
echo ""
