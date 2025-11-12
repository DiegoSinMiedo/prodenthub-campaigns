/**
 * Campaign Manager Lambda Handler
 * CRUD operations for campaign management
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ulid } = require('ulid');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Environment variables
const CAMPAIGNS_TABLE = process.env.CAMPAIGNS_TABLE || 'production-prodenthub-campaigns-metadata';
const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE || 'production-prodenthub-audit-logs';

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, path, body, headers, queryStringParameters } = event;
    const requestBody = body ? JSON.parse(body) : {};

    // API Key authentication
    const apiKey = headers['x-api-key'] || headers['X-API-Key'];
    if (!apiKey) {
      return response(401, { error: 'Missing API key' });
    }

    // Route requests
    switch (path) {
      case '/campaigns/create':
        if (httpMethod === 'POST') {
          return await createCampaign(requestBody, apiKey);
        }
        break;

      case '/campaigns/list':
        if (httpMethod === 'GET') {
          return await listCampaigns(queryStringParameters || {});
        }
        break;

      case '/campaigns/get':
        if (httpMethod === 'GET') {
          const campaignId = queryStringParameters?.campaignId;
          return await getCampaign(campaignId);
        }
        break;

      case '/campaigns/update':
        if (httpMethod === 'PUT') {
          return await updateCampaign(requestBody, apiKey);
        }
        break;

      case '/campaigns/archive':
        if (httpMethod === 'POST') {
          return await archiveCampaign(requestBody.campaignId, apiKey);
        }
        break;

      case '/campaigns/activate':
        if (httpMethod === 'POST') {
          return await activateCampaign(requestBody.campaignId, apiKey);
        }
        break;

      default:
        return response(404, { error: 'Not found' });
    }

    return response(405, { error: 'Method not allowed' });

  } catch (error) {
    console.error('Error:', error);
    return response(500, { error: error.message });
  }
};

/**
 * Create new campaign
 */
async function createCampaign(params, apiKey) {
  const {
    name,
    description,
    type, // paid, free, hybrid
    startDate,
    endDate,
    landingPageUrl,
    targetAudience = {},
    budget = {},
    goals = {},
    assets = {},
    contentSchedule = {}
  } = params;

  // Validate required fields
  if (!name || !description || !type) {
    return response(400, { error: 'Missing required fields: name, description, type' });
  }

  try {
    const campaignId = `campaign-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const now = new Date().toISOString();

    const campaign = {
      campaignId,
      name,
      description,
      type,
      status: 'draft', // draft, active, paused, completed, archived
      startDate: startDate || now,
      endDate: endDate || null,
      createdAt: now,
      updatedAt: now,
      landingPageUrl: landingPageUrl || `https://campaigns.prodenthub.com.au/${campaignId}/`,
      targetAudience: {
        location: targetAudience.location || ['Australia'],
        profession: targetAudience.profession || ['Dentist'],
        examStatus: targetAudience.examStatus || ['Preparing'],
        demographics: targetAudience.demographics || {}
      },
      budget: {
        total: budget.total || 0,
        spent: 0,
        currency: budget.currency || 'AUD'
      },
      goals: {
        leads: goals.leads || 100,
        conversions: goals.conversions || 20,
        revenue: goals.revenue || 5000
      },
      assets: {
        images: assets.images || [],
        videos: assets.videos || [],
        documents: assets.documents || []
      },
      contentSchedule: {
        frequency: contentSchedule.frequency || 'weekly',
        platforms: contentSchedule.platforms || ['facebook'],
        autoGenerate: contentSchedule.autoGenerate !== false
      },
      analytics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        ctr: 0,
        conversionRate: 0,
        roas: 0
      }
    };

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: CAMPAIGNS_TABLE,
      Item: campaign,
      ConditionExpression: 'attribute_not_exists(campaignId)' // Prevent overwrite
    }));

    // Log action
    await logAction('campaign_created', 'agent', campaignId, {
      name,
      type,
      status: 'draft'
    });

    return response(201, {
      success: true,
      campaign
    });

  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return response(409, { error: 'Campaign already exists' });
    }
    console.error('Error creating campaign:', error);
    return response(500, { error: error.message });
  }
}

/**
 * List campaigns with filters
 */
