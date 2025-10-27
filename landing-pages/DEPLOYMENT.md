# 🚀 Deployment Guide - AWS Production

## ✅ Pre-Deployment Checklist

Before deploying, ensure you have:

- [x] Google Tag Manager ID configured: **GTM-P95LCCG6** ✅
- [ ] AWS CLI installed and configured
- [ ] AWS credentials with S3 and CloudFront permissions
- [ ] PDF file in place: `adc-exam-guide/assets/downloads/Volume 01 - Cracking Clinical Cases - ProDentHub Guides Collections - V0.1.pdf`

---

## 📋 Step 1: Configure AWS Credentials

If you haven't configured AWS CLI yet, run:

```bash
aws configure
```

You'll be prompted for:
- **AWS Access Key ID**: `AKIA...` (from AWS IAM Console)
- **AWS Secret Access Key**: `your-secret-key`
- **Default region**: `ap-southeast-2` (Sydney)
- **Output format**: `json`

**To get AWS credentials:**
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → Your username → "Security credentials"
3. Click "Create access key"
4. Choose "CLI access"
5. Download the credentials

---

## 🎯 Step 2: Deploy to AWS S3

### Option A: Automated Deployment (Recommended)

Run the deployment script:

```bash
cd landing-pages
bash deploy-to-s3.sh
```

This script will:
1. ✅ Check AWS credentials
2. ✅ Create S3 bucket if needed
3. ✅ Upload all files (HTML, CSS, JS, PDF)
4. ✅ Configure content types
5. ✅ Set up static website hosting
6. ✅ Give you the public URL

---

### Option B: Manual Deployment

If you prefer manual control:

```bash
# 1. Create S3 bucket
aws s3 mb s3://prodenthub-campaigns --region ap-southeast-2

# 2. Enable static website hosting
aws s3 website s3://prodenthub-campaigns \
  --index-document index.html \
  --error-document index.html

# 3. Upload landing page files
cd landing-pages
aws s3 sync adc-exam-guide/ s3://prodenthub-campaigns/adc-exam-guide/ \
  --exclude "*.md" \
  --cache-control "public, max-age=3600"

# 4. Upload shared assets
aws s3 sync shared/ s3://prodenthub-campaigns/shared/ \
  --cache-control "public, max-age=86400"

# 5. Make bucket public (for static hosting)
aws s3api put-bucket-policy --bucket prodenthub-campaigns --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::prodenthub-campaigns/*"
  }]
}'
```

---

## 🌐 Step 3: Access Your Landing Page

After deployment, your landing page will be available at:

```
http://prodenthub-campaigns.s3-website-ap-southeast-2.amazonaws.com/adc-exam-guide/
```

**Test the flow:**
1. Visit the URL
2. Fill out the form
3. Submit
4. Check that you're redirected to thank-you page
5. Verify PDF downloads automatically

---

## 🔒 Step 4: Set Up HTTPS with CloudFront (Recommended)

S3 static hosting only supports HTTP. For HTTPS and better performance, use CloudFront:

### Quick CloudFront Setup

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name prodenthub-campaigns.s3-website-ap-southeast-2.amazonaws.com \
  --default-root-object index.html \
  --enabled \
  --comment "ProDentHub Campaigns CDN" \
  --default-cache-behavior '{
    "TargetOriginId": "S3-prodenthub-campaigns",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {"Forward": "none"}
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  }'
```

**Note:** CloudFront distribution takes 15-20 minutes to deploy globally.

After creation, you'll get a URL like:
```
https://d1234abcd5678.cloudfront.net/adc-exam-guide/
```

---

## 🌍 Step 5: Custom Domain (Optional)

If you want to use `campaigns.prodenthub.com.au`:

### Prerequisites
- Domain managed in Route 53 or external DNS provider
- SSL certificate in ACM (AWS Certificate Manager)

### Steps:

1. **Request SSL Certificate** (in us-east-1 for CloudFront):
```bash
aws acm request-certificate \
  --domain-name campaigns.prodenthub.com.au \
  --validation-method DNS \
  --region us-east-1
