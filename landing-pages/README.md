# ProDentHub Landing Pages - Architecture

This directory contains all marketing landing pages for ProDentHub campaigns.

## Directory Structure

```
landing-pages/
├── shared/                         # Shared resources across all campaigns
│   ├── assets/                     # Reusable assets only
│   │   ├── icons/                  # Favicons, app icons (all sizes)
│   │   ├── logos/                  # ProDentHub brand logos (SVG, WebP)
│   │   └── images/                 # Generic images (backgrounds, common graphics)
│   ├── css/                        # Global stylesheets
│   │   ├── landing-base.css        # Base landing page styles
│   │   ├── form-styles.css         # Form components
│   │   └── urgency-components.css  # Urgency/scarcity elements
│   └── js/                         # Global scripts
│       ├── form-handler.js         # Form submission logic
│       ├── validation.js           # Form validation
│       ├── urgency.js              # Countdown timers, notifications
│       └── tracking.js             # Analytics tracking
│
├── [campaign-name]/                # Individual campaign folders
│   ├── index.html                  # Main landing page
│   ├── thank-you.html              # Confirmation page
│   └── assets/                     # Campaign-specific assets ONLY
│       ├── images/                 # Hero images, unique graphics
│       └── downloads/              # PDF guides, ebooks, etc.
│
└── README.md                       # This file
```

## Guidelines

### When to Use `shared/assets/`
Place assets here if they will be reused across **2 or more campaigns**:
- ✅ Brand favicons and app icons
- ✅ ProDentHub logos
- ✅ Generic UI patterns/backgrounds
- ✅ Common illustrations

### When to Use `[campaign]/assets/`
Place assets here if they are specific to **one campaign only**:
- ✅ Campaign hero images
- ✅ Downloadable PDFs/ebooks specific to this offer
- ✅ Campaign-specific screenshots
- ✅ Unique graphics/photos

### HTML Reference Patterns

**For shared assets:**
```html
<!-- From any campaign folder -->
<link rel="icon" href="../shared/assets/icons/favicon-32x32.png">
<img src="../shared/assets/logos/logo.svg" alt="ProDentHub">
```

**For campaign-specific assets:**
```html
<!-- Within the same campaign -->
<img src="assets/images/hero-banner.jpg" alt="Campaign Hero">
<a href="assets/downloads/guide.pdf">Download Guide</a>
```

## Creating a New Campaign

1. **Create campaign folder:**
   ```bash
   mkdir landing-pages/new-campaign-name
   ```

2. **Create basic structure:**
   ```bash
   mkdir landing-pages/new-campaign-name/assets
   mkdir landing-pages/new-campaign-name/assets/images
   mkdir landing-pages/new-campaign-name/assets/downloads
   ```

3. **Copy template HTML** (use existing campaign as reference)

4. **Link shared resources:**
   ```html
   <!-- Favicons -->
   <link rel="icon" href="../shared/assets/icons/favicon-32x32.png">

   <!-- Shared CSS -->
   <link href="../shared/css/landing-base.css" rel="stylesheet">
   <link href="../shared/css/form-styles.css" rel="stylesheet">

   <!-- Shared JS -->
   <script src="../shared/js/form-handler.js"></script>
   <script src="../shared/js/urgency.js"></script>
   ```

5. **Add campaign-specific assets** to `assets/` folder

## Naming Conventions

- **Folders:** Use kebab-case: `adc-exam-guide`, `clinical-cases-ebook`
- **Files:** Use kebab-case: `hero-image.jpg`, `download-guide.pdf`
- **Campaign IDs:** Match folder name in hidden form fields

## Performance Notes

- Shared assets are cached across campaigns (better performance)
- Keep campaign folders lightweight (only essential assets)
- Optimize images before adding (WebP preferred)
- Use CDN for Bootstrap, icons, fonts

## Current Campaigns

- `adc-exam-guide/` - ADC Exam Preparation Guide lead magnet
- More to come...
