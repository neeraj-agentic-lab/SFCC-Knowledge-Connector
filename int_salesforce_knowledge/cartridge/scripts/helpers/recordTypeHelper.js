'use strict';

/**
 * Record Type Helper
 *
 * Handles Salesforce Knowledge Record Type lookup and caching.
 * Record Type IDs are org-specific, so we look up by DeveloperName (API Name)
 * and cache the ID for the duration of the job execution.
 *
 * @module scripts/helpers/recordTypeHelper
 */

var Logger = require('dw/system/Logger');
var services = require('int_salesforce_knowledge/cartridge/scripts/services/salesforceKnowledgeService');

var logger = Logger.getLogger('SFKnowledge', 'RecordTypeHelper');

// Cache for Record Type IDs (per execution)
// Structure: { "RecordTypeDeveloperName": "RecordTypeId" }
var recordTypeCache = {};

/**
 * Get Record Type ID by DeveloperName (API Name)
 *
 * Looks up the Record Type ID from Salesforce using SOQL and caches it.
 * Uses cache if Record Type was already looked up in this execution.
 *
 * @param {string} recordTypeName - Record Type DeveloperName (API Name)
 * @param {string} articleType - Knowledge Article Type (e.g., 'Knowledge__kav')
 * @param {string} accessToken - Salesforce OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object} Result { success: boolean, recordTypeId: string, error: string }
 */
function getRecordTypeId(recordTypeName, articleType, accessToken, instanceUrl, serviceID) {
    if (!recordTypeName || recordTypeName.trim() === '') {
        logger.debug('No Record Type name provided, skipping Record Type lookup');
        return { success: true, recordTypeId: null };
    }

    // Check cache first
    var cacheKey = articleType + ':' + recordTypeName;
    if (recordTypeCache[cacheKey]) {
        logger.debug('Record Type ID found in cache: ' + recordTypeName + ' → ' + recordTypeCache[cacheKey]);
        return {
            success: true,
            recordTypeId: recordTypeCache[cacheKey],
            cached: true
        };
    }

    logger.info('Looking up Record Type ID for: ' + recordTypeName + ' (Article Type: ' + articleType + ')');

    try {
        // Build SOQL query to find Record Type by DeveloperName
        var query = "SELECT Id, Name, DeveloperName, Description " +
                    "FROM RecordType " +
                    "WHERE SObjectType = '" + escapeSoql(articleType) + "' " +
                    "AND DeveloperName = '" + escapeSoql(recordTypeName) + "' " +
                    "LIMIT 1";

        logger.debug('Record Type SOQL query: ' + query);

        // Execute query
        var service = services.getKnowledgeService(serviceID);
        if (!service) {
            logger.error('Knowledge API service not found for serviceID: ' + serviceID);
            return {
                success: false,
                error: 'Service not found: ' + serviceID
            };
        }

        var result = service.call({
            accessToken: accessToken,
            instanceUrl: instanceUrl,
            endpoint: '/query?q=' + encodeURIComponent(query),
            method: 'GET',
            body: {}
        });

        // Check response
        if (result.status !== 'OK') {
            logger.error('Record Type lookup failed. Service status: ' + result.status);
            return {
                success: false,
                error: 'Service call failed with status: ' + result.status
            };
        }

        if (!result.object || !result.object.success) {
            var errorMsg = result.object && result.object.errorMessage ? result.object.errorMessage : 'Unknown error';
            logger.error('Record Type lookup failed: ' + errorMsg);
            return {
                success: false,
                error: errorMsg
            };
        }

        var records = result.object.data && result.object.data.records ? result.object.data.records : [];

        if (records.length === 0) {
            logger.error('Record Type not found: ' + recordTypeName + ' for Article Type: ' + articleType);
            logger.error('Please verify the Record Type exists in Salesforce and the DeveloperName is correct');
            return {
                success: false,
                error: 'Record Type "' + recordTypeName + '" not found for ' + articleType
            };
        }

        var recordType = records[0];
        var recordTypeId = recordType.Id;

        logger.info('Record Type found: ' + recordType.Name + ' (Id: ' + recordTypeId + ', DeveloperName: ' + recordType.DeveloperName + ')');

        // Cache the result
        recordTypeCache[cacheKey] = recordTypeId;
        logger.debug('Cached Record Type ID: ' + cacheKey + ' → ' + recordTypeId);

        return {
            success: true,
            recordTypeId: recordTypeId,
            recordTypeName: recordType.Name,
            developerName: recordType.DeveloperName
        };

    } catch (e) {
        logger.error('Exception during Record Type lookup: ' + e.message);
        logger.error('Stack trace: ' + e.stack);
        return {
            success: false,
            error: 'Exception: ' + e.message
        };
    }
}

/**
 * Escape single quotes in SOQL strings
 *
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeSoql(value) {
    if (!value) {
        return value;
    }
    return value.replace(/'/g, "\\'");
}

/**
 * Clear Record Type cache
 *
 * Call this between job executions or sites to force re-lookup
 */
function clearCache() {
    logger.debug('Clearing Record Type cache');
    recordTypeCache = {};
}

/**
 * Get Record Type ID for a site configuration
 *
 * Convenience function that extracts recordTypeName from config and looks up ID
 *
 * @param {Object} config - Site configuration object
 * @param {string} accessToken - Salesforce OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object} Result { success: boolean, recordTypeId: string, error: string }
 */
function getRecordTypeIdFromConfig(config, accessToken, instanceUrl, serviceID) {
    if (!config) {
        return { success: true, recordTypeId: null };
    }

    var recordTypeName = config.recordTypeName;
    var articleType = config.articleType || 'Knowledge__kav';

    return getRecordTypeId(recordTypeName, articleType, accessToken, instanceUrl, serviceID);
}

/**
 * Validate Record Type exists in Salesforce
 *
 * Similar to getRecordTypeId but just validates existence without caching
 *
 * @param {string} recordTypeName - Record Type DeveloperName (API Name)
 * @param {string} articleType - Knowledge Article Type
 * @param {string} accessToken - Salesforce OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object} Result { valid: boolean, error: string }
 */
function validateRecordType(recordTypeName, articleType, accessToken, instanceUrl, serviceID) {
    if (!recordTypeName) {
        return { valid: true }; // No record type is valid (optional)
    }

    var result = getRecordTypeId(recordTypeName, articleType, accessToken, instanceUrl, serviceID);

    return {
        valid: result.success,
        error: result.error,
        recordTypeId: result.recordTypeId
    };
}

/**
 * Get cache statistics (for debugging)
 *
 * @returns {Object} Cache statistics
 */
function getCacheStats() {
    var count = 0;
    for (var key in recordTypeCache) {
        if (recordTypeCache.hasOwnProperty(key)) {
            count++;
        }
    }

    return {
        size: count,
        entries: recordTypeCache
    };
}

/**
 * Log cache contents (for debugging)
 */
function logCacheContents() {
    var stats = getCacheStats();
    logger.debug('Record Type Cache: ' + stats.size + ' entries');
    for (var key in stats.entries) {
        if (stats.entries.hasOwnProperty(key)) {
            logger.debug('  - ' + key + ' → ' + stats.entries[key]);
        }
    }
}

// Export public functions
module.exports = {
    getRecordTypeId: getRecordTypeId,
    getRecordTypeIdFromConfig: getRecordTypeIdFromConfig,
    validateRecordType: validateRecordType,
    clearCache: clearCache,
    getCacheStats: getCacheStats,
    logCacheContents: logCacheContents
};
