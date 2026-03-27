'use strict';

/**
 * Salesforce Data Category Helper
 *
 * Handles data category parsing, validation, and conversion to Salesforce API format.
 * Supports both simple string format (current) and JSON format (future multi-group support).
 *
 * @module scripts/helpers/salesforceDataCategoryHelper
 */

var Logger = require('dw/system/Logger');
var logger = Logger.getLogger('SFKnowledge', 'DataCategory');

/**
 * Parse data category value from B2C content
 *
 * Auto-detects format:
 * - Simple string: "Beauty" or "Beauty:Skincare" → maps to first configured group
 * - JSON string: '{"Categories":"Beauty","Products":"Skincare"}' → multi-group
 *
 * @param {string} value - Data category value from B2C content
 * @param {Object} config - Site configuration
 * @returns {Object|null} Parsed data categories object { groupName: categoryPath }
 *
 * @example
 * // Simple string
 * parseDataCategoryValue("Beauty:Skincare", config)
 * // Returns: { "Categories": "Beauty:Skincare" }
 *
 * // JSON format (future)
 * parseDataCategoryValue('{"Categories":"Beauty","Products":"Skincare"}', config)
 * // Returns: { "Categories": "Beauty", "Products": "Skincare" }
 */
function parseDataCategoryValue(value, config) {
    if (!value || value.trim() === '') {
        return null;
    }

    var trimmedValue = value.trim();

    // Try to parse as JSON (multi-group format)
    if (trimmedValue.charAt(0) === '{') {
        try {
            var parsed = JSON.parse(trimmedValue);
            if (typeof parsed === 'object' && parsed !== null) {
                logger.debug('Detected multi-group data category format (JSON)');
                return parsed;
            }
        } catch (e) {
            logger.warn('Value looks like JSON but failed to parse: ' + e.message + ', treating as simple string');
        }
    }

    // Simple string - map to first configured group
    logger.debug('Detected single-group data category format (string)');
    var firstGroup = getFirstConfiguredGroup(config);

    var result = {};
    result[firstGroup] = trimmedValue;
    return result;
}

/**
 * Get first configured data category group from config
 *
 * @param {Object} config - Site configuration
 * @returns {string} First group name (defaults to "Categories")
 */
function getFirstConfiguredGroup(config) {
    if (!config || !config.dataCategories) {
        return 'Categories';
    }

    var keys = Object.keys(config.dataCategories);
    return keys.length > 0 ? keys[0] : 'Categories';
}

/**
 * Get data categories for content asset
 *
 * Priority:
 * 1. Content-level custom field (if exists)
 * 2. Site-level defaults from config
 *
 * @param {Object} contentAsset - Formatted content asset
 * @param {Object} config - Site configuration
 * @param {boolean} enableDebugLogging - Enable debug logging
 * @returns {Object|null} Data categories object { groupName: categoryPath }
 */
function getDataCategories(contentAsset, config, enableDebugLogging) {
    var dataCategoryField = (config && config.dataCategoryField) || 'custom.sfDataCategory';

    // Step 1: Try to get from content-level field
    var contentValue = getNestedProperty(contentAsset, dataCategoryField);

    if (contentValue) {
        var contentCategories = parseDataCategoryValue(contentValue, config);
        if (contentCategories) {
            if (enableDebugLogging) {
                logger.info('Using content-level data categories: ' + JSON.stringify(contentCategories));
            }
            return contentCategories;
        }
    }

    // Step 2: Fall back to site-level defaults
    if (config && config.dataCategories) {
        if (enableDebugLogging) {
            logger.info('No content-level categories, using site defaults: ' + JSON.stringify(config.dataCategories));
        }
        return config.dataCategories;
    }

    // Step 3: No categories configured
    return null;
}

/**
 * Get nested property from object using dot notation
 *
 * @param {Object} obj - Source object
 * @param {string} path - Dot-separated property path (e.g., "custom.sfDataCategory")
 * @returns {*} Property value or null if not found
 */
