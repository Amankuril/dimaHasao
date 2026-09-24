import express from 'express';
import DistrictSettings from './platformSettings.model.js';
import LegalDocument from '../legal/legalDocument.model.js';
import {
    readModuleToggles,
    writeModuleToggles,
    TOGGLEABLE_MODULES,
    MODULE_LABELS,
    DEFAULT_MAINTENANCE_MESSAGE,
} from './moduleToggles.service.js';

/**
 * Reading is public. Sign-in screens show the brand and the policy links
 * before anyone has a session, so this cannot require one.
 */
export const platformPublicRouter = express.Router();
export const platformAdminRouter = express.Router();

const asText = (value) => (typeof value === 'string' ? value.trim() : '');

/** Only the fields a client should see — never the audit columns. */
const publicShape = (settings) => ({
    brandName: settings.brandName,
    tagline: settings.tagline,
    logoUrl: settings.logoUrl,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    supportUrl: settings.supportUrl,
    address: settings.address,
    state: settings.state,
    pincode: settings.pincode,
});

/**
 * @route GET /v1/platform/settings?module=
 *
 * Brand and contact, plus which policy documents actually exist for this
 * module. The sign-in screens use that second part to decide whether to render
 * a Privacy or Terms link at all, rather than linking to a 404.
 */
platformPublicRouter.get('/settings', async (req, res) => {
    try {
        const module = asText(req.query.module) || 'platform';
        const settings = await DistrictSettings.getSettings();

        // One query for both documents; `module` first, platform as fallback.
        const documents = await LegalDocument.find({
            slug: { $in: ['privacy', 'terms'] },
            module: { $in: [module, 'platform'] },
            isActive: true,
        })
            .select('slug module')
            .lean();

        const has = (slug) => documents.some((d) => d.slug === slug);

        return res.json({
            success: true,
            settings: publicShape(settings),
            legal: { privacy: has('privacy'), terms: has('terms') },
        });
    } catch (error) {
        console.error('Get platform settings error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load settings' });
    }
});

/** @route GET /v1/admin/platform-settings */
platformAdminRouter.get('/', async (_req, res) => {
    try {
        const settings = await DistrictSettings.getSettings();
        return res.json({ success: true, settings });
    } catch (error) {
        console.error('Get platform settings (admin) error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load settings' });
    }
});

const EDITABLE = [
    'brandName',
    'tagline',
    'logoUrl',
    'supportEmail',
    'supportPhone',
    'supportUrl',
    'address',
    'state',
    'pincode',
];

/** @route PUT /v1/admin/platform-settings */
platformAdminRouter.put('/', async (req, res) => {
    try {
        const brandName = asText(req.body.brandName);
        if (!brandName) {
            return res.status(400).json({ success: false, message: 'The brand name is required' });
        }

        const settings = await DistrictSettings.getSettings();
        for (const key of EDITABLE) {
            if (req.body[key] !== undefined) settings[key] = asText(req.body[key]);
        }
        settings.updatedBy = req.user?._id || req.user?.userId || null;
        await settings.save();

        return res.json({ success: true, message: 'Settings saved', settings });
    } catch (error) {
        console.error('Save platform settings error:', error);
        return res.status(500).json({ success: false, message: 'Failed to save settings' });
    }
});

export default { platformPublicRouter, platformAdminRouter };


/**
 * @route GET /v1/platform/module-toggles
 *
 * Public on purpose: the consumer app has to know a module is closed before
 * anyone signs in, and the maintenance screen is shown to signed-out visitors
 * too.
 */
platformPublicRouter.get('/module-toggles', async (_req, res) => {
    const toggles = await readModuleToggles();

    res.json({
        success: true,
        modules: TOGGLEABLE_MODULES,
        labels: MODULE_LABELS,
        defaultMessage: DEFAULT_MAINTENANCE_MESSAGE,
        toggles,
    });
});

/** @route GET /v1/admin/platform/module-toggles */
platformAdminRouter.get('/module-toggles', async (_req, res) => {
    const toggles = await readModuleToggles();

    res.json({
        success: true,
        modules: TOGGLEABLE_MODULES,
        labels: MODULE_LABELS,
        defaultMessage: DEFAULT_MAINTENANCE_MESSAGE,
        toggles,
    });
});

/** @route PATCH /v1/admin/platform/module-toggles  { updates: [{module, enabled, message}] } */
platformAdminRouter.patch('/module-toggles', async (req, res) => {
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];

    if (!updates.length) {
        return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    const toggles = await writeModuleToggles(updates, req.admin?._id || null);

    return res.json({ success: true, message: 'Toggles updated', toggles });
});
