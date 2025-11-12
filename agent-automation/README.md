# ProDentHub Agent Automation System

Complete automation system for marketing content generation, campaign management, and social media publishing.

## 🎯 Overview

This system enables fully automated marketing workflows:

1. **AI-Powered Content Generation** - Claude/GPT generates blog posts, social media content, and ad copy
2. **Campaign Management** - CRUD operations for campaign lifecycle
3. **Social Media Publishing** - Automated posting to Facebook Groups, Pages, and Ads
4. **Analytics Collection** - Track performance metrics from all platforms
5. **Content Approval Workflow** - Human review before publication
6. **Admin Dashboard** - Web-based interface for managing everything

## 📁 Project Structure

```
agent-automation/
├── core/                           # Agent service (Node.js)
│   ├── src/
│   │   ├── index.js               # Main orchestrator
│   │   └── services/              # Content generation, publishing, analytics
│   └── package.json
│
├── lambda/                         # AWS Lambda functions
│   ├── content-generation/        # AI content generation API
│   ├── campaign-manager/          # Campaign CRUD operations
│   ├── facebook-integration/      # Facebook API integration
│   ├── analytics-collector/       # Analytics collection
│   └── auth-manager/              # API authentication
│
├── admin-dashboard/                # React admin UI
│   ├── src/
│   │   ├── pages/                 # Dashboard, Campaigns, Content, Approvals
│   │   └── services/              # API client
│   └── package.json
│
├── content-templates/              # Prompt templates for content generation
│
└── SCHEMA_REFERENCE.md            # DynamoDB schema documentation
```

## 🚀 Quick Start

### Prerequisites

- AWS Account with appropriate permissions
- Node.js 18.x or higher
- AWS CLI configured
- Anthropic API key (for Claude) or OpenAI API key (for GPT)
- Facebook App with API access

### 1. Deploy Infrastructure

```bash
cd infrastructure/terraform/modules/agent-automation

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Deploy
terraform apply
```

This creates:
- 8 DynamoDB tables
- IAM roles and policies
- S3 buckets for assets

### 2. Deploy Lambda Functions

```bash
cd agent-automation/lambda

# Deploy all functions
./deploy-all.sh

# Or deploy individually
cd content-generation
npm install
npm run build
npm run deploy
```

### 3. Configure Environment Variables

Create `.env` file:

```bash
# AWS
AWS_REGION=ap-southeast-2

# API
API_BASE_URL=https://api.prodenthub.com.au/v1
API_KEY=your_api_key_here

# AI Provider
AI_PROVIDER=anthropic  # or openai
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
AI_MODEL=claude-3-5-sonnet-20241022  # or gpt-4-turbo-preview

# DynamoDB Tables
CONTENT_TABLE=production-prodenthub-content
CAMPAIGNS_TABLE=production-prodenthub-campaigns-metadata
ANALYTICS_TABLE=production-prodenthub-content-analytics
PUBLISHING_HISTORY_TABLE=production-prodenthub-publishing-history
SOCIAL_TARGETS_TABLE=production-prodenthub-social-targets
AGENT_TEMPLATES_TABLE=production-prodenthub-agent-templates
AUDIT_LOGS_TABLE=production-prodenthub-audit-logs
API_KEYS_TABLE=production-prodenthub-api-keys

# Facebook
FACEBOOK_SECRET_NAME=prodenthub/facebook/credentials

# Logging
LOG_LEVEL=info
```

### 4. Set Up Facebook Integration

1. Create Facebook App at https://developers.facebook.com
2. Add permissions: `pages_manage_posts`, `pages_read_engagement`, `groups_access_member_info`, `publish_to_groups`
3. Generate long-lived access token
4. Store in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name prodenthub/facebook/credentials \
  --secret-string '{
    "access_token": "your_token_here",
    "app_id": "your_app_id",
    "app_secret": "your_app_secret"
  }'
