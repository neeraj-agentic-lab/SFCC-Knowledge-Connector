'use strict';

/**
 * Language Helper
 *
 * Handles multi-language content discovery and locale switching for syncing
 * B2C Commerce content to Salesforce Knowledge in multiple languages.
 *
 * Features:
 * - Auto-discover enabled locales from site configuration
 * - Check which languages a content asset exists in
 * - Retrieve content in specific locale
 * - Filter locales based on include/exclude configuration
 *
 * @module scripts/helpers/languageHelper
 */

var Site = require('dw/system/Site');
var ContentMgr = require('dw/content/ContentMgr');
var Logger = require('dw/system/Logger');

var logger = Logger.getLogger('SFKnowledge', 'LanguageHelper');

/**
 * Locale mapping from B2C Commerce to Salesforce Knowledge
 *
 * B2C Commerce uses full locale codes (e.g., fr_FR, ja_JP)
 * Salesforce Knowledge uses simplified language codes (e.g., fr, ja)
 *
 * This mapping converts B2C locale codes to Salesforce-compatible language codes.
 *
 * Salesforce Knowledge Supported Languages:
 * - Full locale codes: en_US, en_GB, fr_CA, pt_BR, zh_CN, zh_TW, etc.
 * - Simple language codes: fr, de, es, it, ja, ko, nl, pl, ru, th, etc.
 *
 * @type {Object}
 */
var LOCALE_MAPPING = {
    // English variants
    // NOTE: Most Salesforce orgs only support en_US for English
    // Unless you specifically enable other English variants, map them all to en_US
    'en_US': 'en_US',
    'en_GB': 'en_US', // Map UK English to US English
    'en_CA': 'en_US', // Map Canadian English to US English
    'en_AU': 'en_US', // Map Australian English to US English
    'en_IN': 'en_US', // Map Indian English to US English
    'en_MY': 'en_US', // Map Malaysian English to US English
    'en_PH': 'en_US', // Map Philippine English to US English
    'en_SG': 'en_US', // Map Singapore English to US English
    'en': 'en_US',

    // French variants
    'fr_FR': 'fr',
    'fr_CA': 'fr_CA', // Canadian French uses full code
    'fr_BE': 'fr',
    'fr_CH': 'fr',
    'fr': 'fr',

    // German variants
    'de_DE': 'de',
    'de_AT': 'de',
    'de_CH': 'de',
    'de': 'de',

    // Spanish variants
    'es_ES': 'es',
    'es_MX': 'es_MX',
    'es_AR': 'es',
    'es_CL': 'es',
    'es_CO': 'es',
    'es_PE': 'es',
    'es': 'es',

    // Italian variants
    'it_IT': 'it',
    'it_CH': 'it',
    'it': 'it',

    // Japanese
    'ja_JP': 'ja',
    'ja': 'ja',

    // Chinese variants
    // NOTE: Chinese must be enabled in Salesforce Knowledge Settings to use these codes
    'zh_CN': 'zh_CN', // Simplified Chinese
    'zh_TW': 'zh_TW', // Traditional Chinese
    'zh_HK': 'zh_TW', // Hong Kong uses Traditional
    'zh': 'zh_CN',

    // Portuguese variants
    'pt_BR': 'pt_BR', // Brazilian Portuguese uses full code
    'pt_PT': 'pt_BR', // Map European Portuguese to Brazilian Portuguese
    'pt': 'pt_BR',

    // Korean
    'ko_KR': 'ko',
    'ko': 'ko',

    // Dutch
    'nl_NL': 'nl',
    'nl_BE': 'nl',
    'nl': 'nl',

    // Polish
    'pl_PL': 'pl',
    'pl': 'pl',

    // Russian
    'ru_RU': 'ru',
    'ru': 'ru',

    // Thai
    'th_TH': 'th',
    'th': 'th',

    // Turkish
    'tr_TR': 'tr',
    'tr': 'tr',

    // Swedish
    'sv_SE': 'sv',
    'sv': 'sv',

    // Danish
    'da_DK': 'da',
    'da': 'da',

    // Norwegian
    'no_NO': 'no',
    'no': 'no',

    // Finnish
    'fi_FI': 'fi',
    'fi': 'fi',

    // Czech
    'cs_CZ': 'cs',
    'cs': 'cs',

    // Hungarian
    'hu_HU': 'hu',
    'hu': 'hu',

    // Romanian
    'ro_RO': 'ro',
    'ro': 'ro',

    // Greek
    'el_GR': 'el',
    'el': 'el',

    // Hebrew
    'iw_IL': 'iw',
    'he_IL': 'iw',
    'iw': 'iw',

    // Arabic
    'ar_SA': 'ar',
    'ar_AE': 'ar',
    'ar_EG': 'ar',
    'ar': 'ar',

    // Indonesian
    'in_ID': 'in',
    'id_ID': 'in',
    'in': 'in',

    // Vietnamese
    'vi_VN': 'vi',
    'vi': 'vi',

    // Ukrainian
    'uk_UA': 'uk',
    'uk': 'uk'
};

