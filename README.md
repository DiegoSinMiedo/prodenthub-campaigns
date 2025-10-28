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

| Campaign | URL | Status | Campaign ID |
|----------|-----|--------|-------------|
| Cracking Clinical Cases | [campaigns.prodenthub.com.au/adc-exam-guide/](https://campaigns.prodenthub.com.au/adc-exam-guide/) | 🟢 Live | `cracking-clinical-cases` |

## 🔧 Tech Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Styling:** Bootstrap 5.3.3
- **Icons:** Bootstrap Icons 1.11.3
- **Analytics:** Google Tag Manager (GTM-P95LCCG6)
- **CDN:** AWS CloudFront
- **Hosting:** AWS S3
- **Backend API:** AWS Lambda + API Gateway
- **Database:** DynamoDB

## 📝 Creating New Campaign

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

## 🎨 Brand Guidelines

- **Primary Color:** #cf4520 (Orange-Red)
- **Font:** System fonts (optimized for performance)
- **Form Fields:** First Name, Last Name, Email, Country
- **Privacy:** Links to privacy policy and terms

## 🔗 Related Repositories

- **Infrastructure:** [prodenthub-infrastructure](../prodenthub-infrastructure)
- **Main Website:** [prodenthub.com.au](https://prodenthub.com.au)

## 📧 Support

Questions? Contact: d.villagran.castro@gmail.com

---

**ProDentHub** - Helping dentists ace the ADC exam since 2024