async function listCampaigns(params) {
  const {
    status,
    type,
    limit = 50
  } = params;

  try {
    let queryParams = {
      TableName: CAMPAIGNS_TABLE,
      Limit: parseInt(limit)
    };

    if (status) {
      queryParams.IndexName = 'status-createdAt-index';
      queryParams.KeyConditionExpression = '#status = :status';
      queryParams.ExpressionAttributeNames = {
        '#status': 'status'
      };
      queryParams.ExpressionAttributeValues = {
        ':status': status
      };
      queryParams.ScanIndexForward = false;

      const result = await docClient.send(new QueryCommand(queryParams));

      // Filter by type if provided
      let items = result.Items || [];
      if (type) {
        items = items.filter(item => item.type === type);
      }

      return response(200, {
        items,
        count: items.length
      });

    } else {
      // Full scan if no status filter
      queryParams = {
        TableName: CAMPAIGNS_TABLE,
        Limit: parseInt(limit)
      };

      if (type) {
        queryParams.FilterExpression = '#type = :type';
        queryParams.ExpressionAttributeNames = { '#type': 'type' };
        queryParams.ExpressionAttributeValues = { ':type': type };
      }

      const result = await docClient.send(new ScanCommand(queryParams));

      return response(200, {
        items: result.Items || [],
        count: result.Items?.length || 0
      });
    }

  } catch (error) {
    console.error('Error listing campaigns:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Get single campaign
 */
async function getCampaign(campaignId) {
  if (!campaignId) {
    return response(400, { error: 'Missing campaignId' });
  }

  try {
    const result = await docClient.send(new GetCommand({
      TableName: CAMPAIGNS_TABLE,
      Key: { campaignId }
    }));

    if (!result.Item) {
      return response(404, { error: 'Campaign not found' });
    }

    return response(200, result.Item);

  } catch (error) {
    console.error('Error getting campaign:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Update campaign
 */
async function updateCampaign(params, apiKey) {
  const { campaignId, ...updates } = params;

  if (!campaignId) {
    return response(400, { error: 'Missing campaignId' });
  }

  try {
    // Build update expression
    const updateExpressions = [];
    const attributeNames = {};
    const attributeValues = {};

    Object.keys(updates).forEach((key, index) => {
      updateExpressions.push(`#field${index} = :value${index}`);
      attributeNames[`#field${index}`] = key;
      attributeValues[`:value${index}`] = updates[key];
    });

    updateExpressions.push(`#updatedAt = :updatedAt`);
    attributeNames['#updatedAt'] = 'updatedAt';
    attributeValues[':updatedAt'] = new Date().toISOString();

    await docClient.send(new UpdateCommand({
      TableName: CAMPAIGNS_TABLE,
      Key: { campaignId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: attributeValues
    }));

    await logAction('campaign_updated', 'agent', campaignId, { updates });

    return response(200, { success: true, campaignId });

  } catch (error) {
    console.error('Error updating campaign:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Archive campaign
 */
async function archiveCampaign(campaignId, apiKey) {
  if (!campaignId) {
    return response(400, { error: 'Missing campaignId' });
  }

  try {
    await docClient.send(new UpdateCommand({
      TableName: CAMPAIGNS_TABLE,
      Key: { campaignId },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':status': 'archived',
        ':updatedAt': new Date().toISOString()
      }
    }));

    await logAction('campaign_archived', 'agent', campaignId, {});

    return response(200, { success: true, campaignId, status: 'archived' });

  } catch (error) {
    console.error('Error archiving campaign:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Activate campaign
 */
async function activateCampaign(campaignId, apiKey) {
  if (!campaignId) {
    return response(400, { error: 'Missing campaignId' });
  }

  try {
    await docClient.send(new UpdateCommand({
      TableName: CAMPAIGNS_TABLE,
      Key: { campaignId },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':status': 'active',
        ':updatedAt': new Date().toISOString()
      }
    }));

    await logAction('campaign_activated', 'agent', campaignId, {});

    return response(200, { success: true, campaignId, status: 'active' });

  } catch (error) {
    console.error('Error activating campaign:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Helper: Log action to audit table
 */
async function logAction(action, userId, resourceId, details) {
  const logId = ulid();

  await docClient.send(new PutCommand({
    TableName: AUDIT_LOGS_TABLE,
    Item: {
      logId,
      action,
      userId,
      timestamp: new Date().toISOString(),
      resource: {
        type: 'campaign',
        id: resourceId
      },
      details,
      userAgent: 'ProDentHub-Agent/1.0',
      result: 'success',
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
    }
  }));
}

/**
 * Helper: HTTP response builder
 */
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}
