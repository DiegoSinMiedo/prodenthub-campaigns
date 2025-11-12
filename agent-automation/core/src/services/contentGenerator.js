/**
 * Content Generator Service
 * Handles AI-powered content generation using templates
 */

const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const axios = require('axios');

class ContentGenerator {
  constructor(logger) {
    this.logger = logger;
    this.apiBaseUrl = process.env.API_BASE_URL || 'https://api.prodenthub.com.au/v1';
    this.apiKey = process.env.API_KEY;

    // Initialize AI clients
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async initialize() {
    this.logger.info('ContentGenerator initialized');
  }

  /**
   * Generate content for a campaign
   */
  async generateForCampaign(campaign) {
    this.logger.info(`Generating content for campaign: ${campaign.campaignId}`);

    try {
      // Determine content types to generate based on campaign schedule
      const contentTypes = this.determineContentTypes(campaign);

      // Get appropriate template
      const template = await this.getTemplate(contentTypes[0], campaign);

      // Generate content using API
      const response = await axios.post(
        `${this.apiBaseUrl}/content/generate`,
        {
          campaignId: campaign.campaignId,
          type: contentTypes[0],
          templateId: template?.templateId,
          platform: campaign.contentSchedule.platforms[0] || 'facebook',
          variables: {
            campaignName: campaign.name,
            targetAudience: JSON.stringify(campaign.targetAudience),
            keyFeatures: campaign.description,
            ctaUrl: campaign.landingPageUrl
          }
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      this.logger.info(`Content generated successfully: ${response.data.content.contentId}`);
      return response.data.content;

    } catch (error) {
      this.logger.error('Error generating content:', error);
      throw error;
    }
  }

  /**
   * Determine which content types to generate based on campaign schedule
   */
  determineContentTypes(campaign) {
    const schedule = campaign.contentSchedule;
    const types = [];

    if (schedule.platforms.includes('facebook')) {
      types.push('facebook_post');
    }

    if (schedule.platforms.includes('blog')) {
      types.push('blog_post');
    }

    if (schedule.platforms.includes('email')) {
      types.push('email');
    }

    // Default to Facebook post
    return types.length > 0 ? types : ['facebook_post'];
  }

  /**
   * Get template for content type
   */
  async getTemplate(contentType, campaign) {
    try {
      // In production, this would query the templates table
      // For now, return null to use default prompts
      return null;

    } catch (error) {
      this.logger.warn('Failed to get template, using default:', error);
      return null;
    }
  }

  /**
   * Generate content using AI directly (alternative to API)
   */
  async generateDirect(prompt, contentType = 'facebook_post') {
    const aiProvider = process.env.AI_PROVIDER || 'anthropic';

    try {
      if (aiProvider === 'anthropic') {
        const message = await this.anthropic.messages.create({
          model: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });

        return message.content[0].text;

      } else if (aiProvider === 'openai') {
        const completion = await this.openai.chat.completions.create({
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
      this.logger.error('AI generation error:', error);
      throw error;
    }
  }
}

module.exports = ContentGenerator;
