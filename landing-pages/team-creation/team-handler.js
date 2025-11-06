/**
 * Team Creation Campaign Handler
 * Handles team member management, pricing calculation, and payment processing
 */

const TeamHandler = {
    currentMemberCount: 1,
    maxMembers: 5,
    minMembers: 2,

    init: function() {
        this.attachEventListeners();
        this.updatePricingSummary();
        console.log('TeamHandler initialized');
    },

    attachEventListeners: function() {
        // Form submission
        const form = document.getElementById('team-creation-form');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }

        // Add member button
        const addBtn = document.getElementById('add-member-btn');
        if (addBtn) {
            addBtn.addEventListener('click', this.addTeamMember.bind(this));
        }

        // Initial member count
        this.updateAddButtonState();
    },

    addTeamMember: function() {
        if (this.currentMemberCount >= this.maxMembers) {
            alert(`Maximum ${this.maxMembers} team members allowed`);
            return;
        }

        this.currentMemberCount++;
        const memberNumber = this.currentMemberCount;

        const memberCard = this.createMemberCard(memberNumber);
        document.getElementById('team-members-container').insertAdjacentHTML('beforeend', memberCard);

        // Attach remove button listener
        const removeBtn = document.querySelector(`[data-member="${memberNumber}"] .remove-member-btn`);
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.removeMember(memberNumber));
        }

        this.updatePricingSummary();
        this.updateAddButtonState();
    },

    createMemberCard: function(memberNumber) {
        return `
            <div class="team-member-card mb-3" data-member="${memberNumber}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong>Member ${memberNumber}</strong>
                    <button type="button" class="btn btn-sm btn-outline-danger remove-member-btn">
                        <i class="bi bi-x-circle"></i> Remove
                    </button>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-2">
                        <input type="text" class="form-control member-name" placeholder="Full Name *" required>
                    </div>
                    <div class="col-md-6 mb-2">
                        <input type="email" class="form-control member-email" placeholder="Email *" required>
                    </div>
                </div>
            </div>
        `;
    },

    removeMember: function(memberNumber) {
        const memberCard = document.querySelector(`[data-member="${memberNumber}"]`);
        if (memberCard) {
            memberCard.remove();
            this.currentMemberCount--;
            this.renumberMembers();
            this.updatePricingSummary();
            this.updateAddButtonState();
        }
    },

    renumberMembers: function() {
        const memberCards = document.querySelectorAll('.team-member-card');
        memberCards.forEach((card, index) => {
            const memberNumber = index + 1;
            card.setAttribute('data-member', memberNumber);
            card.querySelector('strong').textContent = `Member ${memberNumber}`;
        });
        this.currentMemberCount = memberCards.length;
    },

    updateAddButtonState: function() {
        const addBtn = document.getElementById('add-member-btn');
        if (addBtn) {
            if (this.currentMemberCount >= this.maxMembers) {
                addBtn.disabled = true;
                addBtn.innerHTML = '<i class="bi bi-info-circle"></i> Maximum team size reached';
            } else {
                addBtn.disabled = false;
                addBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Add Team Member';
            }
        }
    },

    updatePricingSummary: function() {
        const totalMembers = this.currentMemberCount + 1; // +1 for leader
        const pricing = PriceCalculator.calculateTeamPrice(totalMembers);

        if (pricing.error) {
            console.error(pricing.error);
            return;
        }

        // Update display
        document.getElementById('total-members').textContent = totalMembers;
        document.getElementById('price-per-member').textContent = pricing.formattedPerMember;
    },

    collectFormData: function() {
        const form = document.getElementById('team-creation-form');

        // Leader information
        const leaderData = {
            firstName: form.querySelector('#firstName').value.trim(),
            lastName: form.querySelector('#lastName').value.trim(),
            email: form.querySelector('#email').value.trim(),
            country: form.querySelector('#country').value
        };

        // Team members
        const members = [];
        const memberCards = document.querySelectorAll('.team-member-card');

        memberCards.forEach((card, index) => {
            const name = card.querySelector('.member-name').value.trim();
            const email = card.querySelector('.member-email').value.trim();

            if (name && email) {
                members.push({
                    name: name,
                    email: email,
                    status: 'pending'
                });
            }
        });

        // Calculate pricing
        const totalMembers = members.length + 1; // +1 for leader
        const pricing = PriceCalculator.calculateTeamPrice(totalMembers);

        return {
            campaignId: 'team-creation',
            leader: leaderData,
            members: members,
            totalMembers: totalMembers,
            pricing: pricing,
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

        // Check minimum team size
        const totalMembers = this.currentMemberCount + 1;
        if (totalMembers < this.minMembers) {
            alert(`Minimum team size is ${this.minMembers} members (including leader)`);
            return false;
        }

        // Validate all member emails are unique
        const emails = [form.querySelector('#email').value.trim()];
        const memberCards = document.querySelectorAll('.team-member-card');

        memberCards.forEach(card => {
            const email = card.querySelector('.member-email').value.trim();
            if (email) {
                if (emails.includes(email)) {
                    alert('All team member emails must be unique!');
                    throw new Error('Duplicate email found');
                }
                emails.push(email);
            }
        });

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
                    totalMembers: teamData.totalMembers,
                    amount: teamData.pricing.totalPrice
                });
            }

            // Process payment with Stripe
            await StripeHandler.processPayment(teamData.leader, {
                campaignId: 'team-creation',
                amount: teamData.pricing.totalPrice,
                currency: 'AUD',
                metadata: {
                    teamId: 'will_be_generated_by_backend',
                    totalMembers: teamData.totalMembers,
                    pricePerMember: teamData.pricing.pricePerMember,
                    members: JSON.stringify(teamData.members)
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
