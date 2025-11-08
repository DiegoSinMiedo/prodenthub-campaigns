/**
 * Universal Checkout Session Handler
 * Creates and verifies Stripe Checkout Sessions for all campaign types
 */

const Stripe = require('stripe');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize clients
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Lambda handler
 */
exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    try {
        // Handle OPTIONS for CORS
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        const path = event.path;

        if (path.endsWith('/checkout/create')) {
            return await createCheckoutSession(event, headers);
        } else if (path.endsWith('/checkout/verify')) {
            return await verifyCheckoutSession(event, headers);
        } else {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Not found' })
            };
        }

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

/**
 * Create Stripe Checkout Session
 */
async function createCheckoutSession(event, headers) {
    const body = JSON.parse(event.body);

    // Validate required fields
    const { campaignId, email, amount, currency = 'AUD', metadata = {}, successUrl, cancelUrl } = body;

    if (!campaignId || !email || !amount) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing required fields: campaignId, email, amount' })
        };
    }

    // Create line item based on campaign
    const lineItems = [{
        price_data: {
            currency: currency.toLowerCase(),
            product_data: {
                name: getCampaignProductName(campaignId),
                description: getCampaignDescription(campaignId),
                metadata: {
                    campaignId: campaignId
                }
            },
            unit_amount: Math.round(amount * 100) // Convert to cents
        },
        quantity: 1
    }];

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl || `${process.env.FRONTEND_URL}/${campaignId}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/${campaignId}/`,
        customer_email: email,
        metadata: {
            campaignId,
            ...metadata
        },
        billing_address_collection: 'required',
        payment_intent_data: {
            metadata: {
                campaignId,
                ...metadata
            }
        }
    });

    console.log('Created checkout session:', session.id);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            sessionId: session.id,
            checkoutUrl: session.url
        })
    };
}

/**
 * Verify Checkout Session Status
 */
async function verifyCheckoutSession(event, headers) {
    const body = JSON.parse(event.body);
    const { sessionId } = body;

    if (!sessionId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing sessionId' })
        };
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            status: session.status,
            paymentStatus: session.payment_status,
            customerEmail: session.customer_email,
            amountTotal: session.amount_total / 100,
            currency: session.currency.toUpperCase(),
            metadata: session.metadata
        })
    };
}

/**
 * Get product name based on campaign ID
 */
function getCampaignProductName(campaignId) {
    const names = {
        'team-creation': 'ProDentHub Full Version - 6 Months (Team Plan)',
        'scholarship-application': 'ProDentHub Scholarship Access - 3 Months',
        'discount-purchase': 'ProDentHub Access Plan',
        'personalized-plan': 'ProDentHub Personalized Study Plan',
        'mock-exam-registration': 'Universal Mock Exam - Premium Access'
    };
    return names[campaignId] || 'ProDentHub Access';
}

/**
 * Get campaign description
 */
function getCampaignDescription(campaignId) {
    const descriptions = {
        'team-creation': 'Full access for your study team (6 months)',
        'scholarship-application': 'Scholarship-subsidized access (3 months)',
        'discount-purchase': 'Discounted access to ADC exam preparation',
        'personalized-plan': 'Tailored study plan based on your performance',
        'mock-exam-registration': 'Premium analytics and statistics'
    };
    return descriptions[campaignId] || 'Access to ProDentHub ADC exam preparation';
}
