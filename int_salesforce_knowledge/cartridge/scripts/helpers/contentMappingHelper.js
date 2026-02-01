'use strict';

/**
 * Content Mapping Helper
 *
 * Handles reading Content Assets from B2C Commerce and mapping them to
 * Salesforce Knowledge Article format.
 *
 * @module scripts/helpers/contentMappingHelper
 */

var ContentMgr = require('dw/content/ContentMgr');
var ContentSearchModel = require('dw/content/ContentSearchModel');
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');

// Initialize logger
var logger = Logger.getLogger('SFKnowledge', 'ContentMapping');

/**
 * Get Content Assets from B2C Commerce
 *
 * Searches for content assets, optionally filtered by folder and export mode.
 * Only returns online content assets.
 * Defaults to 'root' folder if no folder ID is provided.
 *
 * Export Modes:
 * - 'full': Returns all online content assets (ignores sync metadata)
 * - 'delta': Returns only content modified since last sync (lastModified > sfLastSyncDateTime)
 *
 * @param {string|null} folderID - Content folder ID to search (defaults to 'root' if null/empty)
 * @param {boolean} enableDebugLogging - Enable detailed debug logging
 * @param {string} exportMode - Export mode: 'full' or 'delta' (default: 'delta')
 * @returns {Array<Object>} Array of formatted content asset objects
 *
 * @example
 * // Get all content assets (full sync)
 * var allContent = getContentAssets(null, false, 'full');
 *
 * // Get only modified content (delta sync)
 * var modifiedContent = getContentAssets('root', false, 'delta');
 */
function getContentAssets(folderID, enableDebugLogging, exportMode) {
    var contentAssets = [];

    try {
        // Default export mode to 'delta' if not specified
        var mode = exportMode || 'delta';
        logger.info('Export mode: ' + mode);

        // Create content search model
        var searchModel = new ContentSearchModel();

        // Normalize folder ID - default to 'root' if not specified
        var normalizedFolderID = folderID ? folderID.toString().trim() : 'root';

        // Set folder filter
        if (normalizedFolderID.toLowerCase() === 'root') {
            // Search from root (default behavior)
            logger.info('Getting content assets from root folder (recursive search)');
            searchModel.setFolderID('root');
        } else {
            // Search specific folder
            logger.info('Getting content assets from folder: ' + normalizedFolderID);
            searchModel.setFolderID(normalizedFolderID);
        }

        // Search recursively through subfolders
        searchModel.setRecursiveFolderSearch(true);

        // Execute search
        searchModel.search();

        // Get content iterator
        var contentIterator = searchModel.content;
        var count = 0;
        var skippedCount = 0;

        // Iterate through results
        while (contentIterator.hasNext()) {
            var asset = contentIterator.next();

            // Only export online content
            if (!asset.online) {
                logger.debug('Skipping offline content asset: ' + asset.ID);
                continue;
            }

            // Delta mode filtering: check if content was modified since last sync
            if (mode === 'delta') {
                var lastSyncDateTime = asset.custom && asset.custom.sfLastSyncDateTime;
                var lastModified = asset.lastModified;

                if (lastSyncDateTime && lastModified) {
                    // Compare dates: only include if lastModified > lastSyncDateTime
                    if (lastModified.getTime() <= lastSyncDateTime.getTime()) {
                        logger.debug('Skipping asset ' + asset.ID + ' - not modified since last sync (' +
                            'lastModified: ' + lastModified.toISOString() + ', ' +
                            'lastSync: ' + lastSyncDateTime.toISOString() + ')');
                        skippedCount++;
                        continue;
                    } else {
                        logger.debug('Including asset ' + asset.ID + ' - modified since last sync (' +
                            'lastModified: ' + lastModified.toISOString() + ', ' +
                            'lastSync: ' + lastSyncDateTime.toISOString() + ')');
                    }
                } else if (lastSyncDateTime === null || lastSyncDateTime === undefined) {
                    // No last sync date - include in delta sync (first-time sync)
                    logger.debug('Including asset ' + asset.ID + ' - never synced before');
                } else {
                    // No lastModified date (shouldn't happen) - include for safety
                    logger.debug('Including asset ' + asset.ID + ' - no lastModified date');
                }
            }

            // Format and add asset
            var formattedAsset = formatContentAsset(asset, enableDebugLogging);
            if (formattedAsset) {
                contentAssets.push(formattedAsset);
                count++;
            }
        }

        if (mode === 'delta') {
            logger.info('Found ' + count + ' modified content assets (skipped ' + skippedCount + ' unchanged)');
        } else {
            logger.info('Found ' + count + ' online content assets');
        }

    } catch (e) {
        logger.error('Error getting content assets: ' + e.message + '\nStack: ' + e.stack);
    }

    return contentAssets;
}