```

### 5. Create First API Key

```bash
# Use AWS Lambda Console or CLI
aws lambda invoke \
  --function-name auth-manager-handler \
  --payload '{
    "httpMethod": "POST",
    "path": "/api-keys/create",
    "headers": {"x-master-key": "your_master_key"},
    "body": "{\"name\":\"Agent Service\",\"description\":\"Main agent API key\"}"
  }' \
  response.json

cat response.json
```

Save the returned API key securely.

### 6. Start Agent Service

```bash
cd core

# Install dependencies
npm install

# Set environment variables
export API_KEY=your_api_key_from_step_5
export ANTHROPIC_API_KEY=sk-ant-xxx
export RUN_ON_START=true

# Start service
npm start
```

The agent will:
- Run content generation daily at 8 AM
- Collect analytics every 6 hours
- Check for scheduled posts every hour

### 7. Deploy Admin Dashboard

```bash
cd admin-dashboard

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to S3
aws s3 sync dist/ s3://prodenthub-agent-dashboard/

# Set up CloudFront distribution (optional)
# Point to S3 bucket
```

Access dashboard at: https://agent-dashboard.prodenthub.com.au

## 📊 Architecture

### Data Flow

```
┌─────────────────┐
│  Agent Service  │
│  (Scheduled)    │
└────────┬────────┘
         │
         ├─> Generate Content (Claude/GPT)
         │   └─> Store in DynamoDB
         │
         ├─> Publish to Facebook
         │   └─> Log in Publishing History
         │
         └─> Collect Analytics
             └─> Update Analytics Table

┌─────────────────┐
│ Admin Dashboard │
│   (React App)   │
└────────┬────────┘
         │
         ├─> View Campaigns
         ├─> Approve Content
         ├─> View Analytics
         └─> Manage Settings
```

### API Endpoints

#### Content Generation
```
POST   /content/generate
GET    /content/list
GET    /content/get?contentId={id}
PUT    /content/update
DELETE /content/delete?contentId={id}
```

#### Campaign Management
```
POST   /campaigns/create
GET    /campaigns/list
GET    /campaigns/get?campaignId={id}
PUT    /campaigns/update
POST   /campaigns/activate
POST   /campaigns/archive
```

#### Facebook Integration
```
POST   /facebook/publish
POST   /facebook/schedule
GET    /facebook/analytics?contentId={id}
GET    /facebook/targets/list
POST   /facebook/targets/add
PUT    /facebook/targets/update
```

#### Authentication
```
POST   /api-keys/create
GET    /api-keys/list
POST   /api-keys/revoke
PUT    /api-keys/update
```

## 🎨 Content Templates

Create templates in DynamoDB `agent-templates` table:

```json
{
  "templateId": "template_facebook_post_001",
  "category": "facebook_post",
  "name": "Campaign Promotion - Friendly Tone",
  "prompt": "Create a Facebook post to promote the {campaignName} campaign...",
  "variables": ["campaignName", "targetAudience", "keyFeatures", "ctaUrl"],
  "status": "active"
}
```

## 📈 Monitoring

### CloudWatch Logs

All Lambda functions log to:
```
/aws/lambda/content-generation-handler
/aws/lambda/campaign-manager-handler
/aws/lambda/facebook-integration-handler
/aws/lambda/analytics-collector-handler
/aws/lambda/auth-manager-handler
```

### Key Metrics to Track

- Content generation rate
- Publishing success rate
- API error rates
- Facebook API rate limits
- Analytics collection success rate

### CloudWatch Alarms

Set up alarms for:
- Lambda error rate > 5%
- DynamoDB throttling
- API Gateway 4xx/5xx errors
- Facebook API failures

## 🔒 Security

### API Authentication

All API endpoints require `X-API-Key` header:

```bash
curl -X POST https://api.prodenthub.com.au/v1/content/generate \
  -H "X-API-Key: pdh_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "team-creation",
    "type": "facebook_post"
  }'
