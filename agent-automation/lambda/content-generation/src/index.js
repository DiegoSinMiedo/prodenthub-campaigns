/**
 * Content Generation Lambda Handler
 * Generates marketing content using AI (Claude/GPT) based on templates and campaign data
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { ulid } = require('ulid');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Initialize AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Environment variables
const CONTENT_TABLE = process.env.CONTENT_TABLE || 'production-prodenthub-content';
const TEMPLATES_TABLE = process.env.TEMPLATES_TABLE || 'production-prodenthub-agent-templates';
const CAMPAIGNS_TABLE = process.env.CAMPAIGNS_TABLE || 'production-prodenthub-campaigns-metadata';
const AUDIT_LOGS_TABLE = process.env.AUDIT_LOGS_TABLE || 'production-prodenthub-audit-logs';

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, path, body, headers } = event;
    const requestBody = body ? JSON.parse(body) : {};

    // API Key authentication (simplified - should use API Gateway authorizer in production)
    const apiKey = headers['x-api-key'] || headers['X-API-Key'];
    if (!apiKey) {
      return response(401, { error: 'Missing API key' });
    }

    // Route requests
    switch (path) {
      case '/content/generate':
        if (httpMethod === 'POST') {
          return await generateContent(requestBody, apiKey);
        }
        break;

      case '/content/list':
        if (httpMethod === 'GET') {
          return await listContent(event.queryStringParameters || {});
        }
        break;

      case '/content/get':
        if (httpMethod === 'GET') {
          const contentId = event.queryStringParameters?.contentId;
          return await getContent(contentId);
        }
        break;

      case '/content/update':
        if (httpMethod === 'PUT') {
          return await updateContent(requestBody, apiKey);
        }
        break;

      case '/content/delete':
        if (httpMethod === 'DELETE') {
          const contentId = event.queryStringParameters?.contentId;
          return await deleteContent(contentId, apiKey);
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
 * Generate content using AI
 */
async function generateContent(params, apiKey) {
  const {
    campaignId,
    type, // facebook_post, blog_post, ad_copy, email
    templateId,
    customPrompt,
    variables = {},
    platform = 'facebook',
    scheduledAt = null,
    autoPublish = false
  } = params;

  // Validate required fields
  if (!campaignId || !type) {
    return response(400, { error: 'Missing required fields: campaignId, type' });
  }

  try {
    // Get campaign data
    const campaign = await getCampaignData(campaignId);
    if (!campaign) {
      return response(404, { error: 'Campaign not found' });
    }

    // Get template if templateId provided
    let template = null;
    if (templateId) {
      template = await getTemplate(templateId);
    }

    // Build prompt
    const prompt = buildPrompt(campaign, template, customPrompt, variables, type);

    // Generate content using AI
    const generatedText = await callAI(prompt, type);

    // Parse generated content
    const parsedContent = parseGeneratedContent(generatedText, type);

    // Create content record
    const contentId = ulid();
    const now = new Date().toISOString();

    const contentRecord = {
      contentId,
      type,
      campaignId,
      title: parsedContent.title || `${type} for ${campaign.name}`,
      body: parsedContent.body,
      status: autoPublish ? 'published' : (scheduledAt ? 'scheduled' : 'draft'),
      platform,
      scheduledAt: scheduledAt || null,
      publishedAt: autoPublish ? now : null,
      createdAt: now,
      updatedAt: now,
      createdBy: 'agent',
      metadata: {
        ...parsedContent.metadata,
        templateId: templateId || null,
        aiModel: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
        promptTokens: generatedText.length,
        variables
      },
      analytics: {
        impressions: 0,
        clicks: 0,
        engagement: 0,
        conversions: 0
      },
      ttl: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60) // 6 months
    };

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: CONTENT_TABLE,
      Item: contentRecord
    }));

    // Log action
    await logAction('content_created', 'agent', contentId, {
      contentType: type,
      campaignId,
      status: contentRecord.status
    });

    return response(201, {
      success: true,
      content: contentRecord
    });

  } catch (error) {
    console.error('Error generating content:', error);
    return response(500, { error: error.message });
  }
}

/**
 * List content with filters
 */
