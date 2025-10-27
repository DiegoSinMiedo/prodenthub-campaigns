# 🌐 CloudFront + Custom Domain Setup for Campaigns

## Current Status

✅ **What You Have:**
- Landing page deployed on S3: `prodenthub-campaigns` bucket
- Existing CloudFront distributions for other sites
- SSL certificate for `www.prodenthub.com.au`

❌ **What's Missing:**
- SSL certificate for `campaigns.prodenthub.com.au`
- CloudFront distribution for campaigns bucket
- DNS record for campaigns subdomain

---

## 🎯 Goal

Set up: **https://campaigns.prodenthub.com.au/adc-exam-guide/**

---

## 📋 Step-by-Step Setup

### **Step 1: Request SSL Certificate**

Request a new SSL certificate in **us-east-1** (required for CloudFront):

```bash
aws acm request-certificate \
  --domain-name campaigns.prodenthub.com.au \
  --validation-method DNS \
  --region us-east-1 \
  --subject-alternative-names "campaigns.prodenthub.com.au" \
  --tags Key=Project,Value=ProDentHub Key=Component,Value=Campaigns
```

**Save the CertificateArn** from the output!

---

### **Step 2: Validate the Certificate**

Get the DNS validation records:

```bash
# Replace CERTIFICATE_ARN with the ARN from Step 1
aws acm describe-certificate \
  --certificate-arn CERTIFICATE_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

This will give you a CNAME record like:
```
Name: _abc123.campaigns.prodenthub.com.au
Value: _def456.acm-validations.aws.
```

**Add this CNAME record to your DNS provider** (where you manage prodenthub.com.au DNS)

Wait 5-10 minutes for validation to complete. Check status:
```bash
aws acm describe-certificate \
  --certificate-arn CERTIFICATE_ARN \
  --region us-east-1 \
  --query 'Certificate.Status'
```

Should return: `"ISSUED"`

---

### **Step 3: Create CloudFront Distribution**

Create a CloudFront distribution config file:

```bash
cat > cloudfront-config.json << 'EOF'
{
  "CallerReference": "prodenthub-campaigns-2025-10-27",
  "Aliases": {
    "Quantity": 1,
    "Items": ["campaigns.prodenthub.com.au"]
  },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-prodenthub-campaigns",
        "DomainName": "prodenthub-campaigns.s3-website-ap-southeast-2.amazonaws.com",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "http-only",
          "OriginSslProtocols": {
            "Quantity": 1,
            "Items": ["TLSv1.2"]
          }
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-prodenthub-campaigns",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "Compress": true
  },
  "Comment": "ProDentHub Campaigns Landing Pages",
  "Enabled": true,
  "ViewerCertificate": {
    "ACMCertificateArn": "REPLACE_WITH_YOUR_CERTIFICATE_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "PriceClass": "PriceClass_All",
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  }
}
EOF
```

**Update the `ACMCertificateArn`** in the file with your certificate ARN from Step 1, then create the distribution:

```bash
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --region us-east-1
```

**Save the Distribution ID** from the output!

The distribution takes **15-20 minutes** to deploy globally.

---

### **Step 4: Add DNS Record**

After the CloudFront distribution is deployed, get its domain name:

```bash
# Replace DISTRIBUTION_ID with your distribution ID
aws cloudfront get-distribution \
  --id DISTRIBUTION_ID \
  --query 'Distribution.DomainName'
```

This will return something like: `d1234abcd.cloudfront.net`

**Add a CNAME record to your DNS provider:**
```
Type: CNAME
Name: campaigns
Value: d1234abcd.cloudfront.net
TTL: 300
```

Or if using Route 53:
```
Type: A (Alias)
Name: campaigns.prodenthub.com.au
Value: d1234abcd.cloudfront.net (select CloudFront distribution)
```

---

### **Step 5: Test**

Wait 5-10 minutes for DNS to propagate, then test:

```bash
# Check DNS resolution
nslookup campaigns.prodenthub.com.au

# Test HTTPS
curl -I https://campaigns.prodenthub.com.au/adc-exam-guide/
```

Visit in browser:
```
https://campaigns.prodenthub.com.au/adc-exam-guide/
```

---

## 🚀 Quick Commands Summary

Here's the complete sequence to run:

```bash
# 1. Request certificate
CERT_ARN=$(aws acm request-certificate \
  --domain-name campaigns.prodenthub.com.au \
  --validation-method DNS \
  --region us-east-1 \
  --output text \
  --query 'CertificateArn')

echo "Certificate ARN: $CERT_ARN"

# 2. Get validation CNAME
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'

# [MANUAL STEP] Add the CNAME record to your DNS provider
# Wait 5-10 minutes for validation

# 3. Check certificate status (wait until ISSUED)
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region us-east-1 \
  --query 'Certificate.Status'

# 4. Create CloudFront config (update the ACMCertificateArn first!)
# ... use the cloudfront-config.json from above ...

# 5. Create distribution
DIST_ID=$(aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json \
  --query 'Distribution.Id' \
  --output text)

echo "Distribution ID: $DIST_ID"

# 6. Get CloudFront domain name
aws cloudfront get-distribution \
  --id $DIST_ID \
  --query 'Distribution.DomainName'

# [MANUAL STEP] Add CNAME record to DNS:
# campaigns.prodenthub.com.au -> [CloudFront domain]

# 7. Wait 15-20 minutes, then test
curl -I https://campaigns.prodenthub.com.au/adc-exam-guide/
```

---

## ❓ Where is Your DNS Managed?

Your `prodenthub.com.au` domain DNS is **NOT in Route 53**. It's likely managed by:

- Your domain registrar (GoDaddy, Namecheap, etc.)
- Another DNS provider

**To find out:**
```bash
whois prodenthub.com.au | grep -i "name server"
```

You'll need to add DNS records there for:
1. Certificate validation (CNAME for ACM)
2. Campaigns subdomain (CNAME to CloudFront)

---

## 🔧 Alternative: Migrate DNS to Route 53 (Optional)

If you want to manage everything in AWS:

### Create Hosted Zone
```bash
aws route53 create-hosted-zone \
  --name prodenthub.com.au \
  --caller-reference prodenthub-$(date +%s) \
  --hosted-zone-config Comment="ProDentHub main domain"
```

### Get Nameservers
```bash
aws route53 get-hosted-zone --id YOUR_ZONE_ID \
  --query 'DelegationSet.NameServers'
```

### Update at Registrar
Update your domain registrar's nameservers to the 4 AWS nameservers.

**Benefits:**
- Automatic DNS validation for ACM certificates
- Easier CloudFront alias records
- Centralized management

---

## 💰 Costs

- **SSL Certificate (ACM):** FREE
- **CloudFront:**
  - First 1 TB data transfer: FREE (first 12 months)
  - After: ~$0.085/GB
  - Requests: $0.01 per 10,000
- **Route 53 (if migrated):**
  - Hosted zone: $0.50/month
  - Queries: $0.40 per million

**Estimated: $0-2/month** for moderate traffic

---

## 📞 Need Help?

**Q: Where do I find my DNS provider?**
Run: `whois prodenthub.com.au`

**Q: Can I use the S3 URL for now?**
Yes! Current URL works: http://prodenthub-campaigns.s3-website-ap-southeast-2.amazonaws.com/adc-exam-guide/

**Q: Do I need CloudFront?**
Not required, but recommended for:
- HTTPS (security)
- Custom domain (branding)
- Better performance (CDN)
- Free bandwidth (1 TB for 12 months)

---

**Status:** Ready to implement
**Time required:** 30-45 minutes (mostly waiting for DNS propagation)
