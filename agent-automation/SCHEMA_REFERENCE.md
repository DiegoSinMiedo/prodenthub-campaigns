# DynamoDB Schema Reference - Agent Automation System

This document provides sample records and field descriptions for all DynamoDB tables in the agent automation system.

## Table 1: Content Repository (`prodenthub-content`)

Stores all generated content (blog posts, Facebook posts, ad copy, etc.)

### Sample Record

```json
{
  "contentId": "content_01HMXQR7TGKP3VJ2N8F9W4HBZA",
  "type": "facebook_post",
  "campaignId": "team-creation",
  "title": "Join a Study Team and Save on ProDentHub",
  "body": "Why study alone? Form a team of 2-5 dentists and split the cost of ProDentHub's comprehensive ADC exam prep...",
  "status": "scheduled",
  "platform": "facebook",
  "targetGroupId": "group_123456789",
  "targetPageId": null,
  "scheduledAt": "2025-01-15T10:00:00Z",
  "publishedAt": null,
  "createdAt": "2025-01-10T14:23:45Z",
  "updatedAt": "2025-01-10T14:23:45Z",
  "createdBy": "agent",
  "reviewedBy": null,
  "reviewedAt": null,
  "metadata": {
    "wordCount": 250,
    "hasImages": true,
    "imageUrls": ["https://cdn.prodenthub.com.au/social/team-creation-1.jpg"],
    "hashtags": ["#ADCExam", "#DentistryAustralia", "#StudyTogether"],
    "ctaUrl": "https://campaigns.prodenthub.com.au/team-creation/?utm_source=facebook&utm_medium=organic&utm_campaign=team-creation-jan2025",
    "tone": "friendly",
    "audience": "dentists-preparing-adc"
  },
  "analytics": {
    "impressions": 0,
    "clicks": 0,
    "engagement": 0,
    "conversions": 0
  },
  "ttl": 1735689600
}
```

### Field Descriptions

- **contentId**: Unique identifier (ULID format)
- **type**: Content type (facebook_post, blog_post, ad_copy, email, landing_page)
- **campaignId**: Associated campaign ID
- **title**: Content headline/title
- **body**: Main content text
- **status**: draft | scheduled | published | archived
- **platform**: facebook | instagram | linkedin | blog | email | landing_page
- **scheduledAt**: ISO 8601 timestamp for publication
- **publishedAt**: Actual publication timestamp
- **createdBy**: agent | human | system
- **reviewedBy**: User ID of reviewer (optional)
- **metadata**: Platform-specific and content-specific metadata
- **analytics**: Performance metrics (updated from external APIs)
- **ttl**: Unix timestamp for automatic deletion (6 months after creation)

---

## Table 2: Campaign Metadata (`prodenthub-campaigns-metadata`)

Stores campaign configuration and lifecycle information

### Sample Record

```json
{
  "campaignId": "team-creation",
  "name": "Team Study Groups - Q1 2025",
  "description": "Promote team-based pricing for ADC exam preparation",
  "type": "paid",
  "status": "active",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-03-31T23:59:59Z",
  "createdAt": "2024-12-15T10:00:00Z",
  "updatedAt": "2025-01-10T14:23:45Z",
  "landingPageUrl": "https://campaigns.prodenthub.com.au/team-creation/",
  "targetAudience": {
    "location": ["Australia", "New Zealand"],
    "profession": ["Dentist"],
    "examStatus": ["Preparing", "Retaking"],
    "demographics": {
      "ageRange": "25-45",
      "interests": ["ADC Exam", "Dentistry", "Professional Development"]
    }
  },
  "budget": {
    "total": 5000,
    "spent": 1250,
    "currency": "AUD"
  },
  "goals": {
    "leads": 200,
    "conversions": 40,
    "revenue": 11960
  },
  "assets": {
    "images": [
      "https://cdn.prodenthub.com.au/campaigns/team-creation/hero.jpg",
      "https://cdn.prodenthub.com.au/campaigns/team-creation/og-image.jpg"
    ],
    "videos": [],
    "documents": []
  },
  "contentSchedule": {
    "frequency": "weekly",
    "platforms": ["facebook", "blog"],
    "autoGenerate": true
  },
  "analytics": {
    "impressions": 45000,
    "clicks": 3200,
    "conversions": 28,
    "revenue": 8372,
    "ctr": 7.11,
    "conversionRate": 0.88,
    "roas": 6.7
  }
}
```

---

## Table 3: Content Analytics (`prodenthub-content-analytics`)

Stores time-series analytics data for published content

### Sample Record