/**
 * Map B2C Commerce locale code to Salesforce Knowledge language code
 *
 * Converts B2C locale codes (e.g., fr_FR, ja_JP) to Salesforce-compatible
 * language codes (e.g., fr, ja).
 *
 * @param {String} b2cLocale - B2C Commerce locale code (e.g., "fr_FR")
 * @returns {String} Salesforce Knowledge language code (e.g., "fr")
 *
 * @example
 * mapLocaleToSalesforceLanguage('fr_FR') // Returns: 'fr'
 * mapLocaleToSalesforceLanguage('en_US') // Returns: 'en_US'
 * mapLocaleToSalesforceLanguage('ja_JP') // Returns: 'ja'
 */
function mapLocaleToSalesforceLanguage(b2cLocale) {
    if (!b2cLocale) {
        logger.warn('No locale provided for mapping, returning en_US');
        return 'en_US';
    }

    // Check if we have an exact mapping
    if (LOCALE_MAPPING[b2cLocale]) {
        var sfLanguage = LOCALE_MAPPING[b2cLocale];
        if (b2cLocale !== sfLanguage) {
            logger.debug('Mapped B2C locale "' + b2cLocale + '" to Salesforce language "' + sfLanguage + '"');
        }
        return sfLanguage;
    }

    // If no exact mapping, try to extract language code (first part before underscore)
    var parts = b2cLocale.split('_');
    if (parts.length > 1) {
        var languageCode = parts[0];
        logger.info('No exact mapping for "' + b2cLocale + '", using language code: ' + languageCode);
        return languageCode;
    }

    // If all else fails, return as-is and let Salesforce validation handle it
    logger.warn('No mapping found for locale "' + b2cLocale + '", using as-is');
    return b2cLocale;
}

/**
 * Get all enabled locales for the current site
 *
 * Retrieves the list of allowed locales from Site configuration.
 * These are the languages that could potentially have content.
 *
 * @returns {Array<String>} Array of locale IDs (e.g., ["en_US", "es", "fr"])
 *
 * @example
 * var locales = getAvailableLocalesForSite();
 * // Returns: ["en_US", "es", "fr", "de"]
 */
function getAvailableLocalesForSite() {
    try {
        var currentSite = Site.getCurrent();
        if (!currentSite) {
            logger.error('Unable to get current site');
            return ['en_US']; // Fallback to default locale
        }

        var allowedLocales = currentSite.getAllowedLocales();
        if (!allowedLocales || allowedLocales.length === 0) {
            logger.warn('No allowed locales found for site, using default: en_US');
            return ['en_US'];
        }

        // Convert Collection to Array
        // Keep original B2C locale codes here - they're needed for request.setLocale()
        // Mapping to Salesforce language codes happens later when creating articles
        var localeArray = [];
        var iterator = allowedLocales.iterator();
        while (iterator.hasNext()) {
            var locale = iterator.next();

            // Skip 'default' locale - it's not a valid Salesforce Knowledge language code
            // 'default' is a B2C Commerce special locale for fallback content
            if (locale && locale.toLowerCase() !== 'default') {
                localeArray.push(locale);
            } else if (locale && locale.toLowerCase() === 'default') {
                logger.debug('Skipping "default" locale - not a valid Salesforce Knowledge language code');
            }
        }

        // If no valid locales found (only had 'default'), use en_US as fallback
        if (localeArray.length === 0) {
            logger.warn('No valid locales found (only "default"), using en_US as fallback');
            localeArray.push('en_US');
        }

        logger.debug('Site has ' + localeArray.length + ' valid locales: ' + localeArray.join(', '));

        return localeArray;

    } catch (e) {
        logger.error('Error getting site locales: ' + e.message);
        return ['en_US']; // Fallback to default
    }
}

/**
 * Check which languages a content asset exists in
 *
 * Iterates through provided locales, switches to each locale, and checks
 * if the content asset exists and is online in that locale.
 *
 * IMPORTANT: Preserves and restores original locale to avoid side effects.
 *
 * @param {String} contentAssetID - Content Asset ID
 * @param {Array<String>} locales - Array of locale IDs to check
 * @returns {Array<String>} Array of locale IDs where content exists
 *
 * @example
 * var languages = getAvailableLanguagesForContent('faq-001', ['en_US', 'es', 'fr']);
 * // Returns: ['en_US', 'es'] (if content exists in en_US and es only)
 */
