# Pro DentHub - Marketing Campaigns

Landing pages and marketing campaigns for Pro DentHub ADC exam preparation platform.

## 🎯 Purpose

This repository contains all marketing landing pages designed for lead capture and conversion. Each campaign has its own folder with standalone HTML/CSS/JS files.

## 📁 Structure

```
prodenthub-campaigns/
├─ landing-pages/
│  ├─ adc-exam-guide/          # Free guide download campaign
│  │  ├─ index.html
│  │  ├─ thank-you.html
│  │  ├─ SETUP.md
│  │  └─ FLOW.md
│  ├─ clinical-cases-ebook/    # Clinical cases ebook
│  ├─ webinar-registration/    # Webinar signups
│  └─ shared/                  # Shared assets
│     ├─ css/
│     ├─ js/
│     └─ img/
└─ assets/
   └─ pdfs/                    # Downloadable PDFs
```

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/prodenthub-campaigns.git
cd prodenthub-campaigns

# Open any landing page with Live Server
# Or use Python:
python -m http.server 8000

# Navigate to:
# http://localhost:8000/landing-pages/adc-exam-guide/
```

### Deployment

**Automatic (GitHub Actions):**
- Push to `main` branch triggers automatic deployment to S3

**Manual:**
```bash
# Sync to S3
aws s3 sync landing-pages/ s3://prodenthub-campaigns-production/

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## 📊 Current Campaigns

| Campaign | Status | Conversion Rate | Total Leads |
|----------|--------|-----------------|-------------|
| ADC Exam Guide | 🟢 Live | 28% | 1,247 |
| Clinical Cases eBook | 🟡 Testing | - | - |
| Webinar Registration | 🔴 Draft | - | - |

## 🔧 Tech Stack

- **Framework:** Bootstrap 5.3.3
- **Icons:** Bootstrap Icons 1.11.3
- **Analytics:** Google Tag Manager + Google Analytics
- **Tracking:** Hotjar (optional)
- **Hosting:** AWS S3 + CloudFront
- **Backend:** Serverless (see [prodenthub-infrastructure](https://github.com/YOUR_USERNAME/prodenthub-infrastructure))

## 📝 Creating New Campaign

1. Copy an existing campaign folder as template
2. Update content and copy
3. Configure form submission endpoint (from infrastructure repo)
4. Test locally
5. Push to main for automatic deployment

See [Creating New Campaign Guide](docs/creating-new-campaign.md) for details.

## 🔗 Related Repositories

- **Main Website:** [prodenthub.com.au](https://github.com/YOUR_USERNAME/prodenthub.com.au)
- **Infrastructure:** [prodenthub-infrastructure](https://github.com/YOUR_USERNAME/prodenthub-infrastructure)

## 📧 Support

Questions? Contact: d.villagran.castro@gmail.com

---

**Pro DentHub** - Helping dentists ace the ADC exam since 2024
