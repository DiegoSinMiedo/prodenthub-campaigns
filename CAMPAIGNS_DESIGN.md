# ProDentHub - New Campaigns Design Document

## Overview
This document outlines the design for 5 new fixed campaigns with Stripe payment integration, advanced features, and DynamoDB schemas.

---

## 1. Team Creation Campaign (`team-creation`)

### Purpose
Allow 2 people to sign up together and split the cost of full version access for 6 months.

### Frontend Form Fields
- **Person 1 (You):**
  - First Name (required)
  - Last Name (required)
  - Email (required)
  - Country (required)

- **Person 2 (Study Partner):**
  - Partner's Full Name (required)
  - Partner's Email (required)

- **Plan Details:**
  - Fixed: Full Version 6 Months
  - Price: $299 AUD total
  - Price per person: $149.50 AUD (50% split)
  - Savings: $49.50 per person vs individual plan ($199)

### DynamoDB Schema

**Table: `prodenthub-teams`**
```json
{
  "teamId": "team_UUID (PK)",
  "campaignId": "team-creation",
  "person1": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "country": "Australia",
    "status": "pending|paid|active"
  },
  "person2": {
    "name": "Jane Smith",
    "email": "jane@example.com",
    "status": "pending|paid|active"
  },
  "totalMembers": 2,
  "planType": "full-6months",
  "totalAmount": 299.00,
  "pricePerPerson": 149.50,
  "status": "created|fully_paid|active",
  "createdAt": "2025-01-06T10:30:00Z",
  "activatedAt": "2025-01-06T11:00:00Z",
  "expiresAt": "2025-07-06T11:00:00Z",
  "stripeCheckoutSessionId": "cs_xxx",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "team-discount"
}
```

**GSI:**
- `person1Email-index` (HASH: person1.email) - Query by person 1's email
- `person2Email-index` (HASH: person2.email) - Query by person 2's email
- `status-createdAt-index` (HASH: status, RANGE: createdAt)

### Stripe Integration
1. **Product:** ProDentHub Full Version - 6 Months (Team Plan)
2. **Payment Flow:**
   - Option A: Leader pays full amount, manually splits later
   - Option B: Generate individual payment links for each member (Stripe Checkout)
3. **Webhook Events:**
   - `checkout.session.completed` → Activate team member
   - `payment_intent.succeeded` → Mark member as paid
   - `payment_intent.payment_failed` → Send retry email

### Backend Lambda Functions
- `POST /teams/create` - Create team and Stripe checkout session
- `POST /teams/member/payment` - Individual member payment link
- `GET /teams/{teamId}` - Get team status
- `POST /webhook/stripe` - Handle Stripe webhooks

---

## 2. Scholarship Application Campaign (`scholarship-application`)

### Purpose
Allow students to apply for scholarships based on their exam attempt history and results. The scholarship amount is calculated and charged via Stripe.

### Frontend Form Fields
- **Personal Information:**
  - First Name (required)
  - Last Name (required)
  - Email (required)
  - Country (required)
  - Phone Number (required)

- **Exam History:**
  - Number of Attempts (dropdown: 1-5+)
  - Last Exam Score (slider: 0-100)
  - Last Exam Date (date picker)

- **Scholarship Request:**
  - Reason for Scholarship (textarea, max 500 chars)
  - Financial Need Level (dropdown: Low, Medium, High)

- **Calculated Fields (Display Only):**
  - Scholarship Eligibility Score (0-100)
  - Scholarship Amount (calculated based on attempts & score)
  - Final Price After Scholarship

### Scholarship Calculation Logic
```javascript
// Base price: $199 AUD for 3-month full access
const BASE_PRICE = 199;

// Scholarship calculation
function calculateScholarship(attempts, lastScore, financialNeed) {
  let scholarshipPercent = 0;

  // Based on attempts (more attempts = more scholarship)
  if (attempts >= 3) scholarshipPercent += 20;
  else if (attempts >= 2) scholarshipPercent += 10;

  // Based on score (lower score = more scholarship)
  if (lastScore < 40) scholarshipPercent += 30;
  else if (lastScore < 60) scholarshipPercent += 20;
  else if (lastScore < 75) scholarshipPercent += 10;

  // Based on financial need
  if (financialNeed === 'High') scholarshipPercent += 25;
  else if (financialNeed === 'Medium') scholarshipPercent += 15;
  else if (financialNeed === 'Low') scholarshipPercent += 5;

  // Cap at 75% maximum scholarship
  scholarshipPercent = Math.min(scholarshipPercent, 75);

  const scholarshipAmount = (BASE_PRICE * scholarshipPercent) / 100;
  const finalPrice = BASE_PRICE - scholarshipAmount;

  return {
    eligibilityScore: scholarshipPercent,
    scholarshipAmount: scholarshipAmount.toFixed(2),
    finalPrice: finalPrice.toFixed(2)
  };
}
```

