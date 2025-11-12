/**
 * Auth Manager Lambda Handler
 * API Gateway Lambda Authorizer for API key authentication
 * Also handles API key CRUD operations
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');
const { ulid } = require('ulid');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Environment variables
const API_KEYS_TABLE = process.env.API_KEYS_TABLE || 'production-prodenthub-api-keys';
const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE || 'production-prodenthub-audit-logs';

/**
 * Lambda Authorizer Handler
 * Validates API keys for API Gateway requests
 */
exports.authorize = async (event) => {
  console.log('Authorization event:', JSON.stringify(event, null, 2));

  const apiKey = event.headers['x-api-key'] || event.headers['X-API-Key'];

  if (!apiKey) {
    return generatePolicy('user', 'Deny', event.methodArn);
  }

  try {
    // Validate API key
    const keyData = await validateAPIKey(apiKey);

    if (!keyData) {
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    // Check rate limits
    const withinLimits = await checkRateLimits(keyData);

    if (!withinLimits) {
      return generatePolicy(keyData.keyId, 'Deny', event.methodArn, {
        error: 'Rate limit exceeded'
      });
    }

    // Log API key usage
    await logAPIKeyUsage(keyData.keyId, event);

    // Generate allow policy
    return generatePolicy(keyData.keyId, 'Allow', event.methodArn, {
      keyId: keyData.keyId,
      permissions: keyData.permissions
    });

  } catch (error) {
    console.error('Authorization error:', error);
    return generatePolicy('user', 'Deny', event.methodArn);
  }
};

/**
 * API Key Management Handler
 * CRUD operations for API keys
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, path, body, headers } = event;
    const requestBody = body ? JSON.parse(body) : {};

    // Admin authentication (use master key or AWS IAM)
    const masterKey = headers['x-master-key'];
    if (masterKey !== process.env.MASTER_KEY) {
      return response(401, { error: 'Unauthorized' });
    }

    // Route requests
    switch (path) {
      case '/api-keys/create':
        if (httpMethod === 'POST') {
          return await createAPIKey(requestBody);
        }
        break;

      case '/api-keys/list':
        if (httpMethod === 'GET') {
          return await listAPIKeys(event.queryStringParameters || {});
        }
        break;

      case '/api-keys/revoke':
        if (httpMethod === 'POST') {
          return await revokeAPIKey(requestBody.keyId);
        }
        break;

      case '/api-keys/update':
        if (httpMethod === 'PUT') {
          return await updateAPIKey(requestBody);
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
 * Validate API key
 */
async function validateAPIKey(apiKey) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: API_KEYS_TABLE,
      IndexName: 'apiKey-index',
      KeyConditionExpression: 'apiKey = :apiKey',
      ExpressionAttributeValues: {
        ':apiKey': apiKey
      }
    }));

    const items = result.Items || [];

    if (items.length === 0) {
      return null;
    }

    const keyData = items[0];

    // Check if key is active
    if (keyData.status !== 'active') {
      return null;
    }

    // Check expiration
    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
      return null;
    }

    // Update last used timestamp
    await docClient.send(new UpdateCommand({
      TableName: API_KEYS_TABLE,
      Key: { keyId: keyData.keyId },
      UpdateExpression: 'SET #lastUsedAt = :lastUsedAt',
      ExpressionAttributeNames: {
        '#lastUsedAt': 'lastUsedAt'
      },
      ExpressionAttributeValues: {
        ':lastUsedAt': new Date().toISOString()
      }
    }));

    return keyData;

  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

/**
 * Check rate limits
 */
async function checkRateLimits(keyData) {
  // Simple in-memory rate limiting
  // In production, use Redis or DynamoDB with TTL

  const rateLimit = keyData.rateLimit || {
    requestsPerMinute: 60,
    requestsPerDay: 10000
  };

  // TODO: Implement actual rate limiting logic
  // For now, always return true

  return true;
}

/**
 * Log API key usage
 */
