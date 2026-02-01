'use strict';

/**
 * Salesforce Tooling API Helper
 *
 * Handles Tooling API operations for metadata management.
 * Used to check and create custom fields automatically.
 *
 * @module scripts/helpers/salesforceToolingHelper
 */

var Logger = require('dw/system/Logger');
var authHelper = require('int_salesforce_knowledge/cartridge/scripts/helpers/salesforceAuthHelper');
var services = require('int_salesforce_knowledge/cartridge/scripts/services/salesforceKnowledgeService');

// Initialize logger
var logger = Logger.getLogger('SFKnowledge', 'ToolingAPI');

/**
 * Salesforce API version
 * @type {string}
 */
var API_VERSION = 'v58.0';

/**
 * Permission Set name for SFCC Knowledge field access
 * @type {string}
 */
var PERMISSION_SET_NAME = 'SFCC_Knowledge_Field_Access';

/**
 * Cache key for field existence check
 * @type {string}
 */
var FIELD_CHECK_CACHE_KEY = 'sf_field_existence_cache';

/**
 * Cache key for Permission Set ID
 * @type {string}
 */
var PERMISSION_SET_CACHE_KEY = 'sf_permission_set_cache';

/**
 * Check if custom field exists on Knowledge article type
 *
 * Uses Tooling API to query CustomField by DeveloperName.
 * Caches result in request scope to avoid repeated checks.
 *
 * @param {string} articleType - Knowledge Article Type (e.g., 'Knowledge__kav')
 * @param {string} fieldDeveloperName - Field developer name without __c suffix (e.g., 'SFCC_External_ID')
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object} Check result
 * @returns {boolean} result.exists - Whether field exists
 * @returns {string} result.fieldId - Salesforce field ID (if exists)
 * @returns {string} result.error - Error message (if failed)
 */
function checkCustomFieldExists(articleType, fieldDeveloperName, serviceID) {
    logger.debug('Checking if field exists: ' + articleType + '.' + fieldDeveloperName + '__c');

    // Check cache first (cache per article type + field name)
    var cacheKey = FIELD_CHECK_CACHE_KEY + '_' + articleType + '_' + fieldDeveloperName;
    if (request.custom && request.custom[cacheKey]) {
        logger.debug('Using cached field existence check');
        return request.custom[cacheKey];
    }

    try {
        // Get OAuth token
        var authResult = authHelper.getAccessToken(serviceID);
        if (!authResult.success) {
            logger.error('Authentication failed: ' + authResult.error);
            return {
                exists: false,
                error: 'Authentication failed: ' + authResult.error
            };
        }

        // Build Tooling API query - filter by article type using EntityDefinition.DeveloperName
        // Extract base article name from article type (e.g., 'Knowledge__kav' -> 'Knowledge')
        var baseArticleName = articleType.replace(/__kav$/, '');

        var query = "SELECT Id,DeveloperName,FullName,TableEnumOrId,Length,Description,Metadata FROM CustomField WHERE DeveloperName='" + fieldDeveloperName + "' AND EntityDefinition.DeveloperName='" + baseArticleName + "'";
        // Note: Don't include /services/data/VERSION prefix - the service adds this automatically
        var endpoint = '/tooling/query?q=' + encodeURIComponent(query);

        logger.info('Tooling API - Querying field: ' + fieldDeveloperName + ' on article type: ' + articleType + ' (base: ' + baseArticleName + ')');
        logger.debug('Tooling API - Query: ' + query);

        // Call Tooling API
        var service = services.getKnowledgeService(serviceID);
        var result = service.call({
            accessToken: authResult.accessToken,
            instanceUrl: authResult.instanceUrl,
            endpoint: endpoint,
            method: 'GET',
            body: {}
        });

        // Process result
        if (result.status === 'OK' && result.object && result.object.success) {
            var records = result.object.data.records;

            if (records && records.length > 0) {
                logger.info('Field exists: ' + fieldDeveloperName + '__c (ID: ' + records[0].Id + ')');

                var checkResult = {
                    exists: true,
                    fieldId: records[0].Id,
                    fullName: records[0].FullName
                };

                // Cache result
                if (!request.custom) {
                    request.custom = {};
                }
                request.custom[cacheKey] = checkResult;

                return checkResult;
            } else {
                logger.info('Field does not exist: ' + fieldDeveloperName + '__c');
                return { exists: false };
            }
        } else {
            var errorMsg = result.object ? result.object.errorMessage : (result.errorMessage || 'Query failed');
            logger.error('Tooling API query failed: ' + errorMsg);
            return {
                exists: false,
                error: errorMsg
            };
        }

    } catch (e) {
        logger.error('Exception checking field existence: ' + e.message);
        return {
            exists: false,
            error: 'Exception: ' + e.message
        };
    }
}

