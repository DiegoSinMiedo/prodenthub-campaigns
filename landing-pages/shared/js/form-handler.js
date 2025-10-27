/**
 * Pro DentHub - Form Handler
 * Handles form submission to AWS API Gateway
 */

const FormHandler = {
  // Configuration
  config: {
    // PDF download URL - update this with your S3/CDN URL
    pdfUrl: 'assets/downloads/Volume 01 - Cracking Clinical Cases - ProDentHub Guides Collections - V0.1.pdf',

    // Optional: API endpoint for lead storage (can be added later)
    apiEndpoint: null, // Set to null to skip API call

    // Redirect to thank you page after submission
    thankYouPage: 'thank-you.html'
  },

  // Field validation rules
  validationRules: {
    firstName: {
      required: true,
      minLength: 2,
      maxLength: 50
    },
    lastName: {
      required: true,
      minLength: 2,
      maxLength: 50
    },
    email: {
      required: true,
      email: true
    },
    phone: {
      phone: true
    },
    country: {
      required: true
    },
    consent: {
      checked: true
    }
  },

  // Initialize form handler
  init: function() {
    const forms = document.querySelectorAll('.lead-capture-form');

    forms.forEach(form => {
      // Setup real-time validation
      FormValidator.setupRealtimeValidation(form, this.validationRules);

      // Handle form submission
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit(form);
      });
    });

    console.log('[FormHandler] Initialized');
  },

  // Handle form submission
  handleSubmit: async function(form) {
    // Validate form
    const validation = FormValidator.validateForm(form, this.validationRules);

    if (!validation.valid) {
      this.showMessage(form, 'Please correct the errors above', 'error');
      return;
    }

    // Get form data
    const formData = FormValidator.getFormData(form);

    // Show loading state
    this.setLoading(form, true);
    this.hideMessage(form);

    try {
      // Optional: Submit to API if endpoint is configured
      if (this.config.apiEndpoint) {
        const trackingData = TrackingManager.getUTMParameters();
        const submitData = {
          ...formData,
          ...trackingData,
          campaign: this.getCampaignName(),
          timestamp: new Date().toISOString(),
          referrer: document.referrer,
          userAgent: navigator.userAgent
        };

        await this.submitToAPI(submitData);
      }

      // Track successful submission
      TrackingManager.trackFormSubmit('lead_capture', {
        leadId: Date.now(),
        email: formData.email
      });

      // Redirect to thank you page with download URL
      const downloadUrl = encodeURIComponent(this.config.pdfUrl);
      window.location.href = `${this.config.thankYouPage}?download=${downloadUrl}`;

    } catch (error) {
      console.error('[FormHandler] Submission error:', error);
      TrackingManager.trackError('submission_failed', error.message);
      this.showMessage(form, 'Something went wrong. Please try again.', 'error');
      this.setLoading(form, false);
    }
  },

  // Submit to API Gateway
  submitToAPI: async function(data) {
    const response = await fetch(this.config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Handle immediate download (new flow)
  handleImmediateDownload: function(form, response) {
    const { downloadUrl, data } = response;
    const firstName = data?.firstName || 'there';

    // Show success message
    this.showSuccessMessage(form, firstName);

    // Track download event
    const fileName = this.getFileNameFromCampaign();
    TrackingManager.trackDownload(fileName, downloadUrl);

    // Trigger download after delay
    setTimeout(() => {
      this.triggerDownload(downloadUrl, fileName);
    }, this.config.downloadDelay);
  },

  // Trigger file download
  triggerDownload: function(url, filename) {
    console.log('[FormHandler] Triggering download:', filename);

    // Create temporary anchor element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'ADC-Exam-Guide-ProDentHub.pdf';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    // Append, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Track successful download trigger
    TrackingManager.trackEvent('pdf_download_triggered', {
      filename: filename,
      method: 'immediate'
    });
  },

  // Show enhanced success message with download notification
  showSuccessMessage: function(form, firstName) {
    const messageHTML = `
      <div class="alert alert-success alert-dismissible fade show mb-4" role="alert" style="border-left: 4px solid #08915e;">
        <h4 class="alert-heading mb-3">
          <i class="bi bi-check-circle-fill me-2" style="color: #08915e;"></i>
          Success, ${this.escapeHtml(firstName)}!
        </h4>

        <div class="mb-3">
          <p class="mb-2 fw-bold"><i class="bi bi-download me-2"></i>Your PDF download will start in 1 second...</p>
          <p class="mb-0 small text-muted">If the download doesn't start, check your browser's download settings.</p>
        </div>

        <hr>

        <div class="mb-3">
          <p class="mb-2 fw-bold"><i class="bi bi-envelope-check me-2"></i>Check your email!</p>
          <p class="mb-0 small">We've sent you 5 additional free resources to help you ace the ADC exam.</p>
        </div>

        <hr>

        <div class="mb-0">
          <p class="mb-2 fw-bold">What's Next?</p>
          <ul class="small mb-0 ps-3">
            <li>Read the guide (30 minutes)</li>
            <li>Create your study timeline</li>
            <li>Start practicing with mock exams</li>
          </ul>
        </div>

        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;

    // Remove existing messages
    const existingAlert = form.parentElement.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    // Insert message
    const container = document.createElement('div');
    container.innerHTML = messageHTML;
    form.insertAdjacentElement('beforebegin', container.firstElementChild);

    // Scroll to message
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Optionally hide the form after success
    setTimeout(() => {
      form.style.display = 'none';
    }, 3000);
  },

  // Escape HTML to prevent XSS
  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // Show message
  showMessage: function(form, message, type) {
    let messageElement = form.querySelector(`.${type}-message`);

    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.className = `${type}-message`;
      form.insertBefore(messageElement, form.firstChild);
    }

    messageElement.textContent = message;
    messageElement.classList.add('show');

    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        messageElement.classList.remove('show');
      }, 5000);
    }
  },

  // Hide message
  hideMessage: function(form) {
    const messages = form.querySelectorAll('.success-message, .error-message');
    messages.forEach(msg => msg.classList.remove('show'));
  },

  // Set loading state
  setLoading: function(form, loading) {
    const submitBtn = form.querySelector('button[type="submit"]');

    if (loading) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Processing...';
    } else {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      if (submitBtn.dataset.originalText) {
        submitBtn.textContent = submitBtn.dataset.originalText;
      }
    }

    // Disable all form fields
    const fields = form.querySelectorAll('input, select, textarea, button');
    fields.forEach(field => {
      field.disabled = loading;
    });
  },

  // Get campaign name from URL
  getCampaignName: function() {
    const pathParts = window.location.pathname.split('/').filter(p => p);
    return pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || 'unknown';
  },

  // Get expected file name based on campaign
  getFileNameFromCampaign: function() {
    const campaign = this.getCampaignName();
    const fileNames = {
      'adc-exam-guide': 'ADC Exam Guide.pdf',
      'clinical-cases-ebook': 'Clinical Cases eBook.pdf',
      'study-planner': 'Study Planner.pdf',
      'exam-checklist': 'Exam Checklist.pdf',
      'success-stories': 'Success Stories.pdf',
      'webinar-registration': 'Webinar Details.pdf'
    };

    return fileNames[campaign] || 'Download.pdf';
  }
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    FormHandler.init();
  });
} else {
  FormHandler.init();
}

// Export for use in other scripts
window.FormHandler = FormHandler;