/**
 * Format Content Asset for export
 *
 * Extracts relevant fields from Content Asset and formats them
 * for mapping to Knowledge Article.
 *
 * @param {dw.content.Content} asset - B2C Content Asset
 * @param {boolean} enableDebugLogging - Enable detailed debug logging
 * @returns {Object|null} Formatted content asset object
 *
 * @example
 * var formatted = formatContentAsset(contentAsset, true);
 * // Returns:
 * // {
 * //   ID: 'faq-001',
 * //   name: 'How to reset password',
 * //   description: 'Password reset instructions',
 * //   ...
 * // }
 */
function formatContentAsset(asset, enableDebugLogging) {
    if (!asset) {
        return null;
    }

    try {
        if (enableDebugLogging) {
            logger.info('========== DEBUG: RAW B2C CONTENT ASSET ==========');
            logger.info('Asset ID: ' + asset.ID);
            logger.info('Standard Fields:');
            logger.info('  - ID: ' + asset.ID);
            logger.info('  - name: ' + asset.name);
            logger.info('  - description: ' + asset.description);
            logger.info('  - online: ' + asset.online);
            logger.info('  - pageTitle: ' + asset.pageTitle);
            logger.info('  - pageDescription: ' + asset.pageDescription);
            logger.info('  - pageKeywords: ' + asset.pageKeywords);
            logger.info('  - pageURL: ' + asset.pageURL);
            logger.info('  - template: ' + asset.template);
            logger.info('  - classificationFolder: ' + (asset.classificationFolder ? asset.classificationFolder.ID : 'null'));
            logger.info('  - creationDate: ' + asset.creationDate);
            logger.info('  - lastModified: ' + asset.lastModified);

            // Log custom attributes
            if (asset.custom) {
                logger.info('Custom Attributes:');
                try {
                    // Iterate through custom attributes
                    for (var customAttr in asset.custom) {
                        if (asset.custom.hasOwnProperty(customAttr)) {
                            var value = asset.custom[customAttr];
                            var valueType = typeof value;
                            var displayValue = value;

                            // Handle special types
                            if (value === null || value === undefined) {
                                displayValue = 'null';
                            } else if (valueType === 'object') {
                                // Check for MarkupText
                                if (value.markup !== undefined) {
                                    displayValue = '[MarkupText: ' + String(value.markup).substring(0, 100) + '...]';
                                } else if (value.source !== undefined) {
                                    displayValue = '[MarkupText.source: ' + String(value.source).substring(0, 100) + '...]';
                                } else {
                                    try {
                                        displayValue = JSON.stringify(value);
                                    } catch (e) {
                                        displayValue = '[Object: ' + value.toString() + ']';
                                    }
                                }
                            } else if (valueType === 'string' && value.length > 100) {
                                displayValue = value.substring(0, 100) + '... (length: ' + value.length + ')';
                            }

                            logger.info('  - custom.' + customAttr + ' (' + valueType + '): ' + displayValue);
                        }
                    }
                } catch (customError) {
                    logger.warn('Could not iterate custom attributes: ' + customError.message);
                }
            } else {
                logger.info('Custom Attributes: null');
            }
            logger.info('==================================================');
        }

        return {
            ID: asset.ID,
            name: asset.name || '',
            description: asset.description || '',
            online: asset.online,
            // Standard content fields
            pageTitle: asset.pageTitle || '',
            pageDescription: asset.pageDescription || '',
            pageKeywords: asset.pageKeywords || '',
            pageURL: asset.pageURL || '',
            // Custom attributes (commonly used)
            body: (asset.custom && asset.custom.body) ? asset.custom.body : '',
            // Template info
            template: asset.template || '',
            // Classification
            classificationFolder: asset.classificationFolder ? asset.classificationFolder.ID : '',
            // Timestamps
            creationDate: asset.creationDate,
            lastModified: asset.lastModified,
            // Salesforce Knowledge sync metadata
            sfKnowledgeArticleId: (asset.custom && asset.custom.sfKnowledgeArticleId) ? asset.custom.sfKnowledgeArticleId : null,
            sfKnowledgeVersionId: (asset.custom && asset.custom.sfKnowledgeVersionId) ? asset.custom.sfKnowledgeVersionId : null,
            sfLastSyncDateTime: (asset.custom && asset.custom.sfLastSyncDateTime) ? asset.custom.sfLastSyncDateTime : null,
            // Full custom object for flexible mapping
            custom: asset.custom,
            // Keep reference to original asset for updates
            _asset: asset
        };
    } catch (e) {
        logger.error('Error formatting content asset ' + asset.ID + ': ' + e.message);
        return null;
    }
}