### DynamoDB Schema

**Table: `prodenthub-scholarships`**
```json
{
  "scholarshipId": "scholar_UUID (PK)",
  "campaignId": "scholarship-application",
  "email": "student@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "country": "India",
  "phoneNumber": "+61400000000",
  "examAttempts": 3,
  "lastExamScore": 55,
  "lastExamDate": "2024-12-15",
  "scholarshipReason": "Financial hardship due to...",
  "financialNeed": "High",
  "eligibilityScore": 65,
  "basePrice": 199.00,
  "scholarshipAmount": 129.35,
  "finalPrice": 69.65,
  "scholarshipPercent": 65,
  "status": "pending|approved|rejected|paid|active",
  "approvedBy": "admin@prodenthub.com",
  "approvedAt": "2025-01-06T12:00:00Z",
  "createdAt": "2025-01-06T10:30:00Z",
  "stripePaymentIntentId": "pi_xxx",
  "stripeCheckoutSessionId": "cs_xxx",
  "accessStartDate": "2025-01-06",
  "accessEndDate": "2025-04-06",
  "utm_source": "google",
  "utm_medium": "cpc"
}
```

**GSI:**
- `email-index` (HASH: email)
- `status-createdAt-index` (HASH: status, RANGE: createdAt)
- `eligibilityScore-index` (HASH: status, RANGE: eligibilityScore) - For admin review

### Stripe Integration
1. **Product:** ProDentHub Scholarship Access - 3 Months
2. **Dynamic Pricing:** Based on scholarship calculation
3. **Payment Flow:**
   - Auto-calculate scholarship on form
   - Create Stripe Checkout with dynamic price
   - Redirect to Stripe payment page
   - Webhook confirms payment → Activate access

### Backend Lambda Functions
- `POST /scholarships/calculate` - Calculate scholarship eligibility (real-time)
- `POST /scholarships/apply` - Submit application and create Stripe checkout
- `GET /scholarships/{scholarshipId}` - Get application status
- `POST /scholarships/{scholarshipId}/approve` - Admin approval endpoint

---

## 3. Discount Coupon Purchase Campaign (`discount-purchase`)

### Purpose
Allow users to purchase ProDentHub access with discount coupons. Validates coupon and applies discount to Stripe payment.

### Frontend Form Fields
- **Personal Information:**
  - First Name (required)
  - Last Name (required)
  - Email (required)
  - Country (required)

- **Plan Selection:**
  - Plan Type (dropdown):
    - Basic - 1 Month ($49 AUD)
    - Standard - 3 Months ($129 AUD)
    - Full - 6 Months ($199 AUD)
    - Premium - 12 Months ($299 AUD)

- **Discount Coupon:**
  - Coupon Code (text input, uppercase, e.g., "SAVE20")
  - Apply Button (validates coupon via API)
  - Discount Display (shows discount amount)

- **Price Summary:**
  - Original Price
  - Discount Amount
  - Final Price

### Coupon Types & Validation
```javascript
// Coupon structure in DynamoDB
const couponExample = {
  code: "SAVE20",
  type: "percentage", // or "fixed_amount"
  value: 20, // 20% or $20
  minPurchase: 100, // Minimum purchase amount
  maxDiscount: 50, // Maximum discount amount (for percentage)
  validFrom: "2025-01-01",
  validUntil: "2025-12-31",
  usageLimit: 100, // Total uses allowed
  usageCount: 45, // Current usage count
  perUserLimit: 1, // Uses per email
  applicablePlans: ["standard", "full", "premium"], // or "all"
  status: "active" // active|inactive|expired
};
```

### DynamoDB Schemas

**Table: `prodenthub-coupons`**
```json
{
  "couponCode": "SAVE20 (PK)",
  "type": "percentage|fixed_amount",
  "value": 20,
  "minPurchase": 100,
  "maxDiscount": 50,
  "validFrom": "2025-01-01T00:00:00Z",
  "validUntil": "2025-12-31T23:59:59Z",
  "usageLimit": 100,
  "usageCount": 45,
  "perUserLimit": 1,
  "applicablePlans": ["standard", "full", "premium"],
  "status": "active",
  "createdAt": "2025-01-01T00:00:00Z",
  "createdBy": "admin@prodenthub.com"
}
```

