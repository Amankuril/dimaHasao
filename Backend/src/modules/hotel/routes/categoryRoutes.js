import express from 'express';
import {
    getActiveCategories,
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories
} from '../controllers/categoryController.js';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveCategories);

// Admin routes - Protected
// Using the same middleware pattern as adminRoutes
router.use('/all', protect, authorizedRoles('admin', 'superadmin'));
router.get('/all', getAllCategories);

router.post('/', protect, authorizedRoles('admin', 'superadmin'), createCategory);
router.put('/reorder', protect, authorizedRoles('admin', 'superadmin'), reorderCategories); // Put specific routes before parameter routes
router.put('/:id', protect, authorizedRoles('admin', 'superadmin'), updateCategory);
router.delete('/:id', protect, authorizedRoles('admin', 'superadmin'), deleteCategory);

export default router;
