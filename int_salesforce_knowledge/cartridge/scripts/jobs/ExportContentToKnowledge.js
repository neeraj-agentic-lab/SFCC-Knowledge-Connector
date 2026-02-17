'use strict';

/**
 * Export Content to Salesforce Knowledge Job
 *
 * Main job script that exports B2C Commerce Content Assets to Salesforce Knowledge
 * as Knowledge Articles. This script is called by the SFCC Job Framework.
 *
 * Job Parameters:
 * - ContentFolderID (optional): Specific folder to export (default: 'root' for all content)
 * - BatchSize (optional): Number of assets per batch (default: 50)
 * - ExportMode (optional): 'full' or 'delta' (default: delta)
 * - ArticleType (optional): Knowledge Article Type API Name (default: Knowledge__kav)
 * - FieldMapping (optional): JSON field mapping (default: standard mapping)
 * - DataCategory (optional): Salesforce Knowledge data category
 * - AutoCreateFields (optional): Automatically create missing custom fields (default: false)
 * - FieldMetadata (optional): JSON metadata for custom fields to create (default: {})
 * - PublishArticles (optional): Auto-publish articles after creation/update (default: false)
 * - EnableDebugLogging (optional): Enable detailed debug logging (default: false)
 * - ServiceID (optional): Salesforce service ID (default: salesforce.oauth)
 *
 * Configuration Examples:
 *
 * Example 1: Basic export with auto-create using defaults
 *   AutoCreateFields: true
 *   FieldMapping: {"Title":"name","Body__c":"custom.body","SFCC_External_ID__c":"ID"}
 *   FieldMetadata: {}
 *   Result: Creates Body__c and SFCC_External_ID__c as Text(255) fields
 *
 * Example 2: Export with custom field metadata
 *   AutoCreateFields: true
 *   FieldMapping: {"Title":"name","Body__c":"custom.body","SFCC_External_ID__c":"ID","View_Count__c":"custom.viewCount"}
 *   FieldMetadata: {
 *     "Body__c": {
 *       "type": "LongTextArea",
 *       "length": 32000,
 *       "visibleLines": 10,
 *       "label": "Article Body",
 *       "description": "Rich text content from B2C Commerce"
 *     },
 *     "SFCC_External_ID__c": {
 *       "type": "Text",
 *       "length": 255,
 *       "label": "SFCC External ID",
 *       "description": "B2C content asset ID"
 *     },
 *     "View_Count__c": {
 *       "type": "Number",
 *       "precision": 10,
 *       "scale": 0,
 *       "label": "View Count",
 *       "description": "Number of article views"
 *     }
 *   }
 *   Result: Creates fields with exact specifications
 *
 * Example 3: Validation only (no auto-create)
 *   AutoCreateFields: false
 *   FieldMapping: {"Title":"name","Body__c":"custom.body"}
 *   Result: Validates fields exist, logs warnings if missing, but doesn't create them
 *
 * @module scripts/jobs/ExportContentToKnowledge
 */

var Status = require('dw/system/Status');
var Logger = require('dw/system/Logger');

var authHelper = require('int_salesforce_knowledge/cartridge/scripts/helpers/salesforceAuthHelper');
var contentMappingHelper = require('int_salesforce_knowledge/cartridge/scripts/helpers/contentMappingHelper');
var knowledgeHelper = require('int_salesforce_knowledge/cartridge/scripts/helpers/salesforceKnowledgeHelper');
var toolingHelper = require('int_salesforce_knowledge/cartridge/scripts/helpers/salesforceToolingHelper');

/**
 * Main job execution function
 *
 * This is the entry point called by SFCC Job Framework.
 * The function name 'execute' is specified in steptypes.json.
 *
 * Execution Flow:
 * 1. Validate OAuth configuration
 * 2. Get job parameters and build config
 * 3. Get content assets from B2C
 * 4. Authenticate with Salesforce
 * 4.5. Validate/create custom fields (if AutoCreateFields enabled)
 * 5. Export articles in batches with versioning support
 * 6. Log results and return status
 *
 * @param {dw.job.JobParameters} parameters - Job parameters from Business Manager
 * @param {dw.job.JobStepExecution} stepExecution - Job step execution context
 * @returns {dw.system.Status} Status.OK or Status.ERROR
 *
 * @example
 * // This function is called by SFCC Job Framework
 * // Not meant to be called directly from code
 */