async function listContent(params) {
  const {
    campaignId,
    type,
    status,
    limit = 50
  } = params;

  try {
    let queryParams = {
      TableName: CONTENT_TABLE,
      Limit: parseInt(limit)
    };

    if (campaignId) {
      queryParams.IndexName = 'campaignId-index';
      queryParams.KeyConditionExpression = 'campaignId = :campaignId';
      queryParams.ExpressionAttributeValues = {
        ':campaignId': campaignId
      };
    } else if (type) {
      queryParams.IndexName = 'type-createdAt-index';
      queryParams.KeyConditionExpression = '#type = :type';
      queryParams.ExpressionAttributeNames = {
        '#type': 'type'
      };
      queryParams.ExpressionAttributeValues = {
        ':type': type
      };
      queryParams.ScanIndexForward = false;
    } else if (status) {
      queryParams.IndexName = 'status-scheduledAt-index';
      queryParams.KeyConditionExpression = '#status = :status';
      queryParams.ExpressionAttributeNames = {
        '#status': 'status'
      };
      queryParams.ExpressionAttributeValues = {
        ':status': status
      };
      queryParams.ScanIndexForward = false;
    } else {
      return response(400, { error: 'At least one filter required: campaignId, type, or status' });
    }

    const result = await docClient.send(new QueryCommand(queryParams));

    return response(200, {
      items: result.Items || [],
      count: result.Items?.length || 0
    });

  } catch (error) {
    console.error('Error listing content:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Get single content item
 */
async function getContent(contentId) {
  if (!contentId) {
    return response(400, { error: 'Missing contentId' });
  }

  try {
    const result = await docClient.send(new GetCommand({
      TableName: CONTENT_TABLE,
      Key: { contentId }
    }));

    if (!result.Item) {
      return response(404, { error: 'Content not found' });
    }

    return response(200, result.Item);

  } catch (error) {
    console.error('Error getting content:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Update content
 */
async function updateContent(params, apiKey) {
  const { contentId, ...updates } = params;

  if (!contentId) {
    return response(400, { error: 'Missing contentId' });
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
      TableName: CONTENT_TABLE,
      Key: { contentId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: attributeValues
    }));

    await logAction('content_updated', 'agent', contentId, { updates });

    return response(200, { success: true, contentId });

  } catch (error) {
    console.error('Error updating content:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Delete content (soft delete by updating status)
 */
async function deleteContent(contentId, apiKey) {
  if (!contentId) {
    return response(400, { error: 'Missing contentId' });
  }

  try {
    await docClient.send(new UpdateCommand({
      TableName: CONTENT_TABLE,
      Key: { contentId },
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

    await logAction('content_deleted', 'agent', contentId, {});

    return response(200, { success: true, contentId });

  } catch (error) {
    console.error('Error deleting content:', error);
    return response(500, { error: error.message });
  }
}

/**
 * Helper: Get campaign data
 */
async function getCampaignData(campaignId) {
  const result = await docClient.send(new GetCommand({
    TableName: CAMPAIGNS_TABLE,
    Key: { campaignId }
  }));

  return result.Item;
}

/**
 * Helper: Get template
 */
async function getTemplate(templateId) {
  const result = await docClient.send(new GetCommand({
    TableName: TEMPLATES_TABLE,
    Key: { templateId }
  }));

  return result.Item;
}

/**
 * Helper: Build AI prompt
 */
function buildPrompt(campaign, template, customPrompt, variables, contentType) {
  if (customPrompt) {
    return customPrompt;
  }

  if (template) {
    let prompt = template.prompt;
    // Replace variables
    Object.keys(variables).forEach(key => {
      prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
    });
    return prompt;
  }

  // Default prompt based on content type
  const defaultPrompts = {
    facebook_post: `Create an engaging Facebook post to promote the "${campaign.name}" campaign.

Campaign Description: ${campaign.description}
Target Audience: ${JSON.stringify(campaign.targetAudience)}
Landing Page: ${campaign.landingPageUrl}

Requirements:
- Hook readers in the first line
- Explain the key benefit clearly
- Include a clear call-to-action
- Use 2-3 relevant hashtags
- Keep it under 250 words
- Friendly, helpful tone`,

    blog_post: `Write a comprehensive blog post about "${campaign.name}".

Campaign Description: ${campaign.description}
Target Audience: ${JSON.stringify(campaign.targetAudience)}

Requirements:
- SEO-optimized title
- Engaging introduction
- 3-5 main sections with subheadings
- Practical tips and actionable advice
- Clear conclusion with CTA
- 800-1200 words
- Professional yet approachable tone`,

    ad_copy: `Create compelling ad copy for "${campaign.name}".

Campaign Description: ${campaign.description}
Target Audience: ${JSON.stringify(campaign.targetAudience)}

Requirements:
- Attention-grabbing headline
- Short body text (50-100 words)
- Clear value proposition
- Strong call-to-action
- Urgency element if appropriate`,

    email: `Write a promotional email for "${campaign.name}".

Campaign Description: ${campaign.description}
Target Audience: ${JSON.stringify(campaign.targetAudience)}

Requirements:
- Compelling subject line
- Personal greeting
- Clear value proposition
- 2-3 short paragraphs
- Clear CTA button text
- Professional yet warm tone`
  };

  return defaultPrompts[contentType] || defaultPrompts.facebook_post;
}

/**
 * Helper: Call AI API
 */
async function callAI(prompt, contentType) {
  const aiProvider = process.env.AI_PROVIDER || 'anthropic'; // or 'openai'

  try {
    if (aiProvider === 'anthropic') {
      const message = await anthropic.messages.create({
        model: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return message.content[0].text;

    } else if (aiProvider === 'openai') {
      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-4-turbo-preview',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 2000
      });

      return completion.choices[0].message.content;
    }

  } catch (error) {
    console.error('AI API error:', error);
    throw new Error(`AI generation failed: ${error.message}`);
  }
}

/**
 * Helper: Parse generated content
 */
function parseGeneratedContent(text, contentType) {
  // Basic parsing - can be enhanced with more sophisticated logic
  const lines = text.split('\n').filter(line => line.trim());

  let title = '';
  let body = text;
  const metadata = {
    wordCount: text.split(/\s+/).length,
    hasImages: false,
    hashtags: [],
    tone: 'professional'
  };

  // Extract title (first line for some content types)
  if (contentType === 'blog_post' && lines.length > 0) {
    title = lines[0].replace(/^#\s*/, '');
    body = lines.slice(1).join('\n');
  }

  // Extract hashtags
  const hashtagMatches = text.match(/#\w+/g);
  if (hashtagMatches) {
    metadata.hashtags = hashtagMatches;
  }

  return {
    title,
    body,
    metadata
  };
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
