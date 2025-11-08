const PersonalizedPlanHandler = {
    recommendedCluster: null,

    init: function() {
        // Update range displays in real-time
        ['clinical', 'theory', 'time'].forEach(type => {
            const slider = document.getElementById(`${type}Score`);
            const display = document.getElementById(`${type}-value`);
            slider.addEventListener('input', () => display.textContent = slider.value);
        });

        document.getElementById('calculate-cluster-btn').addEventListener('click', this.calculateCluster.bind(this));
        document.getElementById('personalized-plan-form').addEventListener('submit', this.handleSubmit.bind(this));
    },

    calculateCluster: function() {
        const clinicalScore = parseInt(document.getElementById('clinicalScore').value);
        const theoryScore = parseInt(document.getElementById('theoryScore').value);
        const timeScore = parseInt(document.getElementById('timeScore').value);
        const examScore = parseInt(document.getElementById('examScore').value) || 65;

        const cluster = PriceCalculator.determineCluster(clinicalScore, theoryScore, timeScore, examScore);

        if (cluster.error) {
            alert(cluster.error);
            return;
        }

        this.recommendedCluster = cluster;

        // Display recommendation
        document.getElementById('cluster-name').textContent = `Cluster ${cluster.cluster}: ${cluster.name}`;
        document.getElementById('cluster-reason').textContent = cluster.reason;
        document.getElementById('cluster-duration').textContent = cluster.duration;
        document.getElementById('cluster-price').textContent = PriceCalculator.formatCurrency(cluster.price);

        document.getElementById('cluster-recommendation').classList.remove('d-none');
        document.getElementById('submit-btn').disabled = false;
    },

    handleSubmit: async function(e) {
        e.preventDefault();

        if (!this.recommendedCluster) {
            alert('Please get your cluster recommendation first');
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
            country: form.country.value,
            examDate: form.examDate.value,
            examScore: parseInt(form.examScore.value),
            clinicalScore: parseInt(form.clinicalScore.value),
            theoryScore: parseInt(form.theoryScore.value),
            timeScore: parseInt(form.timeScore.value)
        };

        await StripeHandler.processPayment(formData, {
            campaignId: 'personalized-plan',
            amount: this.recommendedCluster.price,
            currency: 'AUD',
            metadata: {
                ...formData,
                cluster: this.recommendedCluster.cluster,
                clusterName: this.recommendedCluster.name,
                duration: this.recommendedCluster.duration
            },
            successUrl: window.location.origin + '/personalized-plan/thank-you.html?session_id={CHECKOUT_SESSION_ID}',
            cancelUrl: window.location.href
        });
    }
};

document.addEventListener('DOMContentLoaded', () => PersonalizedPlanHandler.init());
