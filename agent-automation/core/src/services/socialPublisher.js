/**
 * Social Publisher Service
 * Publishes content to social media platforms
 */

const axios = require('axios');

class SocialPublisher {
  constructor(logger) {
    this.logger = logger;
    this.apiBaseUrl = process.env.API_BASE_URL || 'https://api.prodenthub.com.au/v1';
    this.apiKey = process.env.API_KEY;
  }

  async initialize() {
    this.logger.info('SocialPublisher initialized');
  }

  /**
   * Publish content to a target
   */
  async publish(content, target) {
    this.logger.info(`Publishing content ${content.contentId} to ${target.platform} ${target.type}: ${target.name}`);

    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/facebook/publish`,
        {
          contentId: content.contentId,
          targetId: target.targetId,
          message: content.body,
          link: content.metadata?.ctaUrl || null,
          imageUrls: content.metadata?.imageUrls || []
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      this.logger.info(`Published successfully: ${response.data.externalId}`);
      return response.data;

    } catch (error) {
      this.logger.error('Error publishing content:', error);
      throw error;
    }
  }

  /**
   * Get targets for a campaign
   */
  async getTargetsForCampaign(campaign) {
    const platforms = campaign.contentSchedule.platforms || ['facebook'];

    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/facebook/targets/list?platform=${platforms[0]}&status=active`,
        {
          headers: {
            'X-API-Key': this.apiKey
          }
        }
      );

      return response.data.items || [];

    } catch (error) {
      this.logger.error('Error getting targets:', error);
      return [];
    }
  }

  /**
   * Get a specific target
   */
  async getTarget(targetId) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/facebook/targets/list?status=active`,
        {
          headers: {
            'X-API-Key': this.apiKey
          }
        }
      );

      const items = response.data.items || [];
      return items.find(item => item.targetId === targetId);

    } catch (error) {
      this.logger.error('Error getting target:', error);
      return null;
    }
  }
}

module.exports = SocialPublisher;
