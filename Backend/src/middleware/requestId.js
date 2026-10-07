import crypto from 'crypto';
import { runWithRequest } from '../utils/requestContext.js';

const HEADER = 'x-request-id';

/**
 * Assigns a request ID from X-Request-ID header or generates one.
 * Attaches to req.requestId and sets response header, and opens the request
 * context (utils/requestContext.js) that the rest of the request runs in.
 */
export const requestIdMiddleware = (req, res, next) => {
    const id = req.headers[HEADER] || crypto.randomUUID();
    req.requestId = id;
    res.setHeader(HEADER, id);
    runWithRequest(req, next);
};