**Table: `prodenthub-discount-purchases`**
```json
{
  "purchaseId": "purchase_UUID (PK)",
  "campaignId": "discount-purchase",
  "email": "buyer@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "country": "Australia",
  "planType": "full",
  "planDuration": "6months",
  "originalPrice": 199.00,
  "couponCode": "SAVE20",
  "discountType": "percentage",
  "discountValue": 20,
  "discountAmount": 39.80,
  "finalPrice": 159.20,
  "status": "pending|paid|active|refunded",
  "createdAt": "2025-01-06T10:30:00Z",
  "stripePaymentIntentId": "pi_xxx",
  "stripeCheckoutSessionId": "cs_xxx",
  "accessStartDate": "2025-01-06",
  "accessEndDate": "2025-07-06",
  "utm_source": "email",
  "utm_medium": "newsletter"
}
```

**Table: `prodenthub-coupon-usage`**
```json
{
  "usageId": "usage_UUID (PK)",
  "couponCode": "SAVE20",
  "email": "buyer@example.com",
  "purchaseId": "purchase_UUID",
  "usedAt": "2025-01-06T10:30:00Z"
}
```

**GSI:**
- `email-index` on `prodenthub-discount-purchases` (HASH: email)
- `couponCode-email-index` on `prodenthub-coupon-usage` (HASH: couponCode, RANGE: email) - Check per-user limit

### Stripe Integration
1. **Products:** Multiple products for different plans
2. **Coupon Validation:** Real-time API call before payment
3. **Payment Flow:**
   - User enters coupon → Validate via API
   - Show discount → Create Stripe Checkout with discounted price
   - Stripe Coupon created (or use existing)
   - Webhook confirms payment → Activate access

### Backend Lambda Functions
- `POST /coupons/validate` - Validate coupon code and calculate discount
- `POST /purchases/create` - Create purchase and Stripe checkout
- `GET /purchases/{purchaseId}` - Get purchase status
- `POST /admin/coupons` - Admin endpoint to create/manage coupons

---

## 4. Personalized Plan Campaign (`personalized-plan`)

### Purpose
For students who have already taken the ADC exam and need a personalized study plan based on their performance cluster (1 of 4 clusters).

### Cluster Definitions
Based on exam performance patterns:

1. **Cluster 1: Clinical Knowledge Gap**
   - Weak in clinical scenarios
   - Strong in theory
   - **Plan:** Clinical case studies + mock exams
   - **Duration:** 3 months
   - **Price:** $179 AUD

2. **Cluster 2: Theory Fundamentals**
   - Weak in theoretical knowledge
   - Needs foundational review
   - **Plan:** Comprehensive theory review + quizzes
   - **Duration:** 4 months
   - **Price:** $199 AUD

3. **Cluster 3: Time Management**
   - Good knowledge but slow
   - Needs exam strategy
   - **Plan:** Timed practice + test-taking strategies
   - **Duration:** 2 months
   - **Price:** $149 AUD

4. **Cluster 4: Comprehensive Review**
   - Borderline pass
   - Needs full spectrum review
   - **Plan:** Full access to all resources
   - **Duration:** 6 months
   - **Price:** $249 AUD

### Frontend Form Fields
- **Personal Information:**
  - First Name (required)
  - Last Name (required)
  - Email (required)
  - Country (required)
  - Phone Number (optional)

- **Exam History:**
  - Exam Date (date picker)
  - Exam Score (number input, 0-100)
  - Upload Score Report (file upload, PDF/JPG)

- **Performance Analysis (Self-Assessment):**
  - Clinical Cases Score (1-10 scale)
  - Theory Knowledge Score (1-10 scale)
  - Time Management Score (1-10 scale)
  - Overall Confidence (1-10 scale)

- **Cluster Recommendation (Auto-calculated):**
  - Recommended Cluster (displayed after assessment)
  - Plan Details (displayed)
  - Price (displayed)

- **Plan Selection:**
  - User can override recommendation or confirm

