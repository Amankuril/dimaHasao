import express from 'express';
import { sendOtp, verifyOtp, verifyPartnerOtp, adminLogin, getMe, updateProfile, updateAdminProfile, registerPartner, updateFcmToken, uploadDocs, deleteDoc, uploadDocsBase64 } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadDocuments } from '../utils/multer.js';

const router = express.Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/partner/register', registerPartner);
router.post('/partner/verify-otp', verifyPartnerOtp);

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
