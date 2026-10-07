import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { logger } from '../utils/logger.js';

/**
 * GitHub push webhook that runs ~/deploy.sh on the server.
 *
 * This used to be inlined in server.js with the secret hardcoded as
 * 'mysecret123' — committed to git, so anyone with the repo could run the
 * deploy script. It is now off unless DEPLOY_WEBHOOK_SECRET is set, and the
 * HMAC is checked over the raw request bytes (GitHub signs those, not a
 * re-serialised, sanitised req.body) with a timing-safe compare.
 */
const DEPLOY_TIMEOUT_MS = 10 * 60 * 1000;

export const deployWebhookHandler = (req, res) => {
    const secret = String(process.env.DEPLOY_WEBHOOK_SECRET || '').trim();
    if (!secret) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }

    const signature = String(req.headers['x-hub-signature-256'] || '');
    const raw = req.rawBody;
    if (!raw || !signature) {
        return res.status(403).send('Unauthorized');
    }

    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        logger.warn(`[deploy] Rejected webhook with bad signature from ${req.ip}`);
        return res.status(403).send('Unauthorized');
    }

    const home = os.homedir();
    logger.info(`[deploy] Signed webhook accepted from ${req.ip}; running deploy.sh`);
    execFile(path.join(home, 'deploy.sh'), [], { cwd: home, timeout: DEPLOY_TIMEOUT_MS }, (err, stdout) => {
        if (err) {
            logger.error(`[deploy] Failed: ${err.message}`);
            return res.send('Deploy failed');
        }
        logger.info(`[deploy] ${String(stdout || '').slice(-2000)}`);
        res.send('Deploy success');
    });
};
