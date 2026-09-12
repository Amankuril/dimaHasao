import mongoose from 'mongoose';
import Property from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import PropertyCategory from '../models/PropertyCategory.js';
import PropertyDocument from '../models/PropertyDocument.js';
import Partner from '../models/Partner.js';
import { PROPERTY_DOCUMENTS } from '../config/propertyDocumentRules.js';
import emailService from '../services/emailService.js';
import User from '../models/User.js'; // Needed to find Admins? Or Admin model
import Admin from '../models/Admin.js';

/**
 * Normalise and check a seasonal rate list.
 *
 * Overlaps are allowed on purpose — the first match wins at pricing time, so a
 * partner can lay a short festival rate over a broad peak season — but a range
 * that ends before it starts, or a negative rate, is always a mistake.
 */
const validateSeasonalRates = (input) => {
  if (input === null || input === undefined) return { valid: true, rates: [] };
  if (!Array.isArray(input)) return { valid: false, message: 'seasonalRates must be a list' };

  const rates = [];
  for (const [index, raw] of input.entries()) {
    const label = `Season ${index + 1}`;
    const name = String(raw?.name || '').trim();
    if (!name) return { valid: false, message: `${label}: name is required` };

    const startDate = new Date(raw?.startDate);
    const endDate = new Date(raw?.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { valid: false, message: `${label} (${name}): start and end dates are required` };
    }
    if (endDate < startDate) {
      return { valid: false, message: `${label} (${name}): the end date is before the start date` };
    }

    const pricePerNight = Number(raw?.pricePerNight);
    if (!Number.isFinite(pricePerNight) || pricePerNight < 0) {
      return { valid: false, message: `${label} (${name}): a price per night of 0 or more is required` };
    }

    rates.push({
      name,
      startDate,
      endDate,
      pricePerNight,
      isActive: raw?.isActive !== false,
    });
  }

  return { valid: true, rates };
};

const notifyAdminOfNewProperty = async (property) => {
  try {
    const admin = await Admin.findOne({ role: { $in: ['admin', 'superadmin'] } });
    if (admin && admin.email) {
      await emailService.sendAdminNewPropertyEmail(admin.email, property);
    }
  } catch (err) {
    console.warn('Could not notify admin about property:', err.message);
  }
};

