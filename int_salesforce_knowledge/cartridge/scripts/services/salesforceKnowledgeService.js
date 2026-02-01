'use strict';

/**
 * Salesforce Knowledge API Service Definitions
 *
 * This module defines two services:
 * 1. salesforce.oauth - For OAuth 2.0 authentication
 * 2. salesforce.knowledge.api - For Knowledge Article CRUD operations
 *
 * Services are created lazily on first access to provide better error messages.
 */

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

// Service cache - now keyed by service ID
var _oauthServiceCache = {};
var _knowledgeServiceCache = {};

/**
 * Get or create OAuth service
 * @param {string} serviceId - Service ID (required)
 * @returns {dw/svc/Service} OAuth service
 */
function getOAuthService(serviceId) {
    var Logger = require('dw/system/Logger');
    var logger = Logger.getLogger('SFKnowledge', 'Service');

    // Validate service ID
    if (!serviceId || serviceId.trim() === '') {
        logger.error('Service ID not provided to getOAuthService');
        throw new Error('Service ID is required');
    }

    // Check cache
    if (_oauthServiceCache[serviceId]) {
        return _oauthServiceCache[serviceId];
    }

    _oauthServiceCache[serviceId] = LocalServiceRegistry.createService(serviceId, {
        createRequest: function (svc, params) {
            var Logger = require('dw/system/Logger');
            var logger = Logger.getLogger('SFKnowledge', 'OAuthService');

            // Get base URL from service configuration
            var baseUrl = svc.getURL();

            // Remove trailing slash if present
            if (baseUrl && baseUrl.charAt(baseUrl.length - 1) === '/') {
                baseUrl = baseUrl.substring(0, baseUrl.length - 1);
            }

            // Construct OAuth endpoint URL
            var oauthUrl = baseUrl + '/services/oauth2/token';
            svc.setURL(oauthUrl);

            logger.info('OAuth Service - Request URL: ' + oauthUrl);
            logger.info('OAuth Service - Request Method: POST');
            logger.info('OAuth Service - Content-Type: application/x-www-form-urlencoded');

            svc.setRequestMethod('POST');
            svc.addHeader('Content-Type', 'application/x-www-form-urlencoded');

            var formData = [];
            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    // Log sanitized parameters
                    if (key === 'client_secret' || key === 'password') {
                        logger.info('OAuth Service - Param: ' + key + '=***HIDDEN***');
                    } else {
                        logger.info('OAuth Service - Param: ' + key + '=' + params[key]);
                    }
                    formData.push(key + '=' + encodeURIComponent(params[key]));
                }
            }

            var requestBody = formData.join('&');
            logger.info('OAuth Service - Request body length: ' + requestBody.length + ' chars');

            return requestBody;
        },

        parseResponse: function (svc, httpClient) {
            var Logger = require('dw/system/Logger');
            var logger = Logger.getLogger('SFKnowledge', 'OAuthService');

            var responseText = httpClient.text;
            var statusCode = httpClient.statusCode;
            var statusMessage = httpClient.statusMessage;

            logger.info('OAuth Service - Response Status Code: ' + statusCode);
            logger.info('OAuth Service - Response Status Message: ' + statusMessage);
            logger.info('OAuth Service - Response Length: ' + (responseText ? responseText.length : 0) + ' chars');

            // Log response preview (sanitized)
            if (responseText) {
                var preview = responseText.substring(0, 500);
                // Hide any access tokens in response
                if (preview.indexOf('access_token') > -1) {
                    logger.info('OAuth Service - Response Preview: [Contains access_token - not logged for security]');
                } else {
                    logger.info('OAuth Service - Response Preview: ' + preview);
                }
            }

            // Check if response is empty
            if (!responseText || responseText.trim() === '') {
                return {
                    error: 'empty_response',
                    error_description: 'Empty response from OAuth endpoint'
                };
            }

            // Check if response is HTML (error page)
            if (responseText.trim().indexOf('<') === 0) {
                return {
                    error: 'html_response',
                    error_description: 'Received HTML instead of JSON. Check OAuth URL configuration.',
                    statusCode: statusCode,
                    responsePreview: responseText.substring(0, 200)
                };
            }

            // Try to parse JSON
            try {
                var result = JSON.parse(responseText);
                logger.info('OAuth Service - Response parsed successfully as JSON');
                return result;
            } catch (e) {
                logger.error('OAuth Service - Failed to parse JSON: ' + e.message);
                return {
                    error: 'invalid_json',
                    error_description: 'Response is not valid JSON: ' + e.message,
                    statusCode: statusCode,
                    responsePreview: responseText.substring(0, 200)
                };
            }
        },

        filterLogMessage: function (msg) {
            if (msg && msg.indexOf('password=') > -1) {
                return msg.replace(/password=[^&]+/, 'password=***FILTERED***');
            }
            return msg;
        }
    });

    return _oauthServiceCache[serviceId];
}

/**
 * Get or create Knowledge API service
 * @param {string} serviceId - Service ID (required)
 * @returns {dw/svc/Service} Knowledge API service
 */
function getKnowledgeService(serviceId) {
    var Logger = require('dw/system/Logger');
    var logger = Logger.getLogger('SFKnowledge', 'Service');

    // Validate service ID
    if (!serviceId || serviceId.trim() === '') {
        logger.error('Service ID not provided to getKnowledgeService');
        throw new Error('Service ID is required');
    }

    // Check cache
    if (_knowledgeServiceCache[serviceId]) {
        return _knowledgeServiceCache[serviceId];
    }

    _knowledgeServiceCache[serviceId] = LocalServiceRegistry.createService(serviceId, {
        createRequest: function (svc, params) {
            svc.setRequestMethod(params.method || 'POST');

            var url = params.instanceUrl + '/services/data/' + (params.apiVersion || 'v58.0') + params.endpoint;
            svc.setURL(url);

            svc.addHeader('Authorization', 'Bearer ' + params.accessToken);
            svc.addHeader('Content-Type', 'application/json');

            if (params.body) {
                return JSON.stringify(params.body);
            }

            return null;
        },

        parseResponse: function (svc, httpClient) {
            var statusCode = httpClient.statusCode;
            var responseText = httpClient.text;

            var result = {
                statusCode: statusCode,
                success: (statusCode >= 200 && statusCode < 300),
                data: null,
                error: null
            };

            if (responseText) {
                try {
                    result.data = JSON.parse(responseText);
                } catch (e) {
                    result.data = responseText;
                }
            }

            if (!result.success) {
                result.error = result.data || 'HTTP ' + statusCode;
            }

            return result;
        },

        filterLogMessage: function (msg) {
            if (msg && msg.indexOf('Bearer ') > -1) {
                return msg.replace(/Bearer [^\s]+/, 'Bearer ***FILTERED***');
            }
            return msg;
        }
    });

    return _knowledgeServiceCache[serviceId];
}

// Export functions that accept service IDs
module.exports = {
    getOAuthService: getOAuthService,
    getKnowledgeService: getKnowledgeService,
    // Legacy getters for backward compatibility (use default service IDs)
    get oauthService() {
        return getOAuthService();
    },
    get knowledgeService() {
        return getKnowledgeService();
    }
};