### Cluster Calculation Logic
```javascript
function determineCluster(clinicalScore, theoryScore, timeScore, examScore) {
  const avgScore = (clinicalScore + theoryScore + timeScore) / 3;

  // Cluster 1: Clinical Knowledge Gap
  if (clinicalScore < 5 && theoryScore >= 6) {
    return {
      cluster: 1,
      name: "Clinical Knowledge Gap",
      duration: "3 months",
      price: 179
    };
  }

  // Cluster 2: Theory Fundamentals
  if (theoryScore < 5 && avgScore < 6) {
    return {
      cluster: 2,
      name: "Theory Fundamentals",
      duration: "4 months",
      price: 199
    };
  }

  // Cluster 3: Time Management
  if (timeScore < 5 && avgScore >= 6 && examScore >= 60) {
    return {
      cluster: 3,
      name: "Time Management",
      duration: "2 months",
      price: 149
    };
  }

  // Cluster 4: Comprehensive Review (default)
  return {
    cluster: 4,
    name: "Comprehensive Review",
    duration: "6 months",
    price: 249
  };
}
```

### DynamoDB Schema

**Table: `prodenthub-personalized-plans`**
```json
{
  "planId": "plan_UUID (PK)",
  "campaignId": "personalized-plan",
  "email": "student@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "country": "Australia",
  "phoneNumber": "+61400000000",
  "examDate": "2024-11-15",
  "examScore": 65,
  "scoreReportUrl": "s3://prodenthub-documents/score-reports/plan_UUID.pdf",
  "selfAssessment": {
    "clinicalScore": 4,
    "theoryScore": 7,
    "timeScore": 5,
    "confidenceScore": 6
  },
  "recommendedCluster": 1,
  "clusterName": "Clinical Knowledge Gap",
  "selectedCluster": 1,
  "planDuration": "3months",
  "planPrice": 179.00,
  "planFeatures": [
    "100+ Clinical Case Studies",
    "Weekly Mock Exams",
    "1-on-1 Mentorship Session",
    "Performance Analytics Dashboard"
  ],
  "status": "pending|paid|active|completed",
  "createdAt": "2025-01-06T10:30:00Z",
  "stripePaymentIntentId": "pi_xxx",
  "stripeCheckoutSessionId": "cs_xxx",
  "accessStartDate": "2025-01-06",
  "accessEndDate": "2025-04-06",
  "progressTracking": {
    "completedCases": 25,
    "mockExamsTaken": 3,
    "averageMockScore": 72,
    "lastActivity": "2025-02-01T15:30:00Z"
  }
}
```

**GSI:**
- `email-index` (HASH: email)
- `selectedCluster-index` (HASH: selectedCluster, RANGE: createdAt) - Analytics
- `status-accessEndDate-index` (HASH: status, RANGE: accessEndDate) - Find expiring plans

### Stripe Integration
1. **Products:** 4 separate products (one per cluster)
2. **File Upload:** Score report uploaded to S3
3. **Payment Flow:**
   - User completes assessment
   - System recommends cluster
   - User confirms or selects different cluster
   - Create Stripe Checkout
   - Webhook activates personalized plan access

### Backend Lambda Functions
- `POST /personalized-plans/assess` - Calculate cluster recommendation
- `POST /personalized-plans/create` - Create plan and upload score report
- `POST /personalized-plans/checkout` - Create Stripe checkout
- `GET /personalized-plans/{planId}` - Get plan details
- `PUT /personalized-plans/{planId}/progress` - Update progress tracking

---

## 5. Universal Mock Exam Campaign (`mock-exam-registration`)

### Purpose
Register for a universal mock exam where participants can see aggregate statistics, dispersion charts, and compare performance with peers.

### Frontend Form Fields
- **Personal Information:**
  - First Name (required)
  - Last Name (required)
  - Email (required)
  - Country (required)
  - Timezone (auto-detected, can override)

- **Mock Exam Selection:**
  - Upcoming Mock Exams (dropdown with dates)
  - Exam Type: Full Mock (200 questions) or Quick Mock (50 questions)

- **Registration Options:**
  - Free Registration (limited stats)
  - Premium Registration - $29 AUD (full analytics access)
    - Detailed performance breakdown
    - Cluster analysis
    - Peer comparison charts
    - Downloadable report

### Statistics Shared After Exam
- **Aggregate Statistics:**
  - Total Participants
  - Average Score
  - Median Score
  - Standard Deviation
  - Pass Rate (assuming 65% threshold)

- **Score Distribution:**
  - Histogram chart (score ranges vs. frequency)
  - Percentile ranking

- **Topic-wise Performance:**
  - Average scores per topic/domain
  - Your score vs. average (radar chart)

- **Time Analytics:**
  - Average time per question
  - Your time vs. average

### DynamoDB Schemas

