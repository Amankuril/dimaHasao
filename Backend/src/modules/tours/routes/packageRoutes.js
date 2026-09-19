import express from 'express';
import { getPublicPackages, getPackageDetail } from '../controllers/packageController.js';

const router = express.Router();

/*
 * Public only. Tours are single-vendor now, so creating and editing a package
 * is an admin job and lives under /v1/tours/admin/packages — there is no
 * vendor to own a package here.
 */
router.get('/', getPublicPackages);
router.get('/:id', getPackageDetail);

export default router;