/**
 * Create custom field on Knowledge article type
 *
 * Uses Tooling API to create a new CustomField.
 * Only creates the field if it doesn't already exist.
 *
 * @param {string} articleType - Knowledge Article Type (e.g., 'Knowledge__kav')
 * @param {string} fieldDeveloperName - Field developer name without __c suffix (e.g., 'SFCC_External_ID')
 * @param {Object} fieldMetadata - Field metadata
 * @param {string} fieldMetadata.label - Field label
 * @param {string} fieldMetadata.description - Field description
 * @param {string} fieldMetadata.type - Field type (e.g., 'Text')
 * @param {number} fieldMetadata.length - Field length (for Text fields)
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object} Create result
 * @returns {boolean} result.success - Whether creation succeeded
 * @returns {string} result.fieldId - Salesforce field ID (if success)
 * @returns {string} result.error - Error message (if failed)
 */
function createCustomField(articleType, fieldDeveloperName, fieldMetadata, serviceID) {
    logger.info('Creating custom field: ' + articleType + '.' + fieldDeveloperName + '__c');

    try {
        // Get OAuth token
        var authResult = authHelper.getAccessToken(serviceID);
        if (!authResult.success) {
            logger.error('Authentication failed: ' + authResult.error);
            return {
                success: false,
                error: 'Authentication failed: ' + authResult.error
            };
        }

        // Build field payload
        // FullName must be articleType.FieldName__c (e.g., 'Knowledge__kav.SFCC_External_ID__c')
        var metadata = {
            label: fieldMetadata.label,
            description: fieldMetadata.description || '',
            type: fieldMetadata.type || 'Text'
        };

        // Add type-specific properties based on field type
        switch (metadata.type) {
            case 'Text':
                metadata.length = fieldMetadata.length || 255;
                break;

            case 'LongTextArea':
                metadata.length = fieldMetadata.length || 32000;
                if (fieldMetadata.visibleLines) {
                    metadata.visibleLines = fieldMetadata.visibleLines;
                }
                break;

            case 'Number':
                metadata.precision = fieldMetadata.precision || 18;
                metadata.scale = fieldMetadata.scale || 0;
                break;

            case 'Checkbox':
                // Checkbox requires a default value
                metadata.defaultValue = fieldMetadata.defaultValue || false;
                break;

            case 'Date':
            case 'DateTime':
                // Date/DateTime fields can have default values
                if (fieldMetadata.defaultValue) {
                    metadata.defaultValue = fieldMetadata.defaultValue;
                }
                break;

            case 'Picklist':
            case 'MultiselectPicklist':
                // Picklist fields require picklist values (set in Salesforce UI after creation)
                logger.warn('Picklist field ' + fieldDeveloperName + ' created, but values must be configured in Salesforce UI');
                break;

            case 'TextArea':
                // Standard TextArea (not rich text)
                metadata.length = fieldMetadata.length || 255;
                break;

            case 'Url':
            case 'Email':
            case 'Phone':
                // URL, Email, Phone are text-based with validation
                metadata.length = fieldMetadata.length || 255;
                break;

            default:
                logger.warn('Unknown field type: ' + metadata.type + ', using Text as fallback');
                metadata.type = 'Text';
                metadata.length = 255;
        }

        var fieldPayload = {
            FullName: articleType + '.' + fieldDeveloperName + '__c',
            Metadata: metadata
        };

        logger.info('Tooling API - Creating field with metadata:');
        logger.info('  - Label: ' + metadata.label);
        logger.info('  - Type: ' + metadata.type);
        logger.info('  - Description: ' + metadata.description);

        // Log type-specific properties
        if (metadata.length) {
            logger.info('  - Length: ' + metadata.length);
        }
        if (metadata.visibleLines) {
            logger.info('  - Visible Lines: ' + metadata.visibleLines);
        }
        if (metadata.precision) {
            logger.info('  - Precision: ' + metadata.precision);
        }
        if (metadata.scale !== undefined) {
            logger.info('  - Scale: ' + metadata.scale);
        }
        if (metadata.defaultValue !== undefined) {
            logger.info('  - Default Value: ' + metadata.defaultValue);
        }

        // Call Tooling API to create field
        // Note: Don't include /services/data/VERSION prefix - the service adds this automatically
        var endpoint = '/tooling/sobjects/CustomField';

        var service = services.getKnowledgeService(serviceID);
        var result = service.call({
            accessToken: authResult.accessToken,
            instanceUrl: authResult.instanceUrl,
            endpoint: endpoint,
            method: 'POST',
            body: fieldPayload
        });

        // Process result
        if (result.status === 'OK' && result.object && result.object.success) {
            var fieldId = result.object.data.id;
            logger.info('Successfully created field: ' + fieldDeveloperName + '__c (ID: ' + fieldId + ')');

            // Cache field existence
            var cacheKey = FIELD_CHECK_CACHE_KEY + '_' + articleType + '_' + fieldDeveloperName;
            if (!request.custom) {
                request.custom = {};
            }
            request.custom[cacheKey] = {
                exists: true,
                fieldId: fieldId,
                fullName: articleType + '.' + fieldDeveloperName + '__c'
            };

            // Set up Field-Level Security permissions
            var flsResult = ensureFieldLevelSecurity(articleType, fieldDeveloperName, authResult, serviceID);
            if (!flsResult.success) {
                logger.warn('Failed to set up Field-Level Security for ' + fieldDeveloperName + '__c: ' + flsResult.error);
                logger.warn('Field created but may not be accessible via API. Manually grant permissions in Salesforce Setup.');
            } else {
                logger.info('Field-Level Security configured successfully for ' + fieldDeveloperName + '__c');
            }

            return {
                success: true,
                fieldId: fieldId
            };
        } else {
            var errorMsg = result.object ? result.object.errorMessage : (result.errorMessage || 'Create failed');
            logger.error('Field creation failed: ' + errorMsg);

            // Check if field already exists (race condition or DUPLICATE_DEVELOPER_NAME error)
            if (errorMsg.indexOf('already exists') > -1 ||
                errorMsg.indexOf('duplicate') > -1 ||
                errorMsg.indexOf('DUPLICATE_DEVELOPER_NAME') > -1) {
                logger.warn('Field already exists (created by another process or already exists in Salesforce)');
                return { success: true, fieldId: null };
            }

            return {
                success: false,
                error: errorMsg
            };
        }

    } catch (e) {
        logger.error('Exception creating field: ' + e.message);
        return {
            success: false,
            error: 'Exception: ' + e.message
        };
    }
}