async function logAPIKeyUsage(keyId, event) {
  const logId = ulid();

  await docClient.send(new PutCommand({
    TableName: AUDIT_LOGS_TABLE,
    Item: {
      logId,
      action: 'api_key_used',
      userId: keyId,
      timestamp: new Date().toISOString(),
      resource: {
        type: 'api',
        id: event.requestContext?.requestId
      },
      details: {
        path: event.path,
        method: event.httpMethod,
        sourceIp: event.requestContext?.identity?.sourceIp
      },
      ip: event.requestContext?.identity?.sourceIp,
      userAgent: event.headers?.['user-agent'] || event.headers?.['User-Agent'],
      result: 'success',
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
    }
  }));
}

/**
 * Generate IAM policy for API Gateway
 */
function generatePolicy(principalId, effect, resource, context = {}) {
  const authResponse = {
    principalId
  };

  if (effect && resource) {
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    };

    authResponse.policyDocument = policyDocument;
  }

  if (Object.keys(context).length > 0) {
    authResponse.context = context;
  }

  return authResponse;
}

/**
 * Create new API key
 */
async function createAPIKey(params) {
  const {
    name,
    description,
    permissions = ['content:read'],
    expiresInDays = 365,
    ipWhitelist = []
  } = params;

  if (!name) {
    return response(400, { error: 'Missing required field: name' });
  }

  try {
    const keyId = ulid();
    const apiKey = generateSecureAPIKey();
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const keyData = {
      keyId,
      apiKey,
      name,
      description: description || '',
      status: 'active',
      permissions,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerDay: 10000
      },
      createdAt: now.toISOString(),
      lastUsedAt: null,
      expiresAt: expiresAt.toISOString(),
      createdBy: 'admin',
      ipWhitelist
    };

    await docClient.send(new PutCommand({
      TableName: API_KEYS_TABLE,
      Item: keyData
    }));

    // Log action
    await logAction('api_key_created', 'admin', keyId, { name });

    return response(201, {
      success: true,
      keyId,
      apiKey, // Only returned once at creation
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error creating API key:', error);
    return response(500, { error: error.message });
  }
}

/**
 * List API keys
 */
async function listAPIKeys(params) {
  const { status = 'active' } = params;

  try {
    const result = await docClient.send(new QueryCommand({
      TableName: API_KEYS_TABLE,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status
      }
    }));

    // Don't return the actual API keys in list
    const items = (result.Items || []).map(item => ({
      keyId: item.keyId,
      name: item.name,
      description: item.description,
      status: item.status,
      permissions: item.permissions,
      createdAt: item.createdAt,
      lastUsedAt: item.lastUsedAt,
      expiresAt: item.expiresAt
    }));

    return response(200, {
      items,
      count: items.length
    });

  } catch (error) {
    console.error('Error listing API keys:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Revoke API key
 */
async function revokeAPIKey(keyId) {
  if (!keyId) {
    return response(400, { error: 'Missing keyId' });
  }

  try {
    await docClient.send(new UpdateCommand({
      TableName: API_KEYS_TABLE,
      Key: { keyId },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'revoked'
      }
    }));

    await logAction('api_key_revoked', 'admin', keyId, {});

    return response(200, { success: true, keyId, status: 'revoked' });

  } catch (error) {
    console.error('Error revoking API key:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Update API key
 */
async function updateAPIKey(params) {
  const { keyId, ...updates } = params;

  if (!keyId) {
    return response(400, { error: 'Missing keyId' });
  }

  // Don't allow updating the actual API key value
  delete updates.apiKey;

  try {
    const updateExpressions = [];
    const attributeNames = {};
    const attributeValues = {};

    Object.keys(updates).forEach((key, index) => {
      updateExpressions.push(`#field${index} = :value${index}`);
      attributeNames[`#field${index}`] = key;
      attributeValues[`:value${index}`] = updates[key];
    });

    await docClient.send(new UpdateCommand({
      TableName: API_KEYS_TABLE,
      Key: { keyId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: attributeValues
    }));

    await logAction('api_key_updated', 'admin', keyId, { updates });

    return response(200, { success: true, keyId });

  } catch (error) {
    console.error('Error updating API key:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Generate secure API key
 */
function generateSecureAPIKey() {
  const prefix = 'pdh_live_';
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  return `${prefix}${randomBytes}`;
}

/**
 * Log action to audit table
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
        type: 'api_key',
        id: resourceId
      },
      details,
      userAgent: 'ProDentHub-Admin/1.0',
      result: 'success',
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year
    }
  }));
}

/**
 * HTTP response builder
 */
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,X-Master-Key',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}