export const createProperty = async (req, res) => {
  try {
    const partner = await Partner.findById(req.user._id);
    if (!partner) return res.status(404).json({ message: 'Partner not found' });

    const { propertyName, contactNumber, propertyType, description, shortDescription, coverImage, propertyImages, amenities, address, location, nearbyPlaces, checkInTime, checkOutTime, cancellationPolicy, houseRules, documents, roomTypes, hostLivesOnProperty, familyFriendly, resortType, activities, hotelCategory, starRating, dynamicCategory } = req.body;
    if (!propertyName || !propertyType || !coverImage) return res.status(400).json({ message: 'Missing required fields' });
    const lowerType = propertyType.toLowerCase();
    const requiredDocs = PROPERTY_DOCUMENTS[lowerType] || [];
    const nearbyPlacesArray = Array.isArray(nearbyPlaces) ? nearbyPlaces : [];
    const propertyImagesArray = Array.isArray(propertyImages) ? propertyImages : [];
    const docsArray = Array.isArray(documents) ? documents : [];
    const dynamicCategoryId = dynamicCategory && mongoose.Types.ObjectId.isValid(dynamicCategory) ? new mongoose.Types.ObjectId(dynamicCategory) : undefined;
    const doc = new Property({
      propertyName,
      contactNumber,
      propertyType: lowerType,
      description,
      shortDescription,
      partnerId: req.user._id,
      address,
      location,
      nearbyPlaces: nearbyPlacesArray,
      amenities,
      coverImage,
      propertyImages: propertyImagesArray,
      checkInTime,
      checkOutTime,
      cancellationPolicy,
      houseRules,
      dynamicCategory: dynamicCategoryId,
      hostLivesOnProperty: lowerType === 'homestay' ? hostLivesOnProperty : undefined,
      familyFriendly: lowerType === 'homestay' ? familyFriendly : undefined,
      resortType: lowerType === 'resort' ? resortType : undefined,
      activities: lowerType === 'resort' ? activities : undefined,
      hotelCategory: ['hotel', 'lodge'].includes(lowerType) ? hotelCategory : undefined,
      starRating: ['hotel', 'lodge'].includes(lowerType) ? starRating : undefined
    });
    // Pricing is now handled in RoomType for ALL types
    await doc.save();
    // Inline RoomTypes if provided
    if (Array.isArray(roomTypes) && roomTypes.length > 0) {
      await RoomType.insertMany(
        roomTypes.map(rt => ({
          ...rt,
          propertyId: doc._id,
          isActive: true
        }))
      );
    }

    // Inline documents upsert on create
    if (docsArray.length) {
      await PropertyDocument.findOneAndUpdate(
        { propertyId: doc._id },
        {
          propertyType: lowerType,
          documents: docsArray.map(d => ({
            type: d.type,
            name: d.name || d.type,
            fileUrl: d.fileUrl,
            isRequired: requiredDocs.includes(d.name || d.type),
          })),
          verificationStatus: 'pending',
          adminRemark: undefined,
          verifiedAt: undefined
        },
        { new: true, upsert: true }
      );
      // Move property to pending for admin verification
      doc.status = 'pending';
      doc.isLive = false;
      await doc.save();
    }

    // AUTO-SUBMIT: If room types are provided, we consider it a full submission
    if (Array.isArray(roomTypes) && roomTypes.length > 0 && doc.status === 'draft') {
      doc.status = 'pending';
      await doc.save();
    }

    // NOTIFICATION: Notify Admin only if pending
    if (doc.status === 'pending') {
      notifyAdminOfNewProperty(doc).catch(e => console.error(e));
    }

    res.status(201).json({ success: true, property: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.partnerId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const updatableFields = [
      'propertyName',
      'description',
      'shortDescription',
      'address',
      'location',
      'nearbyPlaces',
      'amenities',
      'coverImage',
      'propertyImages',
      'checkInTime',
      'checkOutTime',
      'cancellationPolicy',
      'houseRules',
      'dynamicCategory',
      'hostLivesOnProperty',
      'familyFriendly',
      'resortType',
      'activities',
      'hotelCategory',
      'starRating',
      'contactNumber',
      'isLive'
    ];

    updatableFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        property[field] = payload[field];
      }
    });

    await property.save();

    // documents update if provided
    if (payload.documents && Array.isArray(payload.documents)) {
      const lowerType = property.propertyType.toLowerCase();
      const requiredDocs = PROPERTY_DOCUMENTS[lowerType] || [];
      await PropertyDocument.findOneAndUpdate(
        { propertyId: property._id },
        {
          propertyType: lowerType,
          documents: payload.documents.map(d => ({
            type: d.type,
            name: d.name || d.type,
            fileUrl: d.fileUrl,
            isRequired: requiredDocs.includes(d.name || d.type),
          })),
          verificationStatus: 'pending',
          adminRemark: undefined,
          verifiedAt: undefined
        },
        { new: true, upsert: true }
      );
      property.status = 'pending';
      await property.save();
    }

    res.json({ success: true, property });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const addRoomType = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { name, inventoryType, roomCategory, maxAdults, maxChildren, bedsPerRoom, totalInventory, pricePerNight, extraAdultPrice, extraChildPrice, securityDeposit, availableFrom, images, amenities } = req.body;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (!pricePerNight) return res.status(400).json({ message: 'pricePerNight required' });

    // Hotels, resorts and lodges sell rooms; a homestay may also be let whole.
    if (['hotel', 'resort', 'lodge'].includes(property.propertyType) && inventoryType !== 'room') {
      return res.status(400).json({ message: `${property.propertyType} must have inventoryType="room"` });
    }

    if (property.propertyType === 'homestay' && !['room', 'entire'].includes(inventoryType)) {
      return res.status(400).json({ message: 'Homestay must have inventoryType="room" or "entire"' });
    }

    const normalizedImages = Array.isArray(images)
      ? images.filter(Boolean)
      : typeof images === 'string'
        ? images.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const rt = await RoomType.create({
      propertyId,
      name,
      inventoryType,
      roomCategory,
      maxAdults,
      maxChildren,
      bedsPerRoom,
      totalInventory,
      pricePerNight,
      extraAdultPrice,
      extraChildPrice,
      securityDeposit,
      availableFrom,
      images: normalizedImages,
      amenities
    });
    res.status(201).json({ success: true, roomType: rt });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateRoomType = async (req, res) => {
  try {
    const { propertyId, roomTypeId } = req.params;
    const payload = req.body;

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.partnerId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const roomType = await RoomType.findOne({ _id: roomTypeId, propertyId });
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });

    const updatableFields = [
      'name',
      'inventoryType',
      'roomCategory',
      'maxAdults',
      'maxChildren',
      'bedsPerRoom',
      'totalInventory',
      'pricePerNight',
      'seasonalRates',
      'extraAdultPrice',
      'extraChildPrice',
      'securityDeposit',
      'images',
      'amenities',
      'isActive'
    ];

    if (Object.prototype.hasOwnProperty.call(payload, 'seasonalRates')) {
      const validation = validateSeasonalRates(payload.seasonalRates);
      if (!validation.valid) return res.status(400).json({ message: validation.message });
      payload.seasonalRates = validation.rates;
    }

    updatableFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        roomType[field] = payload[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(payload, 'images')) {
      if (Array.isArray(payload.images)) {
        roomType.images = payload.images.filter(Boolean);
      } else if (typeof payload.images === 'string') {
        roomType.images = payload.images.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        roomType.images = [];
      }
    }

    if (payload.inventoryType) {
      if (['hotel', 'resort', 'lodge'].includes(property.propertyType) && roomType.inventoryType !== 'room') {
        return res.status(400).json({ message: `${property.propertyType} must have inventoryType="room"` });
      }
      if (property.propertyType === 'homestay' && !['room', 'entire'].includes(roomType.inventoryType)) {
        return res.status(400).json({ message: 'Homestay must have inventoryType="room" or "entire"' });
      }
    }

    await roomType.save();

    res.json({ success: true, roomType });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteRoomType = async (req, res) => {
  try {
    const { propertyId, roomTypeId } = req.params;

    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    if (String(property.partnerId) !== String(req.user._id) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const roomType = await RoomType.findOneAndDelete({ _id: roomTypeId, propertyId });
    if (!roomType) return res.status(404).json({ message: 'Room type not found' });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const upsertDocuments = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const property = await Property.findById(propertyId);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    const required = PROPERTY_DOCUMENTS[property.propertyType] || [];
    const payloadDocs = Array.isArray(req.body.documents) ? req.body.documents : [];
    const doc = await PropertyDocument.findOneAndUpdate(
      { propertyId },
      {
        propertyType: property.propertyType,
        documents: payloadDocs.map(d => ({
          type: d.type,
          name: d.name || d.type,
          fileUrl: d.fileUrl,
          isRequired: required.includes(d.name || d.type)
        })),
        verificationStatus: 'pending',
        adminRemark: undefined,
        verifiedAt: undefined
      },
      { new: true, upsert: true }
    );
    const wasDraft = property.status === 'draft';
    property.status = 'pending';
    property.isLive = false;
    await property.save();

    if (wasDraft) {
      notifyAdminOfNewProperty(property).catch(e => console.error(e));
    }

    res.json({ success: true, property, propertyDocument: doc });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getPublicProperties = async (req, res) => {
  try {
    const {
      search,
      type,
      minPrice,
      maxPrice,
      amenities,
      lat,
      lng,
      radius = 50, // default 50km
      guests,
      sort
    } = req.query;

    const pipeline = [];

    // 1. Geospatial Search (Must be first if used)
    if (lat && lng) {
      pipeline.push({
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distance",
          maxDistance: parseFloat(radius) * 1000, // convert km to meters
          spherical: true,
          query: { status: 'approved', isLive: true }
        }
      });
    } else {
      // Basic match if no geo
      pipeline.push({ $match: { status: 'approved', isLive: true } });
    }

    // 2. Text/Filter Match
    const matchConditions = {};

    if (type && type !== 'all') {
      const typesList = type.split(',').map(t => t.trim()).filter(Boolean);

      const dynamicTypes = typesList.filter(t => mongoose.Types.ObjectId.isValid(t));
      const staticTypes = typesList.filter(t => !mongoose.Types.ObjectId.isValid(t)).map(t => t.toLowerCase());

      if (dynamicTypes.length > 0 && staticTypes.length > 0) {
        matchConditions.$or = [
          { propertyType: { $in: staticTypes } },
          { dynamicCategory: { $in: dynamicTypes.map(id => new mongoose.Types.ObjectId(id)) } }
        ];
      } else if (dynamicTypes.length > 0) {
        const categoryIds = dynamicTypes.map(id => new mongoose.Types.ObjectId(id));
        const categories = await PropertyCategory.find({ _id: { $in: categoryIds } }).select('displayName name').lean();
        // A category whose name matches a built-in type also matches properties
        // that carry that propertyType but no dynamicCategory.
        const STATIC_TYPES = ['hotel', 'resort', 'homestay', 'lodge'];
        const fallbackPropertyTypes = new Set();
        for (const cat of categories) {
          const dn = (cat.displayName || cat.name || '').toLowerCase();
          if (STATIC_TYPES.includes(dn)) fallbackPropertyTypes.add(dn);
        }
        const fallbackList = [...fallbackPropertyTypes];
        if (fallbackList.length > 0) {
          matchConditions.$or = [
            { dynamicCategory: { $in: categoryIds } },
            { $and: [{ $or: [{ dynamicCategory: null }, { dynamicCategory: { $exists: false } }] }, { propertyType: { $in: fallbackList } }] }
          ];
        } else {
          // If no categories found and we can't determine type, just match by dynamicCategory
          matchConditions.dynamicCategory = { $in: categoryIds };
        }
      } else if (staticTypes.length > 0) {
        matchConditions.propertyType = { $in: staticTypes };
      }
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      const searchOr = [
        { propertyName: regex },
        { "address.city": regex },
        { "address.area": regex },
        { "address.fullAddress": regex }
      ];

      if (matchConditions.$or) {
        matchConditions.$and = [
          { $or: matchConditions.$or },
          { $or: searchOr }
        ];
        delete matchConditions.$or;
      } else {
        matchConditions.$or = searchOr;
      }
    }

    if (amenities) {
      const amList = Array.isArray(amenities) ? amenities : amenities.split(',');
      if (amList.length > 0) {
        matchConditions.amenities = { $all: amList };
      }
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // 3. Lookup Room Types (For Price & Guest Capacity)
    // Use dynamic collection name for robustness
    const roomTypeCollection = RoomType.collection.name;

    pipeline.push({
      $lookup: {
        from: roomTypeCollection,
        localField: '_id',
        foreignField: 'propertyId',
        as: 'roomTypes'
      }
    });

    // 4. Filter Active Room Types & Guest Capacity
    let roomFilter = { $eq: ['$$rt.isActive', true] };

    if (guests) {
      const guestCount = parseInt(guests);
      // Room must accommodate guests (base adults + children? simplified to maxAdults for now)
      // Usually users search by "2 adults", so check maxAdults
      roomFilter = {
        $and: [
          { $eq: ['$$rt.isActive', true] },
          { $gte: ['$$rt.maxAdults', guestCount] }
        ]
      };
    }

    pipeline.push({
      $addFields: {
        roomTypes: {
          $filter: {
            input: '$roomTypes',
            as: 'rt',
            cond: roomFilter
          }
        }
      }
    });

    // 5. Calculate Starting Price (Min Price of valid rooms)
    pipeline.push({
      $addFields: {
        startingPrice: {
          $cond: {
            if: { $gt: [{ $size: "$roomTypes" }, 0] },
            then: { $min: "$roomTypes.pricePerNight" },
            else: null // Will filter out properties with no matching rooms later if strictly needed
          }
        },
        hasMatchingRooms: { $gt: [{ $size: "$roomTypes" }, 0] }
      }
    });

    // 6. Filter by Price Range
    const priceMatch = {};

    // Only require rooms if filtering by price or guests
    if (minPrice || maxPrice || guests) {
      priceMatch.hasMatchingRooms = true;
    }

    if (minPrice) {
      priceMatch.startingPrice = { ...priceMatch.startingPrice, $gte: parseInt(minPrice) };
    }
    if (maxPrice) {
      priceMatch.startingPrice = { ...priceMatch.startingPrice, ...(priceMatch.startingPrice || {}), $lte: parseInt(maxPrice) };
    }

    if (Object.keys(priceMatch).length > 0) {
      pipeline.push({ $match: priceMatch });
    }

    // 7. Sorting
    let sortStage = { createdAt: -1 }; // Newest first
    if (sort) {
      if (sort === 'newest') sortStage = { createdAt: -1 };
      if (sort === 'price_low') sortStage = { startingPrice: 1, createdAt: -1 };
      if (sort === 'price_high') sortStage = { startingPrice: -1, createdAt: -1 };
      if (sort === 'rating') sortStage = { avgRating: -1, createdAt: -1 };
      if (sort === 'distance' && lat && lng) sortStage = { distance: 1, createdAt: -1 };
    }

    pipeline.push({ $sort: sortStage });

    // Execute
    const list = await Property.aggregate(pipeline);
    res.json(list);

  } catch (e) {
    console.error("Error in getPublicProperties:", e);
    res.status(500).json({ message: e.message });
  }
};

export const getMyProperties = async (req, res) => {
  try {
    const query = { partnerId: req.user._id, status: { $ne: 'draft' } };
    if (req.query.type) {
      query.propertyType = String(req.query.type).toLowerCase();
    }
    const properties = await Property.find(query).sort({ createdAt: -1 });
    res.json({ success: true, properties });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getPropertyDetails = async (req, res) => {
  try {
    const { id } = req.params;
    // /:id is the last route on this router, so a stale path (a removed
    // endpoint, a typo) lands here. Answer 404 rather than a cast error 500.
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Property not found' });
    }
    const property = await Property.findById(id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    const roomTypes = await RoomType.find({ propertyId: id, isActive: true });
    const documents = await PropertyDocument.findOne({ propertyId: id });
    res.json({ property, roomTypes, documents });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    // Ensure the property belongs to the logged-in partner
    const property = await Property.findOne({ _id: propertyId, partnerId: req.user._id });

    if (!property) {
      return res.status(404).json({ message: 'Property not found or unauthorized' });
    }

    // Delete associated room types
    await RoomType.deleteMany({ propertyId });

    // Delete associated documents
    await PropertyDocument.deleteMany({ propertyId });

    // Delete the property
    await Property.findByIdAndDelete(propertyId);

    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ message: 'Failed to delete property' });
  }
};
