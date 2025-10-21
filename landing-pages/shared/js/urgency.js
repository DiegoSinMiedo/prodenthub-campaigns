/**
 * Pro DentHub - Urgency Features
 * Dynamic urgency and scarcity elements for conversion optimization
 */

const UrgencyManager = {
  // Configuration
  config: {
    countdownDuration: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
    minSpots: 25,
    maxSpots: 75,
    socialProofInterval: 15000, // Show notification every 15 seconds
    visitorCountMin: 15,
    visitorCountMax: 45
  },

  // Storage keys
  storageKeys: {
    countdownEnd: 'pdh_countdown_end',
    spotsRemaining: 'pdh_spots_remaining',
    lastVisit: 'pdh_last_visit'
  },

  // Sample names and locations for social proof
  sampleNames: [
    { name: 'Dr. Priya Sharma', location: 'Mumbai' },
    { name: 'Dr. Ahmed Hassan', location: 'Dubai' },
    { name: 'Dr. Sarah Chen', location: 'Singapore' },
    { name: 'Dr. Mohammed Ali', location: 'Lahore' },
    { name: 'Dr. Aisha Rahman', location: 'Dhaka' },
    { name: 'Dr. Raj Patel', location: 'Delhi' },
    { name: 'Dr. Maria Santos', location: 'Manila' },
    { name: 'Dr. Wei Zhang', location: 'Sydney' },
    { name: 'Dr. Fatima Khan', location: 'Karachi' },
    { name: 'Dr. Amit Kumar', location: 'Bangalore' }
  ],

  // Initialize all urgency features
  init: function() {
    this.initCountdown();
    this.initSpotsRemaining();
    this.initSocialProof();
    this.initVisitorCount();
    this.initStickyMobileCTA();
    console.log('[UrgencyManager] Initialized');
  },

  // Countdown Timer
  initCountdown: function() {
    const countdownElements = document.querySelectorAll('.countdown-timer');
    if (countdownElements.length === 0) return;

    // Get or set countdown end time
    let countdownEnd = localStorage.getItem(this.storageKeys.countdownEnd);

    if (!countdownEnd) {
      // Set new countdown (2 hours from now)
      countdownEnd = Date.now() + this.config.countdownDuration;
      localStorage.setItem(this.storageKeys.countdownEnd, countdownEnd);
    } else {
      countdownEnd = parseInt(countdownEnd);

      // If countdown expired, reset it
      if (countdownEnd < Date.now()) {
        countdownEnd = Date.now() + this.config.countdownDuration;
        localStorage.setItem(this.storageKeys.countdownEnd, countdownEnd);
      }
    }

    // Update countdown every second
    this.updateCountdown(countdownEnd);
    setInterval(() => this.updateCountdown(countdownEnd), 1000);
  },

  updateCountdown: function(endTime) {
    const now = Date.now();
    const remaining = Math.max(0, endTime - now);

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    const countdownElements = document.querySelectorAll('.countdown-timer');

    countdownElements.forEach(element => {
      element.innerHTML = `
        <span class="countdown-unit">
          <span class="countdown-number">${String(hours).padStart(2, '0')}</span>
          <span class="countdown-label">hrs</span>
        </span>
        <span class="countdown-separator">:</span>
        <span class="countdown-unit">
          <span class="countdown-number">${String(minutes).padStart(2, '0')}</span>
          <span class="countdown-label">min</span>
        </span>
        <span class="countdown-separator">:</span>
        <span class="countdown-unit">
          <span class="countdown-number">${String(seconds).padStart(2, '0')}</span>
          <span class="countdown-label">sec</span>
        </span>
      `;
    });

    // If countdown expired, reset
    if (remaining === 0) {
      const newEndTime = Date.now() + this.config.countdownDuration;
      localStorage.setItem(this.storageKeys.countdownEnd, newEndTime);
    }
  },

  // Spots Remaining Counter
  initSpotsRemaining: function() {
    const spotsElements = document.querySelectorAll('[data-spots-remaining]');
    if (spotsElements.length === 0) return;

    // Get or set spots remaining
    let spotsRemaining = localStorage.getItem(this.storageKeys.spotsRemaining);

    if (!spotsRemaining) {
      // Random number between min and max
      spotsRemaining = Math.floor(
        Math.random() * (this.config.maxSpots - this.config.minSpots + 1) + this.config.minSpots
      );
      localStorage.setItem(this.storageKeys.spotsRemaining, spotsRemaining);
    } else {
      spotsRemaining = parseInt(spotsRemaining);
    }

    // Update spots display
    spotsElements.forEach(element => {
      element.textContent = spotsRemaining;
    });

    // Update progress bar if exists
    const progressBar = document.querySelector('.spots-progress-fill');
    if (progressBar) {
      const percentage = (spotsRemaining / this.config.maxSpots) * 100;
      progressBar.style.width = `${percentage}%`;
    }

    // Decrease spots occasionally (simulate scarcity)
    this.decreaseSpotsOccasionally();
  },

  decreaseSpotsOccasionally: function() {
    // Random chance to decrease spots (every 2-5 minutes)
    const interval = (Math.random() * 3 + 2) * 60 * 1000; // 2-5 minutes

    setTimeout(() => {
      let spots = parseInt(localStorage.getItem(this.storageKeys.spotsRemaining));

      if (spots > this.config.minSpots) {
        spots -= Math.floor(Math.random() * 3) + 1; // Decrease by 1-3
        localStorage.setItem(this.storageKeys.spotsRemaining, spots);

        // Update display
        const spotsElements = document.querySelectorAll('[data-spots-remaining]');
        spotsElements.forEach(element => {
          element.textContent = spots;

          // Add attention animation
          element.parentElement.classList.add('attention-shake');
          setTimeout(() => {
            element.parentElement.classList.remove('attention-shake');
          }, 500);
        });

        // Update progress bar
        const progressBar = document.querySelector('.spots-progress-fill');
        if (progressBar) {
          const percentage = (spots / this.config.maxSpots) * 100;
          progressBar.style.width = `${percentage}%`;
        }
      }

      // Schedule next decrease
      this.decreaseSpotsOccasionally();
    }, interval);
  },

  // Social Proof Notifications
  initSocialProof: function() {
    const stackElement = document.querySelector('.social-proof-stack');
    if (!stackElement) return;

    // Show first notification after 3 seconds
    setTimeout(() => {
      this.showSocialProofNotification();

      // Then show every X seconds
      setInterval(() => {
        this.showSocialProofNotification();
      }, this.config.socialProofInterval);
    }, 3000);
  },

  showSocialProofNotification: function() {
    const stackElement = document.querySelector('.social-proof-stack');
    if (!stackElement) return;

    // Get random name and location
    const randomPerson = this.sampleNames[Math.floor(Math.random() * this.sampleNames.length)];

    // Random time ago (1-30 minutes)
    const minutesAgo = Math.floor(Math.random() * 30) + 1;
    const timeAgo = minutesAgo === 1 ? '1 minute ago' : `${minutesAgo} minutes ago`;

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'social-proof-notification';
    notification.innerHTML = `
      <div class="icon">
        <i class="bi bi-check-circle-fill"></i>
      </div>
      <div class="content">
        <div class="name">${randomPerson.name}</div>
        <div class="action">from ${randomPerson.location} just downloaded</div>
        <div class="time" style="font-size: 0.75rem; opacity: 0.7; margin-top: 2px;">${timeAgo}</div>
      </div>
    `;

    // Add to stack
    stackElement.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutToLeft 0.5s ease-in';
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 5000);

    // Track event
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'social_proof_shown',
        person_location: randomPerson.location
      });
    }
  },

  // Live Visitor Count
  initVisitorCount: function() {
    const visitorElements = document.querySelectorAll('[data-visitor-count]');
    if (visitorElements.length === 0) return;

    // Random initial count
    let visitorCount = Math.floor(
      Math.random() * (this.config.visitorCountMax - this.config.visitorCountMin + 1) +
      this.config.visitorCountMin
    );

    // Update display
    this.updateVisitorCount(visitorCount);

    // Fluctuate count every 10-20 seconds
    setInterval(() => {
      const change = Math.random() > 0.5 ? 1 : -1;
      visitorCount = Math.max(
        this.config.visitorCountMin,
        Math.min(this.config.visitorCountMax, visitorCount + change)
      );
      this.updateVisitorCount(visitorCount);
    }, (Math.random() * 10 + 10) * 1000);
  },

  updateVisitorCount: function(count) {
    const visitorElements = document.querySelectorAll('[data-visitor-count]');
    visitorElements.forEach(element => {
      element.textContent = count;
    });
  },

  // Sticky Mobile CTA
  initStickyMobileCTA: function() {
    const stickyCTA = document.querySelector('.sticky-mobile-cta');
    if (!stickyCTA) return;

    // Show/hide based on scroll position
    let lastScroll = 0;
    const form = document.querySelector('.lead-capture-form');

    if (!form) return;

    window.addEventListener('scroll', () => {
      const formRect = form.getBoundingClientRect();
      const currentScroll = window.pageYOffset;

      // Hide sticky CTA when form is visible
      if (formRect.top < window.innerHeight && formRect.bottom > 0) {
        stickyCTA.style.transform = 'translateY(100%)';
      } else {
        stickyCTA.style.transform = 'translateY(0)';
      }

      lastScroll = currentScroll;
    });

    // Handle sticky CTA click
    const stickyButton = stickyCTA.querySelector('.btn');
    if (stickyButton) {
      stickyButton.addEventListener('click', (e) => {
        e.preventDefault();

        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Focus first input
        setTimeout(() => {
          const firstInput = form.querySelector('input, select');
          if (firstInput) {
            firstInput.focus();
          }
        }, 500);

        // Track click
        if (window.TrackingManager) {
          window.TrackingManager.trackEvent && window.TrackingManager.trackEvent('sticky_cta_click');
        }
      });
    }
  },

  // Exit Intent (Mobile - scroll up detection)
  initExitIntent: function() {
    let hasShownExitIntent = sessionStorage.getItem('exit_intent_shown');
    if (hasShownExitIntent) return;

    let lastScrollY = window.scrollY;
    let exitIntentTriggered = false;

    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;

      // Detect rapid scroll up (exit intent on mobile)
      if (currentScrollY < lastScrollY - 100 && currentScrollY < 300 && !exitIntentTriggered) {
        exitIntentTriggered = true;
        this.showExitIntent();
      }

      lastScrollY = currentScrollY;
    });
  },

  showExitIntent: function() {
    sessionStorage.setItem('exit_intent_shown', 'true');

    // Create exit intent popup (simple alert for mobile)
    const confirmed = confirm(
      '⚠️ Wait! Are you sure you want to leave?\n\nGet your FREE guide now before this offer expires!'
    );

    if (confirmed) {
      // Scroll to form
      const form = document.querySelector('.lead-capture-form');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    // Track event
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'exit_intent_shown',
        user_stayed: confirmed
      });
    }
  },

  // Add urgency animations to specific elements
  addAttentionAnimation: function(selector, type = 'pulse') {
    const elements = document.querySelectorAll(selector);

    elements.forEach(element => {
      if (type === 'pulse') {
        element.classList.add('attention-pulse');
      } else if (type === 'shake') {
        element.classList.add('attention-shake');
        setTimeout(() => {
          element.classList.remove('attention-shake');
        }, 500);
      }
    });
  }
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    UrgencyManager.init();
  });
} else {
  UrgencyManager.init();
}

// Export for use in other scripts
window.UrgencyManager = UrgencyManager;

// Add CSS animation keyframes for exit animations (injected via JS)
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOutToLeft {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(-100%);
    }
  }
`;
document.head.appendChild(style);