```

### Rate Limiting

Default limits per API key:
- 60 requests per minute
- 10,000 requests per day

### Audit Logs

All actions logged to `audit-logs` table:
- Content creation/updates
- Publishing events
- API key usage
- Campaign changes

Query audit logs:
```javascript
// Get all content published in last 24 hours
{
  IndexName: 'action-timestamp-index',
  KeyConditionExpression: 'action = :action AND timestamp > :timestamp',
  ExpressionAttributeValues: {
    ':action': 'content_published',
    ':timestamp': '2025-01-14T00:00:00Z'
  }
}
```

## 🧪 Testing

### Test Content Generation

```bash
curl -X POST http://localhost:3000/content/generate \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "team-creation",
    "type": "facebook_post",
    "variables": {
      "campaignName": "Team Study Groups",
      "targetAudience": "Dentists preparing for ADC exam",
      "keyFeatures": "Split cost, full access, 6 months",
      "ctaUrl": "https://campaigns.prodenthub.com.au/team-creation/"
    }
  }'
```

### Test Facebook Publishing

```bash
curl -X POST http://localhost:3000/facebook/publish \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "content_01HMXQR7TGKP3VJ2N8F9W4HBZA",
    "targetId": "target_facebook_group_001",
    "message": "Test post from automation system"
  }'
```

## 📝 Workflows

### Automated Content Generation Workflow

1. Agent service runs on schedule (daily at 8 AM)
2. Fetches active campaigns from DynamoDB
3. For each campaign with `autoGenerate: true`:
   - Generates content using AI
   - Stores in `content` table with status `draft` or `scheduled`
4. If `autoPublish: true`:
   - Publishes to configured social targets
   - Records in `publishing-history`
5. Otherwise, queues for approval in dashboard

### Manual Content Creation Workflow

1. User creates campaign in dashboard
2. User clicks "Generate Content"
3. API calls Claude/GPT with campaign context
4. Content appears in "Approvals" page
5. User reviews and approves/rejects
6. Approved content published or scheduled

### Analytics Collection Workflow

1. EventBridge triggers Lambda every 6 hours
2. Lambda fetches recently published content
3. For each content item:
   - Queries Facebook Graph API for metrics
   - Stores in `content-analytics` table
   - Updates content record with totals
4. Dashboard displays aggregated metrics

## 🛠️ Troubleshooting

### Issue: Content not being generated

**Check:**
- Agent service is running
- Campaign has `contentSchedule.autoGenerate: true`
- Campaign status is `active`
- API key has `content:write` permission

**Logs:**
```bash
# Check agent service logs
tail -f core/logs/combined.log

# Check Lambda logs
aws logs tail /aws/lambda/content-generation-handler --follow
```

### Issue: Facebook publishing fails

**Check:**
- Facebook access token is valid and not expired
- App has required permissions
- Target (Group/Page) ID is correct
- Rate limits not exceeded

**Test:**
```bash
# Verify Facebook token
curl "https://graph.facebook.com/v18.0/me?access_token=$FB_TOKEN"

# Test posting to group
curl -X POST "https://graph.facebook.com/v18.0/$GROUP_ID/feed" \
  -d "message=Test post" \
  -d "access_token=$FB_TOKEN"
```

### Issue: Analytics not updating

**Check:**
- EventBridge rule is enabled
- Lambda has permissions to read from Facebook API
- Content has `externalId` in publishing history

**Manual trigger:**
```bash
aws lambda invoke \
  --function-name analytics-collector-handler \
  --payload '{}' \
  response.json
```

## 📚 Additional Resources

- [DynamoDB Schema Reference](./SCHEMA_REFERENCE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Facebook Graph API Docs](https://developers.facebook.com/docs/graph-api)
- [Claude API Docs](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)

## 🤝 Contributing

For questions or issues:
- Email: d.villagran.castro@gmail.com
- GitHub: [prodenthub-campaigns](https://github.com/DiegoSinMiedo/prodenthub-campaigns)

## 📄 License

MIT License - ProDentHub 2025

---

**Version:** 1.0.0
**Last Updated:** 2025-01-12
**Status:** Production Ready
