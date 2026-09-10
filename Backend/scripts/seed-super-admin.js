import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { FoodAdmin } from '../src/core/admin/admin.model.js';
import { ADMIN_LEVELS } from '../src/core/admin/adminHierarchy.constants.js';

dotenv.config();

const EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@gmail.com';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const NAME = process.env.SEED_ADMIN_NAME || 'Dima Hasao Super Admin';

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri);

  const email = EMAIL.toLowerCase().trim();
  let admin = await FoodAdmin.findOne({ email });
  const existed = Boolean(admin);
  if (!admin) admin = new FoodAdmin({ email });

  admin.email = email;
  admin.name = NAME;
  admin.password = PASSWORD; // hashed by the model's pre-save hook
  admin.adminLevel = ADMIN_LEVELS.PLATFORM_SUPERADMIN;
  admin.admin_type = 'superadmin';
  admin.role = 'ADMIN';
  admin.module = null;
  admin.parentAdminId = null;
  admin.servicesAccess = ['food', 'quickCommerce', 'taxi'];
  admin.isActive = true;
  admin.active = true;
  admin.status = 'active';

  await admin.save();

  console.log(existed ? 'Updated existing super admin:' : 'Created super admin:');
  console.log({
    id: String(admin._id),
    email: admin.email,
    adminLevel: admin.adminLevel,
    admin_type: admin.admin_type,
    servicesAccess: admin.servicesAccess,
  });

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