function getNestedProperty(obj, path) {
    if (!obj || !path) {
        return null;
    }

    try {
        var parts = path.split('.');
        var current = obj;

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
    } catch (e) {
        // Property doesn't exist (common for custom attributes that aren't defined)
        // This is normal - just return null
        return null;
    }
}

/**
 * Convert data categories to Salesforce API format
 *
 * Converts { "Categories": "Beauty:Skincare" }
 * To: { "DataCategorySelections": { "Categories": [{ "dataCategoryName": "Beauty:Skincare" }] } }
 *
 * @param {Object} categories - Data categories object { groupName: categoryPath }
 * @returns {Object|null} Salesforce API format or null if no categories
 */
function convertToSalesforceFormat(categories) {
    if (!categories || typeof categories !== 'object') {
        return null;
    }

    var sfFormat = {};
    var hasCategories = false;

    for (var groupName in categories) {
        if (categories.hasOwnProperty(groupName)) {
            var categoryValue = categories[groupName];

            if (categoryValue && categoryValue.trim() !== '') {
                sfFormat[groupName] = [{
                    dataCategoryName: categoryValue.trim()
                }];
                hasCategories = true;
            }
        }
    }

    if (!hasCategories) {
        return null;
    }

    return {
        DataCategorySelections: sfFormat
    };
}

/**
 * Collect all unique data categories from site config and content assets
 *
 * Scans both site-level defaults and content-level overrides to build
 * a complete list of categories that need validation.
 *
 * @param {Object} config - Site configuration
 * @param {Array<Object>} contentAssets - Array of formatted content assets
 * @returns {Object} Map of group names to arrays of unique category paths
 *
 * @example
 * // Returns:
 * {
 *   "Categories": ["Beauty", "Beauty:Skincare", "General"]
 * }
 */
function collectAllDataCategories(config, contentAssets) {
    var allCategories = {};

    // Helper function to add categories to the map
    function addCategories(categoryObj) {
        if (!categoryObj) return;

        for (var groupName in categoryObj) {
            if (categoryObj.hasOwnProperty(groupName)) {
                var categoryPath = categoryObj[groupName];

                if (!categoryPath || categoryPath.trim() === '') {
                    continue;
                }

                // Initialize array for this group if needed
                if (!allCategories[groupName]) {
                    allCategories[groupName] = [];
                }

                // Add category if not already present
                if (allCategories[groupName].indexOf(categoryPath) === -1) {
                    allCategories[groupName].push(categoryPath);
                }
            }
        }
    }

    // Add site-level default categories
    if (config && config.dataCategories) {
        addCategories(config.dataCategories);
    }

    // Add content-level categories
    if (contentAssets && contentAssets.length > 0) {
        var dataCategoryField = (config && config.dataCategoryField) || 'custom.sfDataCategory';

        for (var i = 0; i < contentAssets.length; i++) {
            var contentAsset = contentAssets[i];
            var contentValue = getNestedProperty(contentAsset, dataCategoryField);

            if (contentValue) {
                var contentCategories = parseDataCategoryValue(contentValue, config);
                addCategories(contentCategories);
            }
        }
    }

    return allCategories;
}

/**
 * Validate data categories against Salesforce
 *
 * Checks if category groups exist and if category paths are valid.
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {Object} allCategories - Map of group names to category path arrays
 * @param {string} serviceID - Service ID for API calls
 * @param {string} articleType - Article type (e.g., "Knowledge__kav")
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - Whether all categories are valid
 * @returns {Array<string>} result.errors - Array of error messages
 * @returns {Object} result.details - Detailed validation results per group
 */
function validateDataCategories(accessToken, instanceUrl, allCategories, serviceID, articleType) {
    logger.info('Validating data categories');

    var result = {
        valid: true,
        errors: [],
        details: {}
    };

    if (!allCategories || Object.keys(allCategories).length === 0) {
        logger.info('No data categories to validate');
        return result;
    }

    // Validate each category group
    for (var groupName in allCategories) {
        if (allCategories.hasOwnProperty(groupName)) {
            var categories = allCategories[groupName];

            logger.info('Validating data category group: ' + groupName + ' (' + categories.length + ' categories)');

            var groupResult = validateDataCategoryGroup(accessToken, instanceUrl, groupName, categories, serviceID, articleType);

            result.details[groupName] = groupResult;

            if (!groupResult.valid) {
                result.valid = false;
                result.errors = result.errors.concat(groupResult.errors);
            }
        }
    }

    if (result.valid) {
        logger.info('All data categories validated successfully');
    } else {
        logger.error('Data category validation failed with ' + result.errors.length + ' error(s)');
    }

    return result;
}

