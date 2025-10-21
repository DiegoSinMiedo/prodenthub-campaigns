/**
 * Pro DentHub - Tracking Manager
 * Comprehensive tracking for GTM, Meta Pixel, Google Ads, LinkedIn
 */

const TrackingManager = {
  // Configuration
  config: {
    gtmId: 'GTM-XXXXXX', // Replace with actual GTM ID
    metaPixelId: 'YOUR_PIXEL_ID', // Replace with actual Meta Pixel ID
    googleAdsId: 'AW-XXXXXXXXX', // Replace with actual Google Ads ID
    googleAdsConversionLabel: 'CONVERSION_LABEL', // Replace with actual label
    linkedInPartnerId: 'YOUR_PARTNER_ID' // Replace with actual LinkedIn Partner ID
  },

  // Initialize all tracking
  init: function() {
    this.initGTM();
    this.initMetaPixel();
    this.initGoogleAds();
    this.initLinkedIn();
    this.captureUTMParameters();
    this.trackPageView();
    this.setupFormTracking();
  },

  // Google Tag Manager
  initGTM: function() {
    if (window.dataLayer) return; // Already initialized

    window.dataLayer = window.dataLayer || [];
    (function(w,d,s,l,i){
      w[l]=w[l]||[];
      w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
      var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
      j.async=true;
      j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
      f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer', this.config.gtmId);

    console.log('[Tracking] GTM initialized');
  },

  // Meta Pixel (Facebook)
  initMetaPixel: function() {
    if (window.fbq) return; // Already initialized

    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');

    fbq('init', this.config.metaPixelId);
    fbq('track', 'PageView');

    console.log('[Tracking] Meta Pixel initialized');
  },

  // Google Ads
  initGoogleAds: function() {
    if (window.gtag) return; // Already initialized

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', this.config.googleAdsId);

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.googleAdsId}`;
    document.head.appendChild(script);

    console.log('[Tracking] Google Ads initialized');
  },

  // LinkedIn Insight Tag
  initLinkedIn: function() {
    window._linkedin_partner_id = this.config.linkedInPartnerId;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(window._linkedin_partner_id);

    (function(l) {
      if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
      window.lintrk.q=[]}
      var s = document.getElementsByTagName("script")[0];
      var b = document.createElement("script");
      b.type = "text/javascript";b.async = true;
      b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
      s.parentNode.insertBefore(b, s);
    })(window.lintrk);

    console.log('[Tracking] LinkedIn Insight Tag initialized');
  },

  // Capture UTM parameters and store them
  captureUTMParameters: function() {
    const urlParams = new URLSearchParams(window.location.search);

    const utmData = {
      utm_source: urlParams.get('utm_source') || sessionStorage.getItem('utm_source') || 'direct',
      utm_medium: urlParams.get('utm_medium') || sessionStorage.getItem('utm_medium') || 'none',
      utm_campaign: urlParams.get('utm_campaign') || sessionStorage.getItem('utm_campaign') || '',
      utm_term: urlParams.get('utm_term') || sessionStorage.getItem('utm_term') || '',
      utm_content: urlParams.get('utm_content') || sessionStorage.getItem('utm_content') || '',
      gclid: urlParams.get('gclid') || sessionStorage.getItem('gclid') || '',
      fbclid: urlParams.get('fbclid') || sessionStorage.getItem('fbclid') || '',
      msclkid: urlParams.get('msclkid') || sessionStorage.getItem('msclkid') || '',
      li_fat_id: urlParams.get('li_fat_id') || sessionStorage.getItem('li_fat_id') || ''
    };

    // Store in sessionStorage for persistence
    Object.keys(utmData).forEach(key => {
      if (utmData[key]) {
        sessionStorage.setItem(key, utmData[key]);
      }
    });

    // Push to dataLayer
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'utm_captured',
        ...utmData
      });
    }

    console.log('[Tracking] UTM parameters captured:', utmData);
    return utmData;
  },

  // Get stored UTM parameters
  getUTMParameters: function() {
    return {
      utm_source: sessionStorage.getItem('utm_source') || 'direct',
      utm_medium: sessionStorage.getItem('utm_medium') || 'none',
      utm_campaign: sessionStorage.getItem('utm_campaign') || '',
      utm_term: sessionStorage.getItem('utm_term') || '',
      utm_content: sessionStorage.getItem('utm_content') || '',
      gclid: sessionStorage.getItem('gclid') || '',
      fbclid: sessionStorage.getItem('fbclid') || '',
      msclkid: sessionStorage.getItem('msclkid') || '',
      li_fat_id: sessionStorage.getItem('li_fat_id') || ''
    };
  },

  // Track page view
  trackPageView: function() {
    const data = {
      event: 'page_view',
      page_path: window.location.pathname,
      page_title: document.title,
      page_location: window.location.href,
      campaign_name: this.getCampaignName(),
      ...this.getUTMParameters()
    };

    if (window.dataLayer) {
      window.dataLayer.push(data);
    }

    console.log('[Tracking] Page view tracked:', data);
  },

  // Track form view (when form becomes visible)
  trackFormView: function(formName) {
    const data = {
      event: 'form_view',
      form_name: formName || 'lead_capture',
      campaign_name: this.getCampaignName()
    };

    // GTM
    if (window.dataLayer) {
      window.dataLayer.push(data);
    }

    // Meta Pixel
    if (typeof fbq !== 'undefined') {
      fbq('track', 'ViewContent', {
        content_name: this.getCampaignName(),
        content_category: 'Lead Magnet',
        content_type: 'form'
      });
    }

    console.log('[Tracking] Form view tracked:', data);
  },

  // Track form start (when user interacts with first field)
  trackFormStart: function(formName) {
    const data = {
      event: 'form_start',
      form_name: formName || 'lead_capture',
      campaign_name: this.getCampaignName()
    };

    // GTM
    if (window.dataLayer) {
      window.dataLayer.push(data);
    }

    // Meta Pixel
    if (typeof fbq !== 'undefined') {
      fbq('track', 'InitiateCheckout');
    }

    console.log('[Tracking] Form start tracked:', data);
  },

  // Track form submission (successful)
  trackFormSubmit: function(formName, leadData) {
    const leadValue = 10.00; // Estimated lead value in AUD

    const data = {
      event: 'form_submit',
      event_category: 'Lead Generation',
      event_label: formName || 'lead_capture',
      form_name: formName || 'lead_capture',
      campaign_name: this.getCampaignName(),
      lead_id: leadData.leadId || '',
      value: leadValue,
      currency: 'AUD'
    };

    // GTM
    if (window.dataLayer) {
      window.dataLayer.push(data);
    }

    // Meta Pixel - Lead event
    if (typeof fbq !== 'undefined') {
      fbq('track', 'Lead', {
        content_name: this.getCampaignName(),
        content_category: 'Lead Magnet',
        value: leadValue,
        currency: 'AUD',
        predicted_ltv: 100.00 // Estimated lifetime value
      });
    }

    // Google Ads Conversion
    if (typeof gtag !== 'undefined') {
      gtag('event', 'conversion', {
        'send_to': `${this.config.googleAdsId}/${this.config.googleAdsConversionLabel}`,
        'value': leadValue,
        'currency': 'AUD',
        'transaction_id': leadData.leadId || ''
      });
    }

    // LinkedIn Conversion
    if (typeof window.lintrk !== 'undefined') {
      window.lintrk('track', { conversion_id: 1234567 }); // Replace with actual conversion ID
    }

    console.log('[Tracking] Form submission tracked:', data);
  },

  // Track file download
  trackDownload: function(fileName, downloadUrl) {
    const data = {
      event: 'file_download',
      event_category: 'Downloads',
      event_label: fileName,
      file_name: fileName,
      file_url: downloadUrl,
      campaign_name: this.getCampaignName()
    };

    // GTM
    if (window.dataLayer) {
      window.dataLayer.push(data);
    }

    // Meta Pixel
    if (typeof fbq !== 'undefined') {
      fbq('track', 'Purchase', {
        content_name: fileName,
        content_type: 'product',
        value: 0.00,
        currency: 'AUD'
      });
    }

    console.log('[Tracking] Download tracked:', data);
  },

  // Track errors
  trackError: function(errorType, errorMessage) {
    const data = {
      event: 'form_error',
      error_type: errorType,
      error_message: errorMessage,
      campaign_name: this.getCampaignName()
    };

    if (window.dataLayer) {
      window.dataLayer.push(data);
    }

    console.error('[Tracking] Error tracked:', data);
  },

  // Track scroll depth
  trackScrollDepth: function() {
    let scrollDepths = [25, 50, 75, 100];
    let triggered = [];

    window.addEventListener('scroll', () => {
      const scrollPercent = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100;

      scrollDepths.forEach(depth => {
        if (scrollPercent >= depth && !triggered.includes(depth)) {
          triggered.push(depth);

          if (window.dataLayer) {
            window.dataLayer.push({
              event: 'scroll_depth',
              scroll_depth: depth,
              campaign_name: this.getCampaignName()
            });
          }

          console.log(`[Tracking] Scroll depth: ${depth}%`);
        }
      });
    });
  },

  // Track time on page
  trackTimeOnPage: function() {
    const startTime = Date.now();

    const intervals = [30, 60, 120, 300]; // seconds
    const triggered = [];

    setInterval(() => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      intervals.forEach(interval => {
        if (timeSpent >= interval && !triggered.includes(interval)) {
          triggered.push(interval);

          if (window.dataLayer) {
            window.dataLayer.push({
              event: 'time_on_page',
              time_seconds: interval,
              campaign_name: this.getCampaignName()
            });
          }

          console.log(`[Tracking] Time on page: ${interval}s`);
        }
      });
    }, 5000); // Check every 5 seconds
  },

  // Get campaign name from URL path
  getCampaignName: function() {
    const pathParts = window.location.pathname.split('/').filter(p => p);
    // Assuming URL structure: /campaigns/landing-pages/campaign-name/
    return pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || 'unknown';
  },

  // Setup automatic form tracking
  setupFormTracking: function() {
    // Track form view when form is visible
    const forms = document.querySelectorAll('.lead-capture-form');

    forms.forEach(form => {
      // Intersection Observer for form view tracking
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.trackFormView(form.id || 'lead_capture');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });

      observer.observe(form);

      // Track form start on first interaction
      let formStarted = false;
      const formInputs = form.querySelectorAll('input, select, textarea');

      formInputs.forEach(input => {
        input.addEventListener('focus', () => {
          if (!formStarted) {
            formStarted = true;
            this.trackFormStart(form.id || 'lead_capture');
          }
        }, { once: true });
      });
    });
  },

  // Enhanced ecommerce tracking (for advanced analytics)
  trackEnhancedEcommerce: function(step, option) {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'checkout',
        ecommerce: {
          checkout: {
            actionField: { step: step, option: option }
          }
        }
      });
    }
  }
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    TrackingManager.init();
    TrackingManager.trackScrollDepth();
    TrackingManager.trackTimeOnPage();
  });
} else {
  TrackingManager.init();
  TrackingManager.trackScrollDepth();
  TrackingManager.trackTimeOnPage();
}

// Export for use in other scripts
window.TrackingManager = TrackingManager;
