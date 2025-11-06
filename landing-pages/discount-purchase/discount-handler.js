const DiscountHandler = {
    currentPlanPrice: 0,
    appliedCoupon: null,

    init: function() {
        document.getElementById('planType').addEventListener('change', this.handlePlanChange.bind(this));
        document.getElementById('apply-coupon-btn').addEventListener('click', this.applyCoupon.bind(this));
        document.getElementById('discount-purchase-form').addEventListener('submit', this.handleSubmit.bind(this));
    },

    handlePlanChange: function(e) {
        const planType = e.target.value;
        const plan = PriceCalculator.getPlanPricing(planType);

        if (plan) {
            this.currentPlanPrice = plan.price;
            this.updatePricingSummary();
        }
    },

    applyCoupon: async function() {
        const couponCode = document.getElementById('couponCode').value.trim().toUpperCase();
        const planType = document.getElementById('planType').value;

        if (!couponCode) {
            this.showCouponFeedback('Please enter a coupon code', 'danger');
            return;
        }

        if (!planType) {
            this.showCouponFeedback('Please select a plan first', 'danger');
            return;
        }

        // Show loading
        document.getElementById('apply-coupon-btn').disabled = true;
        document.getElementById('apply-coupon-btn').innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            const result = await StripeHandler.validateCoupon(couponCode, this.currentPlanPrice, planType);

            if (result.valid) {
                this.appliedCoupon = result;
                this.showCouponFeedback(`Coupon applied! You save ${result.discountAmount}`, 'success');
                this.updatePricingSummary();
            } else {
                this.showCouponFeedback(result.error || 'Invalid coupon code', 'danger');
                this.appliedCoupon = null;
            }
        } catch (error) {
            this.showCouponFeedback('Failed to validate coupon', 'danger');
        } finally {
            document.getElementById('apply-coupon-btn').disabled = false;
            document.getElementById('apply-coupon-btn').innerHTML = '<i class="bi bi-check2"></i> Apply';
        }
    },

    updatePricingSummary: function() {
        if (!this.currentPlanPrice) return;

        const summary = document.getElementById('pricing-summary');
        summary.classList.remove('d-none');

        document.getElementById('original-price').textContent = PriceCalculator.formatCurrency(this.currentPlanPrice);

        if (this.appliedCoupon) {
            document.getElementById('discount-percent').textContent = this.appliedCoupon.discountType === 'percentage'
                ? this.appliedCoupon.discountValue
                : Math.round((this.appliedCoupon.discountAmount / this.currentPlanPrice) * 100);
            document.getElementById('discount-amount').textContent = PriceCalculator.formatCurrency(this.appliedCoupon.discountAmount);
            document.getElementById('final-price').textContent = PriceCalculator.formatCurrency(this.appliedCoupon.finalPrice);
        } else {
            document.getElementById('discount-percent').textContent = '0';
            document.getElementById('discount-amount').textContent = '$0.00 AUD';
            document.getElementById('final-price').textContent = PriceCalculator.formatCurrency(this.currentPlanPrice);
        }
    },

    showCouponFeedback: function(message, type) {
        const feedback = document.getElementById('coupon-feedback');
        feedback.textContent = message;
        feedback.className = `form-text text-${type}`;
    },

    handleSubmit: async function(e) {
        e.preventDefault();

        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        if (!this.currentPlanPrice) {
            alert('Please select a plan');
            return;
        }

        const formData = {
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            email: form.email.value,
            country: form.country.value
        };

        const finalPrice = this.appliedCoupon ? this.appliedCoupon.finalPrice : this.currentPlanPrice;

        await StripeHandler.processPayment(formData, {
            campaignId: 'discount-purchase',
            amount: finalPrice,
            currency: 'AUD',
            metadata: {
                planType: form.planType.value,
                originalPrice: this.currentPlanPrice,
                couponCode: this.appliedCoupon ? document.getElementById('couponCode').value : null,
                discountAmount: this.appliedCoupon ? this.appliedCoupon.discountAmount : 0
            },
            successUrl: window.location.origin + '/discount-purchase/thank-you.html?session_id={CHECKOUT_SESSION_ID}',
            cancelUrl: window.location.href
        });
    }
};

document.addEventListener('DOMContentLoaded', () => DiscountHandler.init());