/**
 * Validate a single data category group
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {string} groupName - Category group name (e.g., "Categories")
 * @param {Array<string>} categories - Array of category paths to validate
 * @param {string} serviceID - Service ID for API calls
 * @param {string} articleType - Article type (e.g., "Knowledge__kav")
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - Whether all categories in this group are valid
 * @returns {Array<string>} result.errors - Array of error messages
 * @returns {Array<string>} result.validCategories - List of all valid categories in Salesforce
 */
function validateDataCategoryGroup(accessToken, instanceUrl, groupName, categories, serviceID, articleType) {
    var result = {
        valid: true,
        errors: [],
        validCategories: []
    };

    try {
        // Step 1: Check if category group exists
        var groupExists = checkCategoryGroupExists(accessToken, instanceUrl, groupName, serviceID, articleType);

        if (!groupExists.exists) {
            result.valid = false;
            result.errors.push('Category group "' + groupName + '" does not exist in Salesforce');

            if (groupExists.availableGroups && groupExists.availableGroups.length > 0) {
                result.errors.push('Available category groups: ' + groupExists.availableGroups.join(', '));
            }

            return result;
        }

        logger.info('  ✓ Category group "' + groupName + '" exists');

        // Step 2: Validate each category in the group using the specific category API
        var validCategoriesResult = fetchCategoriesInGroup(accessToken, instanceUrl, groupName, categories, serviceID, articleType);

        if (!validCategoriesResult.success) {
            result.valid = false;
            result.errors.push(validCategoriesResult.error);
            return result;
        }

        result.validCategories = validCategoriesResult.categories;
        logger.info('  ✓ All categories validated successfully');

    } catch (e) {
        result.valid = false;
        result.errors.push('Exception validating group "' + groupName + '": ' + e.message);
        logger.error('Exception validating data category group: ' + e.message);
    }

    return result;
}

/**
 * Check if data category group exists in Salesforce
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {string} groupName - Category group name to check
 * @param {string} serviceID - Service ID for API calls
 * @param {string} articleType - Article type (e.g., "Knowledge__kav")
 * @returns {Object} Result
 * @returns {boolean} result.exists - Whether group exists
 * @returns {Array<string>} result.availableGroups - List of available groups
 */
function checkCategoryGroupExists(accessToken, instanceUrl, groupName, serviceID, articleType) {
    logger.debug('Checking if category group exists: ' + groupName);

    try {
        var services = require('int_salesforce_knowledge/cartridge/scripts/services/salesforceKnowledgeService');
        var service = services.getKnowledgeService(serviceID);

        // Use KnowledgeArticleVersion as sObjectName (required by Salesforce API)
        var endpoint = '/support/dataCategoryGroups?sObjectName=KnowledgeArticleVersion';

        logger.debug('Calling API: ' + endpoint);

        var result = service.call({
            accessToken: accessToken,
            instanceUrl: instanceUrl,
            endpoint: endpoint,
            method: 'GET'
        });

        logger.debug('API Response Status: ' + result.status);

        if (result.object) {
            logger.debug('Response Object Success: ' + result.object.success);
            logger.debug('Response Object Data: ' + JSON.stringify(result.object.data));
            logger.debug('Response Object Error: ' + result.object.errorMessage);
        }

        if (result.status === 'OK' && result.object && result.object.success) {
            var data = result.object.data;

            if (data && data.categoryGroups) {
                var availableGroups = [];

                for (var i = 0; i < data.categoryGroups.length; i++) {
                    var group = data.categoryGroups[i];
                    availableGroups.push(group.name);

                    if (group.name === groupName) {
                        return {
                            exists: true,
                            availableGroups: availableGroups
                        };
                    }
                }

                return {
                    exists: false,
                    availableGroups: availableGroups
                };
            }
        }

        var errorMsg = 'Unknown error';
        if (result.object && result.object.errorMessage) {
            errorMsg = result.object.errorMessage;
        } else if (result.errorMessage) {
            errorMsg = result.errorMessage;
        } else if (result.msg) {
            errorMsg = result.msg;
        }

        logger.error('Failed to check category group: ' + errorMsg);
        logger.error('Full result object: ' + JSON.stringify(result));

        return {
            exists: false,
            availableGroups: []
        };

    } catch (e) {
        logger.error('Exception checking category group: ' + e.message);
        logger.error('Stack trace: ' + e.stack);
        return {
            exists: false,
            availableGroups: []
        };
    }
}

