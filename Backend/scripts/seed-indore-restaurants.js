/**
 * Seed three browsable Indore restaurants, with real photos and menus.
 *
 * Images are fetched from Wikimedia Commons at run time and pushed through the
 * platform's own uploader (services/storage.service.js), so they land wherever
 * that deployment keeps uploads — Backend/uploads locally, /var/www/uploads
 * under NODE_ENV=production — and come out as WebP like every other upload.
 *
 * RUN THIS ON THE SERVER THAT SERVES THE IMAGES. The documents are written to
 * whatever MONGODB_URI points at, but the image *files* are written to the
 * local disk of whoever runs it. Seeding from a laptop against the production
 * database leaves rows pointing at files that only exist on the laptop.
 *
 * Stored URLs are relative ("/uploads/x.webp") rather than what the uploader
 * returns, because buildAssetUrl prefixes ASSET_BASE_URL — which is
 * http://localhost:5000 in a dev .env, and that is how the existing
 * "Aman Restro" row ended up with a localhost image URL in production.
 *
 * Usage (from Backend/):
 *   node scripts/seed-indore-restaurants.js
 *
 * Idempotent: restaurants are matched on ownerPhone and menus are rebuilt, so
 * re-running refreshes the images and leaves no duplicates.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

import { storeImageBuffer } from "../src/services/storage.service.js";

dotenv.config();

const ZONE_NAME = /^indore$/i;
const CITY = "Indore";
const STATE = "Madhya Pradesh";
const COUNTRY_CODE = "+91";
const USER_AGENT = "dima-hasao-seed/1.0 (+https://tourismdimahasao.in)";

/** Wikimedia Commons file → bytes. All CC-licensed, all verified to resolve. */
const commonsUrl = (file) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=1200`;

const RESTAURANTS = [
  {
    ownerPhone: "9111100001",
    restaurantName: "Sarafa Bazaar Chaat House",
    ownerName: "Rakesh Agrawal",
    ownerEmail: "sarafa.chaat@example.com",
    area: "Sarafa Bazaar",
    addressLine1: "Shop 14, Sarafa Bazaar, Rajwada",
    pincode: "452002",
    landmark: "Near Rajwada Palace",
    cuisines: ["Street Food", "Chaat", "Snacks"],
    pureVegRestaurant: true,
    openingTime: "18:00",
    closingTime: "02:00",
    rating: 4.6,
    totalRatings: 1284,
    deliveryMinutes: 28,
    offer: "20% OFF up to ₹80",
    latitude: 22.717700,
    longitude: 75.854500,
    coverFile: "Bhalla Papri Chaat with saunth chutney.jpg",
    profileFile: "Aloo Tikki 2.jpg",
    featuredDish: "Bhalla Papri Chaat",
    menu: [
      { name: "Aloo Tikki", price: 60, foodType: "Veg", file: "Aloo Tikki 2.jpg", categoryName: "Chaat", description: "Crisp potato patties griddled in ghee, served with chutneys.", recommended: true },
      { name: "Bhalla Papri Chaat", price: 90, foodType: "Veg", file: "Bhalla Papri Chaat with saunth chutney.jpg", categoryName: "Chaat", description: "Dahi bhalla with papri, saunth chutney and pomegranate.", recommended: true },
      { name: "Pav Bhaji", price: 120, foodType: "Veg", file: "Pav Bhaji.jpg", categoryName: "Main Course", description: "Buttery mashed vegetable bhaji with toasted pav." },
      { name: "Jalebi", price: 70, foodType: "Veg", file: "Jalebi PK013.jpg", categoryName: "Desserts", description: "Hot saffron jalebi, fried to order." },
      { name: "Lassi", price: 80, foodType: "Veg", file: "Lassi with malai and barfi.jpg", categoryName: "Beverages", description: "Thick sweet lassi topped with malai." },
    ],
  },
  {
    ownerPhone: "9111100002",
    restaurantName: "56 Dukan Poha & Jalebi",
    ownerName: "Sunita Joshi",
    ownerEmail: "56dukan.poha@example.com",
    area: "New Palasia",
    addressLine1: "Stall 22, Chappan Dukan, New Palasia",
    pincode: "452001",
    landmark: "Opposite Palasia Square",
    cuisines: ["Breakfast", "Indori", "Snacks"],
    pureVegRestaurant: true,
    openingTime: "06:30",
    closingTime: "13:00",
    rating: 4.4,
    totalRatings: 963,
    deliveryMinutes: 22,
    offer: "Flat ₹50 OFF above ₹199",
    latitude: 22.724400,
    longitude: 75.883900,
    coverFile: "Poha.jpg",
    profileFile: "Jalebi PK013.jpg",
    featuredDish: "Indori Poha Jalebi",
    menu: [
      { name: "Indori Poha", price: 40, foodType: "Veg", file: "Poha.jpg", categoryName: "Breakfast", description: "Steamed poha with sev, onion and a squeeze of lime.", recommended: true },
      { name: "Jalebi (250g)", price: 90, foodType: "Veg", file: "Jalebi PK013.jpg", categoryName: "Breakfast", description: "The other half of an Indore morning.", recommended: true },
      { name: "Sabudana Khichdi", price: 70, foodType: "Veg", file: "Sabudana Khichdi.jpg", categoryName: "Breakfast", description: "Sago tossed with peanuts, curry leaves and green chilli." },
      { name: "Kachori", price: 35, foodType: "Veg", file: "Kachori MA23.jpg", categoryName: "Snacks", description: "Flaky kachori stuffed with spiced dal." },
      { name: "Samosa", price: 25, foodType: "Veg", file: "Samosa.jpg", categoryName: "Snacks", description: "Classic potato samosa with tamarind chutney." },
    ],
  },
  {
    ownerPhone: "9111100003",
    restaurantName: "Indori Rasoi",
    ownerName: "Mahesh Chouhan",
    ownerEmail: "indori.rasoi@example.com",
    area: "Vijay Nagar",
    addressLine1: "201, Scheme 54, Vijay Nagar",
    pincode: "452010",
    landmark: "Near Satya Sai Square",
    cuisines: ["North Indian", "Malwi", "Thali"],
    pureVegRestaurant: false,
    openingTime: "11:00",
    closingTime: "23:00",
    rating: 4.2,
    totalRatings: 540,
    deliveryMinutes: 35,
    offer: "Free delivery above ₹299",
    latitude: 22.753300,
    longitude: 75.893700,
    coverFile: "Daal Bafla.jpg",
    profileFile: "Paneer butter masala 2.jpg",
    featuredDish: "Dal Bafla Thali",
    menu: [
      { name: "Dal Bafla", price: 180, foodType: "Veg", file: "Daal Bafla.jpg", categoryName: "Malwi Special", description: "Ghee-soaked baflas with dal and ladoo — the Malwa classic.", recommended: true },
      { name: "Paneer Butter Masala", price: 260, foodType: "Veg", file: "Paneer butter masala 2.jpg", categoryName: "Main Course", description: "Paneer in a slow-cooked tomato and cashew gravy.", recommended: true },
      { name: "Veg Thali", price: 220, foodType: "Veg", file: "Veg Thali.jpg", categoryName: "Thali", description: "Two sabzi, dal, rice, rotis, salad and sweet." },
      { name: "Masala Dosa", price: 140, foodType: "Veg", file: "Masala Dosa.jpg", categoryName: "South Indian", description: "Crisp dosa with potato masala, sambar and chutney." },
      { name: "Gulab Jamun", price: 80, foodType: "Veg", file: "Gulab jamun (Gibraltar, November 2020).jpg", categoryName: "Desserts", description: "Two warm jamuns in cardamom syrup." },
    ],
  },
];

const connect = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Missing MONGODB_URI / MONGO_URI in environment.");
  const dbName = process.env.MONGODB_DB_NAME || undefined;
  await mongoose.connect(uri, dbName ? { dbName } : undefined);
  return mongoose.connection.name;
};

/** Download a Commons file and keep the bytes; throws rather than seeding a broken image. */
const fetchImage = async (file) => {
  const response = await fetch(commonsUrl(file), { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) throw new Error(`${file}: not an image (${contentType})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 5000) throw new Error(`${file}: suspiciously small (${buffer.length} bytes)`);
  return buffer;
};

