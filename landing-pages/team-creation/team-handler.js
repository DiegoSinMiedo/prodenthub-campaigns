/**
 * Team Creation Campaign Handler (2-Person Teams)
 * Handles 2-person team creation with payment splitting
 */

const TeamHandler = {
    init: function() {
        this.attachEventListeners();
        console.log('TeamHandler initialized (2-person teams)');
    },

    attachEventListeners: function() {
        const form = document.getElementById('team-creation-form');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }
    },

    collectFormData: function() {
        const form = document.getElementById('team-creation-form');

        // Person 1 (You)
        const person1 = {
            firstName: form.querySelector('#firstName').value.trim(),
            lastName: form.querySelector('#lastName').value.trim(),
            email: form.querySelector('#email').value.trim(),
            country: form.querySelector('#country').value
        };

        // Person 2 (Study Partner)
        const person2 = {
            name: form.querySelector('#partnerName').value.trim(),
            email: form.querySelector('#partnerEmail').value.trim()
        };

        // Calculate pricing for 2 people
        const totalPrice = 299.00;
        const pricePerPerson = totalPrice / 2; // $149.50

        return {
            campaignId: 'team-creation',
            person1: person1,
            person2: person2,
            totalMembers: 2,
            totalPrice: totalPrice,
            pricePerPerson: pricePerPerson,
            planType: 'full-6months',
            consent: form.querySelector('#consent').checked
        };
    },

    validateForm: function() {
        const form = document.getElementById('team-creation-form');

        // Bootstrap validation
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return false;
        }

        // Validate that both emails are different
        const email1 = form.querySelector('#email').value.trim().toLowerCase();
        const email2 = form.querySelector('#partnerEmail').value.trim().toLowerCase();

        if (email1 === email2) {
            alert('Both people must have different email addresses!');
            return false;
        }

        return true;
    },

    handleSubmit: async function(e) {
        e.preventDefault();

        try {
            // Validate form
            if (!this.validateForm()) {
                return;
            }

            // Collect form data
            const teamData = this.collectFormData();

            console.log('Team data:', teamData);

            // Track form submission
            if (typeof TrackingManager !== 'undefined') {
                TrackingManager.trackEvent('form_submit', {
                    campaign: 'team-creation',
                    totalMembers: 2,
                    amount: teamData.totalPrice
                });
            }

            // Process payment with Stripe
            await StripeHandler.processPayment(teamData.person1, {
                campaignId: 'team-creation',
                amount: teamData.totalPrice,
                currency: 'AUD',
                metadata: {
                    person1FirstName: teamData.person1.firstName,
                    person1LastName: teamData.person1.lastName,
                    person1Email: teamData.person1.email,
                    person2Name: teamData.person2.name,
                    person2Email: teamData.person2.email,
                    totalMembers: 2,
                    pricePerPerson: teamData.pricePerPerson
                },
                successUrl: window.location.origin + '/team-creation/thank-you.html?session_id={CHECKOUT_SESSION_ID}',
                cancelUrl: window.location.href
            });

        } catch (error) {
            console.error('Error submitting form:', error);
            StripeHandler.showError('Failed to process team creation. Please try again.');
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    TeamHandler.init();
});
