'use strict';

/**
 * Site Configuration Helper
 *
 * Handles multi-site configuration parsing, validation, and inheritance.
 * Supports site-specific overrides with _defaults inheritance pattern.
 *
 * @module scripts/helpers/siteConfigHelper
 */

var Logger = require('dw/system/Logger');
var Site = require('dw/system/Site');

var logger = Logger.getLogger('SFKnowledge', 'SiteConfigHelper');

/**
 * Parse and validate site configurations JSON
 *
 * @param {string} siteConfigurationsJSON - JSON string containing site configurations
 * @returns {Object} Parsed configuration object or null if invalid
 */
function parseSiteConfigurations(siteConfigurationsJSON) {
    if (!siteConfigurationsJSON || siteConfigurationsJSON.trim() === '') {
        logger.warn('SiteConfigurations parameter is empty or null');
        return null;
    }

    try {
        var config = JSON.parse(siteConfigurationsJSON);

        if (typeof config !== 'object' || config === null) {
            logger.error('SiteConfigurations must be a valid JSON object');
            return null;
        }

        logger.debug('Successfully parsed SiteConfigurations JSON');
        return config;
    } catch (e) {
        logger.error('Failed to parse SiteConfigurations JSON: ' + e.message);
        logger.error('JSON content: ' + siteConfigurationsJSON.substring(0, 500));
        return null;
    }
}

/**
 * Get effective configuration for current site with defaults inheritance
 *
 * @param {Object} allConfigs - All site configurations including _defaults
 * @param {string} siteID - Site ID to get configuration for
 * @returns {Object} Merged configuration for the site
 */
function getSiteConfiguration(allConfigs, siteID) {
    if (!allConfigs || typeof allConfigs !== 'object') {
        logger.error('Invalid allConfigs object provided');
        return null;
    }

    if (!siteID || siteID.trim() === '') {
        logger.error('Site ID is required');
        return null;
    }

    logger.debug('Getting configuration for site: ' + siteID);

    // Get defaults
    var defaults = allConfigs._defaults || {};

    // Get site-specific config
    var siteConfig = allConfigs[siteID];

    if (!siteConfig) {
        logger.warn('No configuration found for site: ' + siteID + ', using _defaults only');
        return defaults;
    }

    // Merge configurations (site-specific overrides defaults)
    var effectiveConfig = mergeConfigurations(defaults, siteConfig);

    logger.debug('Effective configuration for site ' + siteID + ' created successfully');

    return effectiveConfig;
}

/**
 * Merge two configuration objects (site-specific overrides defaults)
 *
 * Strategy:
 * - Simple values: site overrides default
 * - Objects (fieldMapping, transforms, fieldMetadata): site REPLACES default entirely
 * - static: MERGE (combine defaults + site static fields)
 *
 * @param {Object} defaults - Default configuration
 * @param {Object} siteConfig - Site-specific configuration
 * @returns {Object} Merged configuration
 */
function mergeConfigurations(defaults, siteConfig) {
    var merged = {};

    // Start with defaults
    for (var key in defaults) {
        if (defaults.hasOwnProperty(key)) {
            merged[key] = defaults[key];
        }
    }

    // Override with site-specific values
    for (var siteKey in siteConfig) {
        if (siteConfig.hasOwnProperty(siteKey)) {
            // Special handling for 'static' - merge instead of replace
            if (siteKey === 'static') {
                merged.static = mergeStaticFields(defaults.static || {}, siteConfig.static || {});
            } else {
                // For all other keys, site value completely replaces default
                merged[siteKey] = siteConfig[siteKey];
            }
        }
    }

    return merged;
}

/**
 * Merge static field objects (defaults + site-specific)
 *
 * @param {Object} defaultStatic - Default static fields
 * @param {Object} siteStatic - Site-specific static fields
 * @returns {Object} Merged static fields (site wins on conflicts)
 */
function mergeStaticFields(defaultStatic, siteStatic) {
    var merged = {};

    // Add all default static fields
    for (var key in defaultStatic) {
        if (defaultStatic.hasOwnProperty(key)) {
            merged[key] = defaultStatic[key];
        }
    }

    // Override/add site-specific static fields
    for (var siteKey in siteStatic) {
        if (siteStatic.hasOwnProperty(siteKey)) {
            merged[siteKey] = siteStatic[siteKey];
        }
    }

    return merged;
}

/**
 * Get current site ID from DW Site context
 *
 * @returns {string} Current site ID
 */
function getCurrentSiteID() {
    var currentSite = Site.getCurrent();
    if (!currentSite) {
        logger.error('Unable to determine current site');
        return null;
    }

    var siteID = currentSite.getID();
    logger.debug('Current site ID: ' + siteID);
    return siteID;
}

/**
 * Validate site configuration structure
 *
 * @param {Object} config - Configuration object to validate
 * @param {string} siteID - Site ID (for error messages)
 * @returns {Object} Validation result { valid: boolean, errors: [], warnings: [] }
 */