/**
 * Convert value to Salesforce-safe format
 *
 * Handles SFCC-specific object types (MarkupText, etc.) and converts them to plain strings.
 * Salesforce expects primitive values (string, number, boolean, null), not complex objects.
 *
 * @param {*} value - Raw value from B2C content asset
 * @returns {*} Salesforce-safe value (string, number, boolean, or null)
 */
function convertToSalesforceSafeValue(value) {
    // Handle null/undefined
    if (value === null || value === undefined) {
        return null;
    }

    // Handle primitives - pass through
    var valueType = typeof value;
    if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
        return value;
    }

    // Handle SFCC MarkupText object - has .markup or .source property
    if (value && typeof value === 'object') {
        // MarkupText has .markup property (HTML content)
        if (value.markup !== undefined && value.markup !== null) {
            return String(value.markup);
        }

        // MarkupText alternative: .source property (raw HTML)
        if (value.source !== undefined && value.source !== null) {
            return String(value.source);
        }

        // Check if it has a toString method that returns something useful
        if (typeof value.toString === 'function') {
            var stringValue = value.toString();
            // Don't use toString if it's just [object Object]
            if (stringValue && stringValue !== '[object Object]') {
                return stringValue;
            }
        }

        // Last resort: stringify the object
        try {
            return JSON.stringify(value);
        } catch (e) {
            logger.warn('Could not convert object to string: ' + e.message);
            return String(value);
        }
    }

    // Fallback: convert to string
    return String(value);
}

/**
 * Map Content Asset to Knowledge Article
 *
 * Transforms B2C Content Asset into Salesforce Knowledge Article format
 * using field mappings.
 *
 * @param {Object} contentAsset - Formatted content asset
 * @param {string} articleType - Salesforce Knowledge Article Type (e.g., 'FAQ__kav')
 * @param {Object} fieldMapping - Field mapping object (SF field -> B2C field path)
 * @param {string} dataCategory - Optional data category
 * @param {boolean} isCreate - Whether this is for article creation (true) or update (false)
 * @param {boolean} enableDebugLogging - Enable detailed debug logging
 * @returns {Object} Knowledge Article object ready for Salesforce API
 *
 * @example
 * var fieldMapping = {
 *     "Title": "name",
 *     "Summary": "pageDescription",
 *     "Body__c": "custom.body",
 *     "SFCC_External_ID__c": "ID"
 * };
 *
 * var article = mapContentToArticle(contentAsset, 'Knowledge__kav', fieldMapping, 'Products:Electronics', true, true);
 */
