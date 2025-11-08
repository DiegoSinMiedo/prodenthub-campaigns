/**
 * Stripe Webhook Handler
 * Processes Stripe webhook events for all campaigns
 */

const Stripe = require('stripe');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Initialize clients
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({ region: process.env.AWS_REGION });

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Lambda handler
 */
exports.handler = async (event) => {
    console.log('Webhook event received');

    try {
        // Verify webhook signature
        const signature = event.headers['Stripe-Signature'] || event.headers['stripe-signature'];

        if (!signature) {
            console.error('No Stripe signature found');
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'No signature' })
            };
        }

        let stripeEvent;
        try {
            stripeEvent = stripe.webhooks.constructEvent(
                event.body,
                signature,
                WEBHOOK_SECRET
            );
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid signature' })
            };
        }

        console.log('Event type:', stripeEvent.type);
        console.log('Event ID:', stripeEvent.id);

        // Process event based on type
        switch (stripeEvent.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(stripeEvent.data.object);
                break;

            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(stripeEvent.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailed(stripeEvent.data.object);
                break;

            case 'charge.refunded':
                await handleRefund(stripeEvent.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${stripeEvent.type}`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ received: true })
        };

    } catch (error) {
        console.error('Webhook handler error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session) {
    console.log('Checkout completed:', session.id);

    const campaignId = session.metadata?.campaignId;
    const customerEmail = session.customer_email;

    if (!campaignId) {
        console.error('No campaignId in session metadata');
        return;
    }

    // Update DynamoDB based on campaign type
    switch (campaignId) {
        case 'team-creation':
            await updateTeamStatus(session);
            break;
        case 'scholarship-application':
            await updateScholarshipStatus(session);
            break;
        case 'discount-purchase':
            await updatePurchaseStatus(session);
            break;
        case 'personalized-plan':
            await updatePersonalizedPlanStatus(session);
            break;
        case 'mock-exam-registration':
            await updateMockExamRegistration(session);
            break;
        default:
            console.warn(`Unknown campaign: ${campaignId}`);
    }

    // Send confirmation email
    await sendConfirmationEmail(customerEmail, campaignId, session);
}

/**
 * Update team status in DynamoDB
 */
async function updateTeamStatus(session) {
    const teamId = session.metadata?.teamId;

    if (!teamId) {
        console.error('No teamId in metadata');
        return;
    }

    const tableName = `${process.env.PROJECT_NAME}-teams-${process.env.ENVIRONMENT}`;

    await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { teamId },
        UpdateExpression: 'SET #status = :status, stripeCheckoutSessionId = :sessionId, activatedAt = :now, #ttl = :ttl',
        ExpressionAttributeNames: {
            '#status': 'status',
            '#ttl': 'ttl'
        },
        ExpressionAttributeValues: {
            ':status': 'fully_paid',
            ':sessionId': session.id,
            ':now': new Date().toISOString(),
            ':ttl': Math.floor(Date.now() / 1000) + (6 * 30 * 24 * 60 * 60) // 6 months
        }
    }));

    console.log(`Team ${teamId} activated`);
}

/**
 * Update scholarship status
 */
async function updateScholarshipStatus(session) {
    const scholarshipId = session.metadata?.scholarshipId;

    if (!scholarshipId) {
        console.error('No scholarshipId in metadata');
        return;
    }

    const tableName = `${process.env.PROJECT_NAME}-scholarships-${process.env.ENVIRONMENT}`;

    await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { scholarshipId },
        UpdateExpression: 'SET #status = :status, stripeCheckoutSessionId = :sessionId, approvedAt = :now',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':status': 'paid',
            ':sessionId': session.id,
            ':now': new Date().toISOString()
        }
    }));

    console.log(`Scholarship ${scholarshipId} activated`);
}

/**
 * Update purchase status
 */
async function updatePurchaseStatus(session) {
    const purchaseId = session.metadata?.purchaseId;

    if (!purchaseId) {
        console.error('No purchaseId in metadata');
        return;
    }

    const tableName = `${process.env.PROJECT_NAME}-discount-purchases-${process.env.ENVIRONMENT}`;

    await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { purchaseId },
        UpdateExpression: 'SET #status = :status, stripeCheckoutSessionId = :sessionId, activatedAt = :now',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':status': 'paid',
            ':sessionId': session.id,
            ':now': new Date().toISOString()
        }
    }));

    console.log(`Purchase ${purchaseId} completed`);
}

/**
 * Update personalized plan status
 */
async function updatePersonalizedPlanStatus(session) {
    const planId = session.metadata?.planId;

    if (!planId) {
        console.error('No planId in metadata');
        return;
    }

    const tableName = `${process.env.PROJECT_NAME}-personalized-plans-${process.env.ENVIRONMENT}`;

    await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { planId },
        UpdateExpression: 'SET #status = :status, stripeCheckoutSessionId = :sessionId, activatedAt = :now',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':status': 'active',
            ':sessionId': session.id,
            ':now': new Date().toISOString()
        }
    }));

    console.log(`Personalized plan ${planId} activated`);
}

/**
 * Update mock exam registration
 */
async function updateMockExamRegistration(session) {
    const registrationId = session.metadata?.registrationId;

    if (!registrationId) {
        console.error('No registrationId in metadata');
        return;
    }

    const tableName = `${process.env.PROJECT_NAME}-mock-registrations-${process.env.ENVIRONMENT}`;

    await docClient.send(new UpdateCommand({
        TableName: tableName,
        Key: { registrationId },
        UpdateExpression: 'SET #status = :status, stripeCheckoutSessionId = :sessionId, registrationType = :type',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':status': 'confirmed',
            ':sessionId': session.id,
            ':type': 'premium'
        }
    }));

    console.log(`Mock exam registration ${registrationId} confirmed`);
}

/**
 * Handle payment succeeded
 */
async function handlePaymentSucceeded(paymentIntent) {
    console.log('Payment succeeded:', paymentIntent.id);
    // Additional processing if needed
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(paymentIntent) {
    console.log('Payment failed:', paymentIntent.id);
    // Send retry email or notification
}

/**
 * Handle refund
 */
async function handleRefund(charge) {
    console.log('Refund processed:', charge.id);
    // Revoke access based on metadata
}

/**
 * Send confirmation email via SES
 */
async function sendConfirmationEmail(email, campaignId, session) {
    const subject = getEmailSubject(campaignId);
    const body = getEmailBody(campaignId, session);

    try {
        await sesClient.send(new SendEmailCommand({
            Source: process.env.SES_FROM_EMAIL,
            Destination: {
                ToAddresses: [email]
            },
            Message: {
                Subject: {
                    Data: subject,
                    Charset: 'UTF-8'
                },
                Body: {
                    Html: {
                        Data: body,
                        Charset: 'UTF-8'
                    }
                }
            }
        }));

        console.log(`Confirmation email sent to ${email}`);
    } catch (error) {
        console.error('Failed to send email:', error);
    }
}

/**
 * Get email subject based on campaign
 */
function getEmailSubject(campaignId) {
    const subjects = {
        'team-creation': 'Your Team Has Been Created - ProDentHub',
        'scholarship-application': 'Scholarship Approved - ProDentHub',
        'discount-purchase': 'Purchase Confirmed - ProDentHub',
        'personalized-plan': 'Your Personalized Plan is Ready - ProDentHub',
        'mock-exam-registration': 'Mock Exam Registration Confirmed - ProDentHub'
    };
    return subjects[campaignId] || 'Purchase Confirmation - ProDentHub';
}

/**
 * Get email body (HTML)
 */
function getEmailBody(campaignId, session) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #cf4520;">Payment Successful!</h1>
                <p>Your payment has been processed successfully.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Order Details</h3>
                    <p><strong>Amount Paid:</strong> $${(session.amount_total / 100).toFixed(2)} ${session.currency.toUpperCase()}</p>
                    <p><strong>Email:</strong> ${session.customer_email}</p>
                    <p><strong>Order ID:</strong> ${session.id}</p>
                </div>
                <p>You can access your account at: <a href="https://app.prodenthub.com.au">app.prodenthub.com.au</a></p>
                <p>If you have any questions, please contact us at support@prodenthub.com.au</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="font-size: 12px; color: #666;">
                    ProDentHub - Helping dentists ace the ADC exam<br>
                    © 2025 ProDentHub. All rights reserved.
                </p>
            </div>
        </body>
        </html>
    `;
}