**Table: `prodenthub-mock-exams`**
```json
{
  "mockExamId": "mock_UUID (PK)",
  "examName": "Universal Mock Exam - January 2025",
  "examDate": "2025-01-15T10:00:00Z",
  "examType": "full|quick",
  "duration": 240,
  "totalQuestions": 200,
  "status": "scheduled|in_progress|completed|archived",
  "registrationDeadline": "2025-01-14T23:59:59Z",
  "createdAt": "2024-12-01T00:00:00Z",
  "pricing": {
    "free": 0,
    "premium": 29
  }
}
```

**Table: `prodenthub-mock-registrations`**
```json
{
  "registrationId": "reg_UUID (PK)",
  "mockExamId": "mock_UUID",
  "campaignId": "mock-exam-registration",
  "email": "participant@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "country": "Australia",
  "timezone": "Australia/Sydney",
  "registrationType": "free|premium",
  "registrationPrice": 29.00,
  "registeredAt": "2025-01-06T10:30:00Z",
  "status": "registered|payment_pending|confirmed|attended|no_show",
  "stripePaymentIntentId": "pi_xxx",
  "examStartedAt": "2025-01-15T10:05:00Z",
  "examSubmittedAt": "2025-01-15T13:45:00Z",
  "examDuration": 220,
  "score": 78,
  "totalQuestions": 200,
  "correctAnswers": 156,
  "incorrectAnswers": 44,
  "percentile": 72,
  "topicScores": {
    "clinical": 82,
    "radiology": 75,
    "pharmacology": 71,
    "diagnosis": 80
  },
  "statsAccessUntil": "2025-02-15T00:00:00Z"
}
```

**Table: `prodenthub-mock-statistics`** (Aggregate data per exam)
```json
{
  "mockExamId": "mock_UUID (PK)",
  "totalRegistrations": 450,
  "totalAttendees": 387,
  "attendanceRate": 86,
  "averageScore": 72.5,
  "medianScore": 74,
  "standardDeviation": 12.3,
  "passRate": 68.5,
  "scoreDistribution": {
    "0-10": 2,
    "11-20": 5,
    "21-30": 8,
    "31-40": 15,
    "41-50": 28,
    "51-60": 45,
    "61-70": 89,
    "71-80": 112,
    "81-90": 65,
    "91-100": 18
  },
  "topicAverages": {
    "clinical": 75.2,
    "radiology": 68.9,
    "pharmacology": 71.4,
    "diagnosis": 73.8
  },
  "averageTimePerQuestion": 72,
  "lastUpdated": "2025-01-15T14:00:00Z"
}
```

**GSI:**
- `email-mockExamId-index` on `prodenthub-mock-registrations` (HASH: email, RANGE: mockExamId)
- `mockExamId-status-index` on `prodenthub-mock-registrations` (HASH: mockExamId, RANGE: status)

### Stripe Integration
1. **Product:** Mock Exam Premium Access - $29 AUD
2. **Payment Flow (for Premium only):**
   - User selects Premium registration
   - Create Stripe Checkout
   - Webhook confirms payment → Update registration status
   - Free registrations skip payment

### Backend Lambda Functions
- `GET /mock-exams` - List upcoming mock exams
- `POST /mock-exams/register` - Register for mock exam (free or premium)
- `GET /mock-exams/{mockExamId}/stats` - Get aggregate statistics
- `GET /mock-registrations/{registrationId}` - Get individual registration & results
- `POST /mock-exams/{mockExamId}/submit` - Submit exam answers
- `POST /mock-exams/{mockExamId}/calculate-stats` - Recalculate aggregate stats

---

## Shared Components

### Stripe Payment Handler (`stripe-handler.js`)
Reusable JavaScript module for all campaigns with payment:

```javascript
class StripeHandler {
  constructor(apiBaseUrl, stripePublicKey) {
    this.apiBaseUrl = apiBaseUrl;
    this.stripe = Stripe(stripePublicKey);
  }

  async createCheckoutSession(campaignData) {
    // POST to Lambda to create checkout session
    // Returns session ID
  }

  async redirectToCheckout(sessionId) {
    // Redirect to Stripe Checkout
  }

  async handleCheckoutComplete(sessionId) {
    // Verify payment completion
    // Show success message
  }
}
```

### Price Calculator (`price-calculator.js`)
Reusable module for dynamic pricing:

```javascript
class PriceCalculator {
  calculateTeamPrice(basePrice, memberCount) {
    return (basePrice / memberCount).toFixed(2);
  }

  calculateScholarship(attempts, score, financialNeed) {
    // Scholarship calculation logic
  }

  calculateDiscount(originalPrice, couponType, couponValue, maxDiscount) {
    // Discount calculation logic
  }

  formatCurrency(amount, currency = 'AUD') {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}
```

