/**
 * Facebook Integration Lambda Handler
 * Publishes content to Facebook Groups, Pages, and manages analytics
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const axios = require('axios');
const { ulid } = require('ulid');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });

// Environment variables
const CONTENT_TABLE = process.env.CONTENT_TABLE || 'production-prodenthub-content';
const PUBLISHING_HISTORY_TABLE = process.env.PUBLISHING_HISTORY_TABLE || 'production-prodenthub-publishing-history';
const SOCIAL_TARGETS_TABLE = process.env.SOCIAL_TARGETS_TABLE || 'production-prodenthub-social-targets';
const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE || 'production-prodenthub-content-analytics';
const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE || 'production-prodenthub-audit-logs';
const FACEBOOK_SECRET_NAME = process.env.FACEBOOK_SECRET_NAME || 'prodenthub/facebook/credentials';

// Facebook API configuration
const FB_API_VERSION = 'v18.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

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
      case '/facebook/publish':
        if (httpMethod === 'POST') {
          return await publishContent(requestBody, apiKey);
        }
        break;

      case '/facebook/schedule':
        if (httpMethod === 'POST') {
          return await scheduleContent(requestBody, apiKey);
        }
        break;

      case '/facebook/analytics':
        if (httpMethod === 'GET') {
          const contentId = queryStringParameters?.contentId;
          return await getAnalytics(contentId);
        }
        break;

      case '/facebook/targets/list':
        if (httpMethod === 'GET') {
          return await listTargets(queryStringParameters || {});
        }
        break;

      case '/facebook/targets/add':
        if (httpMethod === 'POST') {
          return await addTarget(requestBody, apiKey);
        }
        break;

      case '/facebook/targets/update':
        if (httpMethod === 'PUT') {
          return await updateTarget(requestBody, apiKey);
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
 * Publish content immediately to Facebook
 */
