'use strict';

/**
 * Salesforce Knowledge API Helper
 *
 * Handles CRUD operations for Salesforce Knowledge Articles with proper versioning support.
 * Knowledge articles use versioning - Online (Published) articles cannot be updated directly.
 * Must create a draft version first using editOnlineArticle, then publish.
 *
 * @module scripts/helpers/salesforceKnowledgeHelper
 */

var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var authHelper = require('int_salesforce_knowledge/cartridge/scripts/helpers/salesforceAuthHelper');
var contentMappingHelper = require('int_salesforce_knowledge/cartridge/scripts/helpers/contentMappingHelper');
var toolingHelper = require('int_salesforce_knowledge/cartridge/scripts/helpers/salesforceToolingHelper');

// Get services from service definition file
var services = require('int_salesforce_knowledge/cartridge/scripts/services/salesforceKnowledgeService');

// Initialize logger
var logger = Logger.getLogger('SFKnowledge', 'KnowledgeAPI');

/**
 * Salesforce API version
 * @type {string}
 */
var API_VERSION = 'v58.0';

/**
 * External ID field name
 * @type {string}
 */
var EXTERNAL_ID_FIELD = 'SFCC_External_ID__c';

/**
 * Upsert Knowledge Article with Versioning Support
 *
 * This function handles Salesforce Knowledge versioning properly:
 * 1. Ensures SFCC_External_ID__c field exists (creates if needed)
 * 2. Gets OAuth access token
 * 3. Maps content asset to article format
 * 4. Queries for existing article by SFCC_External_ID__c
 * 5. Handles versioning:
 *    - If Online (Published): Create draft via editOnlineArticle
 *    - If Draft exists: Update draft directly
 *    - If doesn't exist: Create new article
 * 6. Publishes the draft version
 * 7. Returns result with KnowledgeArticleId (stable across versions)
 *
 * @param {Object} contentAsset - Formatted content asset object
 * @param {Object} config - Configuration object
 * @param {string} config.articleType - Knowledge Article Type (default: Knowledge__kav)
 * @param {string} config.fieldMapping - JSON field mapping string
 * @param {string} config.dataCategory - Optional data category
 * @returns {Object} Upsert result
 * @returns {boolean} result.success - Whether operation succeeded
 * @returns {string} result.knowledgeArticleId - Stable master article ID (if success)
 * @returns {string} result.versionId - Draft version ID (if success)
 * @returns {string} result.operation - 'create', 'update', or 'publish' (if success)
 * @returns {string} result.error - Error message (if failed)
 */