exports.execute = function (parameters, stepExecution) {
    // Initialize logger
    var logger = Logger.getLogger('SFKnowledge', 'ExportJob');

    logger.info('=======================================================');
    logger.info('Starting Salesforce Knowledge Export Job');
    logger.info('=======================================================');

    var startTime = new Date().getTime();

    try {
        // ========================================
        // 1. VALIDATE CONFIGURATION
        // ========================================
        logger.info('Step 1: Validating configuration');

        // Get Service ID first (needed for validation)
        var serviceID = parameters.ServiceID;

        // Validate Service ID is provided
        if (!serviceID || serviceID.trim() === '') {
            logger.error('Service ID not configured. Please configure ServiceID parameter in job step.');
            logger.error('ServiceID should match a service configured at Administration > Operations > Services');
            return new Status(Status.ERROR, 'ERROR', 'Service ID not configured in job parameters');
        }

        // Validate OAuth configuration
        var configValidation = authHelper.validateConfiguration(serviceID);
        if (!configValidation.valid) {
            logger.error('Configuration validation failed:');
            configValidation.errors.forEach(function (error) {
                logger.error('  - ' + error);
            });
            return new Status(Status.ERROR, 'ERROR', 'Invalid configuration: ' + configValidation.errors.join(', '));
        }

        if (configValidation.warnings.length > 0) {
            logger.warn('Configuration warnings:');
            configValidation.warnings.forEach(function (warning) {
                logger.warn('  - ' + warning);
            });
        }

        logger.info('Configuration validated successfully');

        // ========================================
        // 2. GET JOB PARAMETERS
        // ========================================
        logger.info('Step 2: Processing job parameters');

        var contentFolderID = parameters.ContentFolderID || 'root';
        var batchSize = parameters.BatchSize || 50;
        var exportMode = parameters.ExportMode || 'delta';
        var articleType = parameters.ArticleType || 'Knowledge__kav';
        var fieldMapping = parameters.FieldMapping || '{"Title":"name","Summary":"pageDescription","Body__c":"custom.body","SFCC_External_ID__c":"ID","UrlName":"ID"}';
        var dataCategory = parameters.DataCategory || null;
        var autoCreateFields = parameters.AutoCreateFields || false;
        var fieldMetadata = parameters.FieldMetadata || '{}';
        var enableDebugLogging = parameters.EnableDebugLogging || false;
        var publishArticles = parameters.PublishArticles || false;
        // Note: serviceID was already read in Step 1 for validation

        logger.info('Job Parameters:');
        logger.info('  - Content Folder ID: ' + contentFolderID);
        logger.info('  - Batch Size: ' + batchSize);
        logger.info('  - Export Mode: ' + exportMode);
        logger.info('  - Article Type: ' + articleType);
        logger.info('  - Data Category: ' + (dataCategory || 'None'));
        logger.info('  - Field Mapping: ' + fieldMapping);
        logger.info('  - Auto Create Fields: ' + autoCreateFields);
        logger.info('  - Field Metadata: ' + fieldMetadata);
        logger.info('  - Enable Debug Logging: ' + enableDebugLogging);
        logger.info('  - Publish Articles: ' + publishArticles);
        logger.info('  - Service ID: ' + serviceID);

        // Build configuration object to pass to helpers
        var config = {
            articleType: articleType,
            fieldMapping: fieldMapping,
            dataCategory: dataCategory,
            enableDebugLogging: enableDebugLogging,
            publishArticles: publishArticles,
            serviceID: serviceID
        };

        // Validate batch size
        if (batchSize < 1 || batchSize > 500) {
            logger.error('Invalid batch size: ' + batchSize + ' (must be 1-500)');
            return new Status(Status.ERROR, 'ERROR', 'Invalid batch size');
        }

        // ========================================
        // 3. GET CONTENT ASSETS
        // ========================================
        logger.info('Step 3: Retrieving content assets from B2C Commerce');

        var contentAssets = contentMappingHelper.getContentAssets(contentFolderID, enableDebugLogging, exportMode);

        if (!contentAssets || contentAssets.length === 0) {
            logger.warn('No content assets found to export');
            logger.info('Job completed: No content to export');
            return new Status(Status.OK, 'OK', 'No content assets found');
        }

        logger.info('Found ' + contentAssets.length + ' content assets to export');

        // ========================================
        // 4. AUTHENTICATE WITH SALESFORCE
        // ========================================
        logger.info('Step 4: Authenticating with Salesforce');

        var authResult = authHelper.getAccessToken(serviceID);
        if (!authResult.success) {
            logger.error('Salesforce authentication failed: ' + authResult.error);
            return new Status(Status.ERROR, 'ERROR', 'Authentication failed: ' + authResult.error);
        }

        logger.info('Successfully authenticated with Salesforce');
        logger.info('  - Instance URL: ' + authResult.instanceUrl);

        // ========================================
        // 4.5. ENSURE MAPPED CUSTOM FIELDS EXIST
        // ========================================
        logger.info('Step 4.5: Validating mapped custom fields in Salesforce');

        var fieldCheckResult = toolingHelper.ensureAllMappedFieldsExist(
            articleType,
            fieldMapping,
            fieldMetadata,
            autoCreateFields,
            serviceID
        );

        if (!fieldCheckResult.ready) {
            logger.error('Field validation failed');
            fieldCheckResult.errors.forEach(function (error) {
                logger.error('  - ' + error.field + ': ' + error.error);
            });

            // If auto-create is enabled and fields failed to create, this is an error
            if (autoCreateFields) {
                return new Status(
                    Status.ERROR,
                    'ERROR',
                    'Field validation failed: ' + fieldCheckResult.errors.map(function (e) { return e.field; }).join(', ')
                );
            } else {
                // If auto-create is disabled, just warn about missing fields
                logger.warn('Some fields may be missing. Enable AutoCreateFields to create them automatically.');
            }
        }

        if (fieldCheckResult.created.length > 0) {
            logger.info('Created ' + fieldCheckResult.created.length + ' custom fields: ' + fieldCheckResult.created.join(', '));
        }

        if (fieldCheckResult.skipped.length > 0) {
            logger.warn('Skipped ' + fieldCheckResult.skipped.length + ' fields (auto-create disabled): ' + fieldCheckResult.skipped.join(', '));
        }

        logger.info('Field validation completed successfully');

        // ========================================
        // 5. EXPORT ARTICLES IN BATCHES
        // ========================================
        logger.info('Step 5: Exporting articles to Salesforce Knowledge');

        var syncMetadataUpdates = 0;
        var syncMetadataErrors = 0;

        var exportResult = contentMappingHelper.exportToExternalAPI(
            contentAssets,
            batchSize,
            function (batch) {
                // Export batch to Salesforce Knowledge
                var batchResult = knowledgeHelper.exportBatch(batch, config);

                // Update sync metadata for successfully exported content assets
                if (batchResult.success && batchResult.details && batchResult.details.length > 0) {
                    logger.debug('Updating sync metadata for ' + batchResult.details.length + ' content assets in batch');

                    for (var i = 0; i < batchResult.details.length; i++) {
                        var detail = batchResult.details[i];

                        // Only update metadata for successful exports
                        if (detail.success && detail.knowledgeArticleId && detail.versionId) {
                            var updateResult = contentMappingHelper.updateSyncMetadata(
                                detail.contentId,
                                detail.knowledgeArticleId,
                                detail.versionId
                            );

                            if (updateResult.success) {
                                syncMetadataUpdates++;
                                logger.debug('Updated sync metadata for content: ' + detail.contentId);
                            } else {
                                syncMetadataErrors++;
                                logger.warn('Failed to update sync metadata for content ' + detail.contentId + ': ' + updateResult.error);
                            }
                        }
                    }
                }

                return batchResult;
            }
        );

        logger.info('Sync metadata updates: ' + syncMetadataUpdates + ' successful, ' + syncMetadataErrors + ' failed');

        // ========================================
        // 6. LOG RESULTS
        // ========================================
        logger.info('Step 6: Processing results');

        var endTime = new Date().getTime();
        var duration = (endTime - startTime) / 1000; // seconds

        logger.info('=======================================================');
        logger.info('Export Job Completed');
        logger.info('=======================================================');
        logger.info('Summary:');
        logger.info('  - Export Mode: ' + exportMode);
        logger.info('  - Total Content Assets: ' + contentAssets.length);
        logger.info('  - Total Processed: ' + exportResult.totalProcessed);
        logger.info('  - Successful Exports: ' + exportResult.totalSuccess);
        logger.info('  - Failed Exports: ' + exportResult.totalFailed);
        logger.info('  - Sync Metadata Updates: ' + syncMetadataUpdates + ' successful, ' + syncMetadataErrors + ' failed');
        logger.info('  - Duration: ' + duration.toFixed(2) + ' seconds');

        if (exportResult.errors.length > 0) {
            logger.warn('Errors encountered:');
            exportResult.errors.forEach(function (error) {
                logger.warn('  - Batch ' + error.batch + ': ' + error.error);
            });
        }

        // Determine final status
        if (exportResult.totalSuccess === 0 && exportResult.totalFailed > 0) {
            // All exports failed
            logger.error('All exports failed');
            return new Status(
                Status.ERROR,
                'ERROR',
                'All exports failed. Processed: ' + exportResult.totalProcessed
            );
        } else if (exportResult.totalFailed > 0) {
            // Partial success
            logger.warn('Some exports failed');
            return new Status(
                Status.OK,
                'OK',
                'Partial success. Success: ' + exportResult.totalSuccess + ', Failed: ' + exportResult.totalFailed
            );
        } else {
            // All successful
            logger.info('All exports successful');
            return new Status(
                Status.OK,
                'OK',
                'Success. Exported: ' + exportResult.totalSuccess + ' articles'
            );
        }

    } catch (e) {
        // Catch any unexpected exceptions
        logger.error('Unexpected error in export job: ' + e.message);
        logger.error('Stack trace: ' + e.stack);

        return new Status(
            Status.ERROR,
            'ERROR',
            'Job exception: ' + e.message
        );
    }
};