/**
 * Ensure Field-Level Security permissions for custom field
 *
 * Sets up FLS permissions by:
 * 1. Extracting Run As user ID from OAuth token
 * 2. Creating or finding Permission Set for SFCC Knowledge fields
 * 3. Adding Field Permission for the specified field
 * 4. Assigning Permission Set to the Run As user
 *
 * @param {string} articleType - Knowledge Article Type (e.g., 'Knowledge__kav')
 * @param {string} fieldDeveloperName - Field developer name without __c suffix
 * @param {Object} authResult - Auth result from salesforceAuthHelper
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object} FLS setup result
 * @returns {boolean} result.success - Whether FLS setup succeeded
 * @returns {string} result.error - Error message (if failed)
 */
function ensureFieldLevelSecurity(articleType, fieldDeveloperName, authResult, serviceID) {
    logger.info('Setting up Field-Level Security for ' + fieldDeveloperName + '__c');

    try {
        var service = services.getKnowledgeService(serviceID);

        // Step 1: Extract user ID from OAuth token ID field
        // ID format: "https://login.salesforce.com/id/{orgId}/{userId}"
        var userId = extractUserIdFromOAuthId(authResult);
        if (!userId) {
            return {
                success: false,
                error: 'Failed to extract user ID from OAuth token'
            };
        }

        logger.debug('Run As User ID: ' + userId);

        // Step 2: Get or create Permission Set
        var permissionSetId = getOrCreatePermissionSet(service, authResult);
        if (!permissionSetId) {
            return {
                success: false,
                error: 'Failed to get or create Permission Set'
            };
        }

        logger.debug('Permission Set ID: ' + permissionSetId);

        // Step 3: Add Field Permission
        var fieldName = articleType + '.' + fieldDeveloperName + '__c';
        var fieldPermResult = addFieldPermission(service, authResult, permissionSetId, articleType, fieldName);
        if (!fieldPermResult.success) {
            return {
                success: false,
                error: 'Failed to add field permission: ' + fieldPermResult.error
            };
        }

        logger.debug('Field Permission ID: ' + fieldPermResult.fieldPermissionId);

        // Step 4: Assign Permission Set to user
        var assignResult = assignPermissionSetToUser(service, authResult, permissionSetId, userId);
        if (!assignResult.success) {
            return {
                success: false,
                error: 'Failed to assign Permission Set: ' + assignResult.error
            };
        }

        logger.info('Successfully configured FLS for ' + fieldDeveloperName + '__c');
        return { success: true };

    } catch (e) {
        logger.error('Exception in ensureFieldLevelSecurity: ' + e.message);
        return {
            success: false,
            error: 'Exception: ' + e.message
        };
    }
}