function getAvailableLanguagesForContent(contentAssetID, locales) {
    if (!contentAssetID || !locales || locales.length === 0) {
        logger.warn('Invalid parameters for getAvailableLanguagesForContent');
        return [];
    }

    var availableLanguages = [];
    var originalLocale = request.getLocale();

    // Variables to store master locale content for comparison
    var masterLocale = null;
    var masterName = null;
    var masterBody = null;

    // Track skipped locales for summary
    var skippedLocales = [];

    try {
        for (var i = 0; i < locales.length; i++) {
            var locale = locales[i];

            try {
                // Switch to this locale
                request.setLocale(locale);

                // Try to get content in this locale
                var content = ContentMgr.getContent(contentAssetID);

                if (!content) {
                    logger.debug('[' + contentAssetID + '] Content not found in locale: ' + locale);
                    continue;
                }

                // Check if content has basic data (name and body must be populated)
                var hasName = content.name && content.name.trim() !== '';
                var hasBody = content.custom && content.custom.body && content.custom.body.markup && content.custom.body.markup.trim() !== '';

                // Get actual values
                var nameValue = content.name || '<empty>';
                var bodyValue = '';
                if (content.custom && content.custom.body && content.custom.body.markup) {
                    bodyValue = content.custom.body.markup.trim();
                }

                if (!hasName || !hasBody) {
                    logger.debug('[' + contentAssetID + '] Skipped locale ' + locale + ' - content has empty name or body');
                    continue;
                }

                // Check if content is online in this locale
                if (!content.online) {
                    logger.debug('[' + contentAssetID + '] Skipped locale ' + locale + ' - content is offline');
                    continue;
                }

                // Store master locale content for comparison (first locale is master)
                if (masterLocale === null) {
                    masterLocale = locale;
                    masterName = nameValue;
                    masterBody = bodyValue;
                    availableLanguages.push(locale);
                    continue;
                }

                // For non-master locales, compare content against master to detect fallback
                // Normalize body content by replacing locale patterns in URLs and query parameters
                // B2C Commerce automatically updates locale parameters even when content isn't truly localized

                var localePattern = '(en_US|en_GB|es|fr|de|it|ja|zh|pt|nl|pl|ru|th|tr|sv|da|no|fi|cs|hu|ro|el|iw|ar|in|vi|uk|ko|fr_FR|de_DE|es_ES|it_IT|ja_JP|zh_CN|zh_TW|pt_BR|pt_PT|nl_NL|pl_PL|ru_RU|th_TH|tr_TR|sv_SE|da_DK|no_NO|fi_FI|cs_CZ|hu_HU|ro_RO|el_GR|fr_CA|es_MX|en_CA|en_AU|en_IN)';

                var normalizedMasterBody = masterBody
                    .replace(new RegExp('\\/' + localePattern + '\\/', 'g'), '/__LOCALE__/') // URL paths: /en_US/
                    .replace(new RegExp('[?&]lang=' + localePattern, 'g'), '?lang=__LOCALE__'); // Query params: ?lang=en_US or &lang=en_US

                var normalizedCurrentBody = bodyValue
                    .replace(new RegExp('\\/' + localePattern + '\\/', 'g'), '/__LOCALE__/') // URL paths: /es/
                    .replace(new RegExp('[?&]lang=' + localePattern, 'g'), '?lang=__LOCALE__'); // Query params: ?lang=es or &lang=es

                var isNameSame = (nameValue === masterName);
                var isBodySame = (normalizedCurrentBody === normalizedMasterBody);

                // If content is identical to master, it's fallback content (not truly localized)
                if (isNameSame && isBodySame) {
                    skippedLocales.push(locale);
                    continue;
                }

                // Content differs from master - it's truly localized
                availableLanguages.push(locale);

            } catch (localeError) {
                logger.error('[' + contentAssetID + '] Error checking content in locale ' + locale + ': ' + localeError.message);
            }
        }
    } finally {
        // Always restore original locale
        try {
            request.setLocale(originalLocale);
        } catch (restoreError) {
            logger.error('[' + contentAssetID + '] Failed to restore original locale: ' + restoreError.message);
        }
    }

    // Log concise summary
    if (availableLanguages.length === 0) {
        logger.warn('[' + contentAssetID + '] No localized versions found');
    } else if (availableLanguages.length === 1) {
        logger.info('[' + contentAssetID + '] Exported: ' + availableLanguages[0] + ' only');
    } else {
        var summary = '[' + contentAssetID + '] Exported: ' + availableLanguages.join(', ');
        if (skippedLocales.length > 0) {
            summary += ' (skipped: ' + skippedLocales.join(', ') + ')';
        }
        logger.info(summary);
    }

    return availableLanguages;
}

