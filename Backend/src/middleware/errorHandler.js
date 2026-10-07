import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Multer reports a rejected upload by throwing, with no `statusCode` — so an
 * oversized file came out as a 500 "Server Error", which reads as the server
 * breaking rather than the request being refused. These are client errors and
 * should say so.
 */
const MULTER_STATUS = {
    LIMIT_FILE_SIZE: [413, 'That file is too large'],
    LIMIT_FILE_COUNT: [400, 'Too many files'],
    LIMIT_FIELD_COUNT: [400, 'Too many form fields'],
    LIMIT_FIELD_VALUE: [400, 'A form field is too large'],
    LIMIT_UNEXPECTED_FILE: [400, 'Unexpected file field'],
    LIMIT_PART_COUNT: [400, 'Too many parts in the upload'],
};

/**
 * Errors raised by Mongoose, the Mongo driver, body parsing or the JS runtime
 * carry internal detail in their message — model and field names, the raw
 * value that failed to cast, index names, stack-ish text. Those reached
 * clients verbatim as a 500. Map the ones that are really client mistakes to
 * 4xx and replace the rest with a generic message; the full text still goes
 * to the log. Plain `new Error('…')` thrown by our own code is left alone —
 * many screens show that text to the user.
 */
const classifyInternal = (err) => {
    if (!err || err.statusCode) return null;
    if (err.type === 'entity.parse.failed') return [400, 'Malformed JSON body'];
    if (err.type === 'entity.too.large') return [413, 'Request body is too large'];
    if (err.name === 'CastError' || err.name === 'BSONError') return [400, 'Invalid identifier or value'];
    if (err.name === 'ValidationError' && err.errors) {
        const first = Object.values(err.errors)[0];
        return [400, first?.message || 'Validation failed'];
    }
    if (err.code === 11000) return [409, 'A record with these details already exists'];
    if (['MongoServerError', 'MongoError', 'MongoNetworkError', 'MongooseServerSelectionError',
        'MongoServerSelectionError', 'StrictModeError', 'DocumentNotFoundError', 'VersionError',
        'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'AxiosError'].includes(err.name)) {
        return [500, 'Server Error'];
    }
    return null;
};

const validStatus = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= 400 && n <= 599 ? n : null;
};

const errorHandler = (err, req, res, next) => {
    const multer = err?.name === 'MulterError' ? MULTER_STATUS[err.code] : null;
    const internal = multer ? null : classifyInternal(err);

    const statusCode = multer ? multer[0] : internal ? internal[0] : (validStatus(err.statusCode) || validStatus(err.status) || 500);
    const message = multer ? multer[1] : internal ? internal[1] : (err.message || 'Server Error');
    const requestId = req.requestId || '-';

    logger.error(
        `[${requestId}] ${req.method} ${req.originalUrl} ${statusCode} - ${err.name || 'Error'} - ${err.message || message}`
    );
    if (config.nodeEnv === 'development' && err.stack) {
        logger.error(`[${requestId}] ${err.stack}`);
    }

    res.status(statusCode).json({
        success: false,
        error: message
    });
};

export default errorHandler;