function mapContentToArticle(contentAsset, articleType, fieldMapping, dataCategory, isCreate, enableDebugLogging) {
    logger.debug('Mapping content asset ' + contentAsset.ID + ' to article type: ' + articleType + ' (isCreate: ' + isCreate + ')');

    if (enableDebugLogging) {
        logger.info('========== DEBUG: FIELD MAPPING PROCESS ==========');
        logger.info('Content Asset ID: ' + contentAsset.ID);
        logger.info('Article Type: ' + articleType);
        logger.info('Is Create: ' + isCreate);
        logger.info('Field Mappings:');
    }

    // Initialize article with attributes
    var article = {
        attributes: {
            type: articleType
        }
    };

    try {
        // Apply field mappings from site preferences
        for (var sfField in fieldMapping) {
            if (fieldMapping.hasOwnProperty(sfField)) {
                var b2cFieldPath = fieldMapping[sfField];

                // Get value from content asset using nested property path
                var rawValue = getNestedProperty(contentAsset, b2cFieldPath);

                // Convert value to string-safe format
                var value = convertToSalesforceSafeValue(rawValue);

                if (enableDebugLogging) {
                    var rawValueType = (rawValue === null || rawValue === undefined) ? 'null' : typeof rawValue;
                    var displayRawValue = rawValue;
                    var displayFinalValue = value;

                    // Truncate long values for display
                    if (typeof displayRawValue === 'string' && displayRawValue.length > 100) {
                        displayRawValue = displayRawValue.substring(0, 100) + '... (length: ' + displayRawValue.length + ')';
                    }
                    if (typeof displayFinalValue === 'string' && displayFinalValue.length > 100) {
                        displayFinalValue = displayFinalValue.substring(0, 100) + '... (length: ' + displayFinalValue.length + ')';
                    }

                    // Special handling for MarkupText
                    if (rawValue && typeof rawValue === 'object' && (rawValue.markup !== undefined || rawValue.source !== undefined)) {
                        displayRawValue = '[MarkupText object]';
                    }

                    logger.info('  - SF Field: "' + sfField + '" <- B2C Field: "' + b2cFieldPath + '"');
                    logger.info('    Raw Value (' + rawValueType + '): ' + displayRawValue);
                    logger.info('    Converted Value: ' + displayFinalValue);
                    logger.info('    Included in payload: ' + (value !== null && value !== undefined && value !== ''));
                }

                // Only include non-null/undefined values
                if (value !== null && value !== undefined && value !== '') {
                    article[sfField] = value;
                }
            }
        }

        // Add Language field only during creation (not during updates)
        // The Language field in Salesforce Knowledge is a system field that cannot be modified after creation
        if (isCreate !== false) {
            article.Language = 'en_US'; // TODO: Make configurable or map from site locale
            if (enableDebugLogging) {
                logger.info('  - SF Field: "Language" (System Field)');
                logger.info('    Value: en_US');
                logger.info('    Included in payload: true (CREATE only)');
            }
        } else {
            if (enableDebugLogging) {
                logger.info('  - SF Field: "Language" (System Field)');
                logger.info('    Included in payload: false (UPDATE - field cannot be modified)');
            }
        }

        // Add data category if provided
        if (dataCategory && dataCategory.trim() !== '') {
            // Note: Data categories in Salesforce require specific API structure
            // This is a simplified example - actual implementation may need category group mapping
            article.DataCategorySelections = {
                DataCategory: dataCategory
            };
            if (enableDebugLogging) {
                logger.info('  - SF Field: "DataCategorySelections"');
                logger.info('    Value: ' + dataCategory);
                logger.info('    Included in payload: true');
            }
        }

        if (enableDebugLogging) {
            logger.info('Total fields in article payload: ' + Object.keys(article).length);
            logger.info('==================================================');
        }

        logger.debug('Mapped content asset to article with ' + Object.keys(article).length + ' fields');

    } catch (e) {
        logger.error('Error mapping content to article: ' + e.message + '\nStack: ' + e.stack);
    }

    return article;
}

/**
 * Get nested property from object using dot notation
 *
 * Safely retrieves nested properties from objects.
 * Handles paths like "custom.body" or "classificationFolder.ID"
 *
 * @param {Object} obj - Source object
 * @param {string} path - Dot-separated property path
 * @returns {*} Property value or null if not found
 *
 * @example
 * var value = getNestedProperty(obj, 'custom.body');
 * // Returns obj.custom.body or null
 *
 * var value = getNestedProperty(obj, 'simple');
 * // Returns obj.simple or null
 */
function getNestedProperty(obj, path) {
    if (!obj || !path) {
        return null;
    }

    // Split path by dots
    var parts = path.split('.');
    var current = obj;

    // Traverse path
    for (var i = 0; i < parts.length; i++) {
        if (current === null || current === undefined) {
            return null;
        }

        var part = parts[i].trim();
        if (part === '') {
            continue;
        }

        current = current[part];
    }

    return current;
}

/**
 * Export content assets in batches
 *
 * Processes content assets in batches for efficient API usage.
 * This function orchestrates the batch export process.
 *
 * @param {Array<Object>} contentAssets - Array of formatted content assets
 * @param {number} batchSize - Number of assets to process per batch
 * @param {Function} exportFunction - Function to call for each batch
 * @returns {Object} Export results
 * @returns {number} result.totalProcessed - Total assets processed
 * @returns {number} result.totalSuccess - Total successful exports
 * @returns {number} result.totalFailed - Total failed exports
 * @returns {Array<Object>} result.errors - Array of error objects
 *
 * @example
 * var knowledgeHelper = require('~/salesforceKnowledgeHelper');
 *
 * var result = exportToExternalAPI(contentAssets, 50, function(batch) {
 *     return knowledgeHelper.exportBatch(batch);
 * });
 */