function validateConfiguration(config, siteID) {
    var result = {
        valid: true,
        errors: [],
        warnings: []
    };

    if (!config || typeof config !== 'object') {
        result.valid = false;
        result.errors.push('Configuration is not a valid object for site: ' + siteID);
        return result;
    }

    // Validate articleType
    if (config.articleType && typeof config.articleType !== 'string') {
        result.errors.push('articleType must be a string');
        result.valid = false;
    }

    // Validate contentFolderIDs
    if (config.contentFolderIDs) {
        var folderIDsValid = validateContentFolderIDs(config.contentFolderIDs);
        if (!folderIDsValid.valid) {
            result.errors.push('contentFolderIDs: ' + folderIDsValid.error);
            result.valid = false;
        }
    }

    // Validate batchSize
    if (config.batchSize !== undefined) {
        if (typeof config.batchSize !== 'number' || config.batchSize < 1 || config.batchSize > 500) {
            result.errors.push('batchSize must be a number between 1 and 500');
            result.valid = false;
        }
    }

    // Validate exportMode
    if (config.exportMode && config.exportMode !== 'delta' && config.exportMode !== 'full') {
        result.errors.push('exportMode must be "delta" or "full"');
        result.valid = false;
    }

    // Validate publishArticles
    if (config.publishArticles !== undefined && typeof config.publishArticles !== 'boolean') {
        result.errors.push('publishArticles must be a boolean');
        result.valid = false;
    }

    // Validate enableDebugLogging
    if (config.enableDebugLogging !== undefined && typeof config.enableDebugLogging !== 'boolean') {
        result.errors.push('enableDebugLogging must be a boolean');
        result.valid = false;
    }

    // Validate autoCreateFields
    if (config.autoCreateFields !== undefined && typeof config.autoCreateFields !== 'boolean') {
        result.errors.push('autoCreateFields must be a boolean');
        result.valid = false;
    }

    // Validate fieldMapping
    if (config.fieldMapping) {
        if (typeof config.fieldMapping !== 'object') {
            result.errors.push('fieldMapping must be an object');
            result.valid = false;
        } else if (Object.keys(config.fieldMapping).length === 0) {
            result.warnings.push('fieldMapping is empty');
        }
    }

    // Validate transforms
    if (config.transforms) {
        var transformsValid = validateTransforms(config.transforms);
        if (!transformsValid.valid) {
            result.errors = result.errors.concat(transformsValid.errors);
            result.valid = false;
        }
        if (transformsValid.warnings.length > 0) {
            result.warnings = result.warnings.concat(transformsValid.warnings);
        }
    }

    // Validate static fields
    if (config.static && typeof config.static !== 'object') {
        result.errors.push('static must be an object');
        result.valid = false;
    }

    // Validate fieldMetadata
    if (config.fieldMetadata && typeof config.fieldMetadata !== 'object') {
        result.errors.push('fieldMetadata must be an object');
        result.valid = false;
    }

    // Validate recordTypeName
    if (config.recordTypeName && typeof config.recordTypeName !== 'string') {
        result.errors.push('recordTypeName must be a string');
        result.valid = false;
    }

    // Validate dataCategory
    if (config.dataCategory && typeof config.dataCategory !== 'string') {
        result.errors.push('dataCategory must be a string');
        result.valid = false;
    }

    // Log validation results
    if (!result.valid) {
        logger.error('Configuration validation failed for site: ' + siteID);
        result.errors.forEach(function (error) {
            logger.error('  - ' + error);
        });
    }

    if (result.warnings.length > 0) {
        logger.warn('Configuration warnings for site: ' + siteID);
        result.warnings.forEach(function (warning) {
            logger.warn('  - ' + warning);
        });
    }

    return result;
}

/**
 * Validate contentFolderIDs field
 *
 * Supports: string, array of strings, comma-separated string
 *
 * @param {string|Array} folderIDs - Folder IDs to validate
 * @returns {Object} { valid: boolean, error: string }
 */
function validateContentFolderIDs(folderIDs) {
    if (!folderIDs) {
        return { valid: false, error: 'contentFolderIDs is required' };
    }

    // String (single folder or comma-separated)
    if (typeof folderIDs === 'string') {
        if (folderIDs.trim() === '') {
            return { valid: false, error: 'contentFolderIDs cannot be empty string' };
        }
        return { valid: true };
    }

    // Array
    if (Array.isArray(folderIDs)) {
        if (folderIDs.length === 0) {
            return { valid: false, error: 'contentFolderIDs array cannot be empty' };
        }

        for (var i = 0; i < folderIDs.length; i++) {
            if (typeof folderIDs[i] !== 'string' || folderIDs[i].trim() === '') {
                return { valid: false, error: 'contentFolderIDs array must contain non-empty strings' };
            }
        }

        return { valid: true };
    }

    return { valid: false, error: 'contentFolderIDs must be a string or array of strings' };
}

/**
 * Validate transforms configuration
 *
 * @param {Object} transforms - Transforms object to validate
 * @returns {Object} { valid: boolean, errors: [], warnings: [] }
 */