/**
 * Fetch all categories in a category group from Salesforce
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {string} groupName - Category group name
 * @param {string} serviceID - Service ID for API calls
 * @param {string} articleType - Article type (e.g., "Knowledge__kav")
 * @returns {Object} Result
 * @returns {boolean} result.success - Whether fetch succeeded
 * @returns {Array<string>} result.categories - Flat list of category paths (e.g., ["Beauty", "Beauty:Skincare"])
 * @returns {string} result.error - Error message (if failed)
 */
/**
 * Validate a specific category path using the Salesforce API
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {string} groupName - Category group name (e.g., "Categories")
 * @param {string} categoryPath - Category path to validate (e.g., "All:Shop_Experience")
 * @param {string} serviceID - Service ID for API calls
 * @param {string} articleType - Article type (e.g., "Knowledge__kav")
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - Whether category is valid
 * @returns {string} result.error - Error message (if invalid)
 */
function validateSpecificCategory(accessToken, instanceUrl, groupName, categoryPath, serviceID, articleType) {
    logger.info('  - Validating category: "' + categoryPath + '"');

    try {
        var services = require('int_salesforce_knowledge/cartridge/scripts/services/salesforceKnowledgeService');
        var service = services.getKnowledgeService(serviceID);

        // Parse the category path to get the leaf category
        // For "All:Shop_Experience" -> validate "Shop_Experience"
        // For "Beauty:Skincare:Face_Cream" -> validate "Face_Cream"
        var pathSegments = categoryPath.split(':');
        var leafCategory = pathSegments[pathSegments.length - 1].trim();

        logger.info('    → Leaf category to validate: "' + leafCategory + '"');

        // Query the leaf category directly
        // Format: /support/dataCategoryGroups/{groupName}/dataCategories/{categoryName}?sObjectName=KnowledgeArticleVersion
        var endpoint = '/support/dataCategoryGroups/' + groupName + '/dataCategories/' + encodeURIComponent(leafCategory) + '?sObjectName=KnowledgeArticleVersion';

        logger.info('    → API endpoint: ' + endpoint);

        var result = service.call({
            accessToken: accessToken,
            instanceUrl: instanceUrl,
            endpoint: endpoint,
            method: 'GET'
        });

        logger.info('    → Response status: ' + result.status);

        if (result.status === 'OK' && result.object && result.object.success) {
            var data = result.object.data;
            logger.info('    ✓ Category "' + leafCategory + '" exists');

            // Optionally validate the full hierarchy if parent categories are specified
            if (pathSegments.length > 1) {
                logger.info('    → Full path "' + categoryPath + '" will be used for assignment');
                // Note: We're only validating that the leaf category exists
                // Salesforce will validate the full hierarchy during article creation
            }

            return {
                valid: true
            };
        }

        // Category not found or error
        var errorMsg = 'Category not found';
        if (result.object && result.object.error) {
            errorMsg = JSON.stringify(result.object.error);
        } else if (result.errorMessage) {
            errorMsg = result.errorMessage;
        }

        logger.error('    ✗ Category "' + leafCategory + '" validation failed: ' + errorMsg);
        logger.error('    → Please verify the category exists in Salesforce Setup → Data Categories → ' + groupName);

        return {
            valid: false,
            error: errorMsg
        };

    } catch (e) {
        logger.error('    ✗ Exception validating category: ' + e.message);
        return {
            valid: false,
            error: e.message
        };
    }
}

