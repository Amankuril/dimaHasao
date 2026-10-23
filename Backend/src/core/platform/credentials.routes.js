import express from 'express';
import { describeCredentials, saveCredentials, CREDENTIAL_FIELDS } from './credentials.service.js';

/**
 * Mounted under /v1/admin/credentials behind requirePlatformSuperAdmin.
 * Values go in, never out: reads return masked previews only.
 */
const router = express.Router();

/** @route GET /v1/admin/credentials */
router.get('/', async (_req, res) => {
    try {
        return res.json({ success: true, ...(await describeCredentials()) });
    } catch (error) {
        console.error('Get credentials error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load credentials' });
    }
});

/**
 * @route PUT /v1/admin/credentials
 * Body: { googleMapsApiKey?, razorpayKeyId?, razorpayKeySecret?, razorpayWebhookSecret? }
 * Omitted fields stay as they are; an empty string removes the stored value.
 */
router.put('/', async (req, res) => {
    try {
        const updates = {};
        for (const name of Object.keys(CREDENTIAL_FIELDS)) {
            if (typeof req.body?.[name] === 'string') updates[name] = req.body[name];
        }
        if (!Object.keys(updates).length) {
            return res.status(400).json({ success: false, message: 'Nothing to update' });
        }

        const { changed } = await saveCredentials(updates, req.admin?._id || null);
        return res.json({ success: true, message: 'Credentials saved', changed, ...(await describeCredentials()) });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        console.error('Save credentials error:', error);
        return res.status(500).json({ success: false, message: 'Failed to save credentials' });
    }
});

export default router;
