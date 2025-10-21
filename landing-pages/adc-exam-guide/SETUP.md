# ADC Exam Guide Landing Page - Setup Guide

## Quick Setup (5 Minutes)

### Step 1: Deploy Backend Infrastructure

```bash
cd terraform/campaigns-backend

# Copy example config
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars

# Deploy (guided)
make deploy
```

### Step 2: Get Your API Endpoint

```bash
# Copy this URL
make endpoint

# Example output:
# https://abc123.execute-api.ap-southeast-2.amazonaws.com/lead
```

### Step 3: Update Frontend

Edit `campaigns/landing-pages/shared/js/form-handler.js`:

```javascript
config: {
  apiEndpoint: 'YOUR_API_ENDPOINT_HERE', // ← Paste URL from Step 2
  downloadDelay: 1000
},
```

### Step 4: Upload PDF to S3

```bash
cd terraform/campaigns-backend

# Upload your PDF
make upload-pdf

# Or manually:
aws s3 cp /path/to/ADC-Exam-Guide.pdf \
  s3://$(terraform output -raw s3_bucket_name)/guides/adc-exam-guide.pdf
```

### Step 5: Configure DNS for SES

```bash
# Get DNS records
make dns-config

# Add these records to your DNS:
# - 1 TXT record (domain verification)
# - 3 CNAME records (DKIM)
```

Wait 10-30 minutes for DNS propagation.

### Step 6: Test!

```bash
# Test the API
make test

# Or manually test the form on your landing page
```

---

## How It Works

### User Flow

```
1. User fills form (firstName, lastName, email, country)
        ↓
2. Form submits to API Gateway
        ↓
3. Lambda processes:
   - Validates data
   - Saves to DynamoDB
   - Generates presigned S3 URL (valid 24h)
   - Sends email with 5 bonus resources
   - Returns downloadUrl to frontend
        ↓
4. Frontend receives response:
   - Shows success message
   - Triggers PDF download automatically (1 second delay)
   - Mentions email with bonus content
        ↓
5. User gets:
   ✓ Immediate PDF download
   ✓ Email with 5 additional resources
```

### What the User Sees

**On Form Submission:**
```
✓ Success, John!

↓ Your PDF download will start in 1 second...
   If the download doesn't start, check your browser's download settings.

───────────────────────────────────

✉ Check your email!
   We've sent you 5 additional free resources to help you ace the ADC exam.

───────────────────────────────────

What's Next?
• Read the guide (30 minutes)
• Create your study timeline
• Start practicing with mock exams
```

**In Their Email:**
```
Hi John,

Thanks for downloading our ADC Exam Guide! We hope it's already helping you.

To help you succeed even further, here are 5 ADDITIONAL RESOURCES:

📚 Resource #1: Free Video Masterclass
   "Top 10 Mistakes ADC Candidates Make" - 45 min training
   → Watch Now

🎯 Resource #2: Interactive Study Planner
   Customized timeline calculator based on your exam date
   → Create Your Plan

💡 Resource #3: Weekly ADC Tips (Email Series)
   ✓ You're already subscribed!

📊 Resource #4: Free Practice Questions
   50 sample MCQs with detailed explanations
   → Start Practicing

🎧 Resource #5: ADC Success Podcast
   Interviews with recently registered dentists
   → Listen Now

[CTA: Start Your Free Trial]
```

---

## Configuration

### API Endpoint

**Location:** `campaigns/landing-pages/shared/js/form-handler.js`

```javascript
const FormHandler = {
  config: {
    // UPDATE THIS after terraform deployment
    apiEndpoint: 'https://your-api-id.execute-api.ap-southeast-2.amazonaws.com/lead',
    downloadDelay: 1000 // ms before triggering download
  },
  // ...
}
```

### Email Resources

**Location:** `terraform/campaigns-backend/email-templates/adc-exam-guide.html`

Update the 5 resource links:
- Resource #1: Masterclass URL
- Resource #2: Study Planner URL
- Resource #3: Email series (automatic)
- Resource #4: Practice Questions URL
- Resource #5: Podcast URL

### Form Copy

The form mentions "delivered to your email in 30 seconds" but downloads immediately.

This is intentional psychology:
- User expects email delivery
- Gets surprised with instant download (better UX!)
- Still checks email for bonus resources
- Win-win: instant gratification + email engagement

---

## Testing Checklist

### Local Testing

- [ ] Form validation works
- [ ] Submit button shows loading state
- [ ] Success message displays correctly
- [ ] Download triggers automatically
- [ ] Analytics events fire (check console)

### Backend Testing

```bash
# Test API endpoint
curl -X POST "YOUR_API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "country": "AU",
    "campaign": "adc-exam-guide"
  }'

# Expected response:
{
  "success": true,
  "message": "Success! Your download will start automatically.",
  "downloadUrl": "https://s3.amazonaws.com/...",
  "data": {
    "email": "test@example.com",
    "campaign": "adc-exam-guide",
    "firstName": "Test",
    "emailSent": true
  }
}
```

### Email Testing

1. Submit form with your real email
2. Check inbox (and spam folder)
3. Verify:
   - [ ] Email arrives within 30 seconds
   - [ ] All 5 resource links are correct
   - [ ] Branding looks professional
   - [ ] CTA buttons work

### Production Testing

- [ ] Test from mobile device
- [ ] Test from different browsers (Chrome, Safari, Firefox)
- [ ] Test with different email providers (Gmail, Outlook, etc.)
- [ ] Verify download works on iOS Safari
- [ ] Check CloudWatch logs for errors

---

## Troubleshooting

### Download doesn't start

**Check:**
1. Browser console for errors
2. Pop-up blocker settings
3. Download folder permissions

**Fix:**
- Add manual download button fallback
- Check CORS settings in API Gateway

### Email not received

**Check:**
1. Spam folder
2. SES verification status: `make ses-status`
3. Email in SES sandbox (can only send to verified addresses)

**Fix:**
- Request SES production access (if in sandbox)
- Verify recipient email in SES console
- Check CloudWatch logs: `make logs`

### API returns 403 Forbidden

**Check:**
- CORS configuration in API Gateway
- Allowed origins in `terraform.tfvars`

**Fix:**
```hcl
# In terraform.tfvars
allowed_origins = [
  "https://prodenthub.com.au",
  "http://localhost:5501"  # Add your domain
]
```

### Rate limiting triggered

**Check:**
- Too many submissions from same IP/email
- Rate limits in `terraform.tfvars`

**Fix:**
```hcl
# Increase limits temporarily
rate_limit_per_ip    = 10
rate_limit_per_email = 5
```

---

## Monitoring

### View Logs

```bash
# Lambda logs (live tail)
make logs

# API Gateway logs
make logs-api

# View in AWS Console
make monitoring
```

### Check Metrics

```bash
# View all outputs
make outputs

# Check costs
make costs

# View leads in DynamoDB
aws dynamodb scan --table-name $(terraform output -raw dynamodb_table_name)
```

---

## Next Steps

### Marketing Integration

1. **Mailchimp:** Enable in `terraform.tfvars`
2. **Facebook Pixel:** Add to landing page
3. **Google Ads:** Track conversions

### Additional Campaigns

To create more landing pages:

1. Copy `adc-exam-guide` folder
2. Upload new PDF to S3
3. Update `campaign` value in form
4. Same backend works for all!

---

## Support

**Issues?** Check:
- [Main README](../../../terraform/campaigns-backend/README.md) - Full documentation
- CloudWatch logs - `make logs`
- [GitHub Issues](https://github.com/...)

**Questions?**
- Email: support@prodenthub.com.au
