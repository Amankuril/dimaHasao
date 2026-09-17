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

const errorHandler = (err, req, res, next) => {
    const multer = err?.name === 'MulterError' ? MULTER_STATUS[err.code] : null;

    const statusCode = multer ? multer[0] : (err.statusCode || 500);
    const message = multer ? multer[1] : (err.message || 'Server Error');
    const requestId = req.requestId || '-';

    logger.error(
        `[${requestId}] ${req.method} ${req.originalUrl} ${statusCode} - ${err.name || 'Error'} - ${message}`
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
