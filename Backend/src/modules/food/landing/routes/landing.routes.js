import express from 'express';
import { upload, uploadGallery } from '../../../../middleware/upload.js';
import {
    listHeroBannersController,
    uploadHeroBannersController,
    linkRestaurantsToHeroBannerController,
    deleteHeroBannerController,
    updateHeroBannerOrderController,
    toggleHeroBannerStatusController
} from '../controllers/heroBanner.controller.js';
import {
    listUnder250BannersController,
    uploadUnder250BannersController,
    deleteUnder250BannerController,
    updateUnder250BannerOrderController,
    toggleUnder250BannerStatusController
} from '../controllers/under250Banner.controller.js';
import {
    listDiningBannersController,
    uploadDiningBannersController,
    deleteDiningBannerController,
    updateDiningBannerOrderController,
    toggleDiningBannerStatusController
} from '../controllers/diningBanner.controller.js';
import {
    getAdminLandingSettingsController,
    updateAdminLandingSettingsController
} from '../controllers/landingSettings.controller.js';
import {
    listExploreMoreController,
    createExploreMoreController,
    updateExploreMoreController,
    deleteExploreMoreController,
    toggleExploreMoreStatusController,
    updateExploreMoreOrderController
} from '../controllers/exploreIcon.controller.js';
import {
    getPublicHeroBannersController,
    getPublicUnder250BannersController,
    getPublicDiningBannersController,
    getPublicExploreIconsController,
    getPublicGourmetController,
    getPublicLandingSettingsController
} from '../controllers/publicLanding.controller.js';
import { detectZonePublicController, listZonesPublicController, listZonesNearbyPublicController } from '../controllers/zonePublic.controller.js';
import {
    reverseGeocodePublicController,
    geocodePlacePublicController,
    nearbyPlacesPublicController,
    textSearchPlacesPublicController,
} from '../controllers/geocodePublic.controller.js';
import { getPublicEnvController } from '../controllers/publicEnv.controller.js';
import {
    listGourmetAdmin,
    createGourmetAdmin,
    deleteGourmetAdmin,
    updateGourmetOrderAdmin,
    toggleGourmetStatusAdmin
} from '../controllers/top10GourmetAdmin.controller.js';
import { getPublicPageController } from '../../admin/controllers/pageContent.controller.js';
import { getPublicReferralSettingsController } from '../controllers/publicReferralSettings.controller.js';
import { authMiddleware } from '../../../../core/auth/auth.middleware.js';
import { requireRoles } from '../../../../core/roles/role.middleware.js';
import { enforceAdminFeatureAccess } from '../../../../core/admin/adminFeatureAccess.middleware.js';

const router = express.Router();

/*
 * The landing CMS (hero / under-250 / dining banners, explore-more icons,
 * gourmet picks, landing settings) shares a mount with the public endpoints the
 * user app reads, at /v1/food rather than /v1/food/admin. That is why it never
 * picked up the admin mount's guards: every route below was reachable without a
 * token, so anyone could upload, delete or reorder the storefront.
 *
 * The guard is applied per route rather than with router.use, because the
 * public routes share the /hero-banners prefix and must stay open.
 *
 * enforceAdminFeatureAccess('food') is not applied: its catalogue is keyed on
 * paths under /v1/food/admin and claims no /hero-banners path, so it would
 * refuse every sub-admin. Until the catalogue gains a landing-banners feature,
 * any ADMIN or SUB_ADMIN may manage these.
 */
// The sub-admin feature gate too, or any sub-admin — taxi-only included —
// could manage the food home page. Grant: 'food.landing_banners'.
const adminOnly = [authMiddleware, requireRoles('ADMIN', 'SUB_ADMIN'), enforceAdminFeatureAccess('food')];

// Public CMS pages (About + legal). No auth required.
router.get('/pages/:key', getPublicPageController);
// Public referral settings (no auth required).
router.get('/referral-settings', getPublicReferralSettingsController);

