'use strict';

/**
 * Field Transformation Helper
 *
 * Provides field value transformation functions for content mapping.
 * Supports both simple string notation and complex object notation.
 *
 * Supported Transformations:
 * - replaceSpaces:X - Replace spaces with character X (default: -)
 * - urlSafe:X - URL-safe string (lowercase, spaces→X, remove special chars)
 * - lowercase - Convert to lowercase
 * - uppercase - Convert to UPPERCASE
 * - removeSpaces - Remove all whitespace
 *
 * @module scripts/helpers/fieldTransformHelper
 */

var Logger = require('dw/system/Logger');

var logger = Logger.getLogger('SFKnowledge', 'FieldTransformHelper');

/**
 * Apply transformation to a field value
 *
 * @param {string} value - Original value
 * @param {string|Object} transform - Transform specification
 * @param {string} fieldName - Field name (for logging)
 * @returns {string} Transformed value
 */
function applyTransform(value, transform, fieldName) {
    if (!value) {
        return value;
    }

    if (typeof value !== 'string') {
        logger.warn('Transform applied to non-string value for field: ' + fieldName + ', converting to string');
        value = String(value);
    }

    try {
        var result;

        // Object notation (complex transforms)
        if (typeof transform === 'object' && transform !== null) {
            result = applyObjectTransform(value, transform, fieldName);
        }
        // String notation (simple transforms)
        else if (typeof transform === 'string') {
            result = applyStringTransform(value, transform, fieldName);
        }
        else {
            logger.warn('Invalid transform type for field ' + fieldName + ': ' + typeof transform);
            return value;
        }

        // Log transformation if debug enabled
        if (logger.isDebugEnabled()) {
            logger.debug('Transform applied to field ' + fieldName + ': "' + value + '" → "' + result + '" (transform: ' + JSON.stringify(transform) + ')');
        }

        return result;
    } catch (e) {
        logger.error('Error applying transform to field ' + fieldName + ': ' + e.message);
        logger.error('Returning original value');
        return value;
    }
}

/**
 * Apply transformation using string notation
 *
 * Syntax: "transformName" or "transformName:param"
 * Examples: "replaceSpaces:-", "urlSafe:_", "lowercase"
 *
 * @param {string} value - Original value
 * @param {string} transform - Transform specification
 * @param {string} fieldName - Field name (for logging)
 * @returns {string} Transformed value
 */
function applyStringTransform(value, transform, fieldName) {
    var parts = transform.split(':');
    var transformName = parts[0];
    var parameter = parts.length > 1 ? parts.slice(1).join(':') : null;

    switch (transformName) {
        case 'replaceSpaces':
            return transformReplaceSpaces(value, parameter !== null ? parameter : '-');

        case 'urlSafe':
            return transformUrlSafe(value, parameter !== null ? parameter : '-');

        case 'lowercase':
            return transformLowercase(value);

        case 'uppercase':
            return transformUppercase(value);

        case 'removeSpaces':
            return transformRemoveSpaces(value);

        default:
            logger.warn('Unknown transform "' + transformName + '" for field ' + fieldName + ', returning original value');
            return value;
    }
}

/**
 * Apply transformation using object notation
 *
 * Supports complex transforms with multiple parameters
 *
 * @param {string} value - Original value
 * @param {Object} transform - Transform specification object
 * @param {string} fieldName - Field name (for logging)
 * @returns {string} Transformed value
 */
function applyObjectTransform(value, transform, fieldName) {
    var type = transform.type;

    if (!type) {
        logger.error('Transform object for field ' + fieldName + ' missing "type" property');
        return value;
    }

    switch (type) {
        case 'replaceSpaces':
            return transformReplaceSpaces(value, transform.with || transform.replaceWith || '-');

        case 'urlSafe':
            return transformUrlSafe(value, transform.with || transform.separator || '-');

        case 'lowercase':
            return transformLowercase(value);

        case 'uppercase':
            return transformUppercase(value);

        case 'removeSpaces':
            return transformRemoveSpaces(value);

        case 'replace':
            return transformReplace(value, transform);

        default:
            logger.warn('Unknown transform type "' + type + '" for field ' + fieldName + ', returning original value');
            return value;
    }
}

/**
 * Replace spaces with a specified character
 *
 * Uses regex /\s+/g to match one or more whitespace characters
 *
 * @param {string} value - Original value
 * @param {string} replaceWith - Character to replace spaces with (default: '-')
 * @returns {string} Transformed value
 *
 * @example
 * transformReplaceSpaces("How to Reset", "-")  // "How-to-Reset"
 * transformReplaceSpaces("How to Reset", "_")  // "How_to_Reset"
 * transformReplaceSpaces("How to Reset", "")   // "HowtoReset"
 */
function transformReplaceSpaces(value, replaceWith) {
    if (replaceWith === undefined || replaceWith === null) {
        replaceWith = '-';
    }

    // Replace one or more whitespace characters with the replacement character
    return value.replace(/\s+/g, replaceWith);
}

/**
 * Transform to URL-safe string
 *
 * Steps:
 * 1. Convert to lowercase
 * 2. Replace spaces with separator
 * 3. Remove all characters except alphanumeric and separator
 *
 * @param {string} value - Original value
 * @param {string} separator - Character to use as separator (default: '-')
 * @returns {string} URL-safe string
 *
 * @example
 * transformUrlSafe("How to Reset Password?", "-")  // "how-to-reset-password"
 * transformUrlSafe("C++ Programming!", "_")        // "c_programming"
 * transformUrlSafe("Node.js & Express", "-")       // "nodejs-express"
 */