```json
{
  "analyticsId": "analytics_01HMXQR7TGKP3VJ2N8F9W4HBZA_20250115",
  "contentId": "content_01HMXQR7TGKP3VJ2N8F9W4HBZA",
  "platform": "facebook",
  "date": "2025-01-15",
  "metrics": {
    "impressions": 1250,
    "reach": 980,
    "clicks": 87,
    "likes": 23,
    "comments": 5,
    "shares": 3,
    "saves": 7,
    "linkClicks": 42,
    "ctr": 6.96,
    "engagement": 38,
    "engagementRate": 3.88
  },
  "demographics": {
    "countries": {
      "AU": 85,
      "NZ": 12,
      "UK": 3
    },
    "ageGroups": {
      "25-34": 45,
      "35-44": 40,
      "45-54": 15
    },
    "gender": {
      "male": 42,
      "female": 58
    }
  },
  "conversions": {
    "pageVisits": 42,
    "formSubmissions": 4,
    "purchases": 1,
    "revenue": 299
  },
  "timestamp": "2025-01-15T23:59:59Z"
}
```

---

## Table 4: Publishing History (`prodenthub-publishing-history`)

Audit trail of all content publications

### Sample Record

```json
{
  "publishId": "publish_01HMXQR7TGKP3VJ2N8F9W4HBZA",
  "contentId": "content_01HMXQR7TGKP3VJ2N8F9W4HBZA",
  "platform": "facebook",
  "publishedAt": "2025-01-15T10:00:12Z",
  "publishedBy": "agent",
  "target": {
    "type": "group",
    "id": "group_123456789",
    "name": "ADC Exam Preparation - Australia"
  },
  "externalId": "fb_post_987654321",
  "url": "https://www.facebook.com/groups/123456789/posts/987654321/",
  "status": "success",
  "metadata": {
    "scheduledTime": "2025-01-15T10:00:00Z",
    "actualTime": "2025-01-15T10:00:12Z",
    "delaySeconds": 12,
    "apiVersion": "v18.0",
    "responseCode": 200
  },
  "error": null
}
```

---

## Table 5: Social Media Targets (`prodenthub-social-targets`)

Configuration for Facebook Groups, Pages, and Ad Accounts

### Sample Record

```json
{
  "targetId": "target_facebook_group_001",
  "platform": "facebook",
  "type": "group",
  "name": "ADC Exam Preparation - Australia",
  "externalId": "group_123456789",
  "status": "active",
  "credentials": {
    "accessToken": "encrypted_token_here",
    "tokenExpiry": "2025-06-15T00:00:00Z",
    "permissions": ["publish_to_groups", "read_insights"]
  },
  "postingSchedule": {
    "frequency": "3_times_per_week",
    "preferredTimes": ["10:00", "14:00", "19:00"],
    "timezone": "Australia/Sydney",
    "daysOfWeek": ["Monday", "Wednesday", "Friday"]
  },
  "audience": {
    "size": 12500,
    "location": "Australia",
    "interests": ["ADC Exam", "Dentistry"],
    "demographics": {
      "primaryAge": "25-44",
      "primaryGender": "mixed"
    }
  },
  "performance": {
    "avgEngagementRate": 4.2,
    "avgReach": 1200,
    "totalPosts": 45,
    "totalConversions": 18
  },
  "createdAt": "2024-12-01T10:00:00Z",
  "updatedAt": "2025-01-10T14:23:45Z"
}
```

---

## Table 6: Agent Templates (`prodenthub-agent-templates`)

Prompt templates for content generation

### Sample Record

```json
{
  "templateId": "template_facebook_post_001",
  "category": "facebook_post",
  "name": "Campaign Promotion - Friendly Tone",
  "description": "Template for promoting campaigns on Facebook with friendly, conversational tone",
  "prompt": "Create a Facebook post to promote the {campaignName} campaign. The post should:\n- Start with an engaging hook\n- Explain the key benefit in simple terms\n- Include a clear call-to-action\n- Use 2-3 relevant hashtags\n- Keep it under 250 words\n- Maintain a friendly, helpful tone\n\nTarget audience: {targetAudience}\nKey features: {keyFeatures}\nCTA URL: {ctaUrl}",
  "variables": ["campaignName", "targetAudience", "keyFeatures", "ctaUrl"],
  "metadata": {
    "tone": "friendly",
    "wordCount": "200-250",
    "includeHashtags": true,
    "includeEmojis": true
  },
  "examples": [
    {
      "input": {
        "campaignName": "Team Study Groups",
        "targetAudience": "Dentists preparing for ADC exam",
        "keyFeatures": "Split cost among 2-5 members, Full access for 6 months",
        "ctaUrl": "https://campaigns.prodenthub.com.au/team-creation/"
      },
      "output": "Why tackle the ADC exam alone? 🤝\n\nForm a study team with 2-5 colleagues and split the cost of ProDentHub's comprehensive exam prep. Everyone gets full access for 6 months at a fraction of the individual price!\n\nStudy together, save together, succeed together. 💪\n\nJoin or create your team today → [link]\n\n#ADCExam #DentistryAustralia #StudyTogether"
    }
  ],
  "status": "active",
  "usageCount": 87,
  "avgRating": 4.5,
  "createdAt": "2024-12-01T10:00:00Z",
  "updatedAt": "2025-01-10T14:23:45Z"
}
```

