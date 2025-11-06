/**
 * Stripe Payment Handler
 * Reusable module for handling Stripe Checkout across all campaigns
 *
 * @version 1.0.0
 * @requires Stripe.js v3 (loaded via script tag)
 */

const StripeHandler = {
    // Configuration
    config: {
        apiBaseUrl: 'https://4bgjnc31f8.execute-api.ap-southeast-2.amazonaws.com',
        stripePublicKey: null, // Will be set dynamically or from environment
        stripe: null
    },

    /**
     * Initialize Stripe with public key
     * @param {string} publicKey - Stripe publishable key
     */
    init: function(publicKey) {
        if (!publicKey) {
            console.error('Stripe public key is required');
            return false;
        }

        if (typeof Stripe === 'undefined') {
            console.error('Stripe.js not loaded. Include: <script src="https://js.stripe.com/v3/"></script>');
            return false;
        }

        this.config.stripePublicKey = publicKey;
        this.config.stripe = Stripe(publicKey);
        console.log('Stripe initialized successfully');
        return true;
    },

    /**
     * Create Stripe Checkout Session
     * @param {Object} checkoutData - Data for creating checkout session
     * @param {string} checkoutData.campaignId - Campaign identifier
     * @param {string} checkoutData.email - Customer email
     * @param {number} checkoutData.amount - Amount in dollars
     * @param {string} checkoutData.currency - Currency code (default: AUD)
     * @param {Object} checkoutData.metadata - Additional metadata
     * @param {string} checkoutData.successUrl - Success redirect URL
     * @param {string} checkoutData.cancelUrl - Cancel redirect URL
     * @returns {Promise<Object>} Checkout session object
     */
    createCheckoutSession: async function(checkoutData) {
        try {
            const endpoint = `${this.config.apiBaseUrl}/checkout/create`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    campaignId: checkoutData.campaignId,
                    email: checkoutData.email,
                    amount: checkoutData.amount,
                    currency: checkoutData.currency || 'AUD',
                    metadata: checkoutData.metadata || {},
                    successUrl: checkoutData.successUrl || window.location.origin + '/thank-you.html',
                    cancelUrl: checkoutData.cancelUrl || window.location.href
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create checkout session');
            }

            const data = await response.json();
            return {
                success: true,
                sessionId: data.sessionId,
                checkoutUrl: data.checkoutUrl
            };

        } catch (error) {
            console.error('Error creating checkout session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Redirect to Stripe Checkout
     * @param {string} sessionId - Stripe Checkout Session ID
     * @returns {Promise<void>}
     */
    redirectToCheckout: async function(sessionId) {
        if (!this.config.stripe) {
            console.error('Stripe not initialized. Call StripeHandler.init() first');
            return;
        }

        try {
            const result = await this.config.stripe.redirectToCheckout({
                sessionId: sessionId
            });

            if (result.error) {
                console.error('Stripe redirect error:', result.error);
                this.showError(result.error.message);
            }
        } catch (error) {
            console.error('Error redirecting to checkout:', error);
            this.showError('Failed to redirect to payment page. Please try again.');
        }
    },

    /**
     * Verify Checkout Session Status
     * @param {string} sessionId - Stripe Checkout Session ID
     * @returns {Promise<Object>} Session status
     */
    verifyCheckoutSession: async function(sessionId) {
        try {
            const endpoint = `${this.config.apiBaseUrl}/checkout/verify`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId })
            });

            if (!response.ok) {
                throw new Error('Failed to verify checkout session');
            }

            const data = await response.json();
            return {
                success: true,
                status: data.status,
                paymentStatus: data.paymentStatus,
                metadata: data.metadata
            };

        } catch (error) {
            console.error('Error verifying checkout session:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Process Payment for Campaign
     * @param {Object} formData - Form data from campaign
     * @param {Object} paymentOptions - Payment options
     * @returns {Promise<void>}
     */
    processPayment: async function(formData, paymentOptions) {
        try {
            // Show loading state
            this.showLoading(true);

            // Create checkout session
            const session = await this.createCheckoutSession({
                campaignId: paymentOptions.campaignId,
                email: formData.email,
                amount: paymentOptions.amount,
                currency: paymentOptions.currency || 'AUD',
                metadata: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    country: formData.country,
                    ...paymentOptions.metadata
                },
                successUrl: paymentOptions.successUrl,
                cancelUrl: paymentOptions.cancelUrl
            });

            if (!session.success) {
                throw new Error(session.error);
            }

            // Track checkout initiation
            if (typeof TrackingManager !== 'undefined') {
                TrackingManager.trackEvent('checkout_initiated', {
                    campaign: paymentOptions.campaignId,
                    amount: paymentOptions.amount,
                    currency: paymentOptions.currency || 'AUD'
                });
            }

            // Redirect to Stripe Checkout
            await this.redirectToCheckout(session.sessionId);

        } catch (error) {
            console.error('Error processing payment:', error);
            this.showError(error.message);
            this.showLoading(false);
        }
    },

    /**
     * Handle Checkout Success (on thank-you page)
     * @param {string} sessionId - Session ID from URL parameter
     * @returns {Promise<Object>} Session details
     */
    handleCheckoutSuccess: async function(sessionId) {
        try {
            const verification = await this.verifyCheckoutSession(sessionId);

            if (!verification.success) {
                throw new Error('Failed to verify payment');
            }

            // Track successful payment
            if (typeof TrackingManager !== 'undefined') {
                TrackingManager.trackEvent('purchase_complete', {
                    sessionId: sessionId,
                    status: verification.status
                });
            }

            return verification;

        } catch (error) {
            console.error('Error handling checkout success:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Validate Coupon Code
     * @param {string} couponCode - Coupon code to validate
     * @param {number} originalAmount - Original purchase amount
     * @param {string} planType - Plan type (e.g., 'basic', 'standard', 'full')
     * @returns {Promise<Object>} Validation result with discount details
     */
    validateCoupon: async function(couponCode, originalAmount, planType) {
        try {
            const endpoint = `${this.config.apiBaseUrl}/coupons/validate`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    couponCode: couponCode.toUpperCase(),
                    originalAmount: originalAmount,
                    planType: planType
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Invalid coupon code');
            }

            const data = await response.json();
            return {
                success: true,
                valid: data.valid,
                discountType: data.discountType,
                discountValue: data.discountValue,
                discountAmount: data.discountAmount,
                finalPrice: data.finalPrice,
                message: data.message
            };

        } catch (error) {
            console.error('Error validating coupon:', error);
            return {
                success: false,
                valid: false,
                error: error.message
            };
        }
    },

    /**
     * Show loading state
     * @param {boolean} show - Show or hide loading
     */
    showLoading: function(show) {
        const button = document.querySelector('button[type="submit"]');
        if (!button) return;

        if (show) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || 'Submit';
        }
    },

    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    showError: function(message) {
        // Try to find existing error container
        let errorContainer = document.getElementById('payment-error-message');

        // Create if doesn't exist
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'payment-error-message';
            errorContainer.className = 'alert alert-danger mt-3';
            errorContainer.setAttribute('role', 'alert');

            const form = document.querySelector('form');
            if (form) {
                form.insertAdjacentElement('afterend', errorContainer);
            }
        }

        errorContainer.textContent = message;
        errorContainer.style.display = 'block';

        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 10000);
    },

    /**
     * Show success message
     * @param {string} message - Success message to display
     */
    showSuccess: function(message) {
        let successContainer = document.getElementById('payment-success-message');

        if (!successContainer) {
            successContainer = document.createElement('div');
            successContainer.id = 'payment-success-message';
            successContainer.className = 'alert alert-success mt-3';
            successContainer.setAttribute('role', 'alert');

            const form = document.querySelector('form');
            if (form) {
                form.insertAdjacentElement('afterend', successContainer);
            }
        }

        successContainer.textContent = message;
        successContainer.style.display = 'block';
    },

    /**
     * Get URL parameters
     * @param {string} param - Parameter name
     * @returns {string|null} Parameter value
     */
    getUrlParameter: function(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    /**
     * Format price for display
     * @param {number} amount - Amount in dollars
     * @param {string} currency - Currency code (default: AUD)
     * @returns {string} Formatted price string
     */
    formatPrice: function(amount, currency = 'AUD') {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    }
};

// Auto-initialize on page load if Stripe key is provided via meta tag
document.addEventListener('DOMContentLoaded', function() {
    const stripeKeyMeta = document.querySelector('meta[name="stripe-public-key"]');
    if (stripeKeyMeta) {
        const publicKey = stripeKeyMeta.getAttribute('content');
        if (publicKey) {
            StripeHandler.init(publicKey);
        }
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StripeHandler;
}
