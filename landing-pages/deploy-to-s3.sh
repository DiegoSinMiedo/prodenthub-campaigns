#!/bin/bash
# Deploy ADC Exam Guide Landing Page to AWS S3
# ProDentHub Campaigns Deployment Script

set -e  # Exit on error

# Configuration
BUCKET_NAME="prodenthub-campaigns"
REGION="ap-southeast-2"
CAMPAIGN_NAME="adc-exam-guide"
DISTRIBUTION_ID=""  # CloudFront distribution ID (leave empty on first run)

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  ProDentHub - Landing Page Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Step 1: Check AWS CLI
echo -e "${BLUE}[1/7]${NC} Checking AWS CLI..."
if ! command -v aws &> /dev/null; then
    echo -e "${RED}ERROR: AWS CLI not found. Please install it first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ AWS CLI found${NC}"

# Step 2: Check AWS credentials
echo -e "${BLUE}[2/7]${NC} Checking AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}ERROR: AWS credentials not configured.${NC}"
    echo "Run: aws configure"
    exit 1
fi
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓ Authenticated as AWS Account: $ACCOUNT_ID${NC}"

# Step 3: Create S3 bucket (if doesn't exist)
echo -e "${BLUE}[3/7]${NC} Checking S3 bucket..."
if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "Creating bucket: $BUCKET_NAME"
    aws s3 mb "s3://$BUCKET_NAME" --region "$REGION"

    # Enable static website hosting
    aws s3 website "s3://$BUCKET_NAME" \
        --index-document index.html \
        --error-document index.html

    # Configure bucket policy for public read
    cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF
    aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/bucket-policy.json
    rm /tmp/bucket-policy.json

    echo -e "${GREEN}✓ Bucket created and configured${NC}"
else
    echo -e "${GREEN}✓ Bucket exists${NC}"
fi

# Step 4: PDF hosting check
echo -e "${BLUE}[4/7]${NC} Checking PDF configuration..."
PDF_PATH="$CAMPAIGN_NAME/assets/downloads/Volume 01 - Cracking Clinical Cases - ProDentHub Guides Collections - V0.1.pdf"
if [ -f "$PDF_PATH" ]; then
    echo -e "${GREEN}✓ PDF file found ($(du -h "$PDF_PATH" | cut -f1))${NC}"
    echo -e "${BLUE}  Note: Uploading PDF to S3 will use bandwidth on every download${NC}"
    echo -e "${BLUE}  Tip: Consider using Google Drive for free unlimited bandwidth${NC}"
else
    echo -e "${BLUE}✓ PDF not included (recommended for bandwidth savings)${NC}"
    echo -e "${BLUE}  Use Google Drive or external CDN for PDF hosting${NC}"
fi

# Step 5: Sync files to S3
echo -e "${BLUE}[5/7]${NC} Uploading files to S3..."
cd "$CAMPAIGN_NAME"

# Upload HTML files
aws s3 sync . "s3://$BUCKET_NAME/$CAMPAIGN_NAME/" \
    --exclude "*.md" \
    --exclude ".git/*" \
    --exclude "SETUP.md" \
    --exclude "README.md" \
    --cache-control "public, max-age=3600" \
    --region "$REGION"

# Upload shared assets (CSS, JS, icons)
cd ../shared
aws s3 sync . "s3://$BUCKET_NAME/shared/" \
    --exclude "*.md" \
    --cache-control "public, max-age=86400" \
    --region "$REGION"

cd ..
echo -e "${GREEN}✓ Files uploaded${NC}"

# Step 6: Set content types
echo -e "${BLUE}[6/7]${NC} Setting content types..."
aws s3 cp "s3://$BUCKET_NAME/$CAMPAIGN_NAME/" "s3://$BUCKET_NAME/$CAMPAIGN_NAME/" \
    --recursive \
    --exclude "*" \
    --include "*.html" \
    --content-type "text/html; charset=utf-8" \
    --metadata-directive REPLACE \
    --cache-control "public, max-age=3600" \
    --region "$REGION" \
    > /dev/null 2>&1

aws s3 cp "s3://$BUCKET_NAME/$CAMPAIGN_NAME/" "s3://$BUCKET_NAME/$CAMPAIGN_NAME/" \
    --recursive \
    --exclude "*" \
    --include "*.pdf" \
    --content-type "application/pdf" \
    --content-disposition "inline" \
    --metadata-directive REPLACE \
    --region "$REGION" \
    > /dev/null 2>&1

echo -e "${GREEN}✓ Content types configured${NC}"

# Step 7: Get website URL
echo -e "${BLUE}[7/7]${NC} Deployment complete!"
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  🎉 DEPLOYMENT SUCCESSFUL${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Landing Page URL:"
echo -e "${BLUE}http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com/$CAMPAIGN_NAME/${NC}"
echo ""
echo "S3 Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Test the landing page in your browser"
echo "2. Set up CloudFront CDN for HTTPS and better performance"
echo "3. Configure custom domain (optional)"
echo ""

# Optional: Create CloudFront distribution
read -p "Do you want to create a CloudFront distribution for HTTPS? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Creating CloudFront distribution...${NC}"
    echo "This will take 15-20 minutes to deploy globally."
    echo ""
    echo "Run this command manually to create distribution:"
    echo ""
    echo "aws cloudfront create-distribution \\"
    echo "  --origin-domain-name $BUCKET_NAME.s3-website-$REGION.amazonaws.com \\"
    echo "  --default-root-object index.html"
    echo ""
fi

echo -e "${GREEN}Done! 🚀${NC}"