function transformUrlSafe(value, separator) {
    if (separator === undefined || separator === null) {
        separator = '-';
    }

    // Escape separator for use in regex (in case it's a special regex character)
    var escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Step 1: Convert to lowercase
    var result = value.toLowerCase();

    // Step 2: Replace spaces with separator
    result = result.replace(/\s+/g, separator);

    // Step 3: Remove all characters except alphanumeric and separator
    var pattern = '[^a-z0-9' + escapedSeparator + ']';
    var regex = new RegExp(pattern, 'g');
    result = result.replace(regex, '');

    // Step 4: Remove duplicate separators (e.g., "word--word" → "word-word")
    var duplicateSeparatorPattern = escapedSeparator + '+';
    var duplicateRegex = new RegExp(duplicateSeparatorPattern, 'g');
    result = result.replace(duplicateRegex, separator);

    // Step 5: Remove leading/trailing separators
    var leadingTrailingPattern = '^' + escapedSeparator + '+|' + escapedSeparator + '+$';
    var leadingTrailingRegex = new RegExp(leadingTrailingPattern, 'g');
    result = result.replace(leadingTrailingRegex, '');

    return result;
}

/**
 * Convert string to lowercase
 *
 * @param {string} value - Original value
 * @returns {string} Lowercase string
 *
 * @example
 * transformLowercase("Product FAQ")  // "product faq"
 */
function transformLowercase(value) {
    return value.toLowerCase();
}

/**
 * Convert string to UPPERCASE
 *
 * @param {string} value - Original value
 * @returns {string} Uppercase string
 *
 * @example
 * transformUppercase("product faq")  // "PRODUCT FAQ"
 */
function transformUppercase(value) {
    return value.toUpperCase();
}

/**
 * Remove all whitespace characters
 *
 * @param {string} value - Original value
 * @returns {string} String with no whitespace
 *
 * @example
 * transformRemoveSpaces("How to Reset")  // "HowtoReset"
 */
function transformRemoveSpaces(value) {
    return value.replace(/\s+/g, '');
}

/**
 * Custom replace transformation using regex
 *
 * Object format:
 * {
 *   type: "replace",
 *   pattern: "regex pattern",
 *   replaceWith: "replacement string",
 *   flags: "g" (optional)
 * }
 *
 * @param {string} value - Original value
 * @param {Object} config - Replace configuration
 * @returns {string} Transformed value
 *
 * @example
 * transformReplace("Hello World", { pattern: "[aeiou]", replaceWith: "*", flags: "g" })
 * // "H*ll* W*rld"
 */
function transformReplace(value, config) {
    if (!config.pattern) {
        logger.error('Replace transform missing "pattern" property');
        return value;
    }

    try {
        var replaceWith = config.replaceWith !== undefined ? config.replaceWith : '';
        var flags = config.flags || 'g';

        var regex = new RegExp(config.pattern, flags);
        return value.replace(regex, replaceWith);
    } catch (e) {
        logger.error('Error in replace transform: ' + e.message);
        return value;
    }
}

/**
 * Apply multiple transforms in sequence
 *
 * @param {string} value - Original value
 * @param {Array} transforms - Array of transform specifications
 * @param {string} fieldName - Field name (for logging)
 * @returns {string} Transformed value
 *
 * @example
 * applyMultipleTransforms("  How to Reset  ", ["lowercase", "replaceSpaces:-", "trim"], "UrlName")
 * // "how-to-reset"
 */
function applyMultipleTransforms(value, transforms, fieldName) {
    if (!Array.isArray(transforms)) {
        logger.error('applyMultipleTransforms requires an array of transforms');
        return value;
    }

    var result = value;

    for (var i = 0; i < transforms.length; i++) {
        result = applyTransform(result, transforms[i], fieldName);
    }

    return result;
}

/**
 * Apply all configured transforms to mapped fields
 *
 * @param {Object} mappedFields - Object with field name → value mappings
 * @param {Object} transforms - Object with field name → transform mappings
 * @returns {Object} Object with transformed values
 *
 * @example
 * var fields = { "UrlName": "How to Reset Password", "Slug__c": "Product FAQ" };
 * var transforms = { "UrlName": "urlSafe:-", "Slug__c": "replaceSpaces:_" };
 * applyTransformsToFields(fields, transforms)
 * // { "UrlName": "how-to-reset-password", "Slug__c": "Product_FAQ" }
 */
function applyTransformsToFields(mappedFields, transforms) {
    if (!transforms || typeof transforms !== 'object') {
        return mappedFields;
    }

    var result = {};

    // Copy all fields
    for (var fieldName in mappedFields) {
        if (mappedFields.hasOwnProperty(fieldName)) {
            result[fieldName] = mappedFields[fieldName];
        }
    }

    // Apply transforms
    for (var transformFieldName in transforms) {
        if (transforms.hasOwnProperty(transformFieldName)) {
            if (result.hasOwnProperty(transformFieldName)) {
                var originalValue = result[transformFieldName];
                var transform = transforms[transformFieldName];

                // Support array of transforms for chaining
                if (Array.isArray(transform)) {
                    result[transformFieldName] = applyMultipleTransforms(originalValue, transform, transformFieldName);
                } else {
                    result[transformFieldName] = applyTransform(originalValue, transform, transformFieldName);
                }
            } else {
                logger.warn('Transform defined for field ' + transformFieldName + ' but field not found in mapped fields');
            }
        }
    }

    return result;
}

// Export public functions
module.exports = {
    applyTransform: applyTransform,
    applyMultipleTransforms: applyMultipleTransforms,
    applyTransformsToFields: applyTransformsToFields,
    // Export individual transforms for testing
    transformReplaceSpaces: transformReplaceSpaces,
    transformUrlSafe: transformUrlSafe,
    transformLowercase: transformLowercase,
    transformUppercase: transformUppercase,
    transformRemoveSpaces: transformRemoveSpaces,
    transformReplace: transformReplace
};
