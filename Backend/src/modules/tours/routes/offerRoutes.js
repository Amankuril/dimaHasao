import express from 'express';
import { getPublicOffers } from '../controllers/offerController.js';

const router = express.Router();

// Public: the booking screen lists usable codes before anyone signs in.
router.get('/', getPublicOffers);

export default router;