function exportToExternalAPI(contentAssets, batchSize, exportFunction) {
    logger.info('Starting batch export of ' + contentAssets.length + ' content assets (batch size: ' + batchSize + ')');

    var result = {
        totalProcessed: 0,
        totalSuccess: 0,
        totalFailed: 0,
        errors: []
    };

    if (!contentAssets || contentAssets.length === 0) {
        logger.warn('No content assets to export');
        return result;
    }

    // Calculate number of batches
    var totalBatches = Math.ceil(contentAssets.length / batchSize);
    logger.info('Processing ' + totalBatches + ' batches');

    // Process each batch
    for (var i = 0; i < totalBatches; i++) {
        var startIdx = i * batchSize;
        var endIdx = Math.min(startIdx + batchSize, contentAssets.length);
        var batch = contentAssets.slice(startIdx, endIdx);

        logger.debug('Processing batch ' + (i + 1) + '/' + totalBatches + ' (' + batch.length + ' assets)');

        try {
            // Call export function for this batch
            var batchResult = exportFunction(batch);

            result.totalProcessed += batch.length;

            if (batchResult.success) {
                result.totalSuccess += batchResult.successCount || batch.length;
                logger.info('Batch ' + (i + 1) + ' completed successfully');
            } else {
                result.totalFailed += batch.length;
                result.errors.push({
                    batch: i + 1,
                    error: batchResult.error || 'Unknown error'
                });
                logger.error('Batch ' + (i + 1) + ' failed: ' + batchResult.error);
            }
        } catch (e) {
            result.totalProcessed += batch.length;
            result.totalFailed += batch.length;
            result.errors.push({
                batch: i + 1,
                error: e.message
            });
            logger.error('Exception processing batch ' + (i + 1) + ': ' + e.message);
        }
    }

    logger.info('Batch export completed: ' + result.totalSuccess + ' success, ' + result.totalFailed + ' failed');

    return result;
}

/**
 * Update Sync Metadata on Content Asset
 *
 * Updates the Salesforce Knowledge sync metadata fields on a B2C Content Asset
 * after successful export to Salesforce Knowledge.
 *
 * Updates:
 * - sfKnowledgeArticleId: Master Knowledge Article ID
 * - sfKnowledgeVersionId: Current version ID
 * - sfLastSyncDateTime: Current timestamp
 *
 * @param {string} contentAssetID - B2C Content Asset ID
 * @param {string} knowledgeArticleId - Salesforce Knowledge Article ID (master ID)
 * @param {string} versionId - Salesforce Knowledge Version ID
 * @returns {Object} Update result
 * @returns {boolean} result.success - Whether update succeeded
 * @returns {string} result.error - Error message (if failed)
 *
 * @example
 * var result = updateSyncMetadata('faq-001', 'kA0xx000000001', 'ka0xx000000002');
 * if (result.success) {
 *     logger.info('Sync metadata updated for content: faq-001');
 * }
 */
function updateSyncMetadata(contentAssetID, knowledgeArticleId, versionId) {
    logger.debug('Updating sync metadata for content asset: ' + contentAssetID);

    try {
        // Get content asset
        var content = ContentMgr.getContent(contentAssetID);

        if (!content) {
            logger.error('Content asset not found: ' + contentAssetID);
            return {
                success: false,
                error: 'Content asset not found'
            };
        }

        // Use Transaction API to update custom attributes
        var Transaction = require('dw/system/Transaction');

        Transaction.wrap(function () {
            // Update sync metadata
            content.custom.sfKnowledgeArticleId = knowledgeArticleId;
            content.custom.sfKnowledgeVersionId = versionId;
            content.custom.sfLastSyncDateTime = new Date();

            logger.debug('Updated sync metadata for ' + contentAssetID + ': ' +
                'articleId=' + knowledgeArticleId + ', ' +
                'versionId=' + versionId + ', ' +
                'syncTime=' + content.custom.sfLastSyncDateTime.toISOString());
        });

        return {
            success: true
        };

    } catch (e) {
        logger.error('Error updating sync metadata for ' + contentAssetID + ': ' + e.message);
        return {
            success: false,
            error: e.message
        };
    }
}

// Export public functions
module.exports = {
    getContentAssets: getContentAssets,
    formatContentAsset: formatContentAsset,
    mapContentToArticle: mapContentToArticle,
    getNestedProperty: getNestedProperty,
    exportToExternalAPI: exportToExternalAPI,
    updateSyncMetadata: updateSyncMetadata
};