function validateTransforms(transforms) {
    var result = {
        valid: true,
        errors: [],
        warnings: []
    };

    if (typeof transforms !== 'object' || transforms === null) {
        result.valid = false;
        result.errors.push('transforms must be an object');
        return result;
    }

    var supportedTransforms = ['replaceSpaces', 'urlSafe', 'lowercase', 'uppercase', 'removeSpaces', 'replace'];

    for (var fieldName in transforms) {
        if (transforms.hasOwnProperty(fieldName)) {
            var transform = transforms[fieldName];

            // String notation: "transformName" or "transformName:param"
            if (typeof transform === 'string') {
                var parts = transform.split(':');
                var transformName = parts[0];

                if (supportedTransforms.indexOf(transformName) === -1) {
                    result.warnings.push('Unknown transform "' + transformName + '" for field ' + fieldName);
                }
            }
            // Object notation: { type: "...", ... }
            else if (typeof transform === 'object' && transform !== null) {
                if (!transform.type) {
                    result.errors.push('Transform object for field ' + fieldName + ' must have a "type" property');
                    result.valid = false;
                } else if (typeof transform.type !== 'string') {
                    result.errors.push('Transform type for field ' + fieldName + ' must be a string');
                    result.valid = false;
                } else if (supportedTransforms.indexOf(transform.type) === -1) {
                    result.warnings.push('Unknown transform type "' + transform.type + '" for field ' + fieldName);
                }
            }
            // Invalid
            else {
                result.errors.push('Transform for field ' + fieldName + ' must be a string or object');
                result.valid = false;
            }
        }
    }

    return result;
}

/**
 * Normalize contentFolderIDs to array format
 *
 * Converts string or comma-separated string to array
 *
 * @param {string|Array} folderIDs - Folder IDs in any supported format
 * @returns {Array<string>} Array of folder IDs
 */
function normalizeContentFolderIDs(folderIDs) {
    if (!folderIDs) {
        return ['root'];
    }

    // Already an array
    if (Array.isArray(folderIDs)) {
        return folderIDs;
    }

    // String - check if comma-separated
    if (typeof folderIDs === 'string') {
        if (folderIDs.indexOf(',') !== -1) {
            // Comma-separated - split and trim
            return folderIDs.split(',').map(function (id) {
                return id.trim();
            }).filter(function (id) {
                return id !== '';
            });
        } else {
            // Single folder ID
            return [folderIDs.trim()];
        }
    }

    // Fallback
    logger.warn('Unable to normalize contentFolderIDs, using "root"');
    return ['root'];
}

/**
 * Check if multi-site configuration is enabled
 *
 * Checks if SiteConfigurations parameter exists and has content
 *
 * @param {string} siteConfigurationsJSON - SiteConfigurations JSON string
 * @returns {boolean} True if multi-site mode is enabled
 */
function isMultiSiteMode(siteConfigurationsJSON) {
    return siteConfigurationsJSON && siteConfigurationsJSON.trim() !== '' && siteConfigurationsJSON.trim() !== '{}';
}

/**
 * Log effective configuration for debugging
 *
 * @param {Object} config - Configuration to log
 * @param {string} siteID - Site ID
 */
function logEffectiveConfiguration(config, siteID) {
    logger.info('========== EFFECTIVE CONFIGURATION FOR SITE: ' + siteID + ' ==========');
    logger.info('Article Type: ' + (config.articleType || 'not set'));
    logger.info('Content Folder IDs: ' + JSON.stringify(config.contentFolderIDs || []));
    logger.info('Batch Size: ' + (config.batchSize || 'not set'));
    logger.info('Export Mode: ' + (config.exportMode || 'not set'));
    logger.info('Publish Articles: ' + (config.publishArticles !== undefined ? config.publishArticles : 'not set'));
    logger.info('Record Type Name: ' + (config.recordTypeName || 'none'));
    logger.info('Data Category: ' + (config.dataCategory || 'none'));
    logger.info('Auto Create Fields: ' + (config.autoCreateFields !== undefined ? config.autoCreateFields : 'not set'));
    logger.info('Enable Debug Logging: ' + (config.enableDebugLogging !== undefined ? config.enableDebugLogging : 'not set'));

    if (config.fieldMapping) {
        logger.info('Field Mapping: ' + JSON.stringify(config.fieldMapping));
    }

    if (config.transforms) {
        logger.info('Transforms: ' + JSON.stringify(config.transforms));
    }

    if (config.static) {
        logger.info('Static Fields: ' + JSON.stringify(config.static));
    }

    logger.info('==================================================');
}

// Export public functions
module.exports = {
    parseSiteConfigurations: parseSiteConfigurations,
    getSiteConfiguration: getSiteConfiguration,
    getCurrentSiteID: getCurrentSiteID,
    validateConfiguration: validateConfiguration,
    normalizeContentFolderIDs: normalizeContentFolderIDs,
    isMultiSiteMode: isMultiSiteMode,
    logEffectiveConfiguration: logEffectiveConfiguration,
    mergeConfigurations: mergeConfigurations  // Exported for testing
};
