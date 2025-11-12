/**
 * ProDentHub Agent Core Service
 * Main orchestrator for automated content generation and publishing
 */

const cron = require('node-cron');
const { createLogger, format, transports } = require('winston');
const ContentGenerator = require('./services/contentGenerator');
const CampaignManager = require('./services/campaignManager');
const SocialPublisher = require('./services/socialPublisher');
const AnalyticsCollector = require('./services/analyticsCollector');

// Initialize logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
});

// Initialize services
const contentGenerator = new ContentGenerator(logger);
const campaignManager = new CampaignManager(logger);
const socialPublisher = new SocialPublisher(logger);
const analyticsCollector = new AnalyticsCollector(logger);

/**
 * Main agent workflow
 */
async function runAgentWorkflow() {
  logger.info('Starting agent workflow...');

  try {
    // Step 1: Get active campaigns
    const activeCampaigns = await campaignManager.getActiveCampaigns();
    logger.info(`Found ${activeCampaigns.length} active campaigns`);

    for (const campaign of activeCampaigns) {
      logger.info(`Processing campaign: ${campaign.campaignId}`);

      // Step 2: Check if content should be generated based on schedule
      const shouldGenerate = await campaignManager.shouldGenerateContent(campaign);

      if (shouldGenerate) {
        logger.info(`Generating content for campaign: ${campaign.campaignId}`);

        // Step 3: Generate content using AI
        const content = await contentGenerator.generateForCampaign(campaign);
        logger.info(`Generated content: ${content.contentId}`);

        // Step 4: Determine if content should be auto-published or queued for review
        if (campaign.contentSchedule.autoPublish) {
          logger.info(`Auto-publishing content: ${content.contentId}`);

          // Get social targets for this campaign
          const targets = await socialPublisher.getTargetsForCampaign(campaign);

          for (const target of targets) {
            await socialPublisher.publish(content, target);
            logger.info(`Published to ${target.platform} ${target.type}: ${target.name}`);
          }
        } else {
          logger.info(`Content queued for review: ${content.contentId}`);
        }
      }
    }

    // Step 5: Check for scheduled content that needs to be published
    const scheduledContent = await campaignManager.getScheduledContent();
    logger.info(`Found ${scheduledContent.length} scheduled content items`);

    for (const content of scheduledContent) {
      const target = await socialPublisher.getTarget(content.targetGroupId);

      if (target) {
        await socialPublisher.publish(content, target);
        logger.info(`Published scheduled content: ${content.contentId}`);
      }
    }

    // Step 6: Collect analytics for recently published content
    const recentContent = await campaignManager.getRecentlyPublishedContent(7); // Last 7 days
    logger.info(`Collecting analytics for ${recentContent.length} content items`);

    for (const content of recentContent) {
      await analyticsCollector.collectForContent(content);
    }

    logger.info('Agent workflow completed successfully');

  } catch (error) {
    logger.error('Error in agent workflow:', error);
    throw error;
  }
}

/**
 * Schedule agent workflows
 */
function scheduleWorkflows() {
  // Run content generation daily at 8 AM
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running scheduled content generation...');
    await runAgentWorkflow();
  }, {
    timezone: 'Australia/Sydney'
  });

  // Collect analytics every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running scheduled analytics collection...');
    await analyticsCollector.collectAll();
  }, {
    timezone: 'Australia/Sydney'
  });

  // Check for scheduled posts every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Checking for scheduled posts...');
    const scheduledContent = await campaignManager.getScheduledContent();

    for (const content of scheduledContent) {
      const target = await socialPublisher.getTarget(content.targetGroupId);
      if (target) {
        await socialPublisher.publish(content, target);
      }
    }
  }, {
    timezone: 'Australia/Sydney'
  });

  logger.info('Agent workflows scheduled successfully');
}

/**
 * Start the agent service
 */
async function start() {
  logger.info('Starting ProDentHub Agent Service...');

  try {
    // Initialize services
    await contentGenerator.initialize();
    await campaignManager.initialize();
    await socialPublisher.initialize();
    await analyticsCollector.initialize();

    // Schedule workflows
    scheduleWorkflows();

    // Run initial workflow
    if (process.env.RUN_ON_START === 'true') {
      await runAgentWorkflow();
    }

    logger.info('ProDentHub Agent Service started successfully');
    logger.info('Press Ctrl+C to stop');

  } catch (error) {
    logger.error('Failed to start agent service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down agent service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down agent service...');
  process.exit(0);
});

// Start the service
if (require.main === module) {
  start();
}

module.exports = {
  runAgentWorkflow,
  start
};