---

## Backend API Endpoints Summary

### Base URL
`https://api.prodenthub.com.au/v1` (or API Gateway URL)

### Endpoints by Campaign

#### Team Creation
- `POST /teams/create`
- `POST /teams/member/payment`
- `GET /teams/{teamId}`

#### Scholarship
- `POST /scholarships/calculate`
- `POST /scholarships/apply`
- `GET /scholarships/{scholarshipId}`
- `POST /scholarships/{scholarshipId}/approve` (admin)

#### Discount Purchase
- `POST /coupons/validate`
- `POST /purchases/create`
- `GET /purchases/{purchaseId}`
- `POST /admin/coupons` (admin)

#### Personalized Plan
- `POST /personalized-plans/assess`
- `POST /personalized-plans/create`
- `POST /personalized-plans/checkout`
- `GET /personalized-plans/{planId}`
- `PUT /personalized-plans/{planId}/progress`

#### Mock Exam
- `GET /mock-exams`
- `POST /mock-exams/register`
- `GET /mock-exams/{mockExamId}/stats`
- `GET /mock-registrations/{registrationId}`
- `POST /mock-exams/{mockExamId}/submit`
- `POST /mock-exams/{mockExamId}/calculate-stats`

#### Stripe Webhooks
- `POST /webhook/stripe` (handles all Stripe events)

---

## Stripe Webhook Events to Handle

```javascript
const webhookEvents = [
  'checkout.session.completed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.refunded',
  'customer.subscription.created',
  'customer.subscription.deleted'
];
```

### Event Handlers
1. **checkout.session.completed:**
   - Extract metadata (campaignId, userId, etc.)
   - Update DynamoDB status to "paid"
   - Trigger access activation
   - Send confirmation email

2. **payment_intent.payment_failed:**
   - Update status to "payment_failed"
   - Send retry email with new payment link

3. **charge.refunded:**
   - Revoke access
   - Update status to "refunded"

---

## Infrastructure Requirements

### DynamoDB Tables to Create
1. `prodenthub-teams`
2. `prodenthub-scholarships`
3. `prodenthub-coupons`
4. `prodenthub-coupon-usage`
5. `prodenthub-discount-purchases`
6. `prodenthub-personalized-plans`
7. `prodenthub-mock-exams`
8. `prodenthub-mock-registrations`
9. `prodenthub-mock-statistics`

### Lambda Functions to Create
1. `team-creation-handler`
2. `scholarship-handler`
3. `discount-purchase-handler`
4. `personalized-plan-handler`
5. `mock-exam-handler`
6. `stripe-webhook-handler` (shared)
7. `coupon-management` (admin)

### S3 Buckets
- `prodenthub-score-reports` (for score report uploads)
- `prodenthub-exam-results` (for mock exam result PDFs)

### Stripe Products to Create
1. ProDentHub Full Version - 6 Months (Team Plan) - $299 AUD
2. ProDentHub Scholarship Access - 3 Months - Variable pricing
3. ProDentHub Plans (Basic/Standard/Full/Premium) - $49/$129/$199/$299 AUD
4. Personalized Plans (Cluster 1-4) - $149/$179/$199/$249 AUD
5. Mock Exam Premium Access - $29 AUD

---

## Campaign URLs Structure

```
campaigns.prodenthub.com.au/
├── team-creation/
│   ├── index.html
│   └── thank-you.html
├── scholarship-application/
│   ├── index.html
│   └── thank-you.html
├── discount-purchase/
│   ├── index.html
│   └── thank-you.html
├── personalized-plan/
│   ├── index.html
│   ├── assessment.html
│   └── thank-you.html
└── mock-exam-registration/
    ├── index.html
    ├── thank-you.html
    └── stats-dashboard.html
```

---

## Next Steps

1. ✅ Design document completed
2. ⏳ Create frontend HTML/CSS/JS for each campaign
3. ⏳ Create shared payment handler and price calculator
4. ⏳ Document backend Lambda function requirements
5. ⏳ Create Terraform/CloudFormation templates for infrastructure
6. ⏳ Set up Stripe products and webhooks
7. ⏳ Test end-to-end payment flows
8. ⏳ Deploy to production

---

**Document Version:** 1.0
**Created:** 2025-01-06
**Last Updated:** 2025-01-06
**Author:** ProDentHub Development Team
