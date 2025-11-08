# ProDentHub - Marketing Campaigns

Landing pages and marketing campaigns for ProDentHub ADC exam preparation platform.

## 🎯 Purpose

This repository contains marketing landing pages designed for lead capture and conversion. Each campaign is standalone with its own HTML/CSS/JS files.

## 📁 Structure

```
prodenthub-campaigns/
├── .gitignore
├── README.md
└── landing-pages/
    ├── README.md
    ├── adc-exam-guide/          # "Cracking Clinical Cases" guide
    │   ├── index.html           # Main landing page
    │   ├── thank-you.html       # Post-submission page
    │   └── assets/
    │       ├── images/
    │       │   ├── guide-cover.jpg      # Form preview image
    │       │   └── og-image.jpg         # Social sharing image
    │       └── downloads/
    │           └── [PDF files - not in repo]
    └── shared/                  # Shared assets across campaigns
        ├── css/
        │   ├── landing-base.css
        │   └── form-styles.css
        ├── js/
        │   ├── form-handler.js
        │   ├── tracking.js
        │   └── validation.js
        └── assets/
            └── icons/
```

## 🚀 Quick Start

### Local Development

```bash
# Navigate to landing-pages directory
cd landing-pages

# Run local server (from landing-pages/ directory)
python -m http.server 8000

# Open in browser:
# http://localhost:8000/adc-exam-guide/
```

**Important:** Run the server from `landing-pages/` directory, not from inside a campaign folder, so relative paths to `../shared/` work correctly.

### Deployment

**Manual Deployment to S3:**
```bash
# Upload campaign files
aws s3 sync landing-pages/adc-exam-guide/ s3://prodenthub-campaigns/adc-exam-guide/ \
  --exclude "*.md" \
  --exclude "assets/downloads/*"

# Upload shared assets
aws s3 sync landing-pages/shared/ s3://prodenthub-campaigns/shared/

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1YJ6ILP0FVA5W \
  --paths "/*"
```

## 📊 Current Campaigns

### Lead Magnet Campaigns (Free)

