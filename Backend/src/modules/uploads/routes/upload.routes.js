import express from 'express';
import { upload } from '../../../middleware/upload.js';
import { authMiddleware } from '../../../core/auth/auth.middleware.js';
import UploadedAsset from '../../../core/uploads/asset.model.js';
import { config } from '../../../config/env.js';
import {
    storeImageBuffer,
    storeFileBuffer,
    deleteStoredAsset,
    extractAssetUrl,
} from '../../../services/storage.service.js';

const router = express.Router();

const requireInternalSecret = (req, res, next) => {
    const expected = String(config.uploadInternalSecret || '').trim();
    const provided = String(req.get('X-Upload-Secret') || '').trim();
    if (!expected || !provided || provided !== expected) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized upload',
        });
    }
    return next();
};

/**
 * Remember who uploaded this, so a later delete can be scoped to them.
 *
 * Best-effort: a file that stored correctly should not fail the request because
 * the ownership row did not write. An asset with no row falls back to
 * admin-only deletion, which is the safe direction.
 */
const recordAsset = async (req, stored, folder) => {
    const publicId = stored.public_id || stored.filename;
    if (!publicId) return;

    try {
        await UploadedAsset.findOneAndUpdate(
            { publicId },
            {
                publicId,
                url: stored.url || stored.secure_url,
                folder,
                uploadedBy: req.user?.userId || req.user?._id || null,
                uploaderRole: req.user?.role || null,
                mimeType: req.file?.mimetype,
                bytes: stored.bytes || req.file?.size,
                originalName: req.file?.originalname,
            },
            { upsert: true, new: true },
        );
    } catch (error) {
        console.error('Could not record asset ownership:', error.message);
    }
};

/**
 * Who may delete a stored asset.
 *
 * The uploader, or an admin. An asset with no ownership row predates this
 * record — those are admin-only, rather than open to anyone with a session.
 */
const canDeleteAsset = async (req, url) => {
    const role = String(req.user?.role || '').toUpperCase();
    if (['ADMIN', 'SUB_ADMIN', 'SUPERADMIN'].includes(role)) return true;

    const filename = String(url).split('/').pop();
    const asset = await UploadedAsset.findOne({
        $or: [{ publicId: filename }, { publicId: filename.replace(/\.[^.]+$/, '') }, { url }],
    }).lean();

    if (!asset) return false;
    const caller = String(req.user?.userId || req.user?._id || '');
    return Boolean(caller) && String(asset.uploadedBy) === caller;
};

const isImageUpload = (file) => {
    const mime = String(file?.mimetype || '').toLowerCase();
    if (mime.startsWith('image/')) return true;
    const name = String(file?.originalname || '').toLowerCase();
    return /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|avif)$/i.test(name);
};

/*
 * Uploading and deleting both require a signed-in principal.
 *
 * Neither did. `POST /image` was annotated "auth may be added at caller" and
 * never was, so anyone on the internet could write files into the platform's
 * storage; `DELETE /` took a URL and removed it with no credentials at all,
 * which is every restaurant photo, property image, festival banner and KYC
 * document on the platform, deletable by a stranger who knows a URL.
 *
 * Any authenticated principal is allowed, because uploads come from consumers,
 * vendors and admins alike. Deletion is not yet ownership-scoped — uploads do
 * not record who made them — so an authenticated user who knows another's URL
 * can still remove it. That needs an owner on the asset and is noted rather
 * than half-built here.
 *
 * Attached per route rather than to the router: the /internal pair below
 * authenticates with a shared secret instead of a bearer token.
 */
// POST /v1/uploads/image
router.post('/image', authMiddleware, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'No file provided',
            });
        }

        const folder =
            typeof req.body?.folder === 'string' && req.body.folder.trim()
                ? req.body.folder.trim()
                : 'uploads';

        const stored = await storeImageBuffer(req.file.buffer, folder, {
            mimeType: req.file.mimetype,
            originalName: req.file.originalname,
            replaceUrl: extractAssetUrl(req.body?.replaceUrl),
        });

        await recordAsset(req, stored, folder);

        return res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                url: stored.url || stored.secure_url,
                publicId: stored.public_id || stored.filename || null,
                format: stored.format || 'webp',
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /v1/uploads/internal — local/dev backends forward here so files land on live /var/www/uploads
router.post('/internal', requireInternalSecret, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'No file provided',
            });
        }

        const folder =
            typeof req.body?.folder === 'string' && req.body.folder.trim()
                ? req.body.folder.trim()
                : 'uploads';
        const replaceUrl = extractAssetUrl(req.body?.replaceUrl);

        const stored = isImageUpload(req.file)
            ? await storeImageBuffer(req.file.buffer, folder, {
                  mimeType: req.file.mimetype,
                  originalName: req.file.originalname,
                  replaceUrl,
              })
            : await storeFileBuffer(req.file.buffer, folder, req.file.originalname, {
                  mimeType: req.file.mimetype,
                  replaceUrl,
              });

        return res.status(200).json({
            success: true,
            data: {
                url: stored.url || stored.secure_url,
                secure_url: stored.url || stored.secure_url,
                public_id: stored.public_id || stored.filename || null,
                filename: stored.filename,
                format: stored.format,
                bytes: stored.bytes,
                width: stored.width,
                height: stored.height,
                resource_type: stored.resource_type || (isImageUpload(req.file) ? 'image' : 'raw'),
            },
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /v1/uploads/internal
router.delete('/internal', requireInternalSecret, async (req, res, next) => {
    try {
        const url = extractAssetUrl(req.body?.url || req.body?.replaceUrl);
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'url is required',
            });
        }
        const deleted = await deleteStoredAsset(url);
        return res.status(200).json({
            success: true,
            data: { deleted },
        });
    } catch (error) {
        next(error);
    }
});

// DELETE /v1/uploads — app/web delete (food + taxi); removes file from /var/www/uploads
router.delete('/', authMiddleware, async (req, res, next) => {
    try {
        const url = extractAssetUrl(req.body?.url || req.body?.replaceUrl || req.query?.url);
        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'url is required',
            });
        }

        if (!(await canDeleteAsset(req, url))) {
            // 404 rather than 403: whether a file exists is not something to
            // confirm to someone who may not touch it.
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }

        const deleted = await deleteStoredAsset(url);
        await UploadedAsset.deleteOne({ url }).catch(() => {});
        return res.status(200).json({
            success: true,
            data: { deleted },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
