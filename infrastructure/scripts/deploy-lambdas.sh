#!/bin/bash
# Deploy Lambda Functions Script

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LAMBDA_DIR="$SCRIPT_DIR/../lambda"

echo "🚀 Deploying Lambda Functions..."
echo ""

# Function to deploy a single Lambda
deploy_lambda() {
    local lambda_name=$1
    local lambda_path="$LAMBDA_DIR/$lambda_name"

    echo "📦 Building $lambda_name..."

    cd "$lambda_path"

    # Install dependencies
    if [ -f "package.json" ]; then
        npm install --production
    fi

    # Create deployment package
    zip -r deployment.zip src/ node_modules/ > /dev/null

    echo "✅ $lambda_name built successfully"
    echo ""
}

# Deploy all Lambda functions
LAMBDAS=(
    "checkout-session"
    "stripe-webhook"
    "team-creation"
    "scholarship"
    "discount-purchase"
    "personalized-plan"
    "mock-exam"
)

for lambda in "${LAMBDAS[@]}"; do
    if [ -d "$LAMBDA_DIR/$lambda" ]; then
        deploy_lambda "$lambda"
    else
        echo "⚠️  Skipping $lambda (directory not found)"
    fi
done

echo ""
echo "✅ All Lambda functions built successfully!"
echo "📝 Now run: cd ../terraform && terraform apply"