function upsertKnowledgeArticle(contentAsset, config) {
    logger.debug('Upserting knowledge article for content asset: ' + contentAsset.ID);

    try {
        // Get configuration from parameters
        var articleType = (config && config.articleType) || 'Knowledge__kav';
        var fieldMappingJSON = (config && config.fieldMapping) || '{}';
        var dataCategory = (config && config.dataCategory) || null;
        var enableDebugLogging = (config && config.enableDebugLogging) || false;
        var publishArticles = (config && config.publishArticles) || false;
        var serviceID = (config && config.serviceID) || null;

        // Validate serviceID is provided
        if (!serviceID || serviceID.trim() === '') {
            logger.error('Service ID not provided in config');
            return {
                success: false,
                error: 'Service ID is required but not provided in configuration'
            };
        }

        var fieldMapping;
        try {
            fieldMapping = JSON.parse(fieldMappingJSON);
        } catch (e) {
            logger.error('Invalid field mapping JSON: ' + e.message);
            return {
                success: false,
                error: 'Invalid field mapping configuration'
            };
        }

        // Note: Field validation (including SFCC_External_ID__c) is now handled upfront
        // in Step 4.5 by toolingHelper.ensureAllMappedFieldsExist() before processing any articles

        // Get OAuth token
        var authResult = authHelper.getAccessToken(serviceID);
        if (!authResult.success) {
            logger.error('Authentication failed: ' + authResult.error);
            return {
                success: false,
                error: 'Authentication failed: ' + authResult.error
            };
        }

        logger.debug('Authentication successful, checking for existing article');

        // Find existing article by SFCC_External_ID__c first
        var existingArticle = findArticleByExternalId(
            authResult.accessToken,
            authResult.instanceUrl,
            contentAsset.ID,
            articleType,
            serviceID
        );

        var result;

        if (existingArticle) {
            logger.info('Found existing article: KnowledgeArticleId=' + existingArticle.KnowledgeArticleId + ', PublishStatus=' + existingArticle.PublishStatus);

            // Map content asset to article format for UPDATE (isCreate = false)
            var updateData = contentMappingHelper.mapContentToArticle(contentAsset, articleType, fieldMapping, dataCategory, false, enableDebugLogging);

            if (!updateData || Object.keys(updateData).length <= 1) {
                logger.error('Article mapping resulted in empty data');
                return {
                    success: false,
                    error: 'Failed to map content to article'
                };
            }

            // Ensure External ID is included in article data
            updateData[EXTERNAL_ID_FIELD] = contentAsset.ID;

            // Update existing article with versioning support
            result = updateArticleWithVersioning(
                authResult.accessToken,
                authResult.instanceUrl,
                existingArticle,
                updateData,
                articleType,
                enableDebugLogging,
                publishArticles,
                serviceID
            );
        } else {
            logger.info('No existing article found, creating new article for content: ' + contentAsset.ID);

            // Map content asset to article format for CREATE (isCreate = true)
            var createData = contentMappingHelper.mapContentToArticle(contentAsset, articleType, fieldMapping, dataCategory, true, enableDebugLogging);

            if (!createData || Object.keys(createData).length <= 1) {
                logger.error('Article mapping resulted in empty data');
                return {
                    success: false,
                    error: 'Failed to map content to article'
                };
            }

            // Ensure External ID is included in article data
            createData[EXTERNAL_ID_FIELD] = contentAsset.ID;

            // Create new article
            result = createArticle(
                authResult.accessToken,
                authResult.instanceUrl,
                createData,
                articleType,
                enableDebugLogging,
                publishArticles,
                serviceID
            );
        }

        // Add content ID to result
        if (result) {
            result.contentId = contentAsset.ID;
        }

        return result;

    } catch (e) {
        logger.error('Exception in upsertKnowledgeArticle: ' + e.message + '\nStack: ' + e.stack);
        return {
            success: false,
            error: 'Exception: ' + e.message,
            contentId: contentAsset.ID
        };
    }
}

/**
 * Find existing Knowledge Article by SFCC External ID
 *
 * Queries Salesforce for articles matching the B2C Content Asset ID.
 * Uses KnowledgeArticleId as the stable reference across versions.
 * IMPORTANT: Prioritizes Draft versions over Online versions to avoid duplicate draft creation.
 *
 * Strategy:
 * 1. First search for Draft version (if exists, use it for updates)
 * 2. If no Draft, search for Online version (will need to create draft from it)
 * 3. This prevents "TRANSLATIONALREADYEXIST" error when draft already exists
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {string} externalId - B2C Content Asset ID
 * @param {string} articleType - Knowledge Article Type (e.g., 'Knowledge__kav')
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object|null} Article object or null if not found
 * @returns {string} article.Id - Salesforce version record ID
 * @returns {string} article.KnowledgeArticleId - Master article ID (stable across versions)
 * @returns {string} article.PublishStatus - Publish status (Online, Draft, etc.)
 */