/**
 * Get content asset in a specific locale
 *
 * Switches to the specified locale, retrieves and formats the content asset,
 * then restores the original locale.
 *
 * @param {String} contentAssetID - Content Asset ID
 * @param {String} locale - Locale ID
 * @param {Boolean} enableDebugLogging - Enable debug logging
 * @returns {Object} Formatted content asset or null
 *
 * @example
 * var content = getContentAssetInLocale('faq-001', 'es', false);
 * // Returns formatted content with language: 'es'
 */
function getContentAssetInLocale(contentAssetID, locale, enableDebugLogging) {
    if (!contentAssetID || !locale) {
        logger.error('Content ID and locale are required');
        return null;
    }

    var originalLocale = request.getLocale();

    try {
        // Switch to target locale
        request.setLocale(locale);
        logger.debug('Switched to locale: ' + locale + ' for content: ' + contentAssetID);

        // Get content in this locale
        var content = ContentMgr.getContent(contentAssetID);

        if (!content) {
            logger.debug('Content ' + contentAssetID + ' not found in locale: ' + locale);
            return null;
        }

        if (!content.online) {
            logger.debug('Content ' + contentAssetID + ' is offline in locale: ' + locale);
            return null;
        }

        // Format the content asset (reuse existing function)
        var contentMappingHelper = require('int_salesforce_knowledge/cartridge/scripts/helpers/contentMappingHelper');
        var formattedContent = contentMappingHelper.formatContentAsset(content, enableDebugLogging);

        if (!formattedContent) {
            logger.error('Failed to format content asset: ' + contentAssetID + ' in locale: ' + locale);
            return null;
        }

        // Map B2C locale to Salesforce language code
        var sfLanguage = mapLocaleToSalesforceLanguage(locale);

        // Add language info to the formatted content
        formattedContent.b2cLocale = locale; // Original B2C locale (for reference)
        formattedContent.language = sfLanguage; // Salesforce-compatible language code

        logger.debug('Successfully retrieved content ' + contentAssetID + ' in B2C locale: ' + locale + ', Salesforce language: ' + sfLanguage);

        return formattedContent;

    } catch (e) {
        logger.error('Error getting content in locale ' + locale + ': ' + e.message);
        return null;

    } finally {
        // Always restore original locale
        try {
            request.setLocale(originalLocale);
        } catch (restoreError) {
            logger.error('Failed to restore original locale: ' + restoreError.message);
        }
    }
}

/**
 * Filter locales based on configuration
 *
 * Applies include and exclude filters to the list of locales.
 * - If includeLanguages is specified, only those languages are included
 * - If excludeLanguages is specified, those languages are removed
 * - If both are specified, includeLanguages takes precedence
 *
 * @param {Array<String>} locales - All available locales
 * @param {Object} config - Configuration object
 * @param {Array<String>} config.includeLanguages - Languages to include (whitelist)
 * @param {Array<String>} config.excludeLanguages - Languages to exclude (blacklist)
 * @returns {Array<String>} Filtered locales
 *
 * @example
 * var filtered = filterLocales(
 *     ['en_US', 'es', 'fr', 'de', 'ja'],
 *     { excludeLanguages: ['ja', 'de'] }
 * );
 * // Returns: ['en_US', 'es', 'fr']
 *
 * @example
 * var filtered = filterLocales(
 *     ['en_US', 'es', 'fr', 'de', 'ja'],
 *     { includeLanguages: ['en_US', 'es'] }
 * );
 * // Returns: ['en_US', 'es']
 */
