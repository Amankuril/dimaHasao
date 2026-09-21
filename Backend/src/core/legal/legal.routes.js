import express from 'express';
import LegalDocument, {
    LEGAL_MODULES,
    LEGAL_AUDIENCES,
    LEGAL_SLUGS,
} from './legalDocument.model.js';

/**
 * Reading is public — a privacy policy behind a login is not a privacy policy.
 * Writing is admin-only and lives under the Global settings panel.
 */
export const legalPublicRouter = express.Router();
export const legalAdminRouter = express.Router();

const asText = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * @route GET /v1/legal/:slug?module=&audience=
 *
 * Falls back to the platform-wide copy when the module has none of its own,
 * so every app has something to show from the day this ships.
 */
legalPublicRouter.get('/:slug', async (req, res) => {
    try {
        const slug = asText(req.params.slug).toLowerCase();
        if (!LEGAL_SLUGS.includes(slug)) {
            return res.status(400).json({ success: false, message: 'Unknown document' });
        }

        const module = LEGAL_MODULES.includes(asText(req.query.module)) ? req.query.module : 'platform';
        const audience = LEGAL_AUDIENCES.includes(asText(req.query.audience)) ? req.query.audience : 'customer';

        const document = await LegalDocument.resolve(slug, { module, audience });
        if (!document) {
            return res.status(404).json({ success: false, message: 'This document has not been published yet' });
        }

        return res.json({ success: true, document });
    } catch (error) {
        console.error('Get legal document error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load this document' });
    }
});

/** @route GET /v1/admin/legal — everything, for the editor's list. */
legalAdminRouter.get('/', async (_req, res) => {
    try {
        const documents = await LegalDocument.find({})
            .sort({ module: 1, audience: 1, slug: 1 })
            .lean();
        return res.json({
            success: true,
            documents,
            meta: { modules: LEGAL_MODULES, audiences: LEGAL_AUDIENCES, slugs: LEGAL_SLUGS },
        });
    } catch (error) {
        console.error('List legal documents error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load documents' });
    }
});

/**
 * @route PUT /v1/admin/legal
 *
 * Upsert by module + audience + slug, which is the document's identity. There
 * is no create/update distinction to get wrong from the editor's side.
 */
legalAdminRouter.put('/', async (req, res) => {
    try {
        const slug = asText(req.body.slug).toLowerCase();
        const module = asText(req.body.module) || 'platform';
        const audience = asText(req.body.audience) || 'customer';
        const title = asText(req.body.title);

        if (!LEGAL_SLUGS.includes(slug)) {
            return res.status(400).json({ success: false, message: 'Unknown document' });
        }
        if (!LEGAL_MODULES.includes(module)) {
            return res.status(400).json({ success: false, message: 'Unknown module' });
        }
        if (!LEGAL_AUDIENCES.includes(audience)) {
            return res.status(400).json({ success: false, message: 'Unknown audience' });
        }
        if (!title) {
            return res.status(400).json({ success: false, message: 'A title is required' });
        }

        const document = await LegalDocument.findOneAndUpdate(
            { module, audience, slug },
            {
                module,
                audience,
                slug,
                title,
                content: typeof req.body.content === 'string' ? req.body.content : '',
                isActive: req.body.isActive !== false,
                updatedBy: req.user?._id || req.user?.userId || null,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        return res.json({ success: true, message: 'Document saved', document });
    } catch (error) {
        console.error('Save legal document error:', error);
        return res.status(500).json({ success: false, message: 'Failed to save this document' });
    }
});

/** @route DELETE /v1/admin/legal/:id */
legalAdminRouter.delete('/:id', async (req, res) => {
    try {
        const removed = await LegalDocument.findByIdAndDelete(req.params.id);
        if (!removed) return res.status(404).json({ success: false, message: 'Document not found' });
        return res.json({ success: true, message: 'Document removed' });
    } catch (error) {
        console.error('Delete legal document error:', error);
        return res.status(500).json({ success: false, message: 'Failed to remove this document' });
    }
});

export default { legalPublicRouter, legalAdminRouter };
