/**
 * Analytics Collector Service
 * Collects analytics from Facebook and other platforms
 */

const axios = require('axios');

class AnalyticsCollector {
  constructor(logger) {
    this.logger = logger;
    this.apiBaseUrl = process.env.API_BASE_URL || 'https://api.prodenthub.com.au/v1';
    this.apiKey = process.env.API_KEY;
  }

  async initialize() {
    this.logger.info('AnalyticsCollector initialized');
  }

  /**
   * Collect analytics for a specific content item
   */
  async collectForContent(content) {
    this.logger.info(`Collecting analytics for content: ${content.contentId}`);

    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/facebook/analytics?contentId=${content.contentId}`,
        {
          headers: {
            'X-API-Key': this.apiKey
          }
        }
      );

      this.logger.info(`Analytics collected: ${response.data.analytics?.length || 0} records`);
      return response.data.analytics;

    } catch (error) {
      this.logger.error('Error collecting analytics:', error);
      return [];
    }
  }

  /**
   * Collect analytics for all recent content
   */
  async collectAll() {
    this.logger.info('Collecting analytics for all recent content...');

    try {
      // Get recently published content
      const response = await axios.get(
        `${this.apiBaseUrl}/content/list?status=published&limit=100`,
        {
          headers: {
            'X-API-Key': this.apiKey
          }
        }
      );

      const items = response.data.items || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Last 30 days

      const recentContent = items.filter(item => {
        const publishedDate = new Date(item.publishedAt);
        return publishedDate >= cutoffDate;
      });

      this.logger.info(`Found ${recentContent.length} recent content items`);

      for (const content of recentContent) {
        await this.collectForContent(content);
      }

      this.logger.info('Analytics collection completed');

    } catch (error) {
      this.logger.error('Error in analytics collection:', error);
    }
  }
}

module.exports = AnalyticsCollector;