/**
 * Extract user ID from OAuth auth result
 * @param {Object} authResult - Auth result containing userId (extracted from OAuth 'id' field)
 * @returns {string|null} User ID or null if not available
 */
function extractUserIdFromOAuthId(authResult) {
    // authHelper now extracts and stores userId from OAuth response's 'id' field
    // Format: "https://login.salesforce.com/id/{orgId}/{userId}"
    if (authResult && authResult.userId) {
        logger.debug('Using userId from auth result: ' + authResult.userId);
        return authResult.userId;
    }

    logger.warn('userId not found in auth result. Cannot set up Field-Level Security automatically.');
    logger.warn('Please manually grant field permissions in Salesforce Setup > Permission Sets.');
    return null;
}

/**
 * Get or create Permission Set for SFCC Knowledge field access
 * @param {Object} service - Knowledge API service
 * @param {Object} authResult - Auth result
 * @returns {string|null} Permission Set ID or null if failed
 */
function getOrCreatePermissionSet(service, authResult) {
    // Check cache first
    var cacheKey = PERMISSION_SET_CACHE_KEY;
    if (request.custom && request.custom[cacheKey]) {
        logger.debug('Using cached Permission Set ID');
        return request.custom[cacheKey];
    }

    try {
        // Try to find existing Permission Set
        var query = "SELECT Id FROM PermissionSet WHERE Name='" + PERMISSION_SET_NAME + "' LIMIT 1";
        var queryEndpoint = '/query?q=' + encodeURIComponent(query);

        var queryResult = service.call({
            accessToken: authResult.accessToken,
            instanceUrl: authResult.instanceUrl,
            endpoint: queryEndpoint,
            method: 'GET',
            body: {}
        });

        if (queryResult.status === 'OK' && queryResult.object && queryResult.object.success &&
            queryResult.object.data.records && queryResult.object.data.records.length > 0) {
            var permissionSetId = queryResult.object.data.records[0].Id;
            logger.info('Found existing Permission Set: ' + permissionSetId);

            // Cache it
            if (!request.custom) {
                request.custom = {};
            }
            request.custom[cacheKey] = permissionSetId;

            return permissionSetId;
        }

        // Permission Set doesn't exist, create it
        logger.info('Creating new Permission Set: ' + PERMISSION_SET_NAME);

        var createEndpoint = '/sobjects/PermissionSet';
        var createResult = service.call({
            accessToken: authResult.accessToken,
            instanceUrl: authResult.instanceUrl,
            endpoint: createEndpoint,
            method: 'POST',
            body: {
                Name: PERMISSION_SET_NAME,
                Label: 'SFCC Knowledge Field Access',
                Description: 'Grants access to custom fields on Knowledge articles created by SFCC integration'
            }
        });

        if (createResult.status === 'OK' && createResult.object && createResult.object.success) {
            var newPermissionSetId = createResult.object.data.id;
            logger.info('Created Permission Set: ' + newPermissionSetId);

            // Cache it
            if (!request.custom) {
                request.custom = {};
            }
            request.custom[cacheKey] = newPermissionSetId;

            return newPermissionSetId;
        }

        logger.error('Failed to create Permission Set: ' + (createResult.object ? createResult.object.errorMessage : 'Unknown error'));
        return null;

    } catch (e) {
        logger.error('Exception in getOrCreatePermissionSet: ' + e.message);
        return null;
    }
}

