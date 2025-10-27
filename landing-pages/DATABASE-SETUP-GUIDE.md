# 📊 Database Setup Guide - Lead Capture & Storage

## 🎯 Current Situation

### ❌ **What's Happening Now:**
```
User fills form → Client validates → PDF downloads → DATA IS LOST ❌
```

**No database connected!** User data (name, email, country, consent, timestamp) is NOT being saved.

### ✅ **What You Need:**
```
User fills form → API Gateway → Lambda → DynamoDB → SES Email → DATA SAVED ✅
```

---

## 📋 Data That Will Be Captured

With the backend deployed, you'll capture:

### **User Information:**
- ✅ First Name
- ✅ Last Name
- ✅ Email Address
- ✅ Phone (optional)
- ✅ Country

### **Metadata:**
- ✅ Timestamp (submission date/time)
- ✅ Campaign name (adc-exam-guide)
- ✅ Consent checkbox status
- ✅ Terms version (configurable)
- ✅ Privacy policy version (configurable)
- ✅ PDF downloaded (yes/no)
- ✅ Download timestamp
- ✅ User IP address
- ✅ User agent (browser/device)
- ✅ UTM parameters (source, medium, campaign)
- ✅ Referrer URL

### **Storage Location:**
- **Database**: DynamoDB table `prodenthub-leads`
- **Retention**: Forever (or configurable TTL)
- **Access**: AWS Console + API queries

---

## 🏗️ Backend Architecture (Already Built!)

You already have the infrastructure code at:
```
../prodenthub-infrastructure/campaigns-backend/
```

### **What It Includes:**

1. **API Gateway** - HTTPS endpoint for form submissions
2. **Lambda Function** - Processes form data
3. **DynamoDB Table** - Stores all lead data
4. **SES** - Sends email with PDF attachment
5. **S3 Bucket** - Stores PDFs for email delivery
6. **CloudWatch** - Logs and monitoring

### **Cost:**
- ~$2.81 USD/month for 100 leads
- Scales automatically
- Pay only for what you use

---

## 🚀 Deployment Steps

### **Option 1: Quick Deploy (Recommended)**

Run the automated deployment:

```bash
cd ../prodenthub-infrastructure/campaigns-backend

# 1. Configure variables
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# Update these values:
# - sender_email = "noreply@prodenthub.com.au"
# - domain_name = "prodenthub.com.au"

# 2. Initialize Terraform
terraform init

# 3. Review what will be created
terraform plan

# 4. Deploy everything
terraform apply

# 5. Get the API endpoint URL
terraform output api_endpoint
```

**Time required:** 10-15 minutes

---

### **Option 2: Using Makefile (Easier)**

```bash
cd ../prodenthub-infrastructure/campaigns-backend

# Deploy everything
make deploy

# Get API endpoint
make endpoint
```

---

## 📝 Configuration Required

### **1. Email Setup (AWS SES)**

You need to verify your sender email:

```bash
# Verify sender email
aws ses verify-email-identity \
  --email-address noreply@prodenthub.com.au \
  --region ap-southeast-2
```

**Check your email inbox** for verification link from AWS.

**For production (>200 emails/day):**
- Request SES production access in AWS Console
- Takes 24-48 hours for approval
- Without this, you can only send to verified emails

---

### **2. Upload PDF to S3**

The backend needs the PDF in a specific S3 bucket:

```bash
# This will be created by Terraform
aws s3 cp "landing-pages/adc-exam-guide/assets/downloads/Volume 01 - Cracking Clinical Cases - ProDentHub Guides Collections - V0.1.pdf" \
  s3://prodenthub-campaign-pdfs-ACCOUNT_ID/adc-exam-guide.pdf
```

---

### **3. Update Landing Page Config**

After deployment, update `form-handler.js`:

```javascript
config: {
  pdfUrl: 'assets/downloads/Volume 01 - Cracking Clinical Cases - ProDentHub Guides Collections - V0.1.pdf',

  // ADD THIS - API endpoint from terraform output
  apiEndpoint: 'https://abc123xyz.execute-api.ap-southeast-2.amazonaws.com/prod/lead',

  thankYouPage: 'thank-you.html'
}
```

Then re-deploy:
```bash
cd landing-pages/adc-exam-guide
aws s3 cp ../../shared/js/form-handler.js s3://prodenthub-campaigns/shared/js/form-handler.js

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1YJ6ILP0FVA5W \
  --paths "/shared/js/*"
```

---

## 🔄 Complete Flow (After Backend Deployed)

