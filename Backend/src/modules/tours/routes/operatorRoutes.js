import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import { getMe, updateMe } from '../controllers/operatorController.js';

const router = express.Router();

router.use(protect);
router.use(authorizedRoles('operator'));

router.get('/me', getMe);
router.put('/me', updateMe);

export default router;
