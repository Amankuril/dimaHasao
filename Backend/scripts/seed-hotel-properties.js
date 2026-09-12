/**
 * Seed approved, live hotel properties (with room types) for Dima Hasao.
 *
 * The consumer hotel screens read the real backend, so an empty database looks
 * identical to a broken integration. This gives the customer journey something
 * true to render. Idempotent: re-running updates the same records by name.
 *
 *   node scripts/seed-hotel-properties.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import Property from '../src/modules/hotel/models/Property.js';
import RoomType from '../src/modules/hotel/models/RoomType.js';
import Partner from '../src/modules/hotel/models/Partner.js';

dotenv.config();

const SEED_PARTNER_PHONE = '9000000101';

const IMG = {
  resort: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  homestay: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
  hotel: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  room: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
};

const PROPERTIES = [
  {
    propertyName: 'Haflong Hills Resort & Spa',
    propertyType: 'resort',
    description:
      'Perched on the highest ridge of Haflong with panoramic views of the mist-covered Borail range. Ethnic fine dining, heated showers and tranquil gardens.',
    address: { country: 'India', state: 'Assam', city: 'Haflong', area: 'Upper Bagetar', fullAddress: 'Near Circuit House, Upper Bagetar, Haflong, Dima Hasao, Assam 788819', pincode: '788819' },
    location: { type: 'Point', coordinates: [93.0186, 25.1644] },
    coverImage: IMG.resort,
    propertyImages: [IMG.resort, IMG.homestay, IMG.room],
    amenities: ['wifi', 'parking', 'restaurant', 'hot water', 'power backup', 'bonfire', 'view'],
    checkInTime: '12:00 PM',
    checkOutTime: '11:00 AM',
    cancellationPolicy: 'Free cancellation up to 48 hours before check-in. 50% refund thereafter.',
    houseRules: ['Valid government ID required at check-in', 'No loud music after 10 PM'],
    isFeatured: true,
    avgRating: 4.8,
    totalReviews: 142,
    rooms: [
      { name: 'Valley View Deluxe', inventoryType: 'room', roomCategory: 'double', maxAdults: 2, maxChildren: 1, totalInventory: 6, pricePerNight: 3800, amenities: ['wifi', 'hot water', 'tv'], images: [IMG.room] },
      { name: 'Premium Family Suite', inventoryType: 'room', roomCategory: 'triple', maxAdults: 4, maxChildren: 2, totalInventory: 3, pricePerNight: 5600, amenities: ['wifi', 'hot water', 'tv', 'ac'], images: [IMG.room] },
    ],
  },
  {
    propertyName: 'Jatinga Heritage Homestay',
    propertyType: 'homestay',
    description:
      'A warm family-run homestay in Jatinga village serving authentic Dimasa meals, a short walk from the famous bird-watching point.',
    address: { country: 'India', state: 'Assam', city: 'Jatinga', area: 'Jatinga Village', fullAddress: 'Jatinga Village Road, Jatinga, Dima Hasao, Assam 788819', pincode: '788819' },
    location: { type: 'Point', coordinates: [93.0119, 25.0997] },
    coverImage: IMG.homestay,
    propertyImages: [IMG.homestay, IMG.room],
    amenities: ['wifi', 'parking', 'food', 'hot water'],
    checkInTime: '01:00 PM',
    checkOutTime: '10:00 AM',
    cancellationPolicy: 'Free cancellation up to 24 hours before check-in.',
    houseRules: ['Vegetarian and local cuisine served', 'Please respect quiet hours'],
    avgRating: 4.6,
    totalReviews: 58,
    rooms: [
      { name: 'Traditional Double Room', inventoryType: 'room', roomCategory: 'double', maxAdults: 2, maxChildren: 1, totalInventory: 4, pricePerNight: 1800, amenities: ['wifi', 'hot water'], images: [IMG.room] },
    ],
  },
  {
    propertyName: 'Maibang Riverside Inn',
    propertyType: 'hotel',
    description:
      'Comfortable riverside rooms in Maibang, convenient for the railway station and the historic stone house ruins.',
    address: { country: 'India', state: 'Assam', city: 'Maibang', area: 'Station Road', fullAddress: 'Station Road, Maibang, Dima Hasao, Assam 788831', pincode: '788831' },
    location: { type: 'Point', coordinates: [93.1284, 25.3021] },
    coverImage: IMG.hotel,
    propertyImages: [IMG.hotel, IMG.room],
    amenities: ['wifi', 'parking', 'restaurant', 'tv', 'power backup'],
    checkInTime: '12:00 PM',
    checkOutTime: '11:00 AM',
    cancellationPolicy: 'Free cancellation up to 24 hours before check-in.',
    houseRules: ['Check-in requires valid ID'],
    avgRating: 4.2,
    totalReviews: 31,
    rooms: [
      { name: 'Standard Room', inventoryType: 'room', roomCategory: 'double', maxAdults: 2, maxChildren: 0, totalInventory: 8, pricePerNight: 1400, amenities: ['wifi', 'tv'], images: [IMG.room] },
      { name: 'Riverside Balcony Room', inventoryType: 'room', roomCategory: 'double', maxAdults: 3, maxChildren: 1, totalInventory: 4, pricePerNight: 2200, amenities: ['wifi', 'tv', 'hot water'], images: [IMG.room] },
    ],
  },
];

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);

  let partner = await Partner.findOne({ phone: SEED_PARTNER_PHONE });
  if (!partner) {
    partner = await Partner.create({
      name: 'Dima Hasao Stays (Seed)',
      phone: SEED_PARTNER_PHONE,
      email: 'seed.partner@dimahasao.local',
      password: await bcrypt.hash(`seed:${Date.now()}`, 10),
      role: 'partner',
      isPartner: true,
      isVerified: true,
      partnerApprovalStatus: 'approved',
    });
  }

  for (const { rooms, ...spec } of PROPERTIES) {
    const property = await Property.findOneAndUpdate(
      { propertyName: spec.propertyName },
      {
        ...spec,
        partnerId: partner._id,
        // Both are required for the property to appear in the public list.
        status: 'approved',
        isLive: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await RoomType.deleteMany({ propertyId: property._id });
    for (const room of rooms) {
      await RoomType.create({ ...room, propertyId: property._id, isActive: true });
    }

    console.log(`✓ ${property.propertyName} — ${rooms.length} room type(s)`);
  }

  const live = await Property.countDocuments({ status: 'approved', isLive: true });
  console.log(`\nLive properties now: ${live}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
