# 🚀 Salesforce Knowledge Integration for SFCC (B2C Commerce)

[![SFCC](https://img.shields.io/badge/SFCC-B2C_Commerce-orange)](https://www.salesforce.com/products/commerce-cloud/overview/)
[![Salesforce](https://img.shields.io/badge/Salesforce-Knowledge-blue)](https://www.salesforce.com/products/service-cloud/features/knowledge-management/)
[![API](https://img.shields.io/badge/API-v58.0-green)](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/)

A powerful, production-ready Salesforce Commerce Cloud (SFCC) B2C Commerce cartridge that seamlessly synchronizes Content Assets to Salesforce Knowledge Articles with **incremental sync**, **automatic field creation**, **versioning support**, and **comprehensive debugging capabilities**.

**Author:** [Neeraj Yadav](https://github.com/neeraj-agentic-lab)

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-neeraj--agentic--lab-181717?logo=github&style=flat-square)](https://github.com/neeraj-agentic-lab)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-n--yadav-0077B5?logo=linkedin&style=flat-square)](https://www.linkedin.com/in/n-yadav/)
[![Issues](https://img.shields.io/github/issues/neeraj-agentic-lab/SFCC-Knowledge-Connector?style=flat-square)](https://github.com/neeraj-agentic-lab/SFCC-Knowledge-Connector/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/neeraj-agentic-lab/SFCC-Knowledge-Connector?style=flat-square)](https://github.com/neeraj-agentic-lab/SFCC-Knowledge-Connector/pulls)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Highlights](#key-highlights)
- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Service Configuration](#service-configuration)
  - [Connected App Setup](#connected-app-setup)
  - [Job Configuration](#job-configuration)
  - [Publishing Control](#publishing-control)
- [Multi-Site Configuration](#-multi-site-configuration-v21)
  - [Configuration Schema](#complete-configuration-schema)
  - [Field Transformations](#field-transformations)
  - [Static Fields](#static-field-values)
  - [Record Types](#record-type-configuration)
  - [Multi-Folder Support](#multi-folder-support)
  - [Configuration Examples](#configuration-examples)
  - [Migration Guide](#migration-from-single-site-to-multi-site)
  - [Troubleshooting](#troubleshooting-multi-site-configuration)
  - [Best Practices](#best-practices)
- [Incremental Sync](#incremental-sync)
- [Field Mapping](#field-mapping)
- [Automatic Field Creation](#automatic-field-creation)
- [Process Flow](#process-flow)
- [Best Practices](#best-practices)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)
- [API Reference](#api-reference)
- [Logging and Debugging](#logging-and-debugging)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Testing](#testing)
- [Contributing](#contributing)

---

## 📖 Overview

This cartridge enables automated synchronization of B2C Commerce Content Assets to Salesforce Knowledge as Knowledge Articles. It provides a robust, production-ready solution for maintaining consistent content across your commerce platform and knowledge base, with **intelligent incremental sync** that dramatically reduces sync time and API usage.

### 🎯 Key Capabilities

- **🔄 Incremental Sync (Delta Mode)**: Syncs only modified content, reducing sync time by up to 95%
- **📦 Content Sync**: Seamless export of B2C Content Assets to Salesforce Knowledge Articles
- **🔍 Smart Upsert Logic**: Automatically creates new articles or updates existing ones based on External ID matching
- **📝 Versioning Support**: Handles Salesforce Knowledge article versioning (Draft → Online states)
- **⚡ Automatic Field Creation**: Dynamically creates custom fields in Salesforce using Tooling API
- **🎨 Flexible Field Mapping**: JSON-based configuration for mapping B2C fields to Salesforce fields
- **📊 Sync Metadata Tracking**: Tracks Knowledge IDs and last sync timestamp on Content Assets
- **🐛 Comprehensive Logging**: Detailed debug logging for troubleshooting and monitoring
- **⚙️ Batch Processing**: Configurable batch sizes (1-500 articles) for optimal performance
- **🔧 Configurable Services**: Dynamic service ID configuration for multi-org support

---

## 🎯 Supported Use Cases

The following use cases represent **approved, scalable patterns** for using Salesforce Knowledge with B2C Commerce content synchronization.

### 1. 🛍️ Pre-Purchase & Discovery Support
**Purpose:** Improve conversion and reduce pre-sales inquiries

**Knowledge Content Examples:**
- Product FAQs (materials, care instructions, compatibility)
- Size and fit guidance (non-personalized)
- Warranty and guarantee explanations
- Digital vs physical product behavior
- Price matching and promotion eligibility rules

**Business Outcome:** Higher conversion rates, fewer pre-purchase support cases

---

### 2. 💰 Pricing, Promotions & Cart Semantics
**Purpose:** Reduce confusion during cart and checkout

**Knowledge Content Examples:**
- How promotions work and apply
- Promotion stacking and exclusion rules
- Why cart prices may change dynamically
- Why items may be removed from cart automatically
- Promo code troubleshooting guidance

**Business Outcome:** Reduced cart abandonment, fewer checkout support cases

---

### 3. 💳 Checkout & Payment Policy Guidance
**Purpose:** Explain checkout behavior without exposing sensitive payment data

**Knowledge Content Examples:**
- Supported payment methods by region
- Authorization vs capture explanation
- Common payment failure reasons (generic guidance)
- Fraud review process overview
- International taxes and duties explanation

**Business Outcome:** Smoother checkout experience, reduced payment-related inquiries

---

### 4. 📦 Order Lifecycle & WISMO Support
**Purpose:** Reduce "Where Is My Order?" (WISMO) inquiries

**Knowledge Content Examples:**
- Order status meanings (Placed, Processing, Shipped, Delivered)
- Split shipment explanations
- Multi-warehouse fulfillment logic
- Preorder and backorder handling
- Delivery delay scenarios

**Key Principle:** Knowledge explains *what a status means*, not *what a specific order is doing*

**Business Outcome:** 30-40% reduction in WISMO cases

---

### 5. 🚚 Shipping & Delivery Policies
**Purpose:** Set accurate delivery expectations

**Knowledge Content Examples:**
- Shipping methods and service level agreements (SLAs)
- Order cutoff times for same-day processing
- Weekend and holiday handling policies
- International shipping rules and restrictions
- Carrier delay explanations
- Lost or damaged shipment process

**Business Outcome:** Reduced delivery expectation mismatches

---

### 6. 🔄 Returns, Refunds & Exchanges
**Purpose:** Reduce cost and escalation in the highest-volume support area

**Knowledge Content Examples:**
- Return eligibility rules (time windows, condition requirements)
- Exchange vs refund processes
- Refund timing by payment method
- Partial return handling
- Gift and bundle return rules
- Return shipping cost policies

**Excluded:** Customer-specific refund amounts, payment identifiers

**Business Outcome:** Self-service return handling, reduced agent workload

---

### 7. 💳 Payment Semantics (Policy-Only)
**Purpose:** Explain payment behavior safely

**Knowledge Content Examples:**
- Supported payment instruments
- Split payment rules and limitations
- Gift card and store credit usage policies
- Authorization release timelines
- Pending vs completed transaction explanations

**Business Outcome:** Payment transparency without security risk

---

### 8. 🔁 Subscription & Recurring Commerce
**Purpose:** Support subscription-based business models

**Knowledge Content Examples:**
- Subscription billing cadence and cycles
- Pause, skip, and cancel subscription rules
- Renewal behavior and notifications
- Failed payment retry policy
- Subscription modification policies

**Business Outcome:** Reduced subscription churn, improved self-service

---

### 9. 📧 Commerce Messaging Explanation
**Purpose:** Support transactional and lifecycle messaging

**Knowledge Content Examples:**
- Order confirmation email timing and content
- Multiple shipment notification logic
- Back-in-stock notification behavior
- Account security alert explanations
- Marketing vs transactional email distinction

**Business Outcome:** Reduced "why did I get this email?" inquiries

---

### 10. 🤖 AI & Agent Assist Grounding
**Purpose:** Enable safe AI usage without hallucination

**Knowledge Usage:**
- Grounding for Agentforce and Einstein Copilot responses
- Suggested agent replies with approved phrasing
- Legal-safe language for refunds and cancellations
- Consistent policy enforcement across channels
- AI-powered article recommendations

**Key Benefit:** Knowledge acts as the **approved source of truth** for AI-generated explanations

**Business Outcome:** Safe AI deployment, reduced AI hallucination risk

---

### 11. 👥 Agent Enablement (Internal Knowledge)
**Purpose:** Reduce average handle time (AHT) and tribal knowledge dependency

**Knowledge Content Examples:**
- Commerce lifecycle flow explanations
- OMS and Commerce Cloud interaction patterns
- Manual exception handling procedures
- Escalation criteria and workflows
- Agent capability boundaries (what agents can/cannot promise)

**Business Outcome:** Faster agent onboarding, consistent service quality

---

### 12. 🌐 Self-Service & Help Center
**Purpose:** Case deflection and customer empowerment

**Knowledge Content Examples:**
- Order tracking instructions
- Return initiation guides
- Account and subscription management
- Loyalty program rules and benefits
- Password reset and account recovery

**Business Outcome:** 20-30% case deflection rate

---

### 13. 🌍 Global & Localization Support
**Purpose:** Enable multi-region commerce operations

**Knowledge Content Examples:**
- VAT / GST explanations by region
- Duties and customs rules
- Region-specific return policies
- Market-specific shipping constraints
- Currency and payment method variations

**Business Outcome:** Consistent global customer experience

---

### 14. ⚖️ Governance & Compliance
**Purpose:** Ensure legal and operational consistency

**Knowledge Content Examples:**
- Approved refund language and disclaimers
- Delivery commitment disclaimers
- Proof-of-purchase requirements
- Versioned and time-bound policies
- Regulatory compliance messaging

**Business Outcome:** Reduced legal risk, audit-ready operations

---

## ⭐ Key Highlights

### 🚄 Performance
- **95% faster sync**: Delta mode processes only changed content
- **Scalable**: Handles 1000+ content assets efficiently
- **Batch processing**: Configurable batches prevent timeout issues
- **Request-scoped caching**: Minimizes redundant API calls

### 🛡️ Production-Ready
- **Error recovery**: Graceful error handling with partial success support
- **Comprehensive logging**: Track every operation with detailed logs
- **OAuth 2.0 security**: Industry-standard authentication
- **Field-level security**: Automatic permission configuration

### 🎯 Developer-Friendly
- **Zero-config field creation**: Automatically creates missing Salesforce fields
- **Flexible mapping**: Map any B2C field to any Salesforce field
- **Debug mode**: See raw data, mappings, and API payloads
- **MarkupText support**: Handles SFCC-specific data types

---

## ⚡ Quick Start

Get up and running in **5 minutes**:

### 1. Upload Cartridge
```bash
# Upload to your SFCC instance
# Add to cartridge path: int_salesforce_knowledge:your_cartridges
```

### 2. Import Metadata
```
Business Manager > Administration > Site Development > Import & Export
> Meta Data tab > Upload: cartridge/metadata/content-metadata.xml
```

### 3. Configure Service
```
Business Manager > Administration > Operations > Services
> Create credential: salesforce.oauth
> Add attributes: clientid, clientsecret, granttype
```

### 4. Create Job
```
Business Manager > Administration > Operations > Jobs
> New Job > Add Step: custom.ExportContentToKnowledge
> Set parameters: ServiceID, SiteConfigurations (JSON)
```

### 5. Run Job
```
Click "Run Now" or schedule for automated sync
```

**✅ That's it!** Your content will start syncing to Salesforce Knowledge.

---

## 🎯 Features

### ✨ Core Synchronization Features

| Feature | Description | Benefit |
|---------|-------------|---------|
| **🔄 Incremental Sync** | Delta mode syncs only modified content since last sync | **95% faster**, dramatically reduced API usage |
| **📦 Full Sync Mode** | Option to sync all content regardless of last sync date | Perfect for initial migration and recovery |
| **🎯 Smart Upsert Logic** | Automatically creates new or updates existing articles | No manual article management needed |
| **📊 Sync Metadata Tracking** | Tracks Knowledge IDs and timestamps on Content Assets | Enables intelligent delta sync |
| **🔍 External ID Matching** | Uses `SFCC_External_ID__c` for reliable content identification | Prevents duplicate articles |
| **📝 Versioning Management** | Handles Draft → Online article state transitions | Complies with Salesforce Knowledge rules |
| **🚀 Publish Control** | Configurable auto-publish or keep as draft for manual review | Flexible approval workflows |
| **📂 Folder-Based Sync** | Sync specific folders or all content recursively | Flexible content organization |

### 🔧 Advanced Features

| Feature | Description | Benefit |
|---------|-------------|---------|
| **⚡ Auto Field Creation** | Dynamically creates custom fields via Tooling API | Zero manual field setup required |
| **🔒 Field-Level Security** | Automatically configures permissions and Permission Sets | Secure by default |
| **🎨 Flexible Mapping** | JSON-based field mapping with nested property support | Map any B2C field to any SF field |
| **🖼️ MarkupText Support** | Properly handles SFCC MarkupText objects | Rich HTML content syncs correctly |
| **📑 Multiple Article Types** | Works with standard and custom Knowledge Article types | Supports custom implementations |
| **🏷️ Data Categories** | Assigns articles to Knowledge data categories | Organized knowledge base |
| **🐛 Debug Mode** | Comprehensive logging of raw data, mappings, API payloads | Troubleshooting made easy |
| **⚙️ Configurable Services** | Dynamic service ID for multi-org support | Works with multiple SF orgs |

### 🛡️ Production-Ready Features

| Feature | Description | Benefit |
|---------|-------------|---------|
| **🔐 OAuth 2.0 Security** | Supports Username-Password and Client Credentials flows | Industry-standard authentication |
| **💾 Token Caching** | Request-scoped caching reduces token requests | Optimal performance |
| **📊 Batch Processing** | Configurable batch sizes (1-500 articles) | Prevents timeouts, handles large datasets |
| **⚠️ Error Handling** | Graceful error handling with partial success support | Resilient sync operations |
| **📝 Comprehensive Logging** | Detailed logs with 5+ log categories | Complete audit trail |
| **📈 Status Reporting** | Clear success/failure counts and timing metrics | Easy monitoring |
| **🔄 Service Framework** | Uses SFCC Service Framework for reliability | Built-in retry and circuit breaking |
| **✅ Validation** | Pre-sync validation of configuration and fields | Fail fast with clear error messages |

---

## Architecture

### Component Overview

```
int_salesforce_knowledge/
├── cartridge/
│   ├── scripts/
│   │   ├── jobs/
│   │   │   └── ExportContentToKnowledge.js      # Main job entry point
│   │   ├── helpers/
│   │   │   ├── salesforceAuthHelper.js          # OAuth authentication
│   │   │   ├── salesforceKnowledgeHelper.js     # Knowledge API operations
│   │   │   ├── salesforceToolingHelper.js       # Tooling API for field creation
│   │   │   └── contentMappingHelper.js          # B2C content retrieval & mapping
│   │   └── services/
│   │       └── salesforceKnowledgeService.js    # Service definitions
│   ├── metadata/
│   │   └── content-metadata.xml                 # Custom attributes for sync metadata
│   └── steptypes.json                           # Job step type definition
└── README.md
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SFCC B2C Commerce                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │           Content Assets (Content Library)                │ │
│  │  • FAQ Articles                                           │ │
│  │  • Help Documentation                                     │ │
│  │  • Product Information                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Export Job (Scheduled/Manual)                │ │
│  │  • Reads Content Assets                                   │ │
│  │  • Maps Fields                                            │ │
│  │  • Batch Processing                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             │ OAuth 2.0 Authentication
                             │ (Service Framework)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Salesforce                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   Tooling API                             │ │
│  │  • Field Existence Check                                  │ │
│  │  • Custom Field Creation                                  │ │
│  │  • Permission Set Management                              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                 Knowledge API                             │ │
│  │  • Query Existing Articles (SOQL)                        │ │
│  │  • Create Draft Articles                                  │ │
│  │  • Update Articles (Versioning)                           │ │
│  │  • Publish Articles (Actions API)                         │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                    │
│                            ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               Knowledge Articles                          │ │
│  │  • Knowledge__kav (Standard)                              │ │
│  │  • Custom Article Types                                   │ │
│  │  • Published Articles                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Content Retrieval**: Job reads Content Assets from B2C Commerce Content Library
2. **Field Validation**: Checks/creates custom fields in Salesforce Knowledge Article type
3. **Authentication**: Obtains OAuth access token using configured service
4. **Content Mapping**: Transforms B2C content to Salesforce article format
5. **Upsert Logic**: Queries for existing articles by External ID
   - If exists: Update article (handles versioning)
   - If not exists: Create new article
6. **Publishing**: Publishes draft articles to make them live
7. **Logging**: Reports success/failure counts and any errors

---

## Installation

### Prerequisites

- Salesforce Commerce Cloud B2C instance (version 21.x or higher)
- Salesforce org with Knowledge enabled
- Connected App configured in Salesforce
- Admin access to both platforms

### Step 1: Upload Cartridge

1. Clone or download this repository
2. Upload the `int_salesforce_knowledge` cartridge to your SFCC instance
3. Add `int_salesforce_knowledge` to your site's cartridge path:
   ```
   Administration > Sites > Manage Sites > [Your Site] > Settings
   Cartridge Path: int_salesforce_knowledge:other_cartridges...
   ```

### Step 2: Import Content Metadata

Import custom attribute definitions for Content Assets to enable incremental sync:

1. Navigate to: `Administration > Site Development > Import & Export`
2. Select the **Meta Data** tab
3. Choose file: `int_salesforce_knowledge/cartridge/metadata/content-metadata.xml`
4. Click **Import**
5. Verify import success

This creates three custom attributes on Content Assets:
- `sfKnowledgeArticleId`: Tracks Salesforce Knowledge Article ID
- `sfKnowledgeVersionId`: Tracks current version ID
- `sfLastSyncDateTime`: Tracks last sync timestamp

**Note**: This step is required for delta sync mode to work properly.

---

## Configuration

### Service Configuration

Configure the Salesforce service in Business Manager:

**Path**: `Administration > Operations > Services > Credentials`

#### Step 1: Create Service Credential

1. Click **New** to create a new credential
2. Set the following:
   - **ID**: `salesforce.oauth` (or your custom ID)
   - **URL**: Your Salesforce login URL
     - Production: `https://login.salesforce.com`
     - Sandbox: `https://test.salesforce.com`
   - **User ID**: Salesforce username (for password grant)
   - **Password**: Salesforce password + security token (for password grant)

#### Step 2: Add Custom Credential Attributes

Add these custom attributes to the credential:

| Attribute Name | Value | Description |
|----------------|-------|-------------|
| `clientid` | Your Connected App Consumer Key | OAuth Client ID |
| `clientsecret` | Your Connected App Consumer Secret | OAuth Client Secret |
| `granttype` | `password` or `client_credentials` | OAuth grant type |
| `securityToken` | Your security token (optional for password grant) | Salesforce security token |

#### Step 3: Create Service Profile

**Path**: `Administration > Operations > Services > Profiles`

1. Click **New** to create a new profile
2. Set the following:
   - **ID**: `salesforce.oauth.profile`
   - **Credential**: Select the credential created above
   - **Timeout**: `30000` (30 seconds)
   - **Communication Log**: Enable for debugging

#### Service Configuration Example

```
Service ID: salesforce.oauth
URL: https://login.salesforce.com
Timeout: 30000ms

Custom Attributes:
  clientid: 3MVG9...your_consumer_key
  clientsecret: 1234...your_consumer_secret
  granttype: password
```

### Connected App Setup

Configure a Connected App in Salesforce to enable OAuth:

#### Step 1: Create Connected App

1. In Salesforce, go to: `Setup > Apps > App Manager > New Connected App`
2. Fill in:
   - **Connected App Name**: `SFCC Knowledge Integration`
   - **API Name**: `SFCC_Knowledge_Integration`
   - **Contact Email**: Your email
3. Enable OAuth Settings:
   - ☑ **Enable OAuth Settings**
   - **Callback URL**: `https://login.salesforce.com/services/oauth2/callback`
   - **Selected OAuth Scopes**:
     - `Full access (full)`
     - `Perform requests at any time (refresh_token, offline_access)`
     - `Manage user data via APIs (api)`

#### Step 2: Configure OAuth Policies

1. Go to: `Setup > Apps > Connected Apps > Manage Connected Apps`
2. Select your Connected App
3. Click **Edit Policies**
4. Set:
   - **Permitted Users**: `All users may self-authorize`
   - **IP Relaxation**: `Relax IP restrictions`
   - **Refresh Token Policy**: `Refresh token is valid until revoked`

#### Step 3: Get Consumer Key and Secret

1. In the Connected App details, copy:
   - **Consumer Key** → Use as `clientid` in service credential
   - **Consumer Secret** → Use as `clientsecret` in service credential

### Job Configuration

Create and configure the export job in Business Manager:

**Path**: `Administration > Operations > Jobs`

#### Step 1: Create Job

1. Click **New Job**
2. Set:
   - **ID**: `ExportContentToSalesforceKnowledge`
   - **Description**: `Export B2C Content Assets to Salesforce Knowledge`

#### Step 2: Add Job Step

1. Click **Job Steps** tab
2. Click **New**
3. Configure:
   - **ID**: `ExportContent`
   - **Type**: `custom.ExportContentToKnowledge`
   - **Description**: `Export content to Salesforce Knowledge`

#### Step 3: Configure Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| **ServiceID** | String | No | Service ID from Operations > Services (default: `salesforce.oauth`) |
| **SiteConfigurations** | Text | Yes | Multi-site configuration JSON with `_defaults` inheritance. See [Multi-Site Configuration](#-multi-site-configuration-v21) section for complete documentation and examples. |

**Note**: As of v2.1+, all configuration is done through the `SiteConfigurations` parameter using JSON. This replaces individual parameters and enables:
- Site-specific configurations with defaults inheritance
- Field transformations (urlSafe, replaceSpaces, etc.)
- Static field values
- Record Type configuration by API name
- Multi-folder support with deduplication

**See the [Multi-Site Configuration](#-multi-site-configuration-v21) section below for:**
- Complete configuration schema
- Field transformations
- Static field values
- Record Type configuration
- Multiple configuration examples (simple to production-ready)

#### Step 4: Schedule Job (Optional)

1. Click **Schedule and History** tab
2. Click **New**
3. Set schedule:
   - **Interval**: Every 1 Hour (or as needed)
   - **Start Time**: Choose appropriate time
   - **Time Zone**: Your time zone

### Publishing Control

The integration provides configurable control over whether articles are automatically published or remain in draft status for manual review.

#### PublishArticles Parameter

By default, articles are **NOT automatically published** (PublishArticles: false). This allows for manual review and approval workflows before content goes live.

**Configuration Options:**

```
PublishArticles: false  (default)
- Articles created/updated as drafts
- Remain in draft status for manual review
- Must be published manually in Salesforce
- Recommended for: Production environments with approval workflows
```

```
PublishArticles: true
- Articles automatically published after creation/update
- Go live immediately (Draft → Online)
- No manual intervention required
- Recommended for: Automated content pipelines, non-production environments
```

**Use Cases:**

| Scenario | Recommended Setting | Reason |
|----------|-------------------|--------|
| **Production with approval** | `false` | Content reviewed before publishing |
| **Automated pipeline** | `true` | Fully automated content delivery |
| **Staging/Testing** | `true` | Faster testing cycles |
| **Multiple reviewers** | `false` | Draft workflow supports collaboration |
| **High-risk content** | `false` | Additional review layer before publishing |

**Logging:**

When PublishArticles is disabled, you'll see logs like:
```
INFO: PublishArticles is disabled, article will remain in draft status
INFO: Successfully updated draft article: ka0xx000000002
```

When enabled:
```
INFO: PublishArticles is enabled, publishing article
INFO: Successfully published article: kA0xx000000001
```

**Manual Publishing:**

If PublishArticles is set to false, articles can be published manually in Salesforce:
1. Navigate to: `Service > Knowledge > Articles`
2. Find the article by title or External ID
3. Click **Publish**
4. Confirm publication

**Important: Version Handling with Draft Mode**

When `PublishArticles: false` (draft mode), the integration intelligently handles article versions:

| Current State in Salesforce | What Happens on Sync | Result |
|----------------------------|---------------------|---------|
| **No article exists** | Creates new draft | New draft article created |
| **Draft exists** | Updates existing draft | Same draft updated (no new version) |
| **Online exists, no draft** | Creates draft from online, then updates | New draft version created |
| **Both Online + Draft exist** | Updates existing draft | Draft updated (no duplicate) |

**Example Workflow:**
```
Day 1, Run 1 (PublishArticles: false):
- Content "FAQ-001" synced → Creates Draft (ka0001)
- Draft remains unpublished

Day 1, Run 2 (same content modified):
- Finds existing Draft (ka0001)
- Updates Draft ka0001 in-place
- Still Draft (no new version created)

Day 2 (manually publish in Salesforce):
- Draft ka0001 published → becomes Online

Day 2, Run 3 (content modified again):
- Finds Online version
- Creates NEW Draft ka0002 from Online
- Updates Draft ka0002
- Online ka0001 remains published
```

This prevents the "TRANSLATIONALREADYEXIST" error and allows iterative content refinement before publishing.

---

## 🌐 Multi-Site Configuration (v2.1+)

**New in v2.1**: Configure multiple sites with different settings in a single job using the `SiteConfigurations` parameter.

### Why Multi-Site Configuration?

Instead of creating separate jobs for each site, you can now:
- ✅ Configure all sites in one place with a single JSON parameter
- ✅ Use `_defaults` to reduce duplication (DRY principle)
- ✅ Override specific settings per site
- ✅ Support site-specific Record Types, field transformations, static fields, and folders
- ✅ Maintain backward compatibility with single-site configurations

### Quick Example

```json
{
  "_defaults": {
    "articleType": "Knowledge__kav",
    "fieldMapping": { "Title": "name", "Body__c": "custom.body" },
    "transforms": { "UrlName": "urlSafe:-" },
    "static": { "Source__c": "SFCC" }
  },
  "RefArch": {
    "contentFolderIDs": ["us-faq"],
    "recordTypeName": "Product_FAQ",
    "static": { "SubsidiaryID__c": 7, "RegionCode__c": "US" }
  },
  "RefArchGlobal": {
    "contentFolderIDs": ["eu-faq"],
    "recordTypeName": "Support_Article",
    "static": { "SubsidiaryID__c": 12, "RegionCode__c": "EU" }
  }
}
```

---

### Complete Configuration Schema

```json
{
  "_defaults": {
    // Article Configuration
    "articleType": "Knowledge__kav",
    "contentFolderIDs": ["root"],
    "batchSize": 50,
    "exportMode": "delta",
    "publishArticles": false,
    "enableDebugLogging": false,
    "autoCreateFields": true,

    // Field Mapping (Salesforce Field → B2C Field Path)
    "fieldMapping": {
      "Title": "name",
      "Summary": "pageDescription",
      "Body__c": "custom.body",
      "SFCC_External_ID__c": "ID",
      "UrlName": "name",
      "Author__c": "custom.author",
      "Category__c": "custom.category"
    },

    // Field Transformations
    "transforms": {
      "UrlName": "urlSafe:-",
      "Summary": "lowercase"
    },

    // Static Field Values
    "static": {
      "Source__c": "SFCC",
      "Platform__c": "B2C Commerce"
    },

    // Field Metadata for Auto-Creation
    "fieldMetadata": {
      "Body__c": {
        "type": "LongTextArea",
        "length": 32000,
        "visibleLines": 10,
        "label": "Article Body",
        "description": "Rich text content from B2C Commerce"
      },
      "SFCC_External_ID__c": {
        "type": "Text",
        "length": 255,
        "label": "SFCC External ID",
        "description": "B2C content asset ID for synchronization"
      }
    }
  },

  // Site-Specific Configurations
  "RefArch": {
    "contentFolderIDs": ["us-faq", "us-help", "us-guides"],
    "recordTypeName": "Product_FAQ",
    "dataCategory": "Products:Electronics",
    "transforms": {
      "UrlName": "urlSafe:-",
      "Slug__c": "replaceSpaces:_"
    },
    "static": {
      "SubsidiaryID__c": 7,
      "RegionCode__c": "US",
      "LanguageCode__c": "en_US",
      "Priority__c": 1
    }
  },

  "RefArchGlobal": {
    "contentFolderIDs": ["eu-faq", "eu-help"],
    "recordTypeName": "Support_Article",
    "dataCategory": "Support:International",
    "batchSize": 100,
    "transforms": {
      "UrlName": "urlSafe:_"
    },
    "static": {
      "SubsidiaryID__c": 12,
      "RegionCode__c": "EU",
      "LanguageCode__c": "en_GB"
    }
  }
}
```

---

### Configuration Components

#### 1. `_defaults` Section (Required)

The `_defaults` object contains baseline configuration inherited by all sites.

**Purpose**: Define common settings once, avoid repetition across sites.

```json
{
  "_defaults": {
    "articleType": "Knowledge__kav",
    "fieldMapping": { "Title": "name", "Body__c": "custom.body" },
    "static": { "Source__c": "SFCC" }
  }
}
```

#### 2. Site-Specific Sections

Each site (identified by Site ID) can override any default setting.

**Format**: `"SiteID": { configuration }`

```json
{
  "RefArch": {
    "recordTypeName": "Product_FAQ",
    "static": { "SubsidiaryID__c": 7 }
  }
}
```

**Inheritance**: Site inherits all `_defaults` settings, then applies its own overrides.

---

### Field Transformations

Transform field values before sending to Salesforce.

#### Available Transformations

| Transform | Syntax | Example Input | Example Output |
|-----------|--------|---------------|----------------|
| **replaceSpaces** | `replaceSpaces:-` | `"How to Reset"` | `"How-to-Reset"` |
| | `replaceSpaces:_` | `"How to Reset"` | `"How_to_Reset"` |
| | `replaceSpaces:` | `"How to Reset"` | `"HowtoReset"` |
| **urlSafe** | `urlSafe:-` | `"How to Reset?"` | `"how-to-reset"` |
| | `urlSafe:_` | `"C++ Guide!"` | `"c_guide"` |
| **lowercase** | `lowercase` | `"Product FAQ"` | `"product faq"` |
| **uppercase** | `uppercase` | `"product faq"` | `"PRODUCT FAQ"` |
| **removeSpaces** | `removeSpaces` | `"How to Reset"` | `"HowtoReset"` |

#### Simple Syntax (String)

```json
"transforms": {
  "UrlName": "replaceSpaces:-",
  "Slug__c": "urlSafe:_",
  "InternalKey__c": "uppercase"
}
```

#### Advanced Syntax (Object)

```json
"transforms": {
  "CustomField__c": {
    "type": "replace",
    "pattern": "[^a-zA-Z0-9]",
    "replaceWith": "_",
    "flags": "g"
  }
}
```

#### Real-World Example

**Input**: Content asset with `name = "How to Reset Password"`

```json
{
  "fieldMapping": {
    "Title": "name",
    "UrlName": "name",
    "Slug__c": "name",
    "DisplayName__c": "name"
  },
  "transforms": {
    "UrlName": "urlSafe:-",
    "Slug__c": "replaceSpaces:_",
    "DisplayName__c": "lowercase"
  }
}
```

**Output** in Salesforce:
- `Title`: `"How to Reset Password"` (no transform)
- `UrlName`: `"how-to-reset-password"` (URL-safe)
- `Slug__c`: `"How_to_Reset_Password"` (underscores)
- `DisplayName__c`: `"how to reset password"` (lowercase)

---

### Static Field Values

Set fixed values for Salesforce fields that don't come from content assets.

#### Use Cases

- **Metadata**: Source system identifier, platform name
- **Organization**: Subsidiary ID, region code, language
- **Categorization**: Priority, status, type

#### Configuration

```json
"static": {
  "Source__c": "SFCC",
  "Platform__c": "B2C Commerce",
  "SubsidiaryID__c": 7,
  "RegionCode__c": "US",
  "LanguageCode__c": "en_US",
  "Priority__c": 1,
  "Status__c": "Active"
}
```

#### Data Types Supported

- **String**: `"Source__c": "SFCC"`
- **Number**: `"SubsidiaryID__c": 7`
- **Boolean**: `"IsActive__c": true`

#### Merging Behavior

Static fields are merged **after** field mapping and transformations.

**Precedence**: Static values > Transformed values > Mapped values

---

### Record Type Configuration

Configure Record Types using API Names (DeveloperName) instead of org-specific IDs.

#### Why Use Record Types?

- Different article types in Salesforce (Product FAQ, Support Article, etc.)
- Page layouts and field requirements vary by Record Type
- Org-specific IDs change between sandbox and production

#### Configuration

```json
{
  "RefArch": {
    "recordTypeName": "Product_FAQ"
  },
  "RefArchGlobal": {
    "recordTypeName": "Support_Article"
  }
}
```

#### How It Works

1. Integration looks up Record Type by `DeveloperName` using SOQL
2. Caches the Record Type ID for the job execution
3. Adds `RecordTypeId` to article payload

**Query**:
```sql
SELECT Id, Name, DeveloperName
FROM RecordType
WHERE SObjectType = 'Knowledge' AND DeveloperName = 'Product_FAQ'
LIMIT 1
```

**Benefits**:
- ✅ Org-agnostic configuration
- ✅ Works across sandbox and production
- ✅ Automatic caching (one lookup per site per execution)

---

### Multi-Folder Support

Aggregate content from multiple folders per site with automatic deduplication.

#### Syntax Options

**Array** (Recommended):
```json
"contentFolderIDs": ["us-faq", "us-help", "us-guides"]
```

**Comma-Separated String**:
```json
"contentFolderIDs": "us-faq,us-help,us-guides"
```

**Single Folder**:
```json
"contentFolderIDs": "root"
```

#### Deduplication

If the same content appears in multiple folders, it's only exported once.

**Example**:
- Folder `us-faq` contains: `faq-001`, `faq-002`
- Folder `us-help` contains: `faq-002`, `help-001`
- **Result**: Exports `faq-001`, `faq-002` (once), `help-001`

---

### Configuration Examples

#### Example 1: Simple Multi-Site with Defaults

**Scenario**: Two sites with minimal differences.

```json
{
  "_defaults": {
    "articleType": "Knowledge__kav",
    "fieldMapping": {
      "Title": "name",
      "Body__c": "custom.body",
      "SFCC_External_ID__c": "ID",
      "UrlName": "name"
    },
    "transforms": {
      "UrlName": "urlSafe:-"
    },
    "static": {
      "Source__c": "SFCC"
    }
  },
  "RefArch": {
    "contentFolderIDs": ["us-content"],
    "static": { "RegionCode__c": "US" }
  },
  "RefArchGlobal": {
    "contentFolderIDs": ["eu-content"],
    "static": { "RegionCode__c": "EU" }
  }
}
```

**Result**:
- Both sites use same field mapping and transforms
- Each site has different content folders and region codes
- Configuration is ~70% smaller than duplicating everything

#### Example 2: Different Record Types per Site

**Scenario**: US site uses Product FAQ, EU site uses Support Article.

```json
{
  "_defaults": {
    "articleType": "Knowledge__kav",
    "fieldMapping": {
      "Title": "name",
      "Body__c": "custom.body",
      "SFCC_External_ID__c": "ID"
    },
    "autoCreateFields": true
  },
  "RefArch": {
    "recordTypeName": "Product_FAQ",
    "dataCategory": "Products:Electronics",
    "contentFolderIDs": ["us-faq", "us-products"]
  },
  "RefArchGlobal": {
    "recordTypeName": "Support_Article",
    "dataCategory": "Support:International",
    "contentFolderIDs": ["eu-support"]
  }
}
```

#### Example 3: Site-Specific Transformations

**Scenario**: Different URL conventions per region.

```json
{
  "_defaults": {
    "fieldMapping": {
      "Title": "name",
      "UrlName": "name",
      "Slug__c": "name"
    }
  },
  "RefArch": {
    "transforms": {
      "UrlName": "urlSafe:-",
      "Slug__c": "replaceSpaces:-"
    }
  },
  "RefArchGlobal": {
    "transforms": {
      "UrlName": "urlSafe:_",
      "Slug__c": "replaceSpaces:_"
    }
  },
  "RefArchJapan": {
    "transforms": {
      "UrlName": "urlSafe:_",
      "Slug__c": "lowercase"
    }
  }
}
```

**Results** for content `"Product FAQ"`:

| Site | UrlName | Slug__c |
|------|---------|---------|
| RefArch | `product-faq` | `Product-FAQ` |
| RefArchGlobal | `product_faq` | `Product_FAQ` |
| RefArchJapan | `product_faq` | `product faq` |

#### Example 4: Complete Production Configuration

**Scenario**: 5 sites with all features.

```json
{
  "_defaults": {
    "articleType": "Knowledge__kav",
    "batchSize": 50,
    "exportMode": "delta",
    "publishArticles": false,
    "enableDebugLogging": false,
    "autoCreateFields": true,

    "fieldMapping": {
      "Title": "name",
      "Summary": "pageDescription",
      "Body__c": "custom.body",
      "SFCC_External_ID__c": "ID",
      "UrlName": "name",
      "Author__c": "custom.author"
    },

    "transforms": {
      "UrlName": "urlSafe:-",
      "Summary": "lowercase"
    },

    "static": {
      "Source__c": "SFCC",
      "Platform__c": "B2C Commerce",
      "Status__c": "Active"
    },

    "fieldMetadata": {
      "Body__c": {
        "type": "LongTextArea",
        "length": 32000,
        "visibleLines": 10,
        "label": "Article Body"
      },
      "SFCC_External_ID__c": {
        "type": "Text",
        "length": 255,
        "label": "SFCC External ID"
      },
      "Author__c": {
        "type": "Text",
        "length": 100,
        "label": "Author"
      }
    }
  },

  "RefArch": {
    "contentFolderIDs": ["us-faq", "us-help", "us-guides"],
    "recordTypeName": "Product_FAQ",
    "dataCategory": "Products:Electronics",
    "static": {
      "SubsidiaryID__c": 7,
      "RegionCode__c": "US",
      "LanguageCode__c": "en_US",
      "Priority__c": 1
    }
  },

  "RefArchGlobal": {
    "contentFolderIDs": ["eu-faq", "eu-help"],
    "recordTypeName": "Support_Article",
    "dataCategory": "Support:International",
    "batchSize": 100,
    "transforms": {
      "UrlName": "urlSafe:_"
    },
    "static": {
      "SubsidiaryID__c": 12,
      "RegionCode__c": "EU",
      "LanguageCode__c": "en_GB",
      "Priority__c": 2
    }
  },

  "RefArchJapan": {
    "contentFolderIDs": ["jp-faq"],
    "recordTypeName": "Support_Article",
    "dataCategory": "Support:Asia",
    "transforms": {
      "UrlName": "urlSafe:_"
    },
    "static": {
      "SubsidiaryID__c": 15,
      "RegionCode__c": "JP",
      "LanguageCode__c": "ja_JP",
      "Priority__c": 3
    }
  },

  "RefArchCanada": {
    "contentFolderIDs": ["ca-faq-en", "ca-faq-fr"],
    "recordTypeName": "Product_FAQ",
    "dataCategory": "Products:North_America",
    "publishArticles": true,
    "static": {
      "SubsidiaryID__c": 8,
      "RegionCode__c": "CA",
      "Priority__c": 1
    }
  },

  "SiteGenesis": {
    "contentFolderIDs": ["sitegenesis"],
    "enableDebugLogging": true,
    "publishArticles": true,
    "static": {
      "SubsidiaryID__c": 1,
      "RegionCode__c": "US",
      "Status__c": "Testing"
    }
  }
}
```

---

### Getting Started with Multi-Site Configuration

**Note**: As of v2.1+, `SiteConfigurations` JSON is the only supported configuration method. Individual parameters (ContentFolderID, ArticleType, etc.) have been removed for a cleaner, more maintainable approach.

#### Step 1: Create Your Configuration JSON

Start with a minimal configuration for your site:

```json
{
  "_defaults": {
    "articleType": "Knowledge__kav",
    "fieldMapping": {
      "Title": "name",
      "Body__c": "custom.body",
      "SFCC_External_ID__c": "ID",
      "UrlName": "name"
    },
    "batchSize": 50,
    "exportMode": "delta",
    "publishArticles": false,
    "autoCreateFields": true
  },
  "RefArch": {
    "contentFolderIDs": ["root"]
  }
}
```

Replace `"RefArch"` with your actual Site ID from Business Manager.

#### Step 2: Add to Job Configuration

1. Navigate to: `Administration > Operations > Jobs > [Your Job]`
2. Click **Job Steps** tab
3. Find `SiteConfigurations` parameter
4. Paste your JSON configuration
5. Click **Apply**

#### Step 3: Test

1. Run job manually
2. Check logs: `Administration > Operations > System Log Files`
3. Look for: `"Current site: RefArch"` and configuration details
4. Verify articles created in Salesforce

#### Step 4: Add More Sites (Optional)

Add additional site configurations as needed:

```json
{
  "_defaults": { ... },
  "RefArch": { ... },
  "RefArchGlobal": { ... },
  "SiteGenesis": { ... }
}
```

---

### Troubleshooting Multi-Site Configuration

#### Issue: "Failed to parse SiteConfigurations JSON"

**Cause**: Invalid JSON syntax

**Solution**: Validate JSON using online validator (jsonlint.com)

**Common Mistakes**:
- Missing comma between properties
- Trailing comma after last property
- Unescaped quotes in values
- Missing closing brace

#### Issue: "Configuration not found for site: RefArch"

**Cause**: Site ID doesn't match configured sites

**Solution**: Check Site ID in Business Manager:
```
Administration > Sites > Manage Sites > [Site] > ID
```

Ensure JSON has matching key:
```json
{
  "_defaults": {...},
  "RefArch": {...}  // Must match Site ID exactly
}
```

#### Issue: "Record Type 'Product_FAQ' not found"

**Cause**: Record Type doesn't exist or DeveloperName is wrong

**Solution**: Verify in Salesforce:
1. Navigate to: Setup > Object Manager > Knowledge > Record Types
2. Find your Record Type
3. Use the **API Name** (DeveloperName), not the Label

**Example**:
- Label: "Product FAQ" ❌
- API Name: "Product_FAQ" ✅

#### Issue: Transforms not applying

**Cause**: Transform field not in fieldMapping

**Solution**: Ensure field is mapped first:

```json
{
  "fieldMapping": {
    "UrlName": "name"  // ✅ Field must be mapped
  },
  "transforms": {
    "UrlName": "urlSafe:-"  // ✅ Then transform can be applied
  }
}
```

#### Issue: Static fields not appearing

**Cause**: Field doesn't exist in Salesforce

**Solution**:
1. Enable `autoCreateFields: true`
2. Add field metadata for static fields
3. Or manually create fields in Salesforce

---

### Best Practices

#### 1. Use _defaults for Common Settings

✅ **Good**:
```json
{
  "_defaults": {
    "fieldMapping": {...},  // Define once
    "transforms": {...}
  },
  "RefArch": { "static": {...} },
  "RefArchGlobal": { "static": {...} }
}
```

❌ **Bad** (Repetitive):
```json
{
  "RefArch": {
    "fieldMapping": {...},  // Duplicated
    "transforms": {...}
  },
  "RefArchGlobal": {
    "fieldMapping": {...},  // Duplicated again
    "transforms": {...}
  }
}
```

#### 2. Use Meaningful Static Field Values

```json
"static": {
  "Source__c": "SFCC",  // ✅ Clear system identifier
  "SubsidiaryID__c": 7,  // ✅ Meaningful ID
  "RegionCode__c": "US"  // ✅ Standard region code
}
```

#### 3. Test with Debug Logging First

```json
{
  "RefArch": {
    "enableDebugLogging": true,  // Test with debug ON
    "publishArticles": false      // Keep as draft during testing
  }
}
```

Then disable debug and enable publish for production:

```json
{
  "RefArch": {
    "enableDebugLogging": false,
    "publishArticles": false  // Or true for auto-publish
  }
}
```

#### 4. Version Control Your Configuration

Save configuration JSON in version control (Git) with comments:

```json
{
  "_comment": "Updated 2024-02-16: Added Japan site",
  "_defaults": {...},
  "RefArchJapan": {...}
}
```

#### 5. Use Delta Mode for Performance

```json
{
  "_defaults": {
    "exportMode": "delta"  // Only sync changed content
  }
}
```

Use `"full"` mode only for:
- Initial migration
- Recovery after failures
- Testing

---

## 🔄 Incremental Sync

The integration supports two sync modes: **delta** (incremental) and **full**.

### 🚀 Delta Mode (Default - Recommended)

Delta mode is the **recommended and default mode** for production use. It syncs only content that has been modified since the last successful sync, resulting in dramatic performance improvements and reduced API usage.

#### 📊 Performance Impact

```
Example: 1000 Content Assets, 10 Modified

Full Mode:                         Delta Mode:
┌─────────────────────┐           ┌─────────────────────┐
│ Process: 1000 items │           │ Process: 10 items   │
│ Time: ~5 minutes    │    VS     │ Time: ~10 seconds   │
│ API Calls: ~1000    │           │ API Calls: ~10      │
└─────────────────────┘           └─────────────────────┘

Result: 95% faster, 99% fewer API calls
```

#### 🔍 How Delta Sync Works

**Visual Flow:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Content Asset in B2C Commerce                                   │
├─────────────────────────────────────────────────────────────────┤
│ Standard Fields:                                                │
│ • ID: "faq-001"                                                 │
│ • name: "How to reset password"                                │
│ • lastModified: 2024-02-01 10:30:00                            │
│                                                                  │
│ Sync Metadata (Custom Fields):                                 │
│ • sfKnowledgeArticleId: "kA0xx000000001"  ─┐                   │
│ • sfKnowledgeVersionId: "ka0xx000000002"   │ ← Updated after    │
│ • sfLastSyncDateTime: 2024-02-01 09:00:00 ─┘   successful sync │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │   Delta Filter Logic         │
            │                              │
            │ IF lastModified >            │
            │    sfLastSyncDateTime        │
            │ THEN include in sync         │
            │ ELSE skip                    │
            └──────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
    ┌─────────────┐              ┌─────────────┐
    │  Include    │              │    Skip     │
    │  (Sync)     │              │  (Ignore)   │
    └─────────────┘              └─────────────┘
```

**The Process:**

1. **Custom Metadata Fields**: The integration uses three custom attributes on Content Assets to track sync status:
   - `sfKnowledgeArticleId`: Salesforce Knowledge Article ID (master ID - stable across versions)
   - `sfKnowledgeVersionId`: Current Salesforce version ID (changes with each update)
   - `sfLastSyncDateTime`: Timestamp of last successful sync

2. **Delta Filter Logic**: During delta sync, only content assets where `lastModified > sfLastSyncDateTime` are exported
   ```javascript
   // Example comparison:
   lastModified:        2024-02-01 10:30:00
   sfLastSyncDateTime:  2024-02-01 09:00:00
   Result: INCLUDE (modified after last sync)
   ```

3. **First-Time Sync**: Content assets that have never been synced (no `sfLastSyncDateTime`) are automatically included
   ```javascript
   // Example:
   lastModified:        2024-02-01 10:30:00
   sfLastSyncDateTime:  null
   Result: INCLUDE (never synced)
   ```

4. **Metadata Updates**: After successful export, the integration automatically updates these fields with current sync information
   ```javascript
   // After sync:
   sfKnowledgeArticleId = "kA0xx000000001"  // From Salesforce response
   sfKnowledgeVersionId = "ka0xx000000002"  // From Salesforce response
   sfLastSyncDateTime = new Date()          // Current timestamp
   ```

#### Setting Up Delta Sync

**Step 1: Import Metadata**

Upload the custom attribute metadata to B2C Commerce:

1. Navigate to: `Administration > Site Development > Import & Export`
2. Under **Meta Data** tab, upload: `int_salesforce_knowledge/cartridge/metadata/content-metadata.xml`
3. Click **Import**
4. The three custom fields will be available on all Content Assets

**Step 2: Configure Job for Delta Mode**

In your job configuration, set:
```
ExportMode: delta
```

Or leave it empty to use the default delta mode.

**Step 3: Initial Sync**

For the first sync, you may want to use full mode to sync all existing content:
```
ExportMode: full
```

After the initial sync, switch back to delta mode for subsequent scheduled runs.

### Full Mode

Full mode syncs all online content assets regardless of when they were last synced. Use full mode when:

- Performing initial sync of existing content
- Content metadata was cleared or corrupted
- You want to force re-sync of all content
- Testing or troubleshooting sync issues

To use full mode:
```
ExportMode: full
```

### 📊 Mode Comparison

| Aspect | Delta Mode (Default) | Full Mode |
|--------|---------------------|-----------|
| **Use Case** | ✅ Production, scheduled jobs | ⚠️ Initial sync, recovery |
| **Performance** | ✅ 95% faster for typical workloads | ❌ Processes all content every time |
| **API Usage** | ✅ 99% fewer API calls | ❌ High API consumption |
| **When to Use** | • Hourly/daily scheduled sync<br>• Production environments<br>• After initial migration | • First-time setup<br>• Metadata corruption recovery<br>• Force re-sync all content |
| **Processing** | Only modified content | All online content |
| **Metadata Required** | ✅ Yes (auto-populated) | ❌ No |

### 📈 Real-World Performance Comparison

| Scenario | Content Assets | Modified | Delta Mode | Full Mode | Time Saved |
|----------|----------------|----------|------------|-----------|------------|
| **Hourly Sync** | 1000 | 5 (0.5%) | ~5s | ~5min | **98%** |
| **Daily Sync** | 1000 | 50 (5%) | ~30s | ~5min | **90%** |
| **Weekly Sync** | 1000 | 200 (20%) | ~2min | ~5min | **60%** |
| **Initial Sync** | 1000 | 1000 (100%) | ~5min | ~5min | 0% (expected) |
| **Heavy Edit Day** | 1000 | 500 (50%) | ~3min | ~5min | **40%** |

### Viewing Sync Metadata

You can view sync metadata on Content Assets in Business Manager:

1. Navigate to: `Merchant Tools > Content > Content Assets`
2. Open any content asset
3. Look for the **Salesforce Knowledge Sync** attribute group
4. View:
   - **SF Knowledge Article ID**: Master article ID in Salesforce
   - **SF Knowledge Version ID**: Current version ID
   - **SF Last Sync Date/Time**: When this content was last synced

### Troubleshooting Delta Sync

**Content not syncing in delta mode:**
- Check if `lastModified` date is recent
- Verify `sfLastSyncDateTime` is set correctly
- Try full mode to force re-sync
- Check job logs for filter details (enable debug logging)

**Sync metadata not updating:**
- Check for errors in job logs
- Ensure metadata import was successful
- Verify user permissions on Content Assets

---

## Field Mapping

Field mapping defines how B2C Commerce Content Asset fields map to Salesforce Knowledge Article fields.

### Mapping Format

```json
{
  "SalesforceField": "b2cFieldPath"
}
```

### Supported B2C Field Paths

| Path | Description | Example Value |
|------|-------------|---------------|
| `ID` | Content Asset ID | `faq-001` |
| `name` | Content name | `How to reset password` |
| `description` | Content description | `Password reset guide` |
| `pageTitle` | Page title | `Password Reset FAQ` |
| `pageDescription` | Page description | `Learn how to reset...` |
| `pageKeywords` | Page keywords | `password, reset, help` |
| `custom.fieldName` | Custom attribute | Access any custom field |
| `custom.body` | Custom body content | HTML/text content |

### Nested Custom Attributes

Use dot notation for nested custom attributes:

```json
{
  "Body__c": "custom.body",
  "Author__c": "custom.author",
  "Category__c": "custom.category"
}
```

### Standard Salesforce Fields

| Salesforce Field | Required | Description |
|------------------|----------|-------------|
| `Title` | Yes | Article title (max 255 chars) |
| `UrlName` | Yes | URL-friendly name (unique) |
| `Summary` | No | Article summary |
| `Language` | Auto | Set automatically (en_US) |

### Example Mappings

#### Basic Mapping
```json
{
  "Title": "name",
  "Summary": "pageDescription",
  "SFCC_External_ID__c": "ID",
  "UrlName": "ID"
}
```

#### Advanced Mapping with Custom Fields
```json
{
  "Title": "name",
  "Summary": "pageDescription",
  "Body__c": "custom.body",
  "Author_Name__c": "custom.author",
  "Category__c": "custom.category",
  "View_Count__c": "custom.viewCount",
  "Published_Date__c": "lastModified",
  "SFCC_External_ID__c": "ID",
  "UrlName": "ID"
}
```

---

## Automatic Field Creation

The cartridge can automatically create custom fields in Salesforce Knowledge using the Tooling API.

### Enabling Auto-Creation

Set the job parameter:
```
AutoCreateFields: true
```

### Field Metadata Configuration

Provide field specifications in the `FieldMetadata` parameter:

```json
{
  "Body__c": {
    "type": "LongTextArea",
    "length": 32000,
    "visibleLines": 10,
    "label": "Article Body",
    "description": "Rich text content from B2C Commerce"
  },
  "SFCC_External_ID__c": {
    "type": "Text",
    "length": 255,
    "label": "SFCC External ID",
    "description": "B2C content asset ID for synchronization"
  },
  "View_Count__c": {
    "type": "Number",
    "precision": 10,
    "scale": 0,
    "label": "View Count",
    "description": "Number of article views"
  }
}
```

### Supported Field Types

| Type | Properties | Description |
|------|-----------|-------------|
| **Text** | `length` (1-255) | Single-line text |
| **LongTextArea** | `length` (256-131072), `visibleLines` | Multi-line text |
| **RichTextArea** | `length`, `visibleLines` | HTML content |
| **Number** | `precision`, `scale` | Numeric values |
| **Checkbox** | `defaultValue` | Boolean values |
| **Date** | - | Date only |
| **DateTime** | - | Date and time |
| **Percent** | `precision`, `scale` | Percentage values |

### Field-Level Security

When fields are created, the cartridge automatically:
1. Creates a Permission Set named `SFCC_Knowledge_Field_Access`
2. Adds field permissions (Read/Edit)
3. Assigns the Permission Set to the integration user

---

## Process Flow

### High-Level Flow

```
1. Job Start
   └── Validate configuration

2. Parameter Processing
   └── Read and validate all job parameters

3. Content Retrieval
   └── Query B2C Content Library
   └── Filter by folder (if specified)
   └── Return only online content

4. Authentication
   └── OAuth 2.0 token request
   └── Cache token in request scope

5. Field Validation
   └── Check if custom fields exist
   └── Create missing fields (if AutoCreateFields=true)
   └── Configure field-level security

6. Batch Processing
   ├── For each batch:
   │   ├── For each content asset:
   │   │   ├── Query for existing article by External ID
   │   │   ├── If exists:
   │   │   │   ├── Check publish status
   │   │   │   ├── Create draft if Online
   │   │   │   ├── Update draft
   │   │   │   └── Publish
   │   │   └── If not exists:
   │   │       ├── Create draft article
   │   │       └── Publish
   │   └── Log batch results

7. Job Complete
   └── Log summary statistics
   └── Return status (OK/ERROR)
```

### Versioning Logic

Salesforce Knowledge has strict versioning rules:

| Current State | Action Required | API Used |
|---------------|----------------|----------|
| **Online** (Published) | Create draft via editOnlineArticle | Knowledge Management API |
| **Draft** | Update directly | REST API (PATCH) |
| **Archived** | Log warning, attempt update | REST API (PATCH) |
| **Not Exists** | Create new draft | REST API (POST) |

After update/create:
- All drafts are published via **Actions API**
- Uses `publishKnowledgeArticles` action

---

## 💡 Best Practices

### 1. Use Delta Mode for Scheduled Jobs
**Always use delta mode** for scheduled/recurring jobs:
```
ExportMode: delta
```
Only use full mode for:
- Initial data migration
- Recovery after metadata corruption
- One-time bulk updates

### 2. Batch Size Configuration
Choose appropriate batch sizes based on content complexity:

| Content Type | Recommended Batch Size | Reason |
|--------------|----------------------|---------|
| Simple text (no images) | 100-200 | Fast processing |
| Rich HTML content | 50-100 | Moderate processing |
| Large HTML + images | 20-50 | Prevents timeouts |

### 3. Field Mapping Strategy
**Standard Fields First**: Map standard Salesforce fields before custom fields
```json
{
  "Title": "name",           // Standard (required)
  "UrlName": "ID",           // Standard (required)
  "Summary": "pageDescription", // Standard
  "Body__c": "custom.body"   // Custom
}
```

### 4. Monitoring and Alerting
**Set up monitoring** for:
- Job execution status
- Sync success/failure rates
- API usage patterns
- Error patterns in logs

### 5. Testing Strategy
**Test in sandbox first**:
1. Configure in Salesforce Sandbox
2. Test with small content set (5-10 assets)
3. Verify field mappings
4. Check sync metadata updates
5. Move to production

---

## 🚀 Performance Optimization

### Sync Time Comparison

| Scenario | Content Assets | Full Mode | Delta Mode | Improvement |
|----------|----------------|-----------|------------|-------------|
| Daily sync | 1000 (10 changed) | ~5 min | ~10 sec | **96% faster** |
| Hourly sync | 500 (5 changed) | ~2.5 min | ~5 sec | **95% faster** |
| Initial sync | 1000 (all new) | ~5 min | ~5 min | Same (expected) |

### API Call Reduction

| Operation | Full Mode | Delta Mode | Savings |
|-----------|-----------|------------|---------|
| Content queries | 1000 | 10 | **99%** |
| SOQL queries | 1000 | 10 | **99%** |
| Article updates | 1000 | 10 | **99%** |
| Publish operations | 1000 | 10 | **99%** |

### Performance Tuning Tips

#### 1. Optimize Batch Size
```
# For 1000 assets:
BatchSize: 50   // 20 batches × ~15s = ~5 min
BatchSize: 100  // 10 batches × ~30s = ~5 min (better)
BatchSize: 200  // 5 batches × ~60s = ~5 min (risk timeout)
```

#### 2. Schedule During Off-Peak Hours
```
Recommended schedule:
- Delta sync: Every 1-4 hours
- Full sync: Weekly during maintenance window
```

#### 3. Enable Caching
The integration uses **request-scoped caching** for:
- OAuth tokens (automatic)
- Field existence checks (automatic)
- Permission sets (automatic)

#### 4. Monitor Salesforce API Limits
```
Daily API limits vary by Salesforce edition:
- Enterprise: 1,000 calls per user/day
- Unlimited: 5,000 calls per user/day
- Performance: 10,000 calls per user/day

Delta mode dramatically reduces API consumption.
```

---

## 🔒 Security Considerations

### 1. OAuth Credentials
**Never hardcode credentials**. Use SFCC Service Framework:
- Store credentials in Business Manager > Services
- Use credential custom attributes for sensitive data
- Rotate secrets regularly

### 2. Field-Level Security
The integration automatically configures FLS:
- Creates Permission Set: `SFCC_Knowledge_Field_Access`
- Grants Read/Edit permissions on custom fields
- Assigns to integration user

**Manual verification**:
```
Salesforce Setup > Permission Sets > SFCC_Knowledge_Field_Access
> Field Permissions > Verify all custom fields are listed
```

### 3. User Permissions
Integration user requires:
- **Knowledge User**: To access Salesforce Knowledge
- **Modify All Data**: For Tooling API operations
- **API Enabled**: For REST API access
- **Manage Knowledge Articles**: To publish articles

### 4. IP Restrictions
**Production recommendation**:
- Whitelist SFCC instance IPs in Salesforce
- Use Connected App IP restrictions
- Enable login IP ranges

### 5. Security Token
For password grant flow:
```
Password = Salesforce_Password + Security_Token
Example: MyP@ssw0rd + ABCD1234EFGH5678 = MyP@ssw0rdABCD1234EFGH5678
```

### 6. Audit Trail
Monitor security events:
- Login attempts in Salesforce Setup Audit Trail
- API usage in Setup > System Overview
- Failed authentication attempts in job logs

---

## API Reference

### Helper Modules

#### salesforceAuthHelper

**Purpose**: OAuth 2.0 authentication and token management

**Methods**:
- `getAccessToken(serviceId)` - Authenticates and returns access token
- `validateConfiguration(serviceId)` - Validates OAuth configuration
- `clearCachedToken()` - Clears cached token

#### salesforceKnowledgeHelper

**Purpose**: Knowledge Article CRUD operations

**Methods**:
- `upsertKnowledgeArticle(contentAsset, config)` - Creates or updates article
- `findArticleByExternalId(accessToken, instanceUrl, externalId, articleType, serviceID)` - Finds article by External ID
- `exportBatch(contentAssets, config)` - Processes batch of content
- `deleteArticle(externalId, articleType, serviceID)` - Deletes article

#### salesforceToolingHelper

**Purpose**: Tooling API operations for field management

**Methods**:
- `ensureAllMappedFieldsExist(articleType, fieldMappingJSON, fieldMetadataJSON, autoCreate, serviceID)` - Validates and creates fields
- `checkCustomFieldExists(articleType, fieldDeveloperName, serviceID)` - Checks if field exists
- `createCustomField(articleType, fieldDeveloperName, fieldMetadata, serviceID)` - Creates custom field

#### contentMappingHelper

**Purpose**: B2C content retrieval, transformation, and sync metadata management

**Methods**:

##### `getContentAssets(folderID, enableDebugLogging, exportMode)`
Retrieves content assets from B2C Commerce with optional delta filtering.

**Parameters:**
- `folderID` (String): Content folder ID or 'root' for all folders
- `enableDebugLogging` (Boolean): Enable detailed debug output
- `exportMode` (String): Sync mode - 'delta' (only modified) or 'full' (all content)

**Returns:** Array of formatted content asset objects

**Example:**
```javascript
// Get only modified content (delta sync)
var modifiedContent = contentMappingHelper.getContentAssets('root', false, 'delta');

// Get all content (full sync)
var allContent = contentMappingHelper.getContentAssets('root', false, 'full');
```

##### `mapContentToArticle(contentAsset, articleType, fieldMapping, dataCategory, isCreate, enableDebugLogging)`
Transforms B2C Content Asset into Salesforce Knowledge Article format.

**Parameters:**
- `contentAsset` (Object): Formatted content asset object
- `articleType` (String): Salesforce Knowledge Article Type (e.g., 'Knowledge__kav')
- `fieldMapping` (Object): Field mapping object (SF field → B2C field path)
- `dataCategory` (String|null): Optional data category
- `isCreate` (Boolean): Whether this is for creation (true) or update (false)
- `enableDebugLogging` (Boolean): Enable detailed debug output

**Returns:** Knowledge Article object ready for Salesforce API

##### `updateSyncMetadata(contentAssetID, knowledgeArticleId, versionId)`
Updates sync metadata on Content Asset after successful export.

**Parameters:**
- `contentAssetID` (String): B2C Content Asset ID
- `knowledgeArticleId` (String): Salesforce Knowledge Article ID (master ID)
- `versionId` (String): Salesforce Knowledge Version ID

**Returns:** `{success: Boolean, error: String}`

**Example:**
```javascript
var result = contentMappingHelper.updateSyncMetadata(
    'faq-001',
    'kA0xx000000001',
    'ka0xx000000002'
);

if (result.success) {
    Logger.info('Sync metadata updated successfully');
}
```

##### `exportToExternalAPI(contentAssets, batchSize, exportFunction)`
Processes content assets in batches using provided export function.

**Parameters:**
- `contentAssets` (Array): Array of content assets to process
- `batchSize` (Number): Number of assets per batch
- `exportFunction` (Function): Function to call for each batch

**Returns:** Export result with statistics

---

## Logging and Debugging

### Log Categories

| Category | Component | Purpose |
|----------|-----------|---------|
| `SFKnowledge.ExportJob` | Job execution | Job-level logging |
| `SFKnowledge.Auth` | Authentication | OAuth operations |
| `SFKnowledge.ContentMapping` | Content retrieval | B2C content operations |
| `SFKnowledge.KnowledgeAPI` | Knowledge operations | Salesforce Knowledge API |
| `SFKnowledge.ToolingAPI` | Field creation | Tooling API operations |

### Viewing Logs

**Path**: `Administration > Site Development > Development Setup > Log Files`

View logs in: `custominfo.log` or `customerror.log`

### Debug Logging

Enable debug logging via job parameter:
```
EnableDebugLogging: true
```

#### Debug Output Includes

**1. Raw B2C Content Asset** - Shows all content attributes and values

**2. Field Mapping Process** - Shows how fields are mapped and converted

**3. Salesforce API Requests** - Shows complete API payloads (CREATE/UPDATE)

---

## Troubleshooting

### Common Issues

#### 1. "Service ID not configured"
**Solution**: Set `ServiceID` parameter in job configuration

#### 2. "Authentication failed"
**Solution**: Verify OAuth credentials, security token, and Connected App configuration

#### 3. "Field validation failed"
**Solution**: Enable `AutoCreateFields: true` or manually create fields in Salesforce

#### 4. "Language field error on update"
**Solution**: Already handled automatically - Language is only included on CREATE

#### 5. "Publishing failed"
**Solution**: Check validation rules, required fields, and user permissions

#### 6. "Tooling API permission error"
**Solution**: Grant "Modify All Data" and "API Enabled" permissions to integration user

### Debug Checklist

- [ ] Service is configured correctly in Business Manager
- [ ] Service credential has all custom attributes
- [ ] Connected App is configured with OAuth enabled
- [ ] Integration user has required permissions
- [ ] Field mapping JSON is valid
- [ ] Article type exists in Salesforce
- [ ] Custom fields exist or auto-create is enabled
- [ ] Debug logging is enabled for detailed troubleshooting

---

## ❓ FAQ

### General Questions

**Q: What happens on the first sync if no content has been synced before?**
A: Delta mode automatically includes all content that has never been synced (where `sfLastSyncDateTime` is null). After the first sync, only modified content is synced.

**Q: Can I sync content from multiple folders?**
A: Yes, set `ContentFolderID: root` to sync all folders, or specify a folder ID to sync only that folder and its subfolders.

**Q: Does it support multiple languages?**
A: Currently, the Language field is hardcoded to `en_US`. You can modify `contentMappingHelper.js` to map from site locale.

**Q: Can I use custom Knowledge Article types?**
A: Yes! Set the `ArticleType` parameter to your custom article type (e.g., `Product_FAQ__kav`).

**Q: Why are my articles not publishing automatically?**
A: By default, `PublishArticles` is set to `false`, which keeps articles in draft status for manual review. To enable auto-publishing, set `PublishArticles: true` in your job configuration.

**Q: I'm getting "TRANSLATIONALREADYEXIST" error when syncing. What does this mean?**
A: This error occurred in earlier versions when a draft already existed but the system tried to create another one. **This has been fixed in version 2.0.0+**. The integration now intelligently searches for existing drafts first and updates them in-place, preventing duplicate draft creation. Make sure you're running the latest version.

**Q: What happens when I sync the same content multiple times with PublishArticles: false?**
A: The integration updates the existing draft in-place without creating new versions. This allows you to refine content through multiple sync cycles before manually publishing. Only when an Online (published) version exists and no draft exists will a new draft version be created.

**Q: How do I know if sync metadata is working?**
A: Check Content Assets in Business Manager > Merchant Tools > Content. Open any synced asset and look for the "Salesforce Knowledge Sync" attribute group.

### Performance Questions

**Q: How long does delta sync take?**
A: For 1000 assets with 10 modified: ~10-15 seconds. Full sync of same dataset: ~5 minutes.

**Q: What's the maximum batch size?**
A: 500 articles per batch, but 50-100 is recommended for stability.

**Q: Will this hit Salesforce API limits?**
A: Delta mode dramatically reduces API calls. For 1000 assets with 10 modified:
- Full mode: ~1000 API calls
- Delta mode: ~10 API calls (99% reduction)

### Troubleshooting Questions

**Q: Content isn't syncing in delta mode. Why?**
A: Check these:
1. Has the content been modified recently? (`lastModified > sfLastSyncDateTime`)
2. Is sync metadata populated? (Check `sfLastSyncDateTime` field)
3. Try full mode once to force sync

**Q: Why are some fields not syncing?**
A: Common causes:
1. Field doesn't exist in Salesforce (enable `AutoCreateFields: true`)
2. Field mapping is incorrect (check JSON syntax)
3. Source field is empty/null (only non-empty values are synced)

**Q: Job fails with "Authentication failed". What should I check?**
A: Verify:
1. Service credential is correctly configured
2. Connected App Consumer Key/Secret are correct
3. Security token is appended to password (for password grant)
4. User has required permissions
5. Connected App is not IP-restricted

**Q: Fields are created but not visible in Salesforce. Why?**
A: Check Field-Level Security:
- Setup > Permission Sets > SFCC_Knowledge_Field_Access
- Verify field permissions are set to Read/Edit
- Check if Permission Set is assigned to user

### Migration Questions

**Q: How do I migrate from full to delta mode?**
A:
1. Run one final full sync to ensure all content is synced
2. Verify sync metadata is populated on all Content Assets
3. Change `ExportMode` from `full` to `delta`
4. Run delta sync to verify it works correctly

**Q: Can I rollback if delta sync doesn't work?**
A: Yes, simply change `ExportMode` back to `full`. Your sync metadata is preserved.

**Q: What happens if I delete sync metadata?**
A: Delta mode will treat those assets as never-synced and include them in the next sync.

---

## 🧪 Testing

### Pre-Production Testing Checklist

#### 1. Service Configuration Testing
```
□ Service credential created
□ Custom attributes configured (clientid, clientsecret, granttype)
□ Service profile created with correct credential
□ Communication log enabled for debugging
```

#### 2. Connected App Testing
```
□ Connected App created in Salesforce Sandbox
□ OAuth scopes configured (api, full, refresh_token)
□ IP relaxation set correctly
□ Consumer Key/Secret copied to service credential
```

#### 3. Metadata Import Testing
```
□ content-metadata.xml imported successfully
□ No import warnings or errors
□ Three custom fields visible on Content Assets:
  - sfKnowledgeArticleId
  - sfKnowledgeVersionId
  - sfLastSyncDateTime
```

#### 4. Job Configuration Testing
```
□ Job created with correct step type
□ All required parameters configured
□ Test with small dataset first (5-10 content assets)
□ Review job logs for errors
```

#### 5. Field Mapping Testing
```
□ Field mapping JSON is valid
□ All Salesforce fields exist or auto-create enabled
□ Test with various content types
□ Verify MarkupText fields render correctly
```

### Testing Scenarios

#### Scenario 1: Initial Full Sync
```
Setup:
- ExportMode: full
- ContentFolderID: root
- 10 test content assets

Expected Results:
- All 10 assets synced to Salesforce
- Articles created in Draft then Published
- Sync metadata populated on all assets
- Job status: OK
```

#### Scenario 2: Delta Sync with Modified Content
```
Setup:
- ExportMode: delta
- Modify 2 out of 10 content assets
- Run sync

Expected Results:
- Only 2 assets processed
- 8 assets skipped (not modified)
- Sync metadata updated only for 2 assets
- Job log shows "Found 2 modified content assets (skipped 8 unchanged)"
```

#### Scenario 3: Delta Sync with No Changes
```
Setup:
- ExportMode: delta
- No modifications since last sync
- Run sync

Expected Results:
- 0 assets processed
- Job completes successfully with "No content assets found"
- No API calls to Salesforce (except authentication)
```

#### Scenario 4: Auto-Create Fields
```
Setup:
- AutoCreateFields: true
- Map to non-existent field: "Custom_Field__c": "custom.newField"
- Run sync

Expected Results:
- Custom_Field__c created in Salesforce
- Field permissions configured automatically
- Article synced successfully with new field
```

### Test Automation

#### Sample Test Script (SFCC Script)
```javascript
// Test delta sync filter logic
var contentMappingHelper = require('*/cartridge/scripts/helpers/contentMappingHelper');

// Test 1: Get all content (full mode)
var allContent = contentMappingHelper.getContentAssets('root', false, 'full');
Logger.info('Full mode returned: ' + allContent.length + ' assets');

// Test 2: Get modified content (delta mode)
var modifiedContent = contentMappingHelper.getContentAssets('root', false, 'delta');
Logger.info('Delta mode returned: ' + modifiedContent.length + ' assets');

// Test 3: Verify sync metadata update
var result = contentMappingHelper.updateSyncMetadata(
    'test-content-id',
    'kA0xx000000001',
    'ka0xx000000002'
);
Logger.info('Metadata update success: ' + result.success);
```

### Performance Testing

#### Load Test Scenarios
```
Test 1: 100 assets, full sync
Expected: ~30-60 seconds

Test 2: 100 assets, 5 modified, delta sync
Expected: ~5-10 seconds

Test 3: 1000 assets, full sync
Expected: ~5-8 minutes

Test 4: 1000 assets, 10 modified, delta sync
Expected: ~10-20 seconds
```

### Monitoring During Testing

Watch these metrics:
- **Job execution time**: Should decrease significantly with delta mode
- **API call count**: Check Salesforce System Overview
- **Error rate**: Should be 0% for successful tests
- **Sync metadata accuracy**: Verify timestamps are correct

---

## 🤝 Contributing

Contributions are welcome! I appreciate your help in making this integration better.

### 📢 Ways to Contribute

1. **🐛 Report Bugs**: [Open an issue](https://github.com/neeraj-agentic-lab/SFCC-Knowledge-Connector/issues/new?labels=bug)
2. **💡 Request Features**: [Open an issue](https://github.com/neeraj-agentic-lab/SFCC-Knowledge-Connector/issues/new?labels=enhancement)
3. **📖 Improve Documentation**: Submit PRs for documentation improvements
4. **💻 Submit Code**: Fork, develop, and submit pull requests
5. **⭐ Star the Repo**: Show your support!

### 🔀 Pull Requests

Follow these steps for submitting PRs:

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
4. **Make** your changes
5. **Test** thoroughly (include test results in PR)
6. **Commit** with clear messages (`git commit -m 'Add amazing feature'`)
7. **Push** to your fork (`git push origin feature/amazing-feature`)
8. **Open** a Pull Request with:
   - Clear title and description
   - Reference any related issues
   - Include screenshots/logs if applicable

### 📝 Coding Standards

- Follow existing code style and patterns
- Add JSDoc comments for new functions
- Include error handling
- Write clear commit messages
- Test in sandbox environment first

### 💬 Questions or Discussions?

- 📧 **LinkedIn**: [Connect with me](https://www.linkedin.com/in/n-yadav/)
- 💬 **GitHub Discussions**: [Start a discussion](https://github.com/neeraj-agentic-lab/SFCC-Knowledge-Connector/discussions)
- 🐙 **GitHub Issues**: [Browse or create issues](https://github.com/neeraj-agentic-lab/SFCC-Knowledge-Connector/issues)

---

## 👤 Author

**Neeraj Yadav**

### Connect with me:

- **GitHub**: [neeraj-agentic-lab](https://github.com/neeraj-agentic-lab)
- **LinkedIn**: [n-yadav](https://www.linkedin.com/in/n-yadav/)

## 📈 Version History

### Version 2.0.0
- ✨ **NEW**: Incremental/delta sync mode (default)
- ✨ **NEW**: Sync metadata tracking on Content Assets
- ✨ **NEW**: Request-scoped caching for improved performance
- 🔧 Enhanced field validation and error handling
- 📊 Added comprehensive logging for delta sync
- 🚀 Performance improvements (up to 95% faster)
- 📖 Comprehensive README documentation

### Version 1.0.0
- 🎉 Initial release
- ✨ Full sync mode
- ✨ Automatic field creation via Tooling API
- ✨ Field-level security configuration
- ✨ Versioning support (Draft/Online)
- ✨ Batch processing with configurable sizes
- 📝 Debug logging mode

---

<div align="center">

**Built with ❤️ by [Neeraj Yadav](https://github.com/neeraj-agentic-lab)**

[![GitHub](https://img.shields.io/badge/Follow-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/neeraj-agentic-lab)
[![LinkedIn](https://img.shields.io/badge/Connect-LinkedIn-0077B5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/n-yadav/)

⭐ Star this repo if you find it useful!

[![GitHub stars](https://img.shields.io/github/stars/neeraj-agentic-lab/SFCC-Knowledge-Connector?style=social)](https://github.com/neeraj-agentic-lab/SFCC-Knowledge-Connector)
[![GitHub forks](https://img.shields.io/github/forks/neeraj-agentic-lab/SFCC-Knowledge-Connector?style=social)](https://github.com/neeraj-agentic-lab/SFCC-Knowledge-Connector/fork)

</div>

---

**Version**: 2.0.0
**Last Updated**: February 2024
**Compatibility**: SFCC B2C 21.x+, Salesforce API v58.0+