---

## Table 7: Audit Logs (`prodenthub-audit-logs`)

Complete audit trail of all system actions

### Sample Record

```json
{
  "logId": "log_01HMXQR7TGKP3VJ2N8F9W4HBZA",
  "action": "content_published",
  "userId": "agent",
  "timestamp": "2025-01-15T10:00:12Z",
  "resource": {
    "type": "content",
    "id": "content_01HMXQR7TGKP3VJ2N8F9W4HBZA"
  },
  "details": {
    "contentType": "facebook_post",
    "platform": "facebook",
    "targetId": "target_facebook_group_001",
    "scheduledTime": "2025-01-15T10:00:00Z",
    "actualTime": "2025-01-15T10:00:12Z"
  },
  "ip": "203.123.45.67",
  "userAgent": "ProDentHub-Agent/1.0",
  "result": "success",
  "ttl": 1743552012
}
```

### Common Actions

- `content_created`
- `content_updated`
- `content_deleted`
- `content_published`
- `content_scheduled`
- `campaign_created`
- `campaign_updated`
- `campaign_archived`
- `analytics_fetched`
- `api_key_created`
- `api_key_revoked`

---

## Table 8: API Keys (`prodenthub-api-keys`)

Authentication keys for agent and API access

### Sample Record

```json
{
  "keyId": "key_01HMXQR7TGKP3VJ2N8F9W4HBZA",
  "apiKey": "pdh_live_abc123xyz789...",
  "name": "Agent Service - Production",
  "description": "API key for automated content generation and publishing",
  "status": "active",
  "permissions": [
    "content:read",
    "content:write",
    "content:publish",
    "campaigns:read",
    "analytics:read"
  ],
  "rateLimit": {
    "requestsPerMinute": 60,
    "requestsPerDay": 10000
  },
  "createdAt": "2024-12-01T10:00:00Z",
  "lastUsedAt": "2025-01-15T10:00:12Z",
  "expiresAt": "2025-12-01T10:00:00Z",
  "createdBy": "admin@prodenthub.com.au",
  "ipWhitelist": ["203.123.45.67", "203.123.45.68"]
}
```

---

## Relationships Between Tables

```
campaigns (campaignId)
    ↓
content (campaignId) → publishing_history (contentId)
    ↓                      ↓
content_analytics      social_targets (targetId)
(contentId)

agent_templates → content (generated using template)

All actions → audit_logs

api_keys → Used for authentication across all operations
```

---

## Indexes and Query Patterns

### Common Query Patterns

1. **Get all scheduled content**
   - Table: `content`
   - Index: `status-scheduledAt-index`
   - Query: `status = "scheduled" AND scheduledAt <= NOW()`

2. **Get content for a campaign**
   - Table: `content`
   - Index: `campaignId-index`
   - Query: `campaignId = "team-creation"`

3. **Get analytics for content over time**
   - Table: `content_analytics`
   - Index: `contentId-date-index`
   - Query: `contentId = "content_xxx" AND date BETWEEN "2025-01-01" AND "2025-01-31"`

4. **Get publishing history by platform**
   - Table: `publishing_history`
   - Index: `platform-publishedAt-index`
   - Query: `platform = "facebook" ORDER BY publishedAt DESC`

5. **Get active campaigns**
   - Table: `campaigns`
   - Index: `status-createdAt-index`
   - Query: `status = "active"`

6. **Get audit logs by action**
   - Table: `audit_logs`
   - Index: `action-timestamp-index`
   - Query: `action = "content_published" AND timestamp BETWEEN start AND end`

---

## Data Retention Policies

- **Content**: TTL set to 6 months after creation (archived content)
- **Audit Logs**: TTL set to 12 months after creation
- **Analytics**: No TTL (kept indefinitely for historical analysis)
- **Publishing History**: No TTL (permanent audit trail)
- **Campaigns**: Manually archived, no automatic deletion
- **Templates**: No TTL (reusable assets)
- **Social Targets**: No TTL (configuration data)
- **API Keys**: Expire based on `expiresAt` field

---

**Version:** 1.0
**Last Updated:** 2025-01-12
**Maintained By:** ProDentHub Engineering Team
