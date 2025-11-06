const ScholarshipHandler = {
    calculatedScholarship: null,

    init: function() {
        document.getElementById('calculate-btn').addEventListener('click', this.calculateScholarship.bind(this));
        document.getElementById('scholarship-form').addEventListener('submit', this.handleSubmit.bind(this));

        // Enable calculate button when required fields are filled
        ['examAttempts', 'lastScore', 'financialNeed'].forEach(id => {
            document.getElementById(id).addEventListener('change', this.checkCalculateReady.bind(this));
        });
    },

    checkCalculateReady: function() {
        const attempts = document.getElementById('examAttempts').value;
        const score = document.getElementById('lastScore').value;
        const need = document.getElementById('financialNeed').value;

        if (attempts && score && need) {
            document.getElementById('calculate-btn').disabled = false;
        }
    },

    calculateScholarship: function() {
        const attempts = parseInt(document.getElementById('examAttempts').value);
        const score = parseInt(document.getElementById('lastScore').value);
        const need = document.getElementById('financialNeed').value;

        if (!attempts || !score || !need) {
            alert('Please fill in all exam history fields');
            return;
        }

        const result = PriceCalculator.calculateScholarship(attempts, score, need);

        if (result.error) {
            alert(result.error);
            return;
        }

        this.calculatedScholarship = result;

        // Display result
        document.getElementById('base-price').textContent = result.formattedBase;
        document.getElementById('scholarship-percent').textContent = result.scholarshipPercent;
        document.getElementById('scholarship-amount').textContent = result.formattedScholarship;
        document.getElementById('final-price').textContent = result.formattedFinal;

        document.getElementById('scholarship-result').classList.remove('d-none');
        document.getElementById('submit-btn').disabled = false;
    },

    handleSubmit: async function(e) {
        e.preventDefault();

        if (!this.calculatedScholarship) {
            alert('Please calculate your scholarship first');
            return;
        }

        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const formData = {
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            email: form.email.value,
            phone: form.phone.value,
            country: form.country.value,
            examAttempts: parseInt(form.examAttempts.value),
            lastScore: parseInt(form.lastScore.value),
            lastExamDate: form.lastExamDate.value,
            financialNeed: form.financialNeed.value,
            scholarshipReason: form.scholarshipReason.value
        };

        await StripeHandler.processPayment(formData, {
            campaignId: 'scholarship-application',
            amount: this.calculatedScholarship.finalPrice,
            currency: 'AUD',
            metadata: {
                ...formData,
                scholarshipPercent: this.calculatedScholarship.scholarshipPercent,
                scholarshipAmount: this.calculatedScholarship.scholarshipAmount
            },
            successUrl: window.location.origin + '/scholarship-application/thank-you.html?session_id={CHECKOUT_SESSION_ID}',
            cancelUrl: window.location.href
        });
    }
};

document.addEventListener('DOMContentLoaded', () => ScholarshipHandler.init());