### **User Journey:**
1. User visits: https://campaigns.prodenthub.com.au/adc-exam-guide/
2. Fills form (name, email, country)
3. Clicks "Download Free 4-Step Plan"
4. **Form submits to API Gateway**
5. **Lambda processes and saves to DynamoDB**
6. **SES sends email with PDF attached**
7. User redirected to thank-you page
8. **Data is saved in database** ✅

### **What Gets Stored in DynamoDB:**

```json
{
  "leadId": "20251027-abc123",
  "email": "student@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+61 400 000 000",
  "country": "Australia",
  "campaign": "adc-exam-guide",
  "timestamp": "2025-10-27T08:57:30.123Z",
  "consentGiven": true,
  "termsVersion": "1.0",
  "privacyVersion": "1.0",
  "pdfSent": true,
  "pdfSentAt": "2025-10-27T08:57:31.456Z",
  "ipAddress": "203.123.45.67",
  "userAgent": "Mozilla/5.0...",
  "utmSource": "facebook",
  "utmMedium": "cpc",
  "utmCampaign": "adc-2025",
  "referrer": "https://facebook.com"
}
```

---

## 📊 Viewing Your Leads

### **Option 1: AWS Console**

1. Go to: https://ap-southeast-2.console.aws.amazon.com/dynamodbv2/home?region=ap-southeast-2#tables
2. Click on `prodenthub-leads` table
3. Click **"Explore table items"**
4. View all submissions

### **Option 2: AWS CLI**

```bash
# Get all leads
aws dynamodb scan \
  --table-name prodenthub-leads \
  --region ap-southeast-2

# Get leads from specific campaign
aws dynamodb query \
  --table-name prodenthub-leads \
  --index-name campaign-index \
  --key-condition-expression "campaign = :campaign" \
  --expression-attribute-values '{":campaign":{"S":"adc-exam-guide"}}' \
  --region ap-southeast-2
```

### **Option 3: Export to CSV**

```bash
# Export all leads to CSV
aws dynamodb scan \
  --table-name prodenthub-leads \
  --region ap-southeast-2 \
  --output json | \
  jq -r '.Items[] | [.email.S, .firstName.S, .lastName.S, .country.S, .timestamp.S] | @csv' > leads.csv
```

---

## 📈 Analytics & Reporting

### **Track Metrics:**
- Total leads captured
- Conversion rate (visitors → leads)
- Leads by country
- Leads by campaign
- PDFs sent successfully
- Email delivery rate

### **CloudWatch Logs:**
```bash
# View Lambda logs
aws logs tail /aws/lambda/prodenthub-lead-capture --follow
```

---

## 🔐 Data Privacy & GDPR Compliance

### **What the Backend Does:**
- ✅ Stores data securely in AWS
- ✅ Encrypts data at rest (DynamoDB encryption)
- ✅ Encrypts data in transit (HTTPS)
- ✅ Records consent timestamp
- ✅ Can delete data on request (GDPR right to be forgotten)

### **Delete User Data (GDPR):**
```bash
# Delete specific lead
aws dynamodb delete-item \
  --table-name prodenthub-leads \
  --key '{"leadId": {"S": "20251027-abc123"}}' \
  --region ap-southeast-2
```

---

## 🎯 Do You Want Me to Deploy This Now?

### **What I Need From You:**

1. **Sender Email**: Which email should send the PDFs?
   - Example: `noreply@prodenthub.com.au`
   - Must be an email you can verify

2. **Confirmation**: Ready to deploy backend (~$2.81/month)?

3. **SES Sandbox**: Are you OK with email limitations initially?
   - **Sandbox mode**: Can only send to verified emails
   - **Production mode**: Can send to anyone (requires AWS approval)

---

## 📋 Quick Decision Matrix

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **No Database** (Current) | Simple, free | Lose all data | $0 |
| **With Database** | Save all leads, email PDFs | Setup required | ~$3/month |
| **+ Email Automation** | Follow-up sequences | More complex | +$5/month |
| **+ CRM Integration** | Full marketing suite | Most complex | +$10-50/month |

---

## ✅ My Recommendation

### **For MVP Testing (Now):**
1. Keep current setup (no database)
2. Use Google Analytics + GTM to track conversions
3. Test with real students for 1-2 weeks

### **For Production (Next Week):**
1. Deploy backend infrastructure (~15 minutes)
2. Capture all lead data
3. Send automated emails with PDFs
4. Build email sequences for nurturing

---

## 🚀 Ready to Deploy Backend?

Let me know if you want to:
1. Deploy the backend infrastructure now
2. Wait and test without database first
3. Need more information about costs/setup

I can automate the entire deployment for you! Just say the word. 🎯
