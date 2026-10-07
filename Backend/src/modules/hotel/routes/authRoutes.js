import express from 'express';
import { adminLogin, getMe, updateProfile, updateAdminProfile, registerPartner, updateFcmToken, uploadDocs, deleteDoc, uploadDocsBase64 } from '../controllers/authController.js';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';
import { uploadDocuments } from '../utils/multer.js';

const router = express.Router();

// Phone + OTP sign-in for guests and partners now lives at /v1/auth/otp
// (audiences 'user' and 'hotel-partner'). Partner registration stays here.
router.post('/partner/register', registerPartner);

// Upload routes for partner registration
// Still reachable before an account exists (the signup wizard uploads KYC
// scans first). optionalProtect identifies a signed-in caller so the storage
// service records them as the uploader, which is what delete-doc checks.
router.post('/partner/upload-docs', optionalProtect, uploadDocuments.array('files', 5), uploadDocs);
router.post('/partner/upload-docs-base64', optionalProtect, uploadDocsBase64); // Flutter camera upload
router.post('/partner/delete-doc', optionalProtect, deleteDoc);

router.post('/admin/login', adminLogin);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/admin/update-profile', protect, updateAdminProfile);
router.put('/update-fcm', protect, updateFcmToken); // New Route

export default router;
