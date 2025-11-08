const MockExamHandler = {
    upcomingExams: [],
    selectedExam: null,

    init: async function() {
        await this.loadUpcomingExams();
        this.detectTimezone();
        this.attachEventListeners();
    },

    detectTimezone: function() {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const select = document.getElementById('timezone');
        select.innerHTML = `<option value="${timezone}" selected>${timezone}</option>`;
    },

    loadUpcomingExams: async function() {
        // In production, this would fetch from API
        // For now, using mock data
        this.upcomingExams = [
            {
                id: 'mock_2025_01_15',
                name: 'Universal Mock Exam - January 2025',
                date: '2025-01-15T10:00:00Z',
                type: 'full',
                registrationDeadline: '2025-01-14T23:59:59Z'
            },
            {
                id: 'mock_2025_02_15',
                name: 'Universal Mock Exam - February 2025',
                date: '2025-02-15T10:00:00Z',
                type: 'full',
                registrationDeadline: '2025-02-14T23:59:59Z'
            }
        ];

        this.populateExamDropdown();
        this.updateNextExamDate();
    },

    populateExamDropdown: function() {
        const select = document.getElementById('mockExamId');
        select.innerHTML = '<option value="">Select exam date...</option>';

        this.upcomingExams.forEach(exam => {
            const examDate = new Date(exam.date);
            const formattedDate = examDate.toLocaleDateString('en-AU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const option = document.createElement('option');
            option.value = exam.id;
            option.textContent = `${exam.name} - ${formattedDate}`;
            select.appendChild(option);
        });
    },

    updateNextExamDate: function() {
        if (this.upcomingExams.length > 0) {
            const nextExam = this.upcomingExams[0];
            const examDate = new Date(nextExam.date);
            const formatted = examDate.toLocaleDateString('en-AU', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            document.getElementById('next-exam-date').textContent = formatted;
        }
    },

    attachEventListeners: function() {
        document.getElementById('mock-exam-form').addEventListener('submit', this.handleSubmit.bind(this));

        document.getElementById('mockExamId').addEventListener('change', (e) => {
            this.selectedExam = this.upcomingExams.find(exam => exam.id === e.target.value);
        });
    },

    handleSubmit: async function(e) {
        e.preventDefault();

        const form = e.target;
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const registrationType = form.querySelector('input[name="registrationType"]:checked').value;
        const isPremium = registrationType === 'premium';

        const formData = {
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            email: form.email.value,
            country: form.country.value,
            timezone: form.timezone.value,
            mockExamId: form.mockExamId.value,
            examType: form.examType.value,
            registrationType: registrationType
        };

        if (!isPremium) {
            // Free registration - submit directly without payment
            await this.submitFreeRegistration(formData);
        } else {
            // Premium registration - process payment
            await StripeHandler.processPayment(formData, {
                campaignId: 'mock-exam-registration',
                amount: PriceCalculator.pricing.mockExam.premium,
                currency: 'AUD',
                metadata: formData,
                successUrl: window.location.origin + '/mock-exam-registration/thank-you.html?session_id={CHECKOUT_SESSION_ID}',
                cancelUrl: window.location.href
            });
        }
    },

    submitFreeRegistration: async function(formData) {
        try {
            StripeHandler.showLoading(true);

            const response = await fetch(`${StripeHandler.config.apiBaseUrl}/mock-exams/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            // Redirect to thank you page
            window.location.href = 'thank-you.html?type=free';

        } catch (error) {
            console.error('Error submitting free registration:', error);
            StripeHandler.showError('Failed to complete registration. Please try again.');
            StripeHandler.showLoading(false);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => MockExamHandler.init());
