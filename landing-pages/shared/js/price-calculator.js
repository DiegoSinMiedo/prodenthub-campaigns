/**
 * Price Calculator Utility
 * Reusable module for calculating prices, discounts, scholarships across campaigns
 *
 * @version 1.0.0
 */

const PriceCalculator = {
    // Base prices configuration
    pricing: {
        plans: {
            basic: { duration: '1month', price: 49 },
            standard: { duration: '3months', price: 129 },
            full: { duration: '6months', price: 199 },
            premium: { duration: '12months', price: 299 }
        },
        team: {
            full6months: 299
        },
        scholarship: {
            base: 199, // 3-month full access
            maxScholarship: 75 // Maximum 75% scholarship
        },
        personalizedPlans: {
            cluster1: { name: 'Clinical Knowledge Gap', duration: '3months', price: 179 },
            cluster2: { name: 'Theory Fundamentals', duration: '4months', price: 199 },
            cluster3: { name: 'Time Management', duration: '2months', price: 149 },
            cluster4: { name: 'Comprehensive Review', duration: '6months', price: 249 }
        },
        mockExam: {
            free: 0,
            premium: 29
        }
    },

    /**
     * Calculate team pricing (split among members)
     * @param {number} memberCount - Number of team members (2-5)
     * @returns {Object} Team pricing breakdown
     */
    calculateTeamPrice: function(memberCount) {
        const totalPrice = this.pricing.team.full6months;

        if (memberCount < 2 || memberCount > 5) {
            return {
                error: 'Team must have 2-5 members'
            };
        }

        const pricePerMember = totalPrice / memberCount;

        return {
            totalPrice: totalPrice,
            memberCount: memberCount,
            pricePerMember: parseFloat(pricePerMember.toFixed(2)),
            savings: parseFloat(((199 - pricePerMember) * memberCount).toFixed(2)), // vs individual plan
            formattedTotal: this.formatCurrency(totalPrice),
            formattedPerMember: this.formatCurrency(pricePerMember)
        };
    },

    /**
     * Calculate scholarship amount based on exam attempts, score, and financial need
     * @param {number} attempts - Number of exam attempts (1-5+)
     * @param {number} lastScore - Last exam score (0-100)
     * @param {string} financialNeed - Financial need level ('Low', 'Medium', 'High')
     * @returns {Object} Scholarship calculation result
     */
    calculateScholarship: function(attempts, lastScore, financialNeed) {
        const basePrice = this.pricing.scholarship.base;
        let scholarshipPercent = 0;

        // Validation
        if (attempts < 1 || attempts > 10) {
            return { error: 'Invalid number of attempts' };
        }
        if (lastScore < 0 || lastScore > 100) {
            return { error: 'Score must be between 0 and 100' };
        }
        if (!['Low', 'Medium', 'High'].includes(financialNeed)) {
            return { error: 'Invalid financial need level' };
        }

        // Based on attempts (more attempts = more scholarship)
        if (attempts >= 4) {
            scholarshipPercent += 25;
        } else if (attempts >= 3) {
            scholarshipPercent += 20;
        } else if (attempts >= 2) {
            scholarshipPercent += 10;
        }

        // Based on score (lower score = more scholarship, needs more help)
        if (lastScore < 40) {
            scholarshipPercent += 30;
        } else if (lastScore < 55) {
            scholarshipPercent += 20;
        } else if (lastScore < 65) {
            scholarshipPercent += 15;
        } else if (lastScore < 75) {
            scholarshipPercent += 10;
        }

        // Based on financial need
        if (financialNeed === 'High') {
            scholarshipPercent += 25;
        } else if (financialNeed === 'Medium') {
            scholarshipPercent += 15;
        } else if (financialNeed === 'Low') {
            scholarshipPercent += 5;
        }

        // Cap at maximum scholarship percentage
        scholarshipPercent = Math.min(scholarshipPercent, this.pricing.scholarship.maxScholarship);

        const scholarshipAmount = (basePrice * scholarshipPercent) / 100;
        const finalPrice = basePrice - scholarshipAmount;

        return {
            basePrice: basePrice,
            eligibilityScore: scholarshipPercent,
            scholarshipPercent: scholarshipPercent,
            scholarshipAmount: parseFloat(scholarshipAmount.toFixed(2)),
            finalPrice: parseFloat(finalPrice.toFixed(2)),
            formattedBase: this.formatCurrency(basePrice),
            formattedScholarship: this.formatCurrency(scholarshipAmount),
            formattedFinal: this.formatCurrency(finalPrice),
            breakdown: {
                attemptsBonus: attempts >= 3 ? (attempts >= 4 ? 25 : 20) : (attempts >= 2 ? 10 : 0),
                scoreBonus: lastScore < 40 ? 30 : (lastScore < 55 ? 20 : (lastScore < 65 ? 15 : (lastScore < 75 ? 10 : 0))),
                needBonus: financialNeed === 'High' ? 25 : (financialNeed === 'Medium' ? 15 : 5)
            }
        };
    },

    /**
     * Calculate discount from coupon
     * @param {number} originalPrice - Original price
     * @param {string} discountType - 'percentage' or 'fixed_amount'
     * @param {number} discountValue - Discount value (20 for 20% or $20)
     * @param {number} maxDiscount - Maximum discount cap (for percentage)
     * @param {number} minPurchase - Minimum purchase amount required
     * @returns {Object} Discount calculation result
     */
    calculateDiscount: function(originalPrice, discountType, discountValue, maxDiscount = null, minPurchase = 0) {
        // Validate minimum purchase
        if (originalPrice < minPurchase) {
            return {
                valid: false,
                error: `Minimum purchase of ${this.formatCurrency(minPurchase)} required`
            };
        }

        let discountAmount = 0;

        if (discountType === 'percentage') {
            discountAmount = (originalPrice * discountValue) / 100;

            // Apply maximum discount cap
            if (maxDiscount && discountAmount > maxDiscount) {
                discountAmount = maxDiscount;
            }
        } else if (discountType === 'fixed_amount') {
            discountAmount = discountValue;
        } else {
            return {
                valid: false,
                error: 'Invalid discount type'
            };
        }

        // Ensure discount doesn't exceed original price
        discountAmount = Math.min(discountAmount, originalPrice);

        const finalPrice = originalPrice - discountAmount;
        const savingsPercent = ((discountAmount / originalPrice) * 100).toFixed(0);

        return {
            valid: true,
            originalPrice: originalPrice,
            discountType: discountType,
            discountValue: discountValue,
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            finalPrice: parseFloat(finalPrice.toFixed(2)),
            savingsPercent: parseInt(savingsPercent),
            formattedOriginal: this.formatCurrency(originalPrice),
            formattedDiscount: this.formatCurrency(discountAmount),
            formattedFinal: this.formatCurrency(finalPrice)
        };
    },

    /**
     * Determine personalized plan cluster based on self-assessment
     * @param {number} clinicalScore - Clinical cases score (1-10)
     * @param {number} theoryScore - Theory knowledge score (1-10)
     * @param {number} timeScore - Time management score (1-10)
     * @param {number} examScore - Last exam score (0-100, optional)
     * @returns {Object} Cluster recommendation
     */
    determineCluster: function(clinicalScore, theoryScore, timeScore, examScore = 65) {
        // Validation
        if ([clinicalScore, theoryScore, timeScore].some(score => score < 1 || score > 10)) {
            return { error: 'All scores must be between 1 and 10' };
        }

        const avgScore = (clinicalScore + theoryScore + timeScore) / 3;

        // Cluster 1: Clinical Knowledge Gap
        // Weak in clinical scenarios but strong in theory
        if (clinicalScore <= 5 && theoryScore >= 6) {
            return {
                cluster: 1,
                ...this.pricing.personalizedPlans.cluster1,
                reason: 'Your clinical case analysis needs improvement, but your theoretical knowledge is strong. Focus on practical application.',
                features: [
                    '100+ Clinical Case Studies',
                    'Step-by-Step Analysis Videos',
                    'Weekly Mock Exams',
                    '1-on-1 Mentorship Session',
                    'Clinical Reasoning Workshop'
                ]
            };
        }

        // Cluster 2: Theory Fundamentals
        // Weak in theoretical knowledge, needs foundational review
        if (theoryScore <= 5 && avgScore < 6) {
            return {
                cluster: 2,
                ...this.pricing.personalizedPlans.cluster2,
                reason: 'Your theoretical foundations need strengthening. We\'ll build a solid knowledge base systematically.',
                features: [
                    'Comprehensive Theory Review',
                    'Topic-by-Topic Video Lectures',
                    'Daily Practice Quizzes',
                    'Spaced Repetition System',
                    'Theory Mastery Tracker'
                ]
            };
        }

        // Cluster 3: Time Management
        // Good knowledge but slow, needs exam strategy
        if (timeScore <= 5 && avgScore >= 6 && examScore >= 60) {
            return {
                cluster: 3,
                ...this.pricing.personalizedPlans.cluster3,
                reason: 'You have the knowledge, but need to improve speed and exam strategy. Let\'s optimize your performance.',
                features: [
                    'Timed Practice Sessions',
                    'Test-Taking Strategies Workshop',
                    'Speed Reading Techniques',
                    'Question Prioritization Training',
                    '50+ Speed Drills'
                ]
            };
        }

        // Cluster 4: Comprehensive Review (default)
        // Borderline pass or needs full spectrum review
        return {
            cluster: 4,
            ...this.pricing.personalizedPlans.cluster4,
            reason: 'You need a comprehensive review across all areas. Our full program will cover all your needs systematically.',
            features: [
                'Full Access to All Resources',
                'Personalized Study Plan',
                'Weekly 1-on-1 Coaching',
                'Unlimited Mock Exams',
                'Performance Analytics Dashboard',
                'Study Group Access'
            ]
        };
    },

    /**
     * Get plan pricing by type
     * @param {string} planType - Plan type ('basic', 'standard', 'full', 'premium')
     * @returns {Object|null} Plan details
     */
    getPlanPricing: function(planType) {
        return this.pricing.plans[planType] || null;
    },

    /**
     * Format currency for display
     * @param {number} amount - Amount in dollars
     * @param {string} currency - Currency code (default: AUD)
     * @returns {string} Formatted currency string
     */
    formatCurrency: function(amount, currency = 'AUD') {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    /**
     * Format percentage
     * @param {number} value - Percentage value
     * @returns {string} Formatted percentage string
     */
    formatPercentage: function(value) {
        return `${Math.round(value)}%`;
    },

    /**
     * Calculate savings between two prices
     * @param {number} originalPrice - Original price
     * @param {number} discountedPrice - Discounted price
     * @returns {Object} Savings details
     */
    calculateSavings: function(originalPrice, discountedPrice) {
        const savingsAmount = originalPrice - discountedPrice;
        const savingsPercent = ((savingsAmount / originalPrice) * 100).toFixed(0);

        return {
            savingsAmount: parseFloat(savingsAmount.toFixed(2)),
            savingsPercent: parseInt(savingsPercent),
            formattedSavings: this.formatCurrency(savingsAmount),
            formattedPercent: this.formatPercentage(savingsPercent)
        };
    },

    /**
     * Validate price input
     * @param {number} price - Price to validate
     * @returns {boolean} Is valid price
     */
    isValidPrice: function(price) {
        return typeof price === 'number' && price >= 0 && isFinite(price);
    },

    /**
     * Round to 2 decimal places
     * @param {number} value - Value to round
     * @returns {number} Rounded value
     */
    roundPrice: function(value) {
        return Math.round(value * 100) / 100;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PriceCalculator;
}
