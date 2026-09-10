import express from 'express';
import { protect, authorizedRoles } from '../middlewares/authMiddleware.js';
import {
  createProperty,
  updateProperty,
  addRoomType,
  updateRoomType,
  deleteRoomType,
  upsertDocuments,
  getPublicProperties,
  getPropertyDetails,
  getMyProperties,
  deleteProperty,
  revealContact,
  getRecommendedSellers
} from '../controllers/propertyController.js';

const router = express.Router();

router.get('/', getPublicProperties);
router.get('/recommended-sellers', getRecommendedSellers);
router.get('/my', protect, authorizedRoles('partner', 'admin'), getMyProperties);
router.get('/:id/reveal-contact', revealContact);
router.get('/:id', getPropertyDetails);

router.post('/', protect, authorizedRoles('partner', 'admin'), createProperty);
router.put('/:id', protect, authorizedRoles('partner', 'admin'), updateProperty);
router.delete('/:id', protect, authorizedRoles('partner', 'admin'), deleteProperty);
router.post('/:propertyId/room-types', protect, authorizedRoles('partner', 'admin'), addRoomType);
router.put('/:propertyId/room-types/:roomTypeId', protect, authorizedRoles('partner', 'admin'), updateRoomType);
router.delete('/:propertyId/room-types/:roomTypeId', protect, authorizedRoles('partner', 'admin'), deleteRoomType);
router.post('/:propertyId/documents', protect, authorizedRoles('partner', 'admin'), upsertDocuments);

export default router;
