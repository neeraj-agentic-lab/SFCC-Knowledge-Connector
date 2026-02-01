'use strict';

/**
 * Salesforce OAuth 2.0 Authentication Helper
 *
 * Handles OAuth authentication with Salesforce using Username-Password flow.
 * Manages access token retrieval and caching for Knowledge API calls.
 *
 * @module scripts/helpers/salesforceAuthHelper
 */

var Logger = require('dw/system/Logger');

// Get services from service definition file
var services = require('int_salesforce_knowledge/cartridge/scripts/services/salesforceKnowledgeService');

// Initialize logger
var logger = Logger.getLogger('SFKnowledge', 'Auth');

/**
 * Cache key for storing access token in request scope
 * @type {string}
 */
var CACHE_KEY = 'sf_oauth_access_token';

/**
 * Get OAuth 2.0 access token from Salesforce
 *
 * This function:
 * 1. Checks request cache for existing valid token
 * 2. Gets credentials from service configuration
 * 3. Calls Salesforce OAuth endpoint
 * 4. Returns access token and instance URL
 *
 * OAuth Flow: Username-Password Grant
 * - grant_type: password
 * - client_id: Connected App Consumer Key
 * - client_secret: Connected App Consumer Secret
 * - username: Salesforce username
 * - password: Salesforce password + security token
 *
 * @param {string} serviceId - Service ID (default: 'salesforce.oauth')
 * @returns {Object} Authentication result
 * @returns {boolean} result.success - Whether authentication succeeded
 * @returns {string} result.accessToken - OAuth access token (if success)
 * @returns {string} result.instanceUrl - Salesforce instance URL (if success)
 * @returns {string} result.error - Error message (if failed)
 *
 * @example
 * var authResult = authHelper.getAccessToken('salesforce.oauth');
 *
 * if (authResult.success) {
 *     // Use authResult.accessToken and authResult.instanceUrl
 * } else {
 *     // Handle error: authResult.error
 * }
 */
