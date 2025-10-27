# ADC Exam Guide - Landing Page Setup

## ✅ What's Complete

Your landing page is fully functional with **direct download** (no email required)!

### Files Ready:
- ✅ `index.html` - Main landing page with form
- ✅ `thank-you.html` - Auto-download page
- ✅ `../shared/js/form-handler.js` - Form submission logic
- ✅ `assets/images/` - Folder for PDF cover preview
- ✅ `assets/downloads/` - Folder for your PDF guide

---

## 🚀 Quick Start (3 Steps)

### Step 1: Add Your PDF

**Place your PDF guide here:**
```
landing-pages/adc-exam-guide/assets/downloads/guide.pdf
```

**Requirements:**
- File name: `guide.pdf` (exactly)
- Format: PDF
- Size: Under 5MB recommended
- Content: Your 5-page "Cracking Clinical Cases" guide

---

### Step 2: Add PDF Cover Preview Image (Optional)

**Place cover image here:**
```
landing-pages/adc-exam-guide/assets/images/guide-cover.jpg
```

**Requirements:**
- File name: `guide-cover.jpg`
- Dimensions: 595x842px (A4 ratio) or 1200x1697px (retina)
- Format: JPG
- Size: Under 200KB

If you don't add this image, the landing page will show a broken image placeholder (non-critical).

---

### Step 3: Test Locally

```bash
# Navigate to the landing-pages folder (NOT adc-exam-guide!)
cd landing-pages

# Start a local server (Python 3)
python -m http.server 8000

# Or Python 2
python -m SimpleHTTPServer 8000

# Or Node.js
npx http-server -p 8000

# Open in browser - note the /adc-exam-guide/ path
open http://localhost:8000/adc-exam-guide/
```

**Important:** You must serve from the `landing-pages/` directory (not from inside `adc-exam-guide/`) so the `../shared/` paths work correctly.

**Test the flow:**
1. Fill out the form
2. Click "Download Free 4-Step Plan"
3. Should redirect to `thank-you.html`
4. PDF should auto-download after 2 seconds

---

## 🎯 How It Works

### User Flow:

```
1. User visits: index.html
         ↓
2. Fills form (name, email, country)
         ↓
3. Clicks submit
         ↓
4. Form validates ✓
         ↓
5. Redirects to: thank-you.html?download=assets/downloads/guide.pdf
         ↓
6. Auto-downloads PDF after 2 seconds
         ↓
7. Done! User has the guide
```

### Technical Flow:

**index.html:**
- Displays form
- Includes `form-handler.js`

**form-handler.js:**
- Validates form fields
- On submit: redirects to `thank-you.html?download=assets/downloads/guide.pdf`

**thank-you.html:**
- Reads `?download=...` from URL
- Auto-triggers download after 2 seconds
- Shows success message
- Tracks download event (GTM)

---

## 📁 File Structure

```
landing-pages/adc-exam-guide/
├── index.html                     ← Main landing page
├── thank-you.html                 ← Auto-download page
├── assets/
│   ├── downloads/
│   │   ├── guide.pdf             ← YOUR PDF HERE
│   │   └── README.md
│   └── images/
│       ├── guide-cover.jpg       ← PDF COVER IMAGE HERE
│       └── README.md
└── SETUP.md                       ← This file
```

---

## 🔧 Configuration

### Change PDF URL

Edit: `landing-pages/shared/js/form-handler.js`

```javascript
config: {
  // Local file
  pdfUrl: 'assets/downloads/guide.pdf',

  // Or S3/CDN URL
  pdfUrl: 'https://cdn.prodenthub.com.au/guides/adc-guide.pdf',

  thankYouPage: 'thank-you.html'
}
```

### Add API Endpoint (Optional - for later)

If you want to store leads in a database:

```javascript
config: {
  pdfUrl: 'assets/downloads/guide.pdf',
  apiEndpoint: 'https://your-api-gateway.amazonaws.com/lead', // Add this
  thankYouPage: 'thank-you.html'
}
```

The form will:
1. Submit data to API
2. Then redirect to thank you page

---

## 🌐 Deploy Options

### Option A: Netlify (Easiest - Free)

1. **Drag & Drop:**
   - Go to https://app.netlify.com/drop
   - Drag the `landing-pages/adc-exam-guide` folder
   - Done! You get a URL like: `https://your-site.netlify.app`

2. **Or Git Deploy:**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=landing-pages/adc-exam-guide
   ```

### Option B: Vercel (Also Easy - Free)

```bash
npm install -g vercel
cd landing-pages/adc-exam-guide
vercel --prod
```

### Option C: AWS S3 + CloudFront (Professional)

Use your existing infrastructure:
```bash
cd ../prodenthub-infrastructure/campaigns-backend
make deploy
```

Then upload landing page to the S3 bucket.

---

## ✅ Pre-Flight Checklist

Before going live:

- [ ] PDF guide is in `assets/downloads/guide.pdf`
- [ ] Cover image is in `assets/images/guide-cover.jpg` (optional)
- [ ] Tested locally - form submits correctly
- [ ] PDF downloads automatically on thank-you page
- [ ] Updated GTM ID in both HTML files (replace `GTM-XXXXXX`)
- [ ] Updated privacy/terms links in footer
- [ ] Tested on mobile device
- [ ] Tested in different browsers (Chrome, Safari, Firefox)

---

## 🐛 Troubleshooting

### PDF doesn't download

**Check:**
1. File exists at `assets/downloads/guide.pdf`
2. File name is exactly `guide.pdf` (case-sensitive)
3. Browser isn't blocking downloads (check settings)
4. Open browser console (F12) - look for errors

### Form doesn't submit

**Check:**
1. All required fields are filled
2. Email format is valid
3. Consent checkbox is checked
4. Open browser console (F12) - look for JavaScript errors

### Cover image doesn't show

**Check:**
1. File exists at `assets/images/guide-cover.jpg`
2. File name matches exactly
3. Image is valid JPG format
4. Not critical - page works without it

---

## 📊 Analytics Tracking

The landing page tracks:

- ✅ Page views (GTM)
- ✅ Form submissions (GTM event: `lead_capture`)
- ✅ Thank you page views (GTM event: `thank_you_page_view`)
- ✅ PDF downloads (GTM event: `pdf_download`)

**To enable:**
Replace `GTM-XXXXXX` with your actual Google Tag Manager ID in:
- `index.html` (line 33)
- `thank-you.html` (line 22)

---

## 🚀 Next Steps

### Now:
1. Add your PDF to `assets/downloads/guide.pdf`
2. Add cover image to `assets/images/guide-cover.jpg`
3. Test locally
4. Deploy to Netlify/Vercel

### Later (Optional):
1. Set up AWS infrastructure for lead storage
2. Configure SES for email notifications
3. Add your custom domain
4. Enable SSL certificate
5. Set up email autoresponder sequence

---

## 📞 Need Help?

**Issue:** Something not working?
**Solution:** Check browser console (F12) for error messages

**Issue:** Want to add email delivery?
**Solution:** Configure AWS SES + Lambda (see infrastructure repo)

**Issue:** Want to store leads in database?
**Solution:** Add API endpoint configuration

---

**Status:** ✅ Ready to deploy!
**Estimated setup time:** 10 minutes
**Deployment time:** 5 minutes

Good luck with your campaign! 🎉