/**
 * Validate multiple categories by checking each one individually
 *
 * @param {string} accessToken - OAuth access token
 * @param {string} instanceUrl - Salesforce instance URL
 * @param {string} groupName - Category group name
 * @param {Array<string>} categories - Array of category paths to validate
 * @param {string} serviceID - Service ID for API calls
 * @param {string} articleType - Article type
 * @returns {Object} Result
 * @returns {boolean} result.success - Whether all categories are valid
 * @returns {Array<string>} result.categories - List of valid categories
 * @returns {string} result.error - Error message (if failed)
 */
function fetchCategoriesInGroup(accessToken, instanceUrl, groupName, categories, serviceID, articleType) {
    logger.info('Validating individual categories in group: ' + groupName);

    var validCategories = [];
    var errors = [];

    for (var i = 0; i < categories.length; i++) {
        var categoryPath = categories[i];

        var validationResult = validateSpecificCategory(
            accessToken,
            instanceUrl,
            groupName,
            categoryPath,
            serviceID,
            articleType
        );

        if (validationResult.valid) {
            validCategories.push(categoryPath);
        } else {
            errors.push('Category "' + categoryPath + '" not found: ' + validationResult.error);
        }
    }

    if (errors.length > 0) {
        return {
            success: false,
            error: errors.join('; '),
            categories: validCategories
        };
    }

    return {
        success: true,
        categories: validCategories
    };
}

/**
 * Build category paths from SOQL query results
 * Constructs hierarchical paths like "Parent:Child" from DataCategory records
 *
 * @param {Array<Object>} records - SOQL query results with Name and ParentId
 * @returns {Array<string>} Flat list of category paths
 */
function buildCategoryPathsFromSOQL(records) {
    var categories = [];

    // Create a map of Id -> record for quick lookup
    var recordMap = {};
    for (var i = 0; i < records.length; i++) {
        var record = records[i];
        recordMap[record.Id] = record;
    }

    // Build full path for each record
    for (var j = 0; j < records.length; j++) {
        var rec = records[j];
        var path = buildCategoryPath(rec, recordMap);
        if (path && categories.indexOf(path) === -1) {
            categories.push(path);
        }
    }

    return categories;
}

/**
 * Build full category path by traversing parent hierarchy
 *
 * @param {Object} record - DataCategory record
 * @param {Object} recordMap - Map of record Id to record
 * @returns {string} Full category path (e.g., "All:Shop_Experience")
 */
function buildCategoryPath(record, recordMap) {
    var path = record.Name;

    var current = record;
    while (current.ParentId && recordMap[current.ParentId]) {
        current = recordMap[current.ParentId];
        path = current.Name + ':' + path;
    }

    return path;
}

/**
 * Flatten category hierarchy into an array of paths
 *
 * Converts nested structure into flat paths:
 * { name: "Beauty", childCategories: [{ name: "Skincare" }] }
 * → ["Beauty", "Beauty:Skincare"]
 *
 * @param {Array<Object>} categories - Nested category array
 * @param {string} parentPath - Parent path (for recursion)
 * @param {Array<string>} result - Output array (for recursion)
 */
function flattenCategoryHierarchy(categories, parentPath, result) {
    if (!categories || !Array.isArray(categories)) {
        return;
    }

    for (var i = 0; i < categories.length; i++) {
        var category = categories[i];

        if (!category || !category.name) {
            continue;
        }

        var currentPath = parentPath ? (parentPath + ':' + category.name) : category.name;
        result.push(currentPath);

        // Recursively process child categories
        if (category.childCategories && category.childCategories.length > 0) {
            flattenCategoryHierarchy(category.childCategories, currentPath, result);
        }
    }
}

// Export public functions
module.exports = {
    parseDataCategoryValue: parseDataCategoryValue,
    getDataCategories: getDataCategories,
    convertToSalesforceFormat: convertToSalesforceFormat,
    collectAllDataCategories: collectAllDataCategories,
    validateDataCategories: validateDataCategories
};
