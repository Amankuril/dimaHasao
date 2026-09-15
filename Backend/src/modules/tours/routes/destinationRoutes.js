import express from 'express';
import { getPublicDestinations, getDestinationDetail } from '../controllers/destinationController.js';

const router = express.Router();

// Public: the tourism directory. Admin management lives under /admin.
router.get('/', getPublicDestinations);
router.get('/:id', getDestinationDetail);

export default router;