async function publishContent(params, apiKey) {
  const {
    contentId,
    targetId,
    message,
    link = null,
    imageUrls = [],
    scheduledPublishTime = null
  } = params;

  if (!contentId || !targetId) {
    return response(400, { error: 'Missing required fields: contentId, targetId' });
  }

  try {
    // Get content details
    const content = await getContentItem(contentId);
    if (!content) {
      return response(404, { error: 'Content not found' });
    }

    // Get target details (Group or Page)
    const target = await getTargetItem(targetId);
    if (!target) {
      return response(404, { error: 'Target not found' });
    }

    // Get Facebook credentials
    const credentials = await getFacebookCredentials();
    const accessToken = credentials.accessToken;

    // Build post data
    const postData = {
      message: message || content.body,
      access_token: accessToken
    };

    // Add link if provided
    if (link || content.metadata?.ctaUrl) {
      postData.link = link || content.metadata.ctaUrl;
    }

    // Add scheduled time if provided
    if (scheduledPublishTime) {
      postData.scheduled_publish_time = Math.floor(new Date(scheduledPublishTime).getTime() / 1000);
      postData.published = false;
    }

    // Publish to Facebook
    let publishResult;
    if (target.type === 'group') {
      publishResult = await publishToGroup(target.externalId, postData, imageUrls);
    } else if (target.type === 'page') {
      publishResult = await publishToPage(target.externalId, postData, imageUrls);
    } else {
      return response(400, { error: 'Invalid target type' });
    }

    // Record publishing history
    const publishId = ulid();
    const now = new Date().toISOString();

    await docClient.send(new PutCommand({
      TableName: PUBLISHING_HISTORY_TABLE,
      Item: {
        publishId,
        contentId,
        platform: 'facebook',
        publishedAt: now,
        publishedBy: 'agent',
        target: {
          type: target.type,
          id: target.externalId,
          name: target.name
        },
        externalId: publishResult.id,
        url: publishResult.url,
        status: 'success',
        metadata: {
          scheduledTime: scheduledPublishTime,
          actualTime: now,
          apiVersion: FB_API_VERSION,
          responseCode: 200
        },
        error: null
      }
    }));

    // Update content status
    await docClient.send(new UpdateCommand({
      TableName: CONTENT_TABLE,
      Key: { contentId },
      UpdateExpression: 'SET #status = :status, #publishedAt = :publishedAt, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#publishedAt': 'publishedAt',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':status': scheduledPublishTime ? 'scheduled' : 'published',
        ':publishedAt': scheduledPublishTime || now,
        ':updatedAt': now
      }
    }));

    // Log action
    await logAction('content_published', 'agent', contentId, {
      platform: 'facebook',
      targetId,
      externalId: publishResult.id
    });

    return response(200, {
      success: true,
      publishId,
      externalId: publishResult.id,
      url: publishResult.url
    });

  } catch (error) {
    console.error('Error publishing content:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Schedule content for future publication
 */
async function scheduleContent(params, apiKey) {
  const {
    contentId,
    targetId,
    scheduledAt
  } = params;

  if (!contentId || !targetId || !scheduledAt) {
    return response(400, { error: 'Missing required fields: contentId, targetId, scheduledAt' });
  }

  try {
    // Update content with scheduled time
    await docClient.send(new UpdateCommand({
      TableName: CONTENT_TABLE,
      Key: { contentId },
      UpdateExpression: 'SET #status = :status, #scheduledAt = :scheduledAt, #updatedAt = :updatedAt, #targetId = :targetId',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#scheduledAt': 'scheduledAt',
        '#updatedAt': 'updatedAt',
        '#targetId': 'targetGroupId'
      },
      ExpressionAttributeValues: {
        ':status': 'scheduled',
        ':scheduledAt': scheduledAt,
        ':updatedAt': new Date().toISOString(),
        ':targetId': targetId
      }
    }));

    await logAction('content_scheduled', 'agent', contentId, {
      scheduledAt,
      targetId
    });

    return response(200, {
      success: true,
      contentId,
      scheduledAt
    });

  } catch (error) {
    console.error('Error scheduling content:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Get analytics for published content
 */
async function getAnalytics(contentId) {
  if (!contentId) {
    return response(400, { error: 'Missing contentId' });
  }

  try {
    // Query analytics by contentId
    const result = await docClient.send(new QueryCommand({
      TableName: ANALYTICS_TABLE,
      IndexName: 'contentId-date-index',
      KeyConditionExpression: 'contentId = :contentId',
      ExpressionAttributeValues: {
        ':contentId': contentId
      },
      ScanIndexForward: false
    }));

    return response(200, {
      contentId,
      analytics: result.Items || [],
      count: result.Items?.length || 0
    });

  } catch (error) {
    console.error('Error getting analytics:', error);
    return response(500, { error: error.message });
  }
}

/**
 * List social media targets
 */
async function listTargets(params) {
  const {
    platform = 'facebook',
    type, // group, page, ad_account
    status = 'active'
  } = params;

  try {
    const result = await docClient.send(new QueryCommand({
      TableName: SOCIAL_TARGETS_TABLE,
      IndexName: 'platform-status-index',
      KeyConditionExpression: 'platform = :platform AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':platform': platform,
        ':status': status
      }
    }));

    let items = result.Items || [];

    // Filter by type if provided
    if (type) {
      items = items.filter(item => item.type === type);
    }

    return response(200, {
      items,
      count: items.length
    });

  } catch (error) {
    console.error('Error listing targets:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Add new social media target
 */
async function addTarget(params, apiKey) {
  const {
    platform,
    type, // group, page, ad_account
    name,
    externalId,
    accessToken,
    postingSchedule = {},
    audience = {}
  } = params;

  if (!platform || !type || !name || !externalId) {
    return response(400, { error: 'Missing required fields: platform, type, name, externalId' });
  }

  try {
    const targetId = `target_${platform}_${type}_${ulid().substring(0, 8)}`;
    const now = new Date().toISOString();

    const target = {
      targetId,
      platform,
      type,
      name,
      externalId,
      status: 'active',
      credentials: {
        accessToken: accessToken || 'use_default',
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
        permissions: ['publish_to_groups', 'read_insights']
      },
      postingSchedule: {
        frequency: postingSchedule.frequency || '3_times_per_week',
        preferredTimes: postingSchedule.preferredTimes || ['10:00', '14:00', '19:00'],
        timezone: postingSchedule.timezone || 'Australia/Sydney',
        daysOfWeek: postingSchedule.daysOfWeek || ['Monday', 'Wednesday', 'Friday']
      },
      audience: {
        size: audience.size || 0,
        location: audience.location || 'Australia',
        interests: audience.interests || [],
        demographics: audience.demographics || {}
      },
      performance: {
        avgEngagementRate: 0,
        avgReach: 0,
        totalPosts: 0,
        totalConversions: 0
      },
      createdAt: now,
      updatedAt: now
    };

    await docClient.send(new PutCommand({
      TableName: SOCIAL_TARGETS_TABLE,
      Item: target
    }));

    await logAction('target_added', 'agent', targetId, {
      platform,
      type,
      name
    });

    return response(201, {
      success: true,
      target
    });

  } catch (error) {
    console.error('Error adding target:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Update social media target
 */
async function updateTarget(params, apiKey) {
  const { targetId, ...updates } = params;

  if (!targetId) {
    return response(400, { error: 'Missing targetId' });
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
      TableName: SOCIAL_TARGETS_TABLE,
      Key: { targetId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: attributeValues
    }));

    await logAction('target_updated', 'agent', targetId, { updates });

    return response(200, { success: true, targetId });

  } catch (error) {
    console.error('Error updating target:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Helper: Publish to Facebook Group
 */
async function publishToGroup(groupId, postData, imageUrls = []) {
  const url = `${FB_BASE_URL}/${groupId}/feed`;

  try {
    const fbResponse = await axios.post(url, postData);
    const postId = fbResponse.data.id;

    return {
      id: postId,
      url: `https://www.facebook.com/groups/${groupId}/posts/${postId.split('_')[1]}/`
    };

  } catch (error) {
    console.error('Facebook API error:', error.response?.data || error.message);
    throw new Error(`Facebook API error: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Helper: Publish to Facebook Page
 */
async function publishToPage(pageId, postData, imageUrls = []) {
  const url = `${FB_BASE_URL}/${pageId}/feed`;

  try {
    const fbResponse = await axios.post(url, postData);
    const postId = fbResponse.data.id;

    return {
      id: postId,
      url: `https://www.facebook.com/${pageId}/posts/${postId.split('_')[1]}/`
    };

  } catch (error) {
    console.error('Facebook API error:', error.response?.data || error.message);
    throw new Error(`Facebook API error: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Helper: Get Facebook credentials from Secrets Manager
 */
async function getFacebookCredentials() {
  try {
    const command = new GetSecretValueCommand({
      SecretId: FACEBOOK_SECRET_NAME
    });

    const result = await secretsClient.send(command);
    const secret = JSON.parse(result.SecretString);

    return {
      accessToken: secret.access_token,
      appId: secret.app_id,
      appSecret: secret.app_secret
    };

  } catch (error) {
    console.error('Error retrieving Facebook credentials:', error);
    throw new Error('Failed to retrieve Facebook credentials');
  }
}

/**
 * Helper: Get content item
 */
async function getContentItem(contentId) {
  const result = await docClient.send(new GetCommand({
    TableName: CONTENT_TABLE,
    Key: { contentId }
  }));

  return result.Item;
}

/**
 * Helper: Get target item
 */
async function getTargetItem(targetId) {
  const result = await docClient.send(new GetCommand({
    TableName: SOCIAL_TARGETS_TABLE,
    Key: { targetId }
  }));

  return result.Item;
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
        type: 'content',
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
