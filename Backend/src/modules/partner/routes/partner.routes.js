/**
 * Cross-business partner endpoints.
 *
 * These are the only routes that answer for both businesses at once, so they
 * accept either module's token. Everything else stays behind each module's own
 * guard, unchanged.
 */
import express from 'express';
import { verifyAccessToken } from '../../../core/auth/token.util.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import { getMyProfiles, addHotelProfile } from '../controllers/partner.controller.js';

const router = express.Router();

/**
 * Accept a restaurant token or a hotel partner token.
 *
 * The two modules sign different claims — {userId, role:'RESTAURANT'} versus
 * {id, role:'partner'} — and the shared authMiddleware reads only `userId`/
 * `sub`, so a partner token would arrive with an empty subject. Read all three
 * spellings here instead of forcing either module to change its token.
 */
export const authenticatePartner = (req, res, next) => {
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    try {
        const decoded = verifyAccessToken(token);
        const subject = decoded.userId || decoded.id || decoded.sub || '';

        if (!subject) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        req.user = { userId: String(subject), role: String(decoded.role || '') };
        return next();
    } catch {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

router.get('/profiles', authenticatePartner, asyncHandler(getMyProfiles));
router.post('/profiles/hotel', authenticatePartner, asyncHandler(addHotelProfile));

export default router;