function getAccessToken(serviceId) {
    // Validate service ID is provided
    if (!serviceId || serviceId.trim() === '') {
        logger.error('Service ID not provided. Configure ServiceID parameter in job step.');
        return {
            success: false,
            error: 'Service ID is required but not configured in job parameters'
        };
    }

    logger.debug('Getting Salesforce OAuth access token using service: ' + serviceId);

    // Check request cache for existing token
    if (request.custom && request.custom[CACHE_KEY]) {
        logger.debug('Using cached access token from request');
        return request.custom[CACHE_KEY];
    }

    try {
        // Get OAuth service
        var authService;
        try {
            authService = services.getOAuthService(serviceId);
        } catch (serviceError) {
            var errorMsg = 'Salesforce OAuth service is not configured in Business Manager. ' +
                'Please configure service with ID: ' + serviceId + ' at Administration > Operations > Services';
            logger.error(errorMsg);
            logger.error('Service error details: ' + serviceError.message);
            return {
                success: false,
                error: errorMsg
            };
        }

        if (!authService) {
            logger.error('OAuth service not found. Configure service ID: ' + serviceId + ' in Business Manager');
            return {
                success: false,
                error: 'OAuth service not configured'
            };
        }

        // Get credentials from service configuration
        var serviceConfig = authService.getConfiguration();
        var credentials = serviceConfig.getCredential();

        if (!credentials) {
            logger.error('Service credentials not found. Configure credentials in Business Manager');
            return {
                success: false,
                error: 'Service credentials not configured'
            };
        }

        // Validate required custom fields
        if (!credentials.custom || !credentials.custom.clientid || !credentials.custom.clientsecret) {
            logger.error('Missing required custom credential fields: clientid or clientsecret');
            return {
                success: false,
                error: 'Incomplete service credentials. Add clientid, clientsecret, and granttype as custom fields'
            };
        }

        // Get grant type (handle if granttype is returned as an array or object)
        var grantType = credentials.custom.granttype;
        if (grantType && typeof grantType === 'object' && grantType.length) {
            // If it's an array, take the first element
            grantType = grantType[0];
        }

        // Validate granttype is configured
        if (!grantType || typeof grantType !== 'string' || grantType.trim() === '') {
            logger.error('Grant type not configured. Add "granttype" as a custom credential field with value "password" or "client_credentials"');
            return {
                success: false,
                error: 'Grant type not configured in service credentials'
            };
        }

        grantType = grantType.toString().trim();

        logger.info('OAuth Authentication - Grant Type: ' + grantType);

        // Build OAuth parameters based on grant type
        var params = {};

        if (grantType === 'client_credentials') {
            // Client Credentials Flow (server-to-server)
            logger.info('Using Client Credentials flow');
            params = {
                grant_type: 'client_credentials',
                client_id: credentials.custom.clientid,
                client_secret: credentials.custom.clientsecret
            };
        } else if (grantType === 'password') {
            // Username-Password Flow
            logger.info('Using Username-Password flow');

            // Validate username and password are provided
            if (!credentials.user || !credentials.password) {
                logger.error('Username and password are required for password grant type');
                return {
                    success: false,
                    error: 'Username and password must be configured for password grant type'
                };
            }

            params = {
                grant_type: 'password',
                client_id: credentials.custom.clientid,
                client_secret: credentials.custom.clientsecret,
                username: credentials.user,
                password: credentials.password + (credentials.custom.securityToken || '')
            };
        } else {
            logger.error('Invalid grant type: ' + grantType + '. Must be "password" or "client_credentials"');
            return {
                success: false,
                error: 'Invalid grant type. Must be "password" or "client_credentials"'
            };
        }

        // Log OAuth request (sanitized)
        logger.info('OAuth Request:');
        logger.info('  - Grant Type: ' + params.grant_type);
        logger.info('  - Client ID: ' + params.client_id);
        logger.info('  - Client Secret: ***HIDDEN***');
        if (params.username) {
            logger.info('  - Username: ' + params.username);
            logger.info('  - Password: ***HIDDEN***');
        }

        logger.debug('Calling Salesforce OAuth endpoint');

        // Call OAuth service
        var result = authService.call(params);

        // Log response status
        logger.info('OAuth Response Status: ' + result.status);

        // Check result
        if (result.status === 'OK' && result.object) {
            var oauthResponse = result.object;

            // Log successful response (sanitized)
            logger.info('OAuth Response:');
            logger.info('  - Access Token: ' + (oauthResponse.access_token ? '***TOKEN_RECEIVED*** (length: ' + oauthResponse.access_token.length + ')' : 'MISSING'));
            logger.info('  - Instance URL: ' + (oauthResponse.instance_url || 'MISSING'));
            logger.info('  - Token Type: ' + (oauthResponse.token_type || 'Bearer'));
            logger.info('  - Issued At: ' + (oauthResponse.issued_at || 'N/A'));
            if (oauthResponse.scope) {
                logger.info('  - Scope: ' + oauthResponse.scope);
            }

            if (oauthResponse.access_token && oauthResponse.instance_url) {
                logger.info('OAuth authentication successful');

                // Extract user ID from 'id' field (format: "https://login.salesforce.com/id/{orgId}/{userId}")
                var userId = null;
                var orgId = null;
                if (oauthResponse.id) {
                    var idParts = oauthResponse.id.split('/');
                    if (idParts.length >= 2) {
                        orgId = idParts[idParts.length - 2];
                        userId = idParts[idParts.length - 1];
                        logger.debug('Extracted User ID: ' + userId + ', Org ID: ' + orgId);
                    }
                }

                var authResult = {
                    success: true,
                    accessToken: oauthResponse.access_token,
                    instanceUrl: oauthResponse.instance_url,
                    tokenType: oauthResponse.token_type || 'Bearer',
                    issuedAt: oauthResponse.issued_at,
                    userId: userId,
                    orgId: orgId
                };

                // Cache token in request scope
                if (!request.custom) {
                    request.custom = {};
                }
                request.custom[CACHE_KEY] = authResult;

                return authResult;
            } else {
                logger.error('OAuth response missing required fields');
                logger.error('Full response: ' + JSON.stringify(oauthResponse));
                return {
                    success: false,
                    error: 'Invalid OAuth response structure - missing access_token or instance_url'
                };
            }
        } else {
            // Service call failed
            var errorMsg = result.errorMessage || result.msg || 'Unknown OAuth error';
            logger.error('OAuth authentication failed: ' + errorMsg);
            logger.error('Service Status: ' + result.status);
            logger.error('Error Code: ' + (result.error || 'N/A'));

            // Try to parse error response
            if (result.errorMessage) {
                logger.error('Error Details: ' + result.errorMessage);
            }
            if (result.object) {
                logger.error('Error Response Body: ' + JSON.stringify(result.object));

                // Log specific error details if available
                if (result.object.error) {
                    logger.error('OAuth Error: ' + result.object.error);
                }
                if (result.object.error_description) {
                    logger.error('OAuth Error Description: ' + result.object.error_description);
                }
                if (result.object.statusCode) {
                    logger.error('HTTP Status Code: ' + result.object.statusCode);
                }
                if (result.object.responsePreview) {
                    logger.error('Response Preview: ' + result.object.responsePreview);
                }
            }

            // Build user-friendly error message
            var userError = errorMsg;
            if (result.object && result.object.error_description) {
                userError = result.object.error_description;
            }

            return {
                success: false,
                error: userError,
                statusCode: result.error
            };
        }
    } catch (e) {
        logger.error('OAuth authentication exception: ' + e.message + '\nStack: ' + e.stack);
        return {
            success: false,
            error: 'OAuth exception: ' + e.message
        };
    }
}