/**
 * Download once, store once. Several dishes share a photo with their
 * restaurant's cover, and re-uploading the same bytes would leave orphans.
 */
const imageCache = new Map();

const storeImage = async (file, folder) => {
  const key = `${folder}:${file}`;
  if (imageCache.has(key)) return imageCache.get(key);

  const buffer = await fetchImage(file);
  const stored = await storeImageBuffer(buffer, folder, {
    originalName: file,
    mimeType: "image/jpeg",
  });

  // Relative on purpose — see the header note about ASSET_BASE_URL.
  const relativeUrl = `/uploads/${stored.filename}`;
  imageCache.set(key, relativeUrl);
  return relativeUrl;
};

const seedRestaurant = async (spec, zoneId) => {
  const now = new Date();
  const restaurants = mongoose.connection.collection("food_restaurants");
  const items = mongoose.connection.collection("food_items");

  const [profileImage, coverImage] = await Promise.all([
    storeImage(spec.profileFile, "food_restaurants_profile"),
    storeImage(spec.coverFile, "food_restaurants_cover"),
  ]);

  const fullAddress = `${spec.addressLine1}, ${spec.area}, ${CITY}, ${STATE} ${spec.pincode}`;

  await restaurants.updateOne(
    { ownerPhone: spec.ownerPhone },
    {
      $set: {
        restaurantName: spec.restaurantName,
        ownerName: spec.ownerName,
        ownerEmail: spec.ownerEmail,
        ownerPhone: spec.ownerPhone,
        primaryContactNumber: spec.ownerPhone,
        countryCode: COUNTRY_CODE,
        addressLine1: spec.addressLine1,
        area: spec.area,
        city: CITY,
        state: STATE,
        pincode: spec.pincode,
        landmark: spec.landmark,
        cuisines: spec.cuisines,
        pureVegRestaurant: spec.pureVegRestaurant,
        openingTime: spec.openingTime,
        closingTime: spec.closingTime,
        openDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        // listApprovedRestaurants filters on exactly this.
        status: "approved",
        isAcceptingOrders: true,
        isActive: true,
        rating: spec.rating,
        totalRatings: spec.totalRatings,
        estimatedDeliveryTime: `${spec.deliveryMinutes}-${spec.deliveryMinutes + 10} min`,
        estimatedDeliveryTimeMinutes: spec.deliveryMinutes,
        featuredDish: spec.featuredDish,
        featuredPrice: Math.min(...spec.menu.map((m) => m.price)),
        offer: spec.offer,
        profileImage,
        coverImages: [coverImage],
        zoneId,
        // GeoJSON is [lng, lat]; the zone match is a polygon lookup, so a
        // swapped pair silently drops the restaurant out of its own zone.
        location: {
          type: "Point",
          coordinates: [spec.longitude, spec.latitude],
          latitude: spec.latitude,
          longitude: spec.longitude,
          formattedAddress: fullAddress,
          address: fullAddress,
          area: spec.area,
          city: CITY,
          state: STATE,
          pincode: spec.pincode,
          landmark: spec.landmark,
        },
        approvedAt: now,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  const doc = await restaurants.findOne({ ownerPhone: spec.ownerPhone }, { projection: { _id: 1 } });
  const restaurantId = doc._id;

  // Rebuild rather than upsert each dish: a renamed item would otherwise
  // linger next to its replacement on every re-run.
  await items.deleteMany({ restaurantId });

  const menuDocs = [];
  for (const dish of spec.menu) {
    menuDocs.push({
      restaurantId,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      foodType: dish.foodType,
      categoryName: dish.categoryName,
      image: await storeImage(dish.file, "food_items"),
      isAvailable: true,
      isRecommended: Boolean(dish.recommended),
      approvalStatus: "approved",
      approvedAt: now,
      actionType: "NEW",
      createdAt: now,
      updatedAt: now,
    });
  }
  await items.insertMany(menuDocs);

  return {
    restaurant: spec.restaurantName,
    id: String(restaurantId),
    area: spec.area,
    dishes: menuDocs.length,
  };
};

const run = async () => {
  const dbName = await connect();

  const zone = await mongoose.connection.collection("food_zones").findOne({ name: ZONE_NAME });
  if (!zone) {
    throw new Error('No zone named "indore" exists. Create it in admin → zones first.');
  }
  if (!zone.isActive) {
    console.warn(`Zone "${zone.name}" is inactive — seeded restaurants will not show until it is enabled.`);
  }

  console.log(`Seeding ${RESTAURANTS.length} restaurants into "${dbName}", zone ${zone.name} (${zone._id})\n`);

  const results = [];
  for (const spec of RESTAURANTS) {
    results.push(await seedRestaurant(spec, zone._id));
    console.log(`  done: ${spec.restaurantName}`);
  }

  console.table(results);
  console.log(`\nImages stored under ${process.env.UPLOAD_PATH || (process.env.NODE_ENV === "production" ? "/var/www/uploads" : "Backend/uploads")}`);
  console.log("Photos: Wikimedia Commons (CC-licensed).");
};

run()
  .catch((err) => {
    console.error("Failed to seed Indore restaurants:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