/**
 * Add Field Permission to Permission Set
 * @param {Object} service - Knowledge API service
 * @param {Object} authResult - Auth result
 * @param {string} permissionSetId - Permission Set ID
 * @param {string} articleType - Article type (e.g., 'Knowledge__kav')
 * @param {string} fieldName - Full field name (e.g., 'Knowledge__kav.SFCC_External_ID__c')
 * @returns {Object} Result with success flag and fieldPermissionId
 */
function addFieldPermission(service, authResult, permissionSetId, articleType, fieldName) {
    try {
        // Check if field permission already exists
        var checkQuery = "SELECT Id FROM FieldPermissions WHERE ParentId='" + permissionSetId +
            "' AND SobjectType='" + articleType + "' AND Field='" + fieldName + "' LIMIT 1";
        var checkEndpoint = '/query?q=' + encodeURIComponent(checkQuery);

        var checkResult = service.call({
            accessToken: authResult.accessToken,
            instanceUrl: authResult.instanceUrl,
            endpoint: checkEndpoint,
            method: 'GET',
            body: {}
        });

        if (checkResult.status === 'OK' && checkResult.object && checkResult.object.success &&
            checkResult.object.data.records && checkResult.object.data.records.length > 0) {
            var existingId = checkResult.object.data.records[0].Id;
            logger.info('Field Permission already exists: ' + existingId);
            return { success: true, fieldPermissionId: existingId };
        }

        // Create Field Permission
        var createEndpoint = '/sobjects/FieldPermissions';
        var createResult = service.call({
            accessToken: authResult.accessToken,
            instanceUrl: authResult.instanceUrl,
            endpoint: createEndpoint,
            method: 'POST',
            body: {
                ParentId: permissionSetId,
                SobjectType: articleType,
                Field: fieldName,
                PermissionsRead: true,
                PermissionsEdit: true
            }
        });

        if (createResult.status === 'OK' && createResult.object && createResult.object.success) {
            var fieldPermId = createResult.object.data.id;
            logger.info('Created Field Permission: ' + fieldPermId);
            return { success: true, fieldPermissionId: fieldPermId };
        }

        var errorMsg = createResult.object ? createResult.object.errorMessage : 'Unknown error';
        logger.error('Failed to create Field Permission: ' + errorMsg);
        return { success: false, error: errorMsg };

    } catch (e) {
        logger.error('Exception in addFieldPermission: ' + e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Assign Permission Set to user
 * @param {Object} service - Knowledge API service
 * @param {Object} authResult - Auth result
 * @param {string} permissionSetId - Permission Set ID
 * @param {string} userId - User ID
 * @returns {Object} Result with success flag
 */
function assignPermissionSetToUser(service, authResult, permissionSetId, userId) {
    try {
        // Check if assignment already exists
        var checkQuery = "SELECT Id FROM PermissionSetAssignment WHERE PermissionSetId='" + permissionSetId +
            "' AND AssigneeId='" + userId + "' LIMIT 1";
        var checkEndpoint = '/query?q=' + encodeURIComponent(checkQuery);

        var checkResult = service.call({
            accessToken: authResult.accessToken,
            instanceUrl: authResult.instanceUrl,
            endpoint: checkEndpoint,
            method: 'GET',
            body: {}
        });

        if (checkResult.status === 'OK' && checkResult.object && checkResult.object.success &&
            checkResult.object.data.records && checkResult.object.data.records.length > 0) {
            logger.info('Permission Set already assigned to user');
            return { success: true };
        }

        // Create assignment
        var createEndpoint = '/sobjects/PermissionSetAssignment';
        var createResult = service.call({
            accessToken: authResult.accessToken,
            instanceUrl: authResult.instanceUrl,
            endpoint: createEndpoint,
            method: 'POST',
            body: {
                PermissionSetId: permissionSetId,
                AssigneeId: userId
            }
        });

        if (createResult.status === 'OK' && createResult.object && createResult.object.success) {
            logger.info('Assigned Permission Set to user');
            return { success: true };
        }

        var errorMsg = createResult.object ? createResult.object.errorMessage : 'Unknown error';
        logger.error('Failed to assign Permission Set: ' + errorMsg);
        return { success: false, error: errorMsg };

    } catch (e) {
        logger.error('Exception in assignPermissionSetToUser: ' + e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Ensure SFCC External ID field exists
 *
 * Checks if SFCC_External_ID__c field exists on the article type.
 * If not, creates it automatically with proper metadata.
 *
 * This function is idempotent and safe to call multiple times.
 *
 * @param {string} articleType - Knowledge Article Type (e.g., 'Knowledge__kav')
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object} Ensure result
 * @returns {boolean} result.ready - Whether field is ready to use
 * @returns {boolean} result.created - Whether field was created (vs already existed)
 * @returns {string} result.error - Error message (if failed)
 */
function ensureExternalIdField(articleType, serviceID) {
    logger.info('Ensuring SFCC_External_ID__c field exists on ' + articleType);

    // Check if field exists
    var checkResult = checkCustomFieldExists(articleType, 'SFCC_External_ID', serviceID);

    if (checkResult.exists) {
        logger.info('SFCC_External_ID__c field already exists');
        return {
            ready: true,
            created: false
        };
    }

    if (checkResult.error) {
        logger.error('Failed to check field existence: ' + checkResult.error);
        return {
            ready: false,
            error: checkResult.error
        };
    }

    // Field doesn't exist, create it
    logger.info('SFCC_External_ID__c field does not exist, creating it');

    var createResult = createCustomField(articleType, 'SFCC_External_ID', {
        label: 'SFCC External ID',
        description: 'Salesforce Commerce Cloud B2C content asset ID for synchronization',
        type: 'Text',
        length: 255
    }, serviceID);

    if (createResult.success) {
        logger.info('SFCC_External_ID__c field is now ready');
        return {
            ready: true,
            created: true,
            fieldId: createResult.fieldId
        };
    } else {
        logger.error('Failed to create SFCC_External_ID__c field: ' + createResult.error);
        return {
            ready: false,
            error: createResult.error
        };
    }
}

/**
 * Generate default field metadata from field name
 *
 * Creates sensible defaults when explicit metadata is not provided.
 * Uses field name to infer label.
 *
 * @param {string} fieldName - Full field name (e.g., 'Body__c', 'SFCC_External_ID__c')
 * @returns {Object} Default field metadata
 */
function generateDefaultFieldMetadata(fieldName) {
    // Remove __c suffix and convert to label
    var labelBase = fieldName.replace(/__c$/, '');
    // Replace underscores with spaces
    labelBase = labelBase.replace(/_/g, ' ');

    return {
        label: labelBase,
        description: 'Auto-created field for Salesforce Knowledge integration',
        type: 'Text',
        length: 255
    };
}

/**
 * Ensure all mapped custom fields exist in Salesforce
 *
 * Configuration-driven field validation and creation.
 * Parses FieldMapping to identify custom fields, then checks/creates them
 * based on FieldMetadata configuration or sensible defaults.
 *
 * Supported Field Types and Properties:
 *
 * 1. Text Fields:
 *    {
 *      "type": "Text",
 *      "length": 255,                    // Max 255
 *      "label": "Field Label",
 *      "description": "Field description"
 *    }
 *
 * 2. Long Text Area (Rich Text):
 *    {
 *      "type": "LongTextArea",
 *      "length": 32000,                  // Max 131,072
 *      "visibleLines": 10,               // Number of visible lines in UI
 *      "label": "Field Label",
 *      "description": "Field description"
 *    }
 *
 * 3. Number Fields:
 *    {
 *      "type": "Number",
 *      "precision": 18,                  // Total digits (max 18)
 *      "scale": 0,                       // Decimal places (max precision)
 *      "label": "Field Label",
 *      "description": "Field description"
 *    }
 *
 * 4. Checkbox (Boolean):
 *    {
 *      "type": "Checkbox",
 *      "label": "Field Label",
 *      "description": "Field description"
 *    }
 *
 * 5. Date/DateTime:
 *    {
 *      "type": "Date",                   // or "DateTime"
 *      "label": "Field Label",
 *      "description": "Field description"
 *    }
 *
 * 6. Picklist:
 *    {
 *      "type": "Picklist",
 *      "label": "Field Label",
 *      "description": "Field description"
 *      // Note: Picklist values must be configured in Salesforce UI after creation
 *    }
 *
 * Example FieldMetadata JSON:
 * {
 *   "Body__c": {
 *     "type": "LongTextArea",
 *     "length": 32000,
 *     "visibleLines": 10,
 *     "label": "Article Body",
 *     "description": "Rich text content from B2C Commerce"
 *   },
 *   "SFCC_External_ID__c": {
 *     "type": "Text",
 *     "length": 255,
 *     "label": "SFCC External ID",
 *     "description": "B2C content asset ID for synchronization"
 *   },
 *   "View_Count__c": {
 *     "type": "Number",
 *     "precision": 10,
 *     "scale": 0,
 *     "label": "View Count",
 *     "description": "Number of times article was viewed"
 *   }
 * }
 *
 * @param {string} articleType - Knowledge Article Type (e.g., 'Knowledge__kav')
 * @param {string} fieldMappingJSON - JSON string of field mappings
 * @param {string} fieldMetadataJSON - JSON string of field metadata definitions
 * @param {boolean} autoCreate - Whether to create missing fields
 * @param {string} serviceID - Service ID for Salesforce API
 * @returns {Object} Validation result
 * @returns {boolean} result.ready - Whether all required fields are ready
 * @returns {Array<string>} result.created - List of fields that were created
 * @returns {Array<string>} result.skipped - List of fields that were skipped
 * @returns {Array<string>} result.existing - List of fields that already existed
 * @returns {Array<Object>} result.errors - Array of error objects {field, error}
 */
function ensureAllMappedFieldsExist(articleType, fieldMappingJSON, fieldMetadataJSON, autoCreate, serviceID) {
    logger.info('Ensuring all mapped custom fields exist on ' + articleType);
    logger.info('Auto-create enabled: ' + autoCreate);

    // Validate serviceID is provided
    if (!serviceID || serviceID.trim() === '') {
        logger.error('Service ID not provided to ensureAllMappedFieldsExist');
        return {
            ready: false,
            created: [],
            skipped: [],
            existing: [],
            errors: [{ field: 'N/A', error: 'Service ID is required' }]
        };
    }

    var result = {
        ready: true,
        created: [],
        skipped: [],
        existing: [],
        errors: []
    };

    try {
        // Parse field mapping
        var fieldMapping;
        try {
            fieldMapping = JSON.parse(fieldMappingJSON);
        } catch (e) {
            logger.error('Invalid FieldMapping JSON: ' + e.message);
            result.ready = false;
            result.errors.push({
                field: 'FieldMapping',
                error: 'Invalid JSON: ' + e.message
            });
            return result;
        }

        // Parse field metadata
        var fieldMetadata = {};
        try {
            if (fieldMetadataJSON && fieldMetadataJSON.trim() !== '' && fieldMetadataJSON.trim() !== '{}') {
                fieldMetadata = JSON.parse(fieldMetadataJSON);
            }
        } catch (e) {
            logger.error('Invalid FieldMetadata JSON: ' + e.message);
            result.ready = false;
            result.errors.push({
                field: 'FieldMetadata',
                error: 'Invalid JSON: ' + e.message
            });
            return result;
        }

        logger.info('Field metadata configuration: ' + (Object.keys(fieldMetadata).length > 0 ? Object.keys(fieldMetadata).join(', ') : 'None (using defaults)'));

        // Standard Knowledge fields that should NOT be created
        var standardFields = ['Title', 'Summary', 'UrlName', 'Language', 'PublishStatus', 'VersionNumber', 'Id', 'KnowledgeArticleId'];

        // Iterate through field mapping to find custom fields
        var customFieldsToCheck = [];
        for (var sfField in fieldMapping) {
            if (fieldMapping.hasOwnProperty(sfField)) {
                // Check if it's a custom field (ends with __c)
                if (sfField.indexOf('__c') > -1) {
                    // Skip standard fields
                    if (standardFields.indexOf(sfField) === -1) {
                        customFieldsToCheck.push(sfField);
                    }
                }
            }
        }

        logger.info('Found ' + customFieldsToCheck.length + ' custom fields in mapping: ' + customFieldsToCheck.join(', '));

        // Check and create each custom field
        for (var i = 0; i < customFieldsToCheck.length; i++) {
            var fieldName = customFieldsToCheck[i];
            // Remove __c suffix to get developer name
            var developerName = fieldName.replace(/__c$/, '');

            logger.debug('Processing field: ' + fieldName + ' (developer name: ' + developerName + ')');

            // Check if field exists
            var checkResult = checkCustomFieldExists(articleType, developerName, serviceID);

            if (checkResult.exists) {
                logger.info('Field already exists: ' + fieldName);
                result.existing.push(fieldName);
                continue;
            }

            if (checkResult.error) {
                logger.error('Failed to check field existence for ' + fieldName + ': ' + checkResult.error);
                result.errors.push({
                    field: fieldName,
                    error: checkResult.error
                });
                result.ready = false;
                continue;
            }

            // Field doesn't exist
            logger.info('Field does not exist: ' + fieldName);

            if (!autoCreate) {
                logger.warn('Auto-create disabled, skipping field creation: ' + fieldName);
                result.skipped.push(fieldName);
                continue;
            }

            // Get metadata for this field
            var metadata;
            if (fieldMetadata[fieldName]) {
                // Use provided metadata
                logger.info('Using provided metadata for field: ' + fieldName);
                metadata = fieldMetadata[fieldName];
            } else {
                // Use default metadata
                logger.info('Using default metadata for field: ' + fieldName);
                metadata = generateDefaultFieldMetadata(fieldName);
            }

            // Create the field
            logger.info('Creating field: ' + fieldName);
            var createResult = createCustomField(articleType, developerName, metadata, serviceID);

            if (createResult.success) {
                logger.info('Successfully created field: ' + fieldName);
                result.created.push(fieldName);
            } else {
                logger.error('Failed to create field ' + fieldName + ': ' + createResult.error);
                result.errors.push({
                    field: fieldName,
                    error: createResult.error
                });
                result.ready = false;
            }
        }

        // Log summary
        logger.info('Field validation summary:');
        logger.info('  - Existing fields: ' + result.existing.length);
        logger.info('  - Created fields: ' + result.created.length);
        logger.info('  - Skipped fields: ' + result.skipped.length);
        logger.info('  - Errors: ' + result.errors.length);

        if (result.created.length > 0) {
            logger.info('Created fields: ' + result.created.join(', '));
        }

        if (result.errors.length > 0) {
            logger.warn('Field validation completed with errors');
            result.errors.forEach(function (error) {
                logger.warn('  - ' + error.field + ': ' + error.error);
            });
        }

    } catch (e) {
        logger.error('Exception in ensureAllMappedFieldsExist: ' + e.message);
        result.ready = false;
        result.errors.push({
            field: 'General',
            error: 'Exception: ' + e.message
        });
    }

    return result;
}

// Export public functions
module.exports = {
    checkCustomFieldExists: checkCustomFieldExists,
    createCustomField: createCustomField,
    ensureExternalIdField: ensureExternalIdField,
    ensureAllMappedFieldsExist: ensureAllMappedFieldsExist
};
