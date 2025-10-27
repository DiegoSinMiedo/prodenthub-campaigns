# Campaign Downloads

Place downloadable files in this folder.

## Required File

### `guide.pdf`
- **Purpose:** The free ADC Clinical Cases guide that users download
- **File name:** `guide.pdf` (referenced in form-handler.js)
- **Recommended name for user:** `ProDentHub-ADC-Clinical-Cases-Guide.pdf`
- **Format:** PDF
- **Size:** Keep under 5MB for fast downloads

## How to Add Your PDF:

1. **Create your guide** (5 pages as mentioned in the landing page)
2. **Optimize for web:**
   - Compress images
   - Reduce file size
   - Keep under 5MB
3. **Save as:** `guide.pdf`
4. **Place in this folder:** `landing-pages/adc-exam-guide/assets/downloads/guide.pdf`

## Current Flow:

1. User fills form on `index.html`
2. Form validates and redirects to `thank-you.html?download=assets/downloads/guide.pdf`
3. Thank you page auto-downloads the PDF after 2 seconds
4. User gets the guide instantly (no email required)

## Alternative: Host on CDN/S3

For production, you can host the PDF on S3 or CDN and update the URL in:
```javascript
// File: landing-pages/shared/js/form-handler.js
config: {
  pdfUrl: 'https://cdn.prodenthub.com.au/guides/adc-clinical-cases.pdf'
}
```

Benefits of CDN hosting:
- Faster global downloads
- Lower server load
- Better analytics
- Can update PDF without redeploying site
