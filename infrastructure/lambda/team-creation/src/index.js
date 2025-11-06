/**
 * Team Creation Handler
 * Handles team creation and management
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = `${process.env.PROJECT_NAME}-teams-${process.env.ENVIRONMENT}`;

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
    };

    try {
        if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
        }

        const path = event.path;

        if (event.httpMethod === 'POST' && path.endsWith('/teams/create')) {
            return await createTeam(event, headers);
        } else if (event.httpMethod === 'GET' && path.includes('/teams/')) {
            return await getTeam(event, headers);
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
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function createTeam(event, headers) {
    const body = JSON.parse(event.body);
    const { person1, person2, totalPrice, pricePerPerson, planType } = body;

    // Validate - must be exactly 2 people
    if (!person1 || !person2) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid team data. Must have exactly 2 people.' })
        };
    }

    // Validate different emails
    if (person1.email.toLowerCase() === person2.email.toLowerCase()) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Both people must have different email addresses.' })
        };
    }

    const teamId = `team_${uuidv4()}`;
    const now = new Date().toISOString();

    // Calculate expiry (6 months from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    const teamRecord = {
        teamId,
        campaignId: 'team-creation',
        person1: {
            firstName: person1.firstName,
            lastName: person1.lastName,
            email: person1.email,
            country: person1.country,
            status: 'pending'
        },
        person2: {
            name: person2.name,
            email: person2.email,
            status: 'pending'
        },
        totalMembers: 2,
        planType: planType || 'full-6months',
        totalAmount: totalPrice || 299.00,
        pricePerPerson: pricePerPerson || 149.50,
        status: 'created',
        createdAt: now,
        expiresAt: expiresAt.toISOString()
    };

    await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: teamRecord
    }));

    console.log('Team created:', teamId);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            teamId,
            message: 'Team created successfully (2-person team)',
            team: teamRecord
        })
    };
}

async function getTeam(event, headers) {
    const teamId = event.pathParameters?.teamId;

    if (!teamId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing teamId' })
        };
    }

    const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { teamId }
    }));

    if (!result.Item) {
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Team not found' })
        };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Item)
    };
}
