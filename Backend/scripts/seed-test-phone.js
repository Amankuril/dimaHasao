/**
 * Seed one phone number into every phone+OTP audience, so a single number can
 * log into all six apps for testing.
 *
 * The audiences are the ones registered in
 * core/auth/otpAuth/registerAudiences.js — user, restaurant, delivery,
 * taxi-driver, hotel-partner, tours-operator. Each owns its own collection, so
 * "one test user" really means six documents that happen to share a phone.
 * Platform admin is deliberately absent: it signs in with email + password
 * (see scripts/seed-super-admin.js), not OTP.
 *
 * Restaurant and delivery go through the raw driver rather than their Mongoose
 * models, matching seed-food-restaurant-delivery-default.js — their schemas
 * require a full onboarding payload (FSSAI, documents, bank details) that a
 * login fixture has no business inventing.
 *
 * Usage (from Backend/):
 *   node scripts/seed-test-phone.js              # 8888888888
 *   node scripts/seed-test-phone.js 9999999999   # any other number
 *
 * Idempotent: re-running updates the same six documents in place.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { FoodUser } from "../src/core/users/user.model.js";
import { Driver } from "../src/modules/taxi/driver/models/Driver.js";
import Partner from "../src/modules/hotel/models/Partner.js";
import TourOperator from "../src/modules/tours/models/TourOperator.js";

dotenv.config();

const DEFAULT_PHONE = "8888888888";
const COUNTRY_CODE = "+91";
const CITY = "Haflong";
const STATE = "Assam";

const normalizePhone = (value) => String(value || "").replace(/\D/g, "").slice(-10);

const phone = normalizePhone(process.argv[2] || DEFAULT_PHONE);

if (phone.length !== 10) {
  console.error(`Invalid phone "${process.argv[2]}" — need 10 digits.`);
  process.exit(1);
}

/**
 * OTP is the only credential these accounts use, but every schema still marks
 * `password` required. A random unguessable hash satisfies that without
 * creating a second way in.
 */
const unusablePassword = () =>
  bcrypt.hash(`${phone}:${Date.now()}:${Math.random()}`, 10);

const connect = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("Missing MONGODB_URI / MONGO_URI in environment.");
  const dbName = process.env.MONGODB_DB_NAME || undefined;
  await mongoose.connect(uri, dbName ? { dbName } : undefined);
  return mongoose.connection.name;
};

/** Consumer account — one document behind /app, /food/user and /taxi/user. */
const upsertUser = async () => {
  let user = await FoodUser.findOne({ phone });
  if (!user) user = new FoodUser({ phone });

  user.phone = phone;
  user.countryCode = COUNTRY_CODE;
  user.name = user.name || "Test Consumer";
  user.isBlocked = false;
  await user.save();

  return { app: "Consumer (user)", collection: "users", id: String(user._id) };
};

const upsertRestaurant = async () => {
  const now = new Date();
  const col = mongoose.connection.collection("food_restaurants");

  await col.updateOne(
    { $or: [{ ownerPhone: phone }, { primaryContactNumber: phone }] },
    {
      $set: {
        restaurantName: "Test Restaurant",
        ownerName: "Test Restaurant Owner",
        ownerPhone: phone,
        primaryContactNumber: phone,
        countryCode: COUNTRY_CODE,
        city: CITY,
        state: STATE,
        // audiences.js rejects login unless status === 'approved'.
        status: "approved",
        approvedAt: now,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  const doc = await col.findOne({ ownerPhone: phone }, { projection: { _id: 1 } });
  return { app: "Restaurant", collection: "food_restaurants", id: String(doc?._id) };
};

const upsertDeliveryPartner = async () => {
  const now = new Date();
  const col = mongoose.connection.collection("food_delivery_partners");

  await col.updateOne(
    { phone },
    {
      $set: {
        name: "Test Delivery Partner",
        phone,
        countryCode: COUNTRY_CODE,
        city: CITY,
        state: STATE,
        vehicleType: "bike",
        status: "approved",
        // audiences.js blocks login on isActive === false or isBlocked.
        isActive: true,
        isBlocked: false,
        approvedAt: now,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  const doc = await col.findOne({ phone }, { projection: { _id: 1 } });
  return { app: "Delivery partner", collection: "food_delivery_partners", id: String(doc?._id) };
};

const upsertTaxiDriver = async () => {
  let driver = await Driver.findOne({ phone });
  if (!driver) driver = new Driver({ phone });

  driver.phone = phone;
  driver.name = driver.name || "Test Taxi Driver";
  // VEHICLE_TYPES is ['bike', 'auto', 'car'] — not the pooling service's wider list.
  driver.vehicleType = driver.vehicleType || "car";
  driver.password = await unusablePassword();
  driver.approve = true;
  driver.status = "approved";
  driver.active = true;
  driver.isBlocked = false;
  await driver.save();

  return { app: "Taxi driver", collection: "drivers", id: String(driver._id) };
};

const upsertHotelPartner = async () => {
  let partner = await Partner.findOne({ phone });
  if (!partner) partner = new Partner({ phone });

  partner.phone = phone;
  partner.name = partner.name || "Test Hotel Partner";
  partner.role = "partner";
  partner.isPartner = true;
  partner.isVerified = true;
  partner.isBlocked = false;
  // Approved, not pending — otherwise the panel shows the waiting screen
  // instead of the dashboard.
  partner.partnerApprovalStatus = "approved";
  if (!partner.password) partner.password = await unusablePassword();
  await partner.save();

  return { app: "Hotel partner", collection: "partners", id: String(partner._id) };
};

const upsertTourOperator = async () => {
  let operator = await TourOperator.findOne({ phone });
  if (!operator) operator = new TourOperator({ phone });

  operator.phone = phone;
  operator.name = operator.name || "Test Tour Operator";
  operator.agencyName = operator.agencyName || "Test Tours & Travels";
  operator.role = "operator";
  operator.isVerified = true;
  operator.isBlocked = false;
  operator.operatorApprovalStatus = "approved";
  if (!operator.password) operator.password = await unusablePassword();
  await operator.save();

  return { app: "Tours operator", collection: "touroperators", id: String(operator._id) };
};

const run = async () => {
  const dbName = await connect();
  console.log(`Seeding ${phone} into database "${dbName}"\n`);

  // Sequential, not Promise.all: a failure part-way should leave a readable
  // trail of what did get created.
  const results = [];
  for (const step of [
    upsertUser,
    upsertRestaurant,
    upsertDeliveryPartner,
    upsertTaxiDriver,
    upsertHotelPartner,
    upsertTourOperator,
  ]) {
    results.push(await step());
  }

  console.table(results);
  console.log(`\nAll six apps now accept ${phone} at their OTP login.`);
  console.log("OTP itself comes from env: USE_DEFAULT_OTP / USE_DEFAULT_TEST_PHONE + DEFAULT_TEST_PHONE.");
  console.log("Platform admin is email + password — use scripts/seed-super-admin.js instead.");
};

run()
  .catch((err) => {
    console.error("Failed to seed test phone:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