| Campaign | URL | Status | Campaign ID |
|----------|-----|--------|-------------|
| Cracking Clinical Cases | [campaigns.prodenthub.com.au/adc-exam-guide/](https://campaigns.prodenthub.com.au/adc-exam-guide/) | 🟢 Live | `cracking-clinical-cases` |

### Paid Campaigns (Stripe Integration)

| Campaign | URL | Status | Campaign ID | Price |
|----------|-----|--------|-------------|-------|
| Team Creation | campaigns.prodenthub.com.au/team-creation/ | 🟡 Pending Backend | `team-creation` | $299 AUD (split) |
| Scholarship Application | campaigns.prodenthub.com.au/scholarship-application/ | 🟡 Pending Backend | `scholarship-application` | Variable (up to 75% off) |
| Discount Purchase | campaigns.prodenthub.com.au/discount-purchase/ | 🟡 Pending Backend | `discount-purchase` | $49-$299 AUD |
| Personalized Plan | campaigns.prodenthub.com.au/personalized-plan/ | 🟡 Pending Backend | `personalized-plan` | $149-$249 AUD |
| Mock Exam Registration | campaigns.prodenthub.com.au/mock-exam-registration/ | 🟡 Pending Backend | `mock-exam-registration` | Free or $29 AUD |

## 🔧 Tech Stack

### Frontend
- **HTML/CSS/JavaScript:** Vanilla (no frameworks)
- **Styling:** Bootstrap 5.3.3
- **Icons:** Bootstrap Icons 1.11.3
- **Analytics:** Google Tag Manager (GTM-P95LCCG6)
- **Payment:** Stripe Checkout (Stripe.js v3)

### Backend
- **CDN:** AWS CloudFront (Distribution ID: E1YJ6ILP0FVA5W)
- **Hosting:** AWS S3 (prodenthub-campaigns)
- **API:** AWS Lambda + API Gateway (ap-southeast-2)
- **Database:** DynamoDB (9 tables for campaigns)
- **Email:** AWS SES
- **File Storage:** S3 (score reports, PDFs)

## 📝 Campaign Types

### 1. **Team Creation** (`team-creation`)
Create study teams and split the cost. Full access for 6 months divided among 2-5 members.
- **Features:** Dynamic team member management, payment splitting
- **Integration:** Stripe Checkout, team dashboard

### 2. **Scholarship Application** (`scholarship-application`)
Apply for scholarships based on exam attempts, scores, and financial need.
- **Features:** Real-time scholarship calculation (up to 75% off), eligibility scoring
- **Integration:** Stripe dynamic pricing

### 3. **Discount Purchase** (`discount-purchase`)
Purchase with discount coupons. Validates coupons and applies discounts.
- **Features:** Coupon validation, usage tracking, percentage or fixed discounts
- **Integration:** Stripe Checkout with coupon metadata

### 4. **Personalized Plan** (`personalized-plan`)
Get a customized study plan based on performance cluster (1 of 4 clusters).
- **Features:** Self-assessment quiz, cluster determination, tailored resources
- **Integration:** Cluster-specific Stripe products

### 5. **Mock Exam Registration** (`mock-exam-registration`)
Register for universal mock exams with statistics and peer comparison.
- **Features:** Free or premium registration, aggregate statistics, performance analytics
- **Integration:** Optional Stripe payment for premium features

## 📝 Creating New Campaign

### For Free Lead Magnet Campaigns:

1. **Copy existing campaign folder:**
   ```bash
   cp -r landing-pages/adc-exam-guide/ landing-pages/new-campaign/
   ```

2. **Update campaign ID:**
   - Change hidden form field: `<input name="campaign" value="new-campaign-id">`
   - Update analytics tracking in `thank-you.html`

3. **Update Lambda PDF mapping:**
   - Add to `prodenthub-infrastructure/campaigns-backend/lambda/lead-capture/index.js`
   - Upload PDF to S3: `s3://prodenthub-campaign-pdfs-production/guides/new-campaign-id.pdf`

4. **Test locally** then deploy to S3

### For Paid Campaigns:

1. **Use existing campaign templates** (team-creation, scholarship-application, etc.)
2. **Configure Stripe:**
   - Create product in Stripe Dashboard
   - Update `stripe-public-key` meta tag in HTML
   - Set product ID in Lambda environment variables
3. **Implement backend Lambda** (see `BACKEND_REQUIREMENTS.md`)
4. **Configure DynamoDB tables** as specified
5. **Set up Stripe webhooks** for payment processing

## 🎨 Brand Guidelines

- **Primary Color:** #cf4520 (Orange-Red)
- **Font:** System fonts (optimized for performance)
- **Form Fields:** First Name, Last Name, Email, Country
- **Privacy:** Links to privacy policy and terms

## 📚 Documentation

- **[CAMPAIGNS_DESIGN.md](./CAMPAIGNS_DESIGN.md)** - Detailed design document for all campaigns, including DynamoDB schemas, pricing logic, and API specifications
- **[BACKEND_REQUIREMENTS.md](./BACKEND_REQUIREMENTS.md)** - Complete backend implementation guide for Lambda functions, DynamoDB tables, and Stripe integration

## 🔗 Related Repositories

- **Infrastructure:** [prodenthub-infrastructure](../prodenthub-infrastructure) - Backend Lambda functions, DynamoDB, and API Gateway configuration
- **Main Website:** [prodenthub.com.au](https://prodenthub.com.au)

## 🚀 Deployment Checklist

### Frontend (This Repo)
- [ ] Update campaign HTML/JS files
- [ ] Test locally with `python -m http.server 8000`
- [ ] Sync to S3: `aws s3 sync landing-pages/ s3://prodenthub-campaigns/`
- [ ] Invalidate CloudFront cache

### Backend (Infrastructure Repo)
- [ ] Create/update DynamoDB tables (Terraform)
- [ ] Deploy Lambda functions
- [ ] Configure API Gateway routes
- [ ] Set up Stripe products
- [ ] Configure Stripe webhooks
- [ ] Test end-to-end payment flows

## 🧪 Testing

```bash
# Test locally (from landing-pages/ directory)
cd landing-pages
python -m http.server 8000

# Open in browser:
# http://localhost:8000/team-creation/
# http://localhost:8000/scholarship-application/
# http://localhost:8000/discount-purchase/
# http://localhost:8000/personalized-plan/
# http://localhost:8000/mock-exam-registration/
```

**Note:** Payment processing requires backend API to be deployed. Use Stripe test mode for testing.

## 📧 Support

Questions? Contact: d.villagran.castro@gmail.com

---

**ProDentHub** - Helping dentists ace the ADC exam since 2024
