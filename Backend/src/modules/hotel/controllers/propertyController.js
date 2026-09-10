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
    // --- SUBSCRIPTION GUARD: Check if partner can add more properties ---
    const partner = await Partner.findById(req.user._id).populate('subscription.planId');
    if (!partner) return res.status(404).json({ message: 'Partner not found' });

    const { subscription } = partner;

    // Check if subscription is active and not expired
    const isSubscriptionActive =
      subscription?.status === 'active' &&
      subscription?.expiryDate &&
      new Date(subscription.expiryDate) > new Date();

    // LOGIC UPDATE: Revenue Strategy & No Subscription Case
    // If no active subscription, we allow property creation (Commission-based model).
    // If active subscription, we enforce the plan's property limit.

    let maxAllowed = 1; // Default limit for non-subscribed users (or could be unlimited based on business rule)
    // The requirement says "Agar partner koi plan purchase nahi karta: Vo properties add kar sakta hai".
    // We'll set a reasonable default or unlimited. Let's assume unlimited for commission-only, 
    // BUT usually systems have a free tier limit. 
    // If "No Subscription" means "Pay Per Booking", maybe they can add unlimited but pay higher commission.
    // However, to avoid spam, let's keep it open or check if business requires a strict limit.
    // Logic: If subscription active -> use plan limit. If not -> Unrestricted (or high limit).

    if (isSubscriptionActive) {
      maxAllowed = subscription.planId?.maxProperties || 1;
    } else {
      // No subscription / Expired
      // "Vo properties add kar sakta hai" -> Allow.
      // We set a high number or skip the check.
      maxAllowed = 9999;
    }

    // REMOVED THE BLOCKING GUARD to support "No Subscription Case"
    /* 
    if (!isSubscriptionActive) {
      return res.status(403).json({
        message: 'No active subscription. Please purchase a subscription plan to add properties.',
        requiresSubscription: true
      });
    } 
    */

    // Check if partner has reached property limit
    const currentPropertyCount = await Property.countDocuments({
      partnerId: req.user._id,
      status: { $ne: 'deleted' } // Don't count deleted properties
    });

    // maxAllowed is already determined above based on subscription status

    if (currentPropertyCount >= maxAllowed) {
      return res.status(403).json({
        message: `Property limit reached. Your plan allows ${maxAllowed} properties. Please upgrade your subscription.`,
        limitReached: true,
        currentCount: currentPropertyCount,
        maxAllowed: maxAllowed
      });
    }

    const { propertyName, contactNumber, propertyType, description, shortDescription, coverImage, propertyImages, amenities, address, location, nearbyPlaces, checkInTime, checkOutTime, cancellationPolicy, houseRules, documents, roomTypes, pgType, hostelType, hostLivesOnProperty, familyFriendly, resortType, activities, hotelCategory, starRating, dynamicCategory, pgDetails, rentDetails, plotDetails, buyDetails } = req.body;
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
      pgType: lowerType === 'pg' ? pgType : undefined,
      pgDetails: lowerType === 'pg' ? pgDetails : undefined,
      hostelType: lowerType === 'hostel' ? hostelType : undefined,
      hostLivesOnProperty: lowerType === 'homestay' ? hostLivesOnProperty : undefined,
      familyFriendly: lowerType === 'homestay' ? familyFriendly : undefined,
      resortType: lowerType === 'resort' ? resortType : undefined,
      activities: lowerType === 'resort' ? activities : undefined,
      hotelCategory: lowerType === 'hotel' ? hotelCategory : undefined,
      starRating: lowerType === 'hotel' ? starRating : undefined,
      rentDetails: lowerType === 'rent' ? rentDetails : undefined,
      plotDetails: lowerType === 'plot' ? plotDetails : undefined,
      buyDetails: lowerType === 'buy' ? buyDetails : undefined
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

    // INCREMENT SUBSCRIPTION COUNTER: Update propertiesAdded count
    partner.subscription.propertiesAdded = (partner.subscription.propertiesAdded || 0) + 1;
    await partner.save();

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
      'pgType',
      'pgDetails',
      'rentDetails',
      'plotDetails',
      'buyDetails',
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

    // For Villa, inventoryType must be 'entire'
    if (property.propertyType === 'villa' && inventoryType !== 'entire') {
      return res.status(400).json({ message: 'Villa must have inventoryType="entire"' });
    }

    if (property.propertyType === 'hotel' && inventoryType !== 'room') {
      return res.status(400).json({ message: 'Hotel must have inventoryType="room"' });
    }

    if (property.propertyType === 'resort' && inventoryType !== 'room') {
      return res.status(400).json({ message: 'Resort must have inventoryType="room"' });
    }

    // For Hostel, inventoryType must be 'bed'
    if (property.propertyType === 'hostel' && inventoryType !== 'bed') {
      return res.status(400).json({ message: 'Hostel must have inventoryType="bed"' });
    }

    // For PG, inventoryType must be 'bed'
    if (property.propertyType === 'pg' && inventoryType !== 'bed') {
      return res.status(400).json({ message: 'PG must have inventoryType="bed"' });
    }

    if (property.propertyType === 'tent' && inventoryType !== 'tent') {
      return res.status(400).json({ message: 'Tent/Campsite must have inventoryType="tent"' });
    }

    // For Homestay, inventoryType can be 'room' or 'entire'
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
      'extraAdultPrice',
      'extraChildPrice',
      'images',
      'amenities',
      'isActive'
    ];

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
      if (property.propertyType === 'villa' && roomType.inventoryType !== 'entire') {
        return res.status(400).json({ message: 'Villa must have inventoryType="entire"' });
      }
      if (property.propertyType === 'hotel' && roomType.inventoryType !== 'room') {
        return res.status(400).json({ message: 'Hotel must have inventoryType="room"' });
      }
      if (property.propertyType === 'resort' && roomType.inventoryType !== 'room') {
        return res.status(400).json({ message: 'Resort must have inventoryType="room"' });
      }
      if (property.propertyType === 'hostel' && roomType.inventoryType !== 'bed') {
        return res.status(400).json({ message: 'Hostel must have inventoryType="bed"' });
      }
      if (property.propertyType === 'pg' && roomType.inventoryType !== 'bed') {
        return res.status(400).json({ message: 'PG must have inventoryType="bed"' });
      }
      if (property.propertyType === 'tent' && roomType.inventoryType !== 'tent') {
        return res.status(400).json({ message: 'Tent/Campsite must have inventoryType="tent"' });
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
      sort,
      // Rent specific
      bhkType,
      furnishing,
      // PG specific
      gender,
      occupancy,
      // Plot specific
      landType
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
        const fallbackPropertyTypes = new Set();
        let hasPgCoLivingCategory = false;
        for (const cat of categories) {
          const dn = (cat.displayName || cat.name || '').toLowerCase();
          if (dn === 'pg' || dn === 'hostel' || dn === 'pg/co-living' || dn === 'co-living' || dn === 'pg/co-livinig') {
            fallbackPropertyTypes.add('pg').add('hostel');
            hasPgCoLivingCategory = true;
          }
          else if (dn === 'villa') fallbackPropertyTypes.add('villa');
          else if (dn === 'hotel') fallbackPropertyTypes.add('hotel');
          else if (dn === 'resort') fallbackPropertyTypes.add('resort');
          else if (dn === 'homestay') fallbackPropertyTypes.add('homestay');
          else if (dn === 'tent' || dn === 'plot' || dn === 'plots') fallbackPropertyTypes.add('tent');
        }
        const fallbackList = [...fallbackPropertyTypes];
        // Always add fallback for PG/Co-living if we detected it, or if categories not found but IDs were sent
        // This ensures properties with dynamicCategory null but propertyType pg/hostel still show
        if (fallbackList.length > 0 || hasPgCoLivingCategory) {
          // If we have PG/Co-living categories but fallbackList is empty (shouldn't happen), add pg/hostel anyway
          if (hasPgCoLivingCategory && fallbackList.length === 0) {
            fallbackList.push('pg', 'hostel');
          }
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

    // 2.1 Property Specific Filters
    if (bhkType) {
      const bhkList = bhkType.split(',').map(t => new RegExp(`^${t.trim()}$`, 'i'));
      matchConditions['rentDetails.type'] = { $in: bhkList };
    }
    if (furnishing) {
      const furnishList = furnishing.split(',').map(f => new RegExp(`^${f.trim()}$`, 'i'));
      matchConditions['rentDetails.furnishing'] = { $in: furnishList };
    }
    if (gender) {
      const genderList = gender.split(',').map(g => new RegExp(`^${g.trim()}$`, 'i'));
      // Check both pgType (old) and pgDetails.gender (new)
      const genderMatch = {
        $or: [
          { pgType: { $in: genderList } },
          { 'pgDetails.gender': { $in: genderList } }
        ]
      };

      if (matchConditions.$and) {
        matchConditions.$and.push(genderMatch);
      } else if (matchConditions.$or) {
        // If we have a global $or (from search), we must move it to $and to keep boolean logic correct
        const existingOr = matchConditions.$or;
        delete matchConditions.$or;
        matchConditions.$and = [{ $or: existingOr }, genderMatch];
      } else {
        // No search/other $or, just use genderMatch $or
        matchConditions.$or = genderMatch.$or;
      }
    }
    if (occupancy) {
      const occList = occupancy.split(',').map(o => new RegExp(`^${o.trim()}$`, 'i'));
      matchConditions['pgDetails.occupancy'] = { $in: occList };
    }
    if (landType) {
      const landList = landType.split(',').map(l => new RegExp(`^${l.trim()}$`, 'i'));
      matchConditions['plotDetails.landType'] = { $in: landList };
    }

    if (req.query.foodIncluded === 'true') {
      matchConditions['$or'] = matchConditions['$or'] || [];
      matchConditions['$or'].push(
        { 'pgDetails.foodIncluded.breakfast': true },
        { 'pgDetails.foodIncluded.lunch': true },
        { 'pgDetails.foodIncluded.dinner': true }
      );
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // --- SUBSCRIPTION RANKING BOOST ---
    pipeline.push(
      {
        $lookup: {
          from: 'partners',
          localField: 'partnerId',
          foreignField: '_id',
          as: 'partner'
        }
      },
      { $unwind: { path: '$partner', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'partner.subscription.planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          rankingWeight: { $ifNull: ['$plan.rankingWeight', 0] },
          hasVerifiedTag: { $ifNull: ['$plan.hasVerifiedTag', false] }
        }
      }
    );

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
    let sortStage = { rankingWeight: -1, createdAt: -1 }; // Priority: Weight then Newest
    if (sort) {
      if (sort === 'newest') sortStage = { rankingWeight: -1, createdAt: -1 };
      if (sort === 'price_low') sortStage = { startingPrice: 1, rankingWeight: -1 };
      if (sort === 'price_high') sortStage = { startingPrice: -1, rankingWeight: -1 };
      if (sort === 'rating') sortStage = { avgRating: -1, rankingWeight: -1 };
      if (sort === 'distance' && lat && lng) sortStage = { distance: 1, rankingWeight: -1 };
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

/**
 * @desc    Get Property Contact Details (Enforces Lead Capping)
 * @route   GET /api/properties/:id/reveal-contact
 * @access  Public (Optional Login)
 */
export const revealContact = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findById(id).populate({
      path: 'partnerId',
      populate: { path: 'subscription.planId' }
    });

    if (!property) return res.status(404).json({ message: 'Property not found' });

    const partner = property.partnerId;
    if (!partner) return res.status(404).json({ message: 'Partner details missing' });

    const sub = partner.subscription;
    const plan = sub?.planId;

    // Check if partner is active and has a plan
    if (sub?.status === 'active' && plan) {
      // Logic for Silver Tier Lead Capping
      if (plan.tier === 'silver' && plan.leadCap > 0) {
        if ((sub.leadsUsedThisMonth || 0) >= plan.leadCap) {
          return res.status(403).json({
            success: false,
            message: 'Partner lead limit reached. Try another property.',
            limitReached: true
          });
        }
      }

      // Increment leads count
      partner.subscription.leadsUsedThisMonth = (sub.leadsUsedThisMonth || 0) + 1;
      await partner.save();
    }

    res.json({
      success: true,
      contactNumber: property.contactNumber
    });

  } catch (error) {
    console.error('Reveal Contact Error:', error);
    res.status(500).json({ message: 'Failed to reveal contact' });
  }
};

/**
 * @desc    Get Recommended Sellers (Partners with Premium Plans & High Activity)
 * @route   GET /api/properties/recommended-sellers
 * @access  Public
 */
export const getRecommendedSellers = async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          partnerApprovalStatus: 'approved',
          'subscription.status': 'active'
        }
      },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'subscription.planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      { $unwind: '$plan' },
      // Sort by rankingWeight (Diamond=5, etc.) then by creation date
      { $sort: { 'plan.rankingWeight': -1, createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: 'partnerId',
          pipeline: [{ $match: { status: 'approved', isLive: true } }],
          as: 'activeProperties'
        }
      },
      {
        $addFields: {
          totalListings: { $size: '$activeProperties' },
          experienceYears: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), '$partnerSince'] },
                1000 * 60 * 60 * 24 * 365
              ]
            }
          }
        }
      },
      {
        $project: {
          password: 0,
          otp: 0,
          otpExpires: 0,
          fcmTokens: 0,
          aadhaarNumber: 0,
          aadhaarFront: 0,
          aadhaarBack: 0,
          panNumber: 0,
          panCardImage: 0,
          activeProperties: 0,
          'subscription.transactionId': 0
        }
      }
    ];

    const partners = await Partner.aggregate(pipeline);
    res.json(partners);
  } catch (err) {
    console.error('getRecommendedSellers error:', err);
    res.status(500).json({ message: err.message });
  }
};

