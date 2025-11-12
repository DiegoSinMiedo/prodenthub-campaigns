/**
 * Analytics Collector Lambda Handler
 * Collects analytics data from Facebook and other platforms
 * Stores in DynamoDB for reporting and optimization
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
const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE || 'production-prodenthub-content-analytics';
const PUBLISHING_HISTORY_TABLE = process.env.PUBLISHING_HISTORY_TABLE || 'production-prodenthub-publishing-history';
const FACEBOOK_SECRET_NAME = process.env.FACEBOOK_SECRET_NAME || 'prodenthub/facebook/credentials';

const FB_API_VERSION = 'v18.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

/**
 * Main Lambda handler
 * Can be invoked via EventBridge (scheduled) or manually
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Get recently published content (last 30 days)
    const recentContent = await getRecentContent(30);
    console.log(`Found ${recentContent.length} recent content items`);

    // Collect analytics for each
    for (const content of recentContent) {
      await collectAnalyticsForContent(content);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        itemsProcessed: recentContent.length
      })
    };

  } catch (error) {
    console.error('Error in analytics collection:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

/**
 * Get recently published content
 */
async function getRecentContent(days) {
  const result = await docClient.send(new QueryCommand({
    TableName: CONTENT_TABLE,
    IndexName: 'status-scheduledAt-index',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'published'
    },
    Limit: 100
  }));

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return (result.Items || []).filter(item => {
    const publishedDate = new Date(item.publishedAt);
    return publishedDate >= cutoffDate;
  });
}

/**
 * Collect analytics for a content item
 */
async function collectAnalyticsForContent(content) {
  console.log(`Collecting analytics for: ${content.contentId}`);

  try {
    // Get publishing history to find external post ID
    const publishHistory = await getPublishingHistory(content.contentId);

    if (!publishHistory || publishHistory.length === 0) {
      console.log(`No publishing history found for: ${content.contentId}`);
      return;
    }

    // Collect from Facebook
    if (content.platform === 'facebook') {
      await collectFacebookAnalytics(content, publishHistory[0]);
    }

    // Update content analytics summary
    await updateContentAnalytics(content.contentId);

  } catch (error) {
    console.error(`Error collecting analytics for ${content.contentId}:`, error);
  }
}

/**
 * Get publishing history for content
 */
async function getPublishingHistory(contentId) {
  const result = await docClient.send(new QueryCommand({
    TableName: PUBLISHING_HISTORY_TABLE,
    IndexName: 'contentId-publishedAt-index',
    KeyConditionExpression: 'contentId = :contentId',
    ExpressionAttributeValues: {
      ':contentId': contentId
    }
  }));

  return result.Items || [];
}

/**
 * Collect Facebook analytics
 */
async function collectFacebookAnalytics(content, publishRecord) {
  const externalId = publishRecord.externalId;
  if (!externalId) {
    console.log('No external ID found');
    return;
  }

  try {
    // Get Facebook credentials
    const credentials = await getFacebookCredentials();
    const accessToken = credentials.accessToken;

    // Fetch post insights from Facebook
    const insightsUrl = `${FB_BASE_URL}/${externalId}/insights`;
    const response = await axios.get(insightsUrl, {
      params: {
        access_token: accessToken,
        metric: 'post_impressions,post_engaged_users,post_clicks,post_reactions_by_type_total'
      }
    });

    const metrics = parseMetrics(response.data.data);

    // Store in analytics table
    const analyticsId = `${content.contentId}_${new Date().toISOString().split('T')[0]}`;
    const today = new Date().toISOString().split('T')[0];

    await docClient.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: {
        analyticsId,
        contentId: content.contentId,
        platform: 'facebook',
        date: today,
        metrics: {
          impressions: metrics.impressions || 0,
          reach: metrics.reach || 0,
          engagement: metrics.engagement || 0,
          clicks: metrics.clicks || 0,
          likes: metrics.reactions?.like || 0,
          comments: metrics.comments || 0,
          shares: metrics.shares || 0
        },
        timestamp: new Date().toISOString()
      }
    }));

    console.log(`Analytics collected for ${content.contentId}`);

  } catch (error) {
    console.error('Error collecting Facebook analytics:', error.response?.data || error.message);
  }
}

/**
 * Parse Facebook metrics
 */
function parseMetrics(data) {
  const metrics = {
    impressions: 0,
    reach: 0,
    engagement: 0,
    clicks: 0,
    reactions: {}
  };

  data.forEach(item => {
    if (item.name === 'post_impressions') {
      metrics.impressions = item.values[0]?.value || 0;
    } else if (item.name === 'post_engaged_users') {
      metrics.engagement = item.values[0]?.value || 0;
    } else if (item.name === 'post_clicks') {
      metrics.clicks = item.values[0]?.value || 0;
    } else if (item.name === 'post_reactions_by_type_total') {
      metrics.reactions = item.values[0]?.value || {};
    }
  });

  return metrics;
}

/**
 * Update content analytics summary
 */
async function updateContentAnalytics(contentId) {
  // Query all analytics for this content
  const result = await docClient.send(new QueryCommand({
    TableName: ANALYTICS_TABLE,
    IndexName: 'contentId-date-index',
    KeyConditionExpression: 'contentId = :contentId',
    ExpressionAttributeValues: {
      ':contentId': contentId
    }
  }));

  const analytics = result.Items || [];

  // Aggregate totals
  const totals = {
    impressions: 0,
    clicks: 0,
    engagement: 0,
    conversions: 0
  };

  analytics.forEach(item => {
    totals.impressions += item.metrics?.impressions || 0;
    totals.clicks += item.metrics?.clicks || 0;
    totals.engagement += item.metrics?.engagement || 0;
  });

  // Update content record
  await docClient.send(new UpdateCommand({
    TableName: CONTENT_TABLE,
    Key: { contentId },
    UpdateExpression: 'SET #analytics = :analytics, #updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#analytics': 'analytics',
      '#updatedAt': 'updatedAt'
    },
    ExpressionAttributeValues: {
      ':analytics': totals,
      ':updatedAt': new Date().toISOString()
    }
  }));
}

/**
 * Get Facebook credentials from Secrets Manager
 */
async function getFacebookCredentials() {
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
}

/**
 * Generate UTM parameters for tracking
 */
function generateUTMParams(campaign, platform, contentType) {
  const baseUrl = campaign.landingPageUrl;
  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: contentType === 'ad_copy' ? 'paid' : 'organic',
    utm_campaign: campaign.campaignId,
    utm_content: contentType
  });

  return `${baseUrl}?${params.toString()}`;
}

module.exports = { generateUTMParams };
