import { FoodLandingSettings } from '../models/landingSettings.model.js';
import { deleteStoredAsset } from '../../../../services/storage.service.js';

export const getLandingSettings = async (zoneId = null) => {
    let query = zoneId ? { zoneId } : { zoneId: null };
    let doc = await FoodLandingSettings.findOne(query).lean();
    if (!doc) {
        doc = (await FoodLandingSettings.create(query)).toObject();
    }
    return doc;
};

/*
 * The fields an admin may set. The controller hands over req.body whole, and
 * passing that straight to findOneAndUpdate let a caller write any path —
 * including operators like $unset/$rename, zoneId (moving a document between
 * zones) or _id/timestamps. Anything outside this list is dropped.
 */
const EDITABLE_FIELDS = [
    'exploreMoreHeading',
    'recommendedRestaurantIds',
    'showHeroBanners',
    'showUnder250',
    'showDining',
    'showExploreIcons',
    'showTop10',
    'showGourmet',
    'under250PriceLimit',
    'festBannerImageUrl',
    'festBannerTopColor'
];

const pickEditable = (payload) => {
    const update = {};
    if (!payload || typeof payload !== 'object') return update;
    for (const key of EDITABLE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) update[key] = payload[key];
    }
    return update;
};

export const updateLandingSettings = async (payload, zoneId = null) => {
    let query = zoneId ? { zoneId } : { zoneId: null };
    const oldDoc = await FoodLandingSettings.findOne(query).lean();

    const doc = await FoodLandingSettings.findOneAndUpdate(query, { $set: pickEditable(payload) }, {
        new: true,
        upsert: true,
        runValidators: true
    }).lean();

    // Drop the previous banner file when the URL was cleared or replaced.
    if (oldDoc && oldDoc.festBannerImageUrl && oldDoc.festBannerImageUrl !== doc.festBannerImageUrl) {
        await deleteStoredAsset(oldDoc.festBannerImageUrl);
    }

    return doc;
};

