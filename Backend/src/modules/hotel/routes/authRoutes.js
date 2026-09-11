import express from 'express';
import { adminLogin, getMe, updateProfile, updateAdminProfile, registerPartner, updateFcmToken, uploadDocs, deleteDoc, uploadDocsBase64 } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadDocuments } from '../utils/multer.js';

const router = express.Router();

// Phone + OTP sign-in for guests and partners now lives at /v1/auth/otp
// (audiences 'user' and 'hotel-partner'). Partner registration stays here.
router.post('/partner/register', registerPartner);

// Upload routes for partner registration
router.post('/partner/upload-docs', uploadDocuments.array('files', 5), uploadDocs);
router.post('/partner/upload-docs-base64', uploadDocsBase64); // Flutter camera upload
router.post('/partner/delete-doc', deleteDoc);

router.post('/admin/login', adminLogin);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfile);
router.put('/admin/update-profile', protect, updateAdminProfile);
router.put('/update-fcm', protect, updateFcmToken); // New Route

export default router;