// Admin hero banner management
router.get('/hero-banners', ...adminOnly, listHeroBannersController);
router.post(
    '/hero-banners/multiple',
    ...adminOnly,
    uploadGallery.array('files'),
    uploadHeroBannersController
);
router.delete('/hero-banners/:id', ...adminOnly, deleteHeroBannerController);
router.patch('/hero-banners/:id/order', ...adminOnly, updateHeroBannerOrderController);
router.patch('/hero-banners/:id/status', ...adminOnly, toggleHeroBannerStatusController);
router.patch('/hero-banners/:id/link-restaurants', ...adminOnly, linkRestaurantsToHeroBannerController);

// Admin under 250 banners
router.get('/hero-banners/under-250', ...adminOnly, listUnder250BannersController);
router.post(
    '/hero-banners/under-250/multiple',
    ...adminOnly,
    uploadGallery.array('files'),
    uploadUnder250BannersController
);
router.delete('/hero-banners/under-250/:id', ...adminOnly, deleteUnder250BannerController);
router.patch('/hero-banners/under-250/:id/order', ...adminOnly, updateUnder250BannerOrderController);
router.patch('/hero-banners/under-250/:id/status', ...adminOnly, toggleUnder250BannerStatusController);

// Admin dining banners
router.get('/hero-banners/dining', ...adminOnly, listDiningBannersController);
router.post(
    '/hero-banners/dining/multiple',
    ...adminOnly,
    uploadGallery.array('files'),
    uploadDiningBannersController
);
router.delete('/hero-banners/dining/:id', ...adminOnly, deleteDiningBannerController);
router.patch('/hero-banners/dining/:id/order', ...adminOnly, updateDiningBannerOrderController);
router.patch('/hero-banners/dining/:id/status', ...adminOnly, toggleDiningBannerStatusController);

// Admin Explore More (icons)
router.get('/hero-banners/landing/explore-more', ...adminOnly, listExploreMoreController);
router.post(
    '/hero-banners/landing/explore-more',
    ...adminOnly,
    upload.single('image'),
    createExploreMoreController
);
router.delete('/hero-banners/landing/explore-more/:id', ...adminOnly, deleteExploreMoreController);
router.patch('/hero-banners/landing/explore-more/:id/status', ...adminOnly, toggleExploreMoreStatusController);
router.patch('/hero-banners/landing/explore-more/:id/order', ...adminOnly, updateExploreMoreOrderController);
router.patch(
    '/hero-banners/landing/explore-more/:id',
    ...adminOnly,
    upload.single('image'),
    updateExploreMoreController
);

// Admin Gourmet (hero-banners)
router.get('/hero-banners/gourmet', ...adminOnly, listGourmetAdmin);
router.post('/hero-banners/gourmet', ...adminOnly, createGourmetAdmin);
router.delete('/hero-banners/gourmet/:id', ...adminOnly, deleteGourmetAdmin);
router.patch('/hero-banners/gourmet/:id/order', ...adminOnly, updateGourmetOrderAdmin);
router.patch('/hero-banners/gourmet/:id/status', ...adminOnly, toggleGourmetStatusAdmin);

// Public landing endpoints (Food user app)
router.get('/hero-banners/public', getPublicHeroBannersController);
router.get('/hero-banners/under-250/public', getPublicUnder250BannersController);
router.get('/hero-banners/dining/public', getPublicDiningBannersController);
router.get('/explore-icons/public', getPublicExploreIconsController);
router.get('/hero-banners/gourmet/public', getPublicGourmetController);
router.get('/landing/settings/public', getPublicLandingSettingsController);
router.get('/zones/detect', detectZonePublicController);
router.get('/zones/nearby', listZonesNearbyPublicController);
router.get('/zones/public', listZonesPublicController);
// Geocode proxies — API key stays on the server
router.get('/geocode/reverse', reverseGeocodePublicController);
router.get('/geocode/place', geocodePlacePublicController);
router.post('/geocode/nearby', nearbyPlacesPublicController);
router.post('/geocode/text-search', textSearchPlacesPublicController);
router.get('/public/env', getPublicEnvController);
// Admin landing settings (old paths used by admin UI)
router.get('/hero-banners/landing/settings', ...adminOnly, getAdminLandingSettingsController);
router.patch('/hero-banners/landing/settings', ...adminOnly, updateAdminLandingSettingsController);

export default router;

