/**
 * The single Firebase service-account loader.
 *
 * There were two independent parsers — `config/firebase.js` (admin SDK init)
 * and `core/notifications/firebase.service.js` (the REST FCM sender's OAuth
 * path). Fixing one left the other broken, which is exactly how push kept
 * failing after Firebase "started working".
 *
 * A service account's `private_key` is a PEM block containing real newlines.
 * Pasted into .env as-is those stay literal, and a raw newline inside a JSON
 * string is invalid — JSON.parse fails with "Bad control character in string
 * literal". This parser retries once with control characters escaped so both
 * the correct (\n-escaped) and the pasted-raw form work.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

let cached = null;

const sanitize = (value) => String(value ?? '').trim();

/**
 * @param {string} rawJson
 * @returns {Object|null}
 */
export const parseServiceAccountJson = (rawJson) => {
    try {
        return JSON.parse(rawJson);
    } catch (firstError) {
        try {
            const escaped = rawJson
                .replace(/\r\n/g, '\\n')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\n')
                .replace(/\t/g, '\\t');
            const parsed = JSON.parse(escaped);
            logger.warn(
                'FIREBASE_SERVICE_ACCOUNT contained literal newlines; parsed after escaping. '
                + 'Escape the private_key newlines as \\n to silence this.',
            );
            return parsed;
        } catch {
            logger.error(`Error parsing FIREBASE_SERVICE_ACCOUNT JSON: ${firstError.message}`);
            return null;
        }
    }
};

/**
 * Load the service account from FIREBASE_SERVICE_ACCOUNT_PATH or
 * FIREBASE_SERVICE_ACCOUNT. Cached after the first successful read.
 *
 * @returns {Object|null} null when unconfigured or unparseable.
 */
export const loadFirebaseServiceAccount = () => {
    if (cached) return cached;

    const pathValue = sanitize(config.firebaseServiceAccountPath || process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (pathValue) {
        const filePath = resolve(process.cwd(), pathValue);
        if (existsSync(filePath)) {
            try {
                cached = JSON.parse(readFileSync(filePath, 'utf8'));
                return cached;
            } catch (error) {
                logger.error(`Error reading Firebase service account file at ${filePath}: ${error.message}`);
            }
        }
    }

    const rawJson = sanitize(config.firebaseServiceAccount || process.env.FIREBASE_SERVICE_ACCOUNT);
    if (rawJson) {
        cached = parseServiceAccountJson(rawJson);
        if (cached) return cached;
    }

    return null;
};

export default { loadFirebaseServiceAccount, parseServiceAccountJson };