/**
 * Before Step function (optional)
 *
 * Called before the main execute function.
 * Can be used for setup tasks.
 *
 * @param {dw.job.JobParameters} parameters - Job parameters
 * @param {dw.job.JobStepExecution} stepExecution - Job step execution context
 * @returns {dw.system.Status} Status.OK to continue, Status.ERROR to abort
 */
exports.beforeStep = function (parameters, stepExecution) {
    var logger = Logger.getLogger('SFKnowledge', 'ExportJob');
    logger.debug('beforeStep: Job initialization');

    // Could perform pre-checks here
    // Return Status.ERROR to prevent job execution

    return new Status(Status.OK);
};

/**
 * After Step function (optional)
 *
 * Called after the main execute function completes.
 * Can be used for cleanup tasks.
 *
 * @param {boolean} success - Whether the execute step succeeded
 * @param {dw.job.JobParameters} parameters - Job parameters
 * @param {dw.job.JobStepExecution} stepExecution - Job step execution context
 * @returns {dw.system.Status} Status
 */
exports.afterStep = function (success, parameters, stepExecution) {
    var logger = Logger.getLogger('SFKnowledge', 'ExportJob');
    logger.debug('afterStep: Job cleanup (success: ' + success + ')');

    // Clear cached OAuth token
    var authHelper = require('int_salesforce_knowledge/cartridge/scripts/helpers/salesforceAuthHelper');
    authHelper.clearCachedToken();

    return new Status(Status.OK);
};

/**
 * Get total count function (optional)
 *
 * Returns the total count of items to be processed.
 * Used for progress tracking in Business Manager.
 *
 * @param {dw.job.JobParameters} parameters - Job parameters
 * @param {dw.job.JobStepExecution} stepExecution - Job step execution context
 * @returns {number} Total count of items
 */
exports.getTotalCount = function (parameters, stepExecution) {
    try {
        var contentMappingHelper = require('int_salesforce_knowledge/cartridge/scripts/helpers/contentMappingHelper');
        var contentFolderID = parameters.ContentFolderID || 'root';
        var exportMode = parameters.ExportMode || 'delta';
        var contentAssets = contentMappingHelper.getContentAssets(contentFolderID, false, exportMode);

        return contentAssets ? contentAssets.length : 0;
    } catch (e) {
        return 0;
    }
};
