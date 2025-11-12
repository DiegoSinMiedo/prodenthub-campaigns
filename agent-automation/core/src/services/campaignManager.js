/**
 * Campaign Manager Service
 * Manages campaign lifecycle and content scheduling
 */

const axios = require('axios');

class CampaignManager {
  constructor(logger) {
    this.logger = logger;
    this.apiBaseUrl = process.env.API_BASE_URL || 'https://api.prodenthub.com.au/v1';
    this.apiKey = process.env.API_KEY;
  }

  async initialize() {
    this.logger.info('CampaignManager initialized');
  }

  /**
   * Get all active campaigns
   */
  async getActiveCampaigns() {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/campaigns/list?status=active`,
        {
          headers: {
            'X-API-Key': this.apiKey
          }
        }
      );

      return response.data.items || [];

    } catch (error) {
      this.logger.error('Error getting active campaigns:', error);
      return [];
    }
  }

  /**
   * Check if content should be generated for a campaign based on schedule
   */
  async shouldGenerateContent(campaign) {
    const schedule = campaign.contentSchedule;

    if (!schedule.autoGenerate) {
      return false;
    }

    // Check if we've already generated content today
    const today = new Date().toISOString().split('T')[0];
    const lastGenerated = campaign.lastContentGenerated?.split('T')[0];

    if (lastGenerated === today) {
      return false;
    }

    // Check frequency
    const frequency = schedule.frequency;
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    if (frequency === 'daily') {
      return true;
    }

    if (frequency === 'weekly' && schedule.daysOfWeek?.includes(dayOfWeek)) {
      return true;
    }

    if (frequency === '3_times_per_week') {
      const preferredDays = schedule.daysOfWeek || ['Monday', 'Wednesday', 'Friday'];
      return preferredDays.includes(dayOfWeek);
    }

    return false;
  }

  /**
   * Get scheduled content that's ready to be published
   */
  async getScheduledContent() {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/content/list?status=scheduled`,
        {
          headers: {
            'X-API-Key': this.apiKey
          }
        }
      );

      const now = new Date();
      const items = response.data.items || [];

      // Filter for content scheduled for now or earlier
      return items.filter(item => {
        const scheduledTime = new Date(item.scheduledAt);
        return scheduledTime <= now;
      });

    } catch (error) {
      this.logger.error('Error getting scheduled content:', error);
      return [];
    }
  }

  /**
   * Get recently published content for analytics collection
   */
  async getRecentlyPublishedContent(days = 7) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/content/list?status=published&limit=100`,
        {
          headers: {
            'X-API-Key': this.apiKey
          }
        }
      );

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const items = response.data.items || [];

      return items.filter(item => {
        const publishedDate = new Date(item.publishedAt);
        return publishedDate >= cutoffDate;
      });

    } catch (error) {
      this.logger.error('Error getting recently published content:', error);
      return [];
    }
  }
}

module.exports = CampaignManager;