/**
 * Clear cached access token from request scope
 *
 * Use this to force token refresh on next getAccessToken() call
 *
 * @example
 * // After API call fails with 401 Unauthorized
 * authHelper.clearCachedToken();
 * var newAuth = authHelper.getAccessToken();
 */
function clearCachedToken() {
    if (request.custom && request.custom[CACHE_KEY]) {
        delete request.custom[CACHE_KEY];
        logger.debug('Cleared cached access token');
    }
}

/**
 * Validate OAuth credentials configuration
 *
 * Checks if service and credentials are properly configured
 * Useful for troubleshooting configuration issues
 *
 * @param {string} serviceId - Service ID (default: 'salesforce.oauth')
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - Whether configuration is valid
 * @returns {Array<string>} result.errors - List of configuration errors
 * @returns {Array<string>} result.warnings - List of configuration warnings
 *
 * @example
 * var validation = authHelper.validateConfiguration('salesforce.oauth');
 * if (!validation.valid) {
 *     validation.errors.forEach(function(error) {
 *         logger.error('Config error: ' + error);
 *     });
 * }
 */
function validateConfiguration(serviceId) {
    var errors = [];
    var warnings = [];

    // Validate service ID is provided
    if (!serviceId || serviceId.trim() === '') {
        errors.push('Service ID not provided. Configure ServiceID parameter in job step.');
        return { valid: false, errors: errors, warnings: warnings };
    }

    try {
        // Check service exists
        var authService;
        try {
            authService = services.getOAuthService(serviceId);
        } catch (serviceError) {
            errors.push('Salesforce OAuth service (ID: ' + serviceId + ') is not configured in Business Manager');
            errors.push('Configure at: Administration > Operations > Services');
            return { valid: false, errors: errors, warnings: warnings };
        }

        if (!authService) {
            errors.push('OAuth service not found (ID: ' + serviceId + ')');
            return { valid: false, errors: errors, warnings: warnings };
        }

        // Check service configuration
        var serviceConfig = authService.getConfiguration();
        if (!serviceConfig) {
            errors.push('Service configuration not found');
            return { valid: false, errors: errors, warnings: warnings };
        }

        // Check credentials
        var credentials = serviceConfig.getCredential();
        if (!credentials) {
            errors.push('Service credentials not configured');
            return { valid: false, errors: errors, warnings: warnings };
        }

        // Validate custom fields first
        if (!credentials.custom) {
            errors.push('Custom credential fields not configured');
        } else {
            if (!credentials.custom.clientid) {
                errors.push('Custom field "clientid" not configured');
            }
            if (!credentials.custom.clientsecret) {
                errors.push('Custom field "clientsecret" not configured');
            }
            // Get grant type (handle if it's an array)
            var grantType = credentials.custom.granttype;
            if (grantType && typeof grantType === 'object' && grantType.length) {
                grantType = grantType[0];
            }

            // Validate granttype is configured
            if (!grantType || typeof grantType !== 'string' || grantType.trim() === '') {
                errors.push('Custom field "granttype" not configured. Must be "password" or "client_credentials"');
            } else {
                grantType = grantType.toString().trim();

                // Validate based on grant type
                if (grantType === 'password') {
                    // Username-Password flow requires user and password
                    if (!credentials.user || credentials.user.trim() === '') {
                        errors.push('Username not configured (required for password grant type)');
                    }
                    if (!credentials.password || credentials.password.trim() === '') {
                        errors.push('Password not configured (required for password grant type)');
                    }
                    if (!credentials.custom.securityToken) {
                        warnings.push('Custom field "securityToken" not configured (may be required for password grant)');
                    }
                } else if (grantType === 'client_credentials') {
                    // Client Credentials flow only needs clientid and clientsecret
                    // Username and password are not used
                    if (credentials.user || credentials.password) {
                        warnings.push('Username/password configured but not used for client_credentials grant type');
                    }
                } else {
                    errors.push('Invalid granttype: "' + grantType + '". Must be "password" or "client_credentials"');
                }
            }
        }

    } catch (e) {
        errors.push('Configuration validation exception: ' + e.message);
    }

    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

// Export public functions
module.exports = {
    getAccessToken: getAccessToken,
    clearCachedToken: clearCachedToken,
    validateConfiguration: validateConfiguration
};