```

2. **Validate certificate** via DNS records (ACM will provide them)

3. **Add custom domain to CloudFront distribution**:
   - Go to CloudFront console
   - Edit distribution settings
   - Add "Alternate Domain Names (CNAMEs)": `campaigns.prodenthub.com.au`
   - Select SSL certificate

4. **Update DNS** in Route 53 or your DNS provider:
```bash
# Create CNAME record
campaigns.prodenthub.com.au → d1234abcd5678.cloudfront.net
```

---

## 🔄 Updating the Landing Page

When you make changes to the landing page:

```bash
# Upload changes
cd landing-pages
aws s3 sync adc-exam-guide/ s3://prodenthub-campaigns/adc-exam-guide/ \
  --exclude "*.md"

# If using CloudFront, invalidate cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/adc-exam-guide/*"
```

---

## 💰 Estimated Costs

### Without CloudFront (HTTP only)
- S3 storage (10MB): ~$0.02/month
- S3 requests (1,000 downloads): ~$0.05/month
- **Total: ~$0.07/month**

### With CloudFront (HTTPS)
- S3 storage: ~$0.02/month
- CloudFront data transfer (10GB): ~$0.85/month
- CloudFront requests (10,000): ~$0.01/month
- **Total: ~$0.88/month**

All estimates based on 1,000 visitors/month with 100 PDF downloads.

---

## 🐛 Troubleshooting

### Issue: "Access Denied" when accessing S3 URL

**Solution:** Check bucket policy allows public read:
```bash
aws s3api get-bucket-policy --bucket prodenthub-campaigns
```

### Issue: PDF doesn't download

**Solution:** Check PDF exists in S3:
```bash
aws s3 ls s3://prodenthub-campaigns/adc-exam-guide/assets/downloads/
```

### Issue: "Invalid credentials" error

**Solution:** Reconfigure AWS CLI:
```bash
aws configure
```

### Issue: CloudFront shows 403 error

**Solution:**
1. Check origin domain name uses the S3 **website** endpoint (not REST endpoint)
2. Should be: `bucket-name.s3-website-region.amazonaws.com`
3. NOT: `bucket-name.s3.region.amazonaws.com`

---

## 📊 Monitoring

### Check S3 bucket size
```bash
aws s3 ls s3://prodenthub-campaigns --recursive --summarize --human-readable
```

### View CloudFront statistics
```bash
aws cloudfront get-distribution-config --id YOUR_DISTRIBUTION_ID
```

### Monitor costs
```bash
aws ce get-cost-and-usage \
  --time-period Start=2025-10-01,End=2025-10-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

---

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] Landing page loads correctly at public URL
- [ ] All images and styles load (check browser console)
- [ ] Form submits without errors
- [ ] Redirect to thank-you page works
- [ ] PDF downloads automatically after 2 seconds
- [ ] Google Tag Manager fires events (check GTM debug mode)
- [ ] Page loads on mobile devices
- [ ] HTTPS works (if using CloudFront)

---

## 🔐 Security Best Practices

1. **Never commit AWS credentials** to git
2. **Use IAM roles** with least privilege
3. **Enable S3 bucket versioning** for rollback capability
4. **Set up CloudWatch alarms** for unexpected costs
5. **Use CloudFront** to prevent direct S3 access
6. **Enable S3 access logging** for audit trail

---

## 📞 Need Help?

**Issue:** Deployment failing?
**Solution:** Check AWS credentials and permissions

**Issue:** Want to add API backend later?
**Solution:** See `../prodenthub-infrastructure/campaigns-backend/README.md`

---

**Status:** Ready to deploy! 🚀
**Estimated deployment time:** 10-15 minutes
**Next step:** Run `bash deploy-to-s3.sh`