function filterLocales(locales, config) {
    if (!locales || locales.length === 0) {
        logger.warn('No locales to filter');
        return [];
    }

    if (!config) {
        logger.debug('No filter configuration, returning all locales');
        return locales;
    }

    var filtered = locales.slice(); // Copy array

    // Apply include filter (whitelist) - if specified, only these languages
    if (config.includeLanguages && Array.isArray(config.includeLanguages) && config.includeLanguages.length > 0) {
        logger.info('Applying includeLanguages filter: ' + config.includeLanguages.join(', '));

        filtered = filtered.filter(function (locale) {
            return config.includeLanguages.indexOf(locale) !== -1;
        });

        logger.info('After includeLanguages filter: ' + filtered.length + ' locales remaining: ' + filtered.join(', '));
    }

    // Apply exclude filter (blacklist) - remove these languages
    if (config.excludeLanguages && Array.isArray(config.excludeLanguages) && config.excludeLanguages.length > 0) {
        logger.info('Applying excludeLanguages filter: ' + config.excludeLanguages.join(', '));

        var beforeCount = filtered.length;
        filtered = filtered.filter(function (locale) {
            return config.excludeLanguages.indexOf(locale) === -1;
        });

        var excludedCount = beforeCount - filtered.length;
        if (excludedCount > 0) {
            logger.info('Excluded ' + excludedCount + ' locales, ' + filtered.length + ' remaining: ' + filtered.join(', '));
        }
    }

    if (filtered.length === 0) {
        logger.warn('All locales were filtered out, this may cause issues');
    }

    return filtered;
}

/**
 * Validate language configuration
 *
 * Checks if the language configuration is valid.
 *
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result { valid: Boolean, errors: Array<String> }
 */
function validateLanguageConfiguration(config) {
    var result = {
        valid: true,
        errors: []
    };

    if (!config) {
        return result; // No language config is valid (uses defaults)
    }

    // Validate masterLanguage format
    if (config.masterLanguage) {
        if (typeof config.masterLanguage !== 'string') {
            result.valid = false;
            result.errors.push('masterLanguage must be a string (e.g., "en_US")');
        } else if (config.masterLanguage.trim() === '') {
            result.valid = false;
            result.errors.push('masterLanguage cannot be empty');
        }
    }

    // Validate languageMode
    if (config.languageMode) {
        if (config.languageMode !== 'auto' && config.languageMode !== 'configured') {
            result.valid = false;
            result.errors.push('languageMode must be "auto" or "configured"');
        }
    }

    // Validate languages array (for configured mode)
    if (config.languages) {
        if (!Array.isArray(config.languages)) {
            result.valid = false;
            result.errors.push('languages must be an array of language codes');
        } else if (config.languages.length === 0) {
            result.errors.push('Warning: languages array is empty');
        }
    }

    // Validate includeLanguages
    if (config.includeLanguages && !Array.isArray(config.includeLanguages)) {
        result.valid = false;
        result.errors.push('includeLanguages must be an array');
    }

    // Validate excludeLanguages
    if (config.excludeLanguages && !Array.isArray(config.excludeLanguages)) {
        result.valid = false;
        result.errors.push('excludeLanguages must be an array');
    }

    return result;
}

/**
 * Log language discovery results
 *
 * Logs detailed information about language discovery for debugging.
 *
 * @param {Array<String>} siteLocales - All site locales
 * @param {Array<String>} targetLocales - Filtered target locales
 * @param {String} masterLanguage - Master language
 */
function logLanguageDiscovery(siteLocales, targetLocales, masterLanguage) {
    logger.info('========== LANGUAGE DISCOVERY ==========');
    logger.info('Site Locales (B2C): ' + siteLocales.length + ' - ' + siteLocales.join(', '));
    logger.info('Target Locales (B2C): ' + targetLocales.length + ' - ' + targetLocales.join(', '));

    // Show Salesforce language mappings
    var sfMappings = [];
    for (var i = 0; i < targetLocales.length; i++) {
        var b2cLocale = targetLocales[i];
        var sfLanguage = mapLocaleToSalesforceLanguage(b2cLocale);
        if (b2cLocale !== sfLanguage) {
            sfMappings.push(b2cLocale + ' → ' + sfLanguage);
        }
    }

    if (sfMappings.length > 0) {
        logger.info('Salesforce Language Mappings: ' + sfMappings.join(', '));
    } else {
        logger.info('No locale mapping needed (all locales match Salesforce format)');
    }

    logger.info('Master Language (B2C): ' + masterLanguage + ', Salesforce: ' + mapLocaleToSalesforceLanguage(masterLanguage));

    if (siteLocales.length !== targetLocales.length) {
        var filtered = siteLocales.length - targetLocales.length;
        logger.info('Filtered out: ' + filtered + ' locales');
    }

    logger.info('========================================');
}

// Export public functions
module.exports = {
    getAvailableLocalesForSite: getAvailableLocalesForSite,
    getAvailableLanguagesForContent: getAvailableLanguagesForContent,
    getContentAssetInLocale: getContentAssetInLocale,
    filterLocales: filterLocales,
    validateLanguageConfiguration: validateLanguageConfiguration,
    logLanguageDiscovery: logLanguageDiscovery,
    mapLocaleToSalesforceLanguage: mapLocaleToSalesforceLanguage
};