function findArticleByExternalId(accessToken, instanceUrl, externalId, articleType, serviceID) {
    logger.debug('Searching for existing article with SFCC_External_ID__c: ' + externalId);

    try {
        var escapedId = externalId.replace(/'/g, "\\'");
        var service = services.getKnowledgeService(serviceID);
        if (!service) {
            logger.error('Knowledge API service not found for serviceID: ' + serviceID);
            return null;
        }

        // STEP 1: First, search for Draft version (highest priority)
        var draftQuery = "SELECT Id, KnowledgeArticleId, Title, " + EXTERNAL_ID_FIELD + ", PublishStatus, VersionNumber " +
            "FROM " + articleType +
            " WHERE " + EXTERNAL_ID_FIELD + " = '" + escapedId + "' " +
            "AND PublishStatus = 'Draft' " +
            "ORDER BY VersionNumber DESC LIMIT 1";

        logger.debug('Query (Draft): ' + draftQuery);

        var draftResult = service.call({
            accessToken: accessToken,
            instanceUrl: instanceUrl,
            endpoint: '/query?q=' + encodeURIComponent(draftQuery),
            method: 'GET',
            body: {}
        });

        if (draftResult.status === 'OK' && draftResult.object && draftResult.object.success) {
            var draftRecords = draftResult.object.data.records;

            if (draftRecords && draftRecords.length > 0) {
                var draftArticle = draftRecords[0];
                logger.info('Found existing DRAFT article: Id=' + draftArticle.Id + ', KnowledgeArticleId=' + draftArticle.KnowledgeArticleId + ', PublishStatus=' + draftArticle.PublishStatus);
                return draftArticle;
            }
        }

        // STEP 2: No Draft found, search for Online version
        logger.debug('No draft found, searching for Online version');

        var onlineQuery = "SELECT Id, KnowledgeArticleId, Title, " + EXTERNAL_ID_FIELD + ", PublishStatus, VersionNumber " +
            "FROM " + articleType +
            " WHERE " + EXTERNAL_ID_FIELD + " = '" + escapedId + "' " +
            "AND PublishStatus = 'Online' " +
            "ORDER BY VersionNumber DESC LIMIT 1";

        logger.debug('Query (Online): ' + onlineQuery);

        var onlineResult = service.call({
            accessToken: accessToken,
            instanceUrl: instanceUrl,
            endpoint: '/query?q=' + encodeURIComponent(onlineQuery),
            method: 'GET',
            body: {}
        });

        if (onlineResult.status === 'OK' && onlineResult.object && onlineResult.object.success) {
            var onlineRecords = onlineResult.object.data.records;

            if (onlineRecords && onlineRecords.length > 0) {
                var onlineArticle = onlineRecords[0];
                logger.info('Found existing ONLINE article: Id=' + onlineArticle.Id + ', KnowledgeArticleId=' + onlineArticle.KnowledgeArticleId + ', PublishStatus=' + onlineArticle.PublishStatus);
                return onlineArticle;
            }
        }

        // STEP 3: No Draft or Online found, try Archived or other statuses
        logger.debug('No draft or online found, searching all statuses');

        var allQuery = "SELECT Id, KnowledgeArticleId, Title, " + EXTERNAL_ID_FIELD + ", PublishStatus, VersionNumber " +
            "FROM " + articleType +
            " WHERE " + EXTERNAL_ID_FIELD + " = '" + escapedId + "' " +
            "ORDER BY VersionNumber DESC LIMIT 1";

        logger.debug('Query (All): ' + allQuery);

        var allResult = service.call({
            accessToken: accessToken,
            instanceUrl: instanceUrl,
            endpoint: '/query?q=' + encodeURIComponent(allQuery),
            method: 'GET',
            body: {}
        });

        if (allResult.status === 'OK' && allResult.object && allResult.object.success) {
            var allRecords = allResult.object.data.records;

            if (allRecords && allRecords.length > 0) {
                var article = allRecords[0];
                logger.info('Found existing article (other status): Id=' + article.Id + ', KnowledgeArticleId=' + article.KnowledgeArticleId + ', PublishStatus=' + article.PublishStatus);
                return article;
            }
        }

        logger.debug('No existing article found with SFCC_External_ID__c: ' + externalId);
        return null;

    } catch (e) {
        logger.error('Exception searching for article: ' + e.message);
        return null;
    }
}

/**
 * Update Article with Versioning Support
 *
 * Handles Knowledge versioning:
 * - If Online (Published): Creates draft via editOnlineArticle REST API
 * - If Draft: Updates draft directly
 * Then optionally publishes the updated draft based on publishArticles flag.
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {Object} existingArticle - Existing article object from query
 * @param {Object} articleData - Article data to update
 * @param {string} articleType - Knowledge Article Type
 * @param {boolean} enableDebugLogging - Enable debug logging
 * @param {boolean} publishArticles - Whether to publish the article (true) or keep as draft (false)
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object} Update result
 */
function updateArticleWithVersioning(accessToken, instanceUrl, existingArticle, articleData, articleType, enableDebugLogging, publishArticles, serviceID) {
    logger.info('Updating article with versioning: KnowledgeArticleId=' + existingArticle.KnowledgeArticleId + ', PublishStatus=' + existingArticle.PublishStatus);

    try {
        var draftId;

        if (existingArticle.PublishStatus === 'Online') {
            // Article is published, must create draft first using editOnlineArticle
            logger.info('Article is Online, creating draft via editOnlineArticle');

            var editResult = editOnlineArticle(accessToken, instanceUrl, existingArticle.KnowledgeArticleId, serviceID);

            if (!editResult.success) {
                logger.error('Failed to create draft from online article: ' + editResult.error);
                return {
                    success: false,
                    error: 'Failed to create draft: ' + editResult.error,
                    operation: 'edit_online'
                };
            }

            draftId = editResult.draftId;
            logger.info('Created draft version: ' + draftId);

        } else if (existingArticle.PublishStatus === 'Draft') {
            // Draft already exists, use it
            logger.info('Draft version already exists: ' + existingArticle.Id);
            draftId = existingArticle.Id;

        } else {
            // Other status (Archived, etc.) - log warning and attempt to update
            logger.warn('Article has unusual PublishStatus: ' + existingArticle.PublishStatus + ', attempting direct update');
            draftId = existingArticle.Id;
        }

        // Update the draft
        logger.info('Updating draft article: ' + draftId);

        var endpoint = '/sobjects/' + articleType + '/' + draftId;

        if (enableDebugLogging) {
            logger.info('========== DEBUG: SALESFORCE API REQUEST (UPDATE) ==========');
            logger.info('Endpoint: ' + instanceUrl + '/services/data/' + API_VERSION + endpoint);
            logger.info('Method: PATCH');
            logger.info('Payload:');
            try {
                logger.info(JSON.stringify(articleData, null, 2));
            } catch (e) {
                logger.warn('Could not stringify payload: ' + e.message);
                logger.info('Payload fields: ' + Object.keys(articleData).join(', '));
            }
            logger.info('===========================================================');
        }

        var service = services.getKnowledgeService(serviceID);
        var updateResult = service.call({
            accessToken: accessToken,
            instanceUrl: instanceUrl,
            endpoint: endpoint,
            method: 'PATCH',
            body: articleData
        });

        if (updateResult.status !== 'OK' || !updateResult.object || !updateResult.object.success) {
            var errorMsg = updateResult.object ? updateResult.object.errorMessage : (updateResult.errorMessage || 'Update failed');
            logger.error('Draft update failed: ' + errorMsg);
            return {
                success: false,
                error: 'Failed to update draft: ' + errorMsg,
                operation: 'update_draft'
            };
        }

        logger.info('Successfully updated draft article: ' + draftId);

        // Conditionally publish the draft based on publishArticles flag
        if (publishArticles) {
            logger.info('PublishArticles is enabled, publishing article');
            var publishResult = publishArticle(accessToken, instanceUrl, draftId, serviceID);

            if (!publishResult.success) {
                logger.warn('Article updated but publish failed: ' + publishResult.error);
                // Return success anyway since the draft was updated
                return {
                    success: true,
                    knowledgeArticleId: existingArticle.KnowledgeArticleId,
                    versionId: draftId,
                    operation: 'update',
                    publishStatus: 'draft',
                    warning: 'Publish failed: ' + publishResult.error
                };
            }

            logger.info('Successfully published article: ' + existingArticle.KnowledgeArticleId);

            return {
                success: true,
                knowledgeArticleId: existingArticle.KnowledgeArticleId,
                versionId: draftId,
                operation: 'update',
                publishStatus: 'online'
            };
        } else {
            logger.info('PublishArticles is disabled, article will remain in draft status');
            return {
                success: true,
                knowledgeArticleId: existingArticle.KnowledgeArticleId,
                versionId: draftId,
                operation: 'update',
                publishStatus: 'draft'
            };
        }

    } catch (e) {
        logger.error('Exception updating article with versioning: ' + e.message);
        return {
            success: false,
            error: 'Exception: ' + e.message,
            operation: 'update'
        };
    }
}

/**
 * Create New Knowledge Article
 *
 * Creates a new Knowledge article in Draft status, then optionally publishes it based on publishArticles flag.
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {Object} articleData - Article data
 * @param {string} articleType - Knowledge Article Type
 * @param {boolean} enableDebugLogging - Enable debug logging
 * @param {boolean} publishArticles - Whether to publish the article (true) or keep as draft (false)
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object} Create result
 */
function createArticle(accessToken, instanceUrl, articleData, articleType, enableDebugLogging, publishArticles, serviceID) {
    logger.info('Creating new Knowledge article');

    try {
        var endpoint = '/sobjects/' + articleType;

        if (enableDebugLogging) {
            logger.info('========== DEBUG: SALESFORCE API REQUEST (CREATE) ==========');
            logger.info('Endpoint: ' + instanceUrl + '/services/data/' + API_VERSION + endpoint);
            logger.info('Method: POST');
            logger.info('Payload:');
            try {
                logger.info(JSON.stringify(articleData, null, 2));
            } catch (e) {
                logger.warn('Could not stringify payload: ' + e.message);
                logger.info('Payload fields: ' + Object.keys(articleData).join(', '));
            }
            logger.info('===========================================================');
        }

        var service = services.getKnowledgeService(serviceID);
        var result = service.call({
            accessToken: accessToken,
            instanceUrl: instanceUrl,
            endpoint: endpoint,
            method: 'POST',
            body: articleData
        });

        // Process result
        if (result.status === 'OK' && result.object && result.object.success) {
            var articleId = result.object.data.id;
            logger.info('Successfully created article: ' + articleId);

            // Query to get KnowledgeArticleId
            var query = "SELECT Id, KnowledgeArticleId FROM " + articleType + " WHERE Id = '" + articleId + "'";
            var queryEndpoint = '/query?q=' + encodeURIComponent(query);

            logger.info('Querying for KnowledgeArticleId with query: ' + query);

            var queryResult = service.call({
                accessToken: accessToken,
                instanceUrl: instanceUrl,
                endpoint: queryEndpoint,
                method: 'GET',
                body: {}
            });

            logger.info('Query result status: ' + queryResult.status);
            if (queryResult.object) {
                logger.info('Query result success: ' + queryResult.object.success);
                if (queryResult.object.data) {
                    logger.info('Query result data: ' + JSON.stringify(queryResult.object.data));
                } else {
                    logger.warn('Query result has no data property');
                }
            } else {
                logger.warn('Query result has no object property');
            }

            var knowledgeArticleId = articleId;
            if (queryResult.status === 'OK' && queryResult.object && queryResult.object.success) {
                var records = queryResult.object.data.records;
                if (records && records.length > 0) {
                    logger.info('Query returned ' + records.length + ' record(s)');
                    logger.info('Record[0].Id: ' + records[0].Id);
                    logger.info('Record[0].KnowledgeArticleId: ' + records[0].KnowledgeArticleId);

                    knowledgeArticleId = records[0].KnowledgeArticleId;
                    logger.info('Using KnowledgeArticleId: ' + knowledgeArticleId + ' from query result');
                } else {
                    logger.warn('Query returned no records, using fallback articleId: ' + knowledgeArticleId);
                }
            } else {
                logger.warn('Query failed or returned no success flag, using fallback articleId: ' + knowledgeArticleId);
                if (queryResult.object && queryResult.object.errorMessage) {
                    logger.error('Query error: ' + queryResult.object.errorMessage);
                }
            }

            // Conditionally publish the article based on publishArticles flag
            if (publishArticles) {
                logger.info('PublishArticles is enabled, publishing article');
                var publishResult = publishArticle(accessToken, instanceUrl, articleId, serviceID);

                if (!publishResult.success) {
                    logger.warn('Article created but publish failed: ' + publishResult.error);
                    return {
                        success: true,
                        knowledgeArticleId: knowledgeArticleId,
                        versionId: articleId,
                        operation: 'create',
                        publishStatus: 'draft',
                        warning: 'Publish failed: ' + publishResult.error
                    };
                }

                logger.info('Successfully published new article: ' + knowledgeArticleId);

                return {
                    success: true,
                    knowledgeArticleId: knowledgeArticleId,
                    versionId: articleId,
                    operation: 'create',
                    publishStatus: 'online'
                };
            } else {
                logger.info('PublishArticles is disabled, article will remain in draft status');
                return {
                    success: true,
                    knowledgeArticleId: knowledgeArticleId,
                    versionId: articleId,
                    operation: 'create',
                    publishStatus: 'draft'
                };
            }
        } else {
            var errorMsg = result.object ? result.object.errorMessage : (result.errorMessage || 'Create failed');
            logger.error('Article creation failed: ' + errorMsg);

            return {
                success: false,
                error: errorMsg,
                operation: 'create'
            };
        }

    } catch (e) {
        logger.error('Exception creating article: ' + e.message);
        return {
            success: false,
            error: 'Exception: ' + e.message,
            operation: 'create'
        };
    }
}

/**
 * Edit Online Article (Create Draft from Published)
 *
 * Uses KbManagement REST API to create a new draft version from a published article.
 * This is required because you cannot update a Published article directly.
 *
 * Endpoint: POST /services/data/vXX.0/knowledgeManagement/articleVersions/masterVersions
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {string} knowledgeArticleId - Master Knowledge Article ID (kA0...)
 * @returns {Object} Edit result
 * @returns {boolean} result.success - Whether operation succeeded
 * @returns {string} result.draftId - Draft version ID (if success)
 * @returns {string} result.error - Error message (if failed)
 */
function editOnlineArticle(accessToken, instanceUrl, knowledgeArticleId, serviceID) {
    logger.info('Creating draft version from published article: ' + knowledgeArticleId);

    try {
        var endpoint = '/knowledgeManagement/articleVersions/masterVersions';

        var service = services.getKnowledgeService(serviceID);
        var result = service.call({
            accessToken: accessToken,
            instanceUrl: instanceUrl,
            endpoint: endpoint,
            method: 'POST',
            body: {
                articleId: knowledgeArticleId
            }
        });

        if (result.status === 'OK' && result.object && result.object.success) {
            var draftId = result.object.data.id;
            logger.info('Successfully created draft version: ' + draftId);

            return {
                success: true,
                draftId: draftId
            };
        } else {
            var errorMsg = result.object ? result.object.errorMessage : (result.errorMessage || 'Failed to create draft version');
            logger.error('Failed to create draft version: ' + errorMsg);

            return {
                success: false,
                error: errorMsg
            };
        }

    } catch (e) {
        logger.error('Exception creating draft version: ' + e.message);
        return {
            success: false,
            error: 'Exception: ' + e.message
        };
    }
}

/**
 * Publish Knowledge Article
 *
 * Publishes a draft version using Actions API.
 *
 * Endpoint: POST /services/data/vXX.0/actions/standard/publishKnowledgeArticles
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {string} articleVersionId - Draft version ID (ka0...)
 * @returns {Object} Publish result
 * @returns {boolean} result.success - Whether operation succeeded
 * @returns {string} result.error - Error message (if failed)
 */
function publishArticle(accessToken, instanceUrl, articleVersionId, serviceID) {
    logger.info('Publishing article version: ' + articleVersionId);

    try {
        var endpoint = '/actions/standard/publishKnowledgeArticles';

        var service = services.getKnowledgeService(serviceID);
        var result = service.call({
            accessToken: accessToken,
            instanceUrl: instanceUrl,
            endpoint: endpoint,
            method: 'POST',
            body: {
                inputs: [{
                    articleVersionIdList: [articleVersionId],
                    pubAction: 'PUBLISH_ARTICLE'
                }]
            }
        });

        // Actions API returns different response structure
        if (result.status === 'OK' && result.object && result.object.success) {
            var responseData = result.object.data;

            // Check if it's an array response from Actions API
            if (responseData && Array.isArray(responseData) && responseData.length > 0) {
                var actionResult = responseData[0];

                if (actionResult.isSuccess) {
                    logger.info('Successfully published article version: ' + articleVersionId);
                    return {
                        success: true
                    };
                } else {
                    var errorMsg = actionResult.errors && actionResult.errors.length > 0
                        ? JSON.stringify(actionResult.errors)
                        : 'Publish failed';
                    logger.error('Publish failed: ' + errorMsg);
                    return {
                        success: false,
                        error: errorMsg
                    };
                }
            } else {
                logger.error('Unexpected Actions API response structure');
                return {
                    success: false,
                    error: 'Unexpected response structure from Actions API'
                };
            }
        } else {
            var errorMsg = result.object ? result.object.errorMessage : (result.errorMessage || 'Publish failed');
            logger.error('Publish failed: ' + errorMsg);

            return {
                success: false,
                error: errorMsg
            };
        }

    } catch (e) {
        logger.error('Exception publishing article: ' + e.message);
        return {
            success: false,
            error: 'Exception: ' + e.message
        };
    }
}

/**
 * Export batch of content assets to Salesforce Knowledge
 *
 * Processes multiple content assets in a single batch.
 * Continues processing even if individual articles fail.
 *
 * @param {Array<Object>} contentAssets - Array of formatted content assets
 * @param {Object} config - Configuration object
 * @param {string} config.articleType - Knowledge Article Type
 * @param {string} config.fieldMapping - JSON field mapping string
 * @param {string} config.dataCategory - Optional data category
 * @returns {Object} Batch result
 * @returns {boolean} result.success - Whether batch completed (even with errors)
 * @returns {number} result.successCount - Number of successful upserts
 * @returns {number} result.failureCount - Number of failed upserts
 * @returns {Array<Object>} result.details - Detailed results for each asset
 * @returns {string} result.error - Overall error message (if batch failed completely)
 */
function exportBatch(contentAssets, config) {
    logger.info('Exporting batch of ' + contentAssets.length + ' content assets');

    var result = {
        success: true,
        successCount: 0,
        failureCount: 0,
        details: []
    };

    if (!contentAssets || contentAssets.length === 0) {
        result.error = 'Empty batch';
        return result;
    }

    try {
        // Process each content asset
        for (var i = 0; i < contentAssets.length; i++) {
            var contentAsset = contentAssets[i];

            logger.debug('Processing content asset ' + (i + 1) + '/' + contentAssets.length + ': ' + contentAsset.ID);

            // Upsert article
            var upsertResult = upsertKnowledgeArticle(contentAsset, config);

            // Track result
            result.details.push({
                contentId: contentAsset.ID,
                success: upsertResult.success,
                knowledgeArticleId: upsertResult.knowledgeArticleId,
                versionId: upsertResult.versionId,
                operation: upsertResult.operation,
                publishStatus: upsertResult.publishStatus,
                error: upsertResult.error,
                warning: upsertResult.warning
            });

            if (upsertResult.success) {
                result.successCount++;
            } else {
                result.failureCount++;
                logger.warn('Failed to upsert article for content ' + contentAsset.ID + ': ' + upsertResult.error);
            }
        }

        logger.info('Batch complete: ' + result.successCount + ' success, ' + result.failureCount + ' failed');

    } catch (e) {
        logger.error('Exception processing batch: ' + e.message + '\nStack: ' + e.stack);
        result.success = false;
        result.error = 'Batch exception: ' + e.message;
    }

    return result;
}

/**
 * Delete Knowledge Article by SFCC External ID
 *
 * Deletes article from Salesforce Knowledge.
 * Use with caution - this is a destructive operation.
 *
 * @param {string} externalId - B2C Content Asset ID
 * @param {string} articleType - Knowledge Article Type (e.g., 'Knowledge__kav')
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object} Delete result
 * @returns {boolean} result.success - Whether deletion succeeded
 * @returns {string} result.error - Error message (if failed)
 */
function deleteArticle(externalId, articleType, serviceID) {
    logger.debug('Deleting article with SFCC_External_ID__c: ' + externalId);

    try {
        // Get authentication
        var authResult = authHelper.getAccessToken(serviceID);
        if (!authResult.success) {
            return {
                success: false,
                error: 'Authentication failed: ' + authResult.error
            };
        }

        // Find article
        var existingArticle = findArticleByExternalId(
            authResult.accessToken,
            authResult.instanceUrl,
            externalId,
            articleType,
            serviceID
        );

        if (!existingArticle) {
            logger.warn('Article not found with SFCC_External_ID__c: ' + externalId);
            return {
                success: false,
                error: 'Article not found'
            };
        }

        // Delete article using KnowledgeArticleId (deletes all versions)
        var endpoint = '/knowledgeManagement/articles/' + existingArticle.KnowledgeArticleId;

        var service = services.getKnowledgeService(serviceID);
        var result = service.call({
            accessToken: authResult.accessToken,
            instanceUrl: authResult.instanceUrl,
            endpoint: endpoint,
            method: 'DELETE',
            body: {}
        });

        if (result.status === 'OK') {
            logger.info('Successfully deleted article: ' + existingArticle.KnowledgeArticleId);
            return { success: true };
        } else {
            var errorMsg = result.errorMessage || 'Delete failed';
            logger.error('Article deletion failed: ' + errorMsg);
            return {
                success: false,
                error: errorMsg
            };
        }

    } catch (e) {
        logger.error('Exception deleting article: ' + e.message);
        return {
            success: false,
            error: 'Exception: ' + e.message
        };
    }
}

// Export public functions
module.exports = {
    upsertKnowledgeArticle: upsertKnowledgeArticle,
    findArticleByExternalId: findArticleByExternalId,
    exportBatch: exportBatch,
    deleteArticle: deleteArticle
};
