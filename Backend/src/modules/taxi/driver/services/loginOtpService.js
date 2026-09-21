import { ApiError } from '../../../../utils/ApiError.js';
import { Driver } from '../models/Driver.js';
import { DriverLoginSession } from '../models/DriverLoginSession.js';
import { signAccessToken } from './authService.js';
import { createOrUpdateOtp, verifyOtp } from '../../../../core/otp/otp.service.js';

/**
 * OTP generation, storage, rate limiting and delivery live in core/otp under
 * the 'taxi-driver' scope. DriverLoginSession is kept for what core does not
 * model: which account/role this phone is logging in as, and the multi-role
 * selection handshake after a successful verify.
 */
const OTP_SCOPE = 'taxi-driver';

/** How long the post-OTP role-selection handshake stays usable. */
const SESSION_TTL_MS = 10 * 60 * 1000;

const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '').trim();
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};

const buildPhoneCandidates = (phone) => {
  const normalizedPhone = normalizePhone(phone);
  const candidates = new Set();

  if (normalizedPhone) {
    candidates.add(normalizedPhone);
    candidates.add(`91${normalizedPhone}`);
    candidates.add(`+91${normalizedPhone}`);
  }

  return [...candidates];
};

const normalizeRole = (role) => {
  const normalized = String(role || 'driver').toLowerCase();
  return 'driver';
};

const getVisibleOtp = (otp) => (process.env.NODE_ENV !== 'production' ? String(otp) : null);

const getSession = async (phone) => {
  const session = await DriverLoginSession.findOne({ phone: normalizePhone(phone) });

  if (!session) {
    throw new ApiError(404, 'Login session not found');
  }

  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
    await DriverLoginSession.deleteOne({ _id: session._id });
    throw new ApiError(410, 'Login session expired');
  }

  return session;
};

const publicSessionPayload = (session, debugOtp = null) => ({
  phone: session.phone,
  status: 'otp_sent',
  debugOtp,
});

const publicDriverPayload = (driver) => ({
  id: driver._id,
  name: driver.name,
  phone: driver.phone,
  email: driver.email,
  gender: driver.gender,
  vehicleType: driver.vehicleType,
  registerFor: driver.registerFor,
  vehicleNumber: driver.vehicleNumber,
  vehicleColor: driver.vehicleColor,
  city: driver.city,
  approve: driver.approve,
  status: driver.status,
  rating: driver.rating,
  isOnline: driver.isOnline,
  isOnRide: driver.isOnRide,
});

const LOGIN_ROLE_PRIORITY = ['driver'];

export const findDriverPortalAccountByPhone = async ({ phone, role } = {}) => {
  const normalizedRole = normalizeRole(role);
  const phoneCandidates = buildPhoneCandidates(phone);

  if (!phoneCandidates.length) {
    return null;
  }

  const account = await Driver.findOne({ phone: { $in: phoneCandidates } });

  return account ? { role: normalizedRole, account } : null;
};

const buildDriverPortalExistenceQuery = (role, phoneCandidates) => {
  return Driver.findOne({ phone: { $in: phoneCandidates } }).select('_id').lean();
};

export const findPreferredDriverPortalAccountByPhone = async (phone) => {
  const phoneCandidates = buildPhoneCandidates(phone);

  if (!phoneCandidates.length) {
    return null;
  }

  const results = await Promise.all(
    LOGIN_ROLE_PRIORITY.map(async (role) => {
      const account = await buildDriverPortalExistenceQuery(role, phoneCandidates);
      return account ? { role, account } : null;
    }),
  );

  for (const role of LOGIN_ROLE_PRIORITY) {
    const match = results.find((item) => item?.role === role);
    if (match) return match;
  }

  return null;
};

export const findAllDriverPortalAccountsByPhone = async (phone) => {
  const phoneCandidates = buildPhoneCandidates(phone);

  if (!phoneCandidates.length) {
    return [];
  }

  const results = await Promise.all(
    LOGIN_ROLE_PRIORITY.map(async (role) => {
      const account = await buildDriverPortalExistenceQuery(role, phoneCandidates);
      return account ? { role, id: account._id } : null;
    }),
  );

  return results.filter(Boolean);
};

export const startDriverLoginOtp = async ({ phone, role = 'driver' }) => {
  const normalizedPhone = normalizePhone(phone);
  const normalizedRole = normalizeRole(role);

  if (!normalizedPhone || normalizedPhone.length !== 10) {
    throw new ApiError(400, 'A valid 10-digit mobile number is required');
  }

  const match = await findDriverPortalAccountByPhone({ phone: normalizedPhone, role: normalizedRole });
  const account = match?.account;

  if (!account) {
    throw new ApiError(
      404,
      'Driver account not found',
    );
  }


  // core generates, stores, rate-limits and sends.
  const otp = await createOrUpdateOtp(normalizedPhone, OTP_SCOPE);
  const now = Date.now();

  const session = await DriverLoginSession.findOneAndUpdate(
    { phone: normalizedPhone },
    {
      phone: normalizedPhone,
      driverId: account._id,
      accountRole: normalizedRole,
      verifiedAt: null,
      expiresAt: new Date(now + SESSION_TTL_MS),
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  );

  const debugOtp = getVisibleOtp(otp);

  if (debugOtp) {
    console.log(`[loginOtpService] OTP for ${normalizedPhone} = ${debugOtp}`);
  }

  const allRoles = await findAllDriverPortalAccountsByPhone(normalizedPhone);
  const rolesList = allRoles.map((item) => item.role);

  return {
    message: 'OTP sent successfully',
    session: publicSessionPayload(session, debugOtp),
    availableRoles: rolesList,
  };
};

export const verifyDriverLoginOtp = async ({ phone, otp, role }) => {
  const session = await getSession(phone);

  if (!otp || String(otp).trim().length !== 4) {
    throw new ApiError(400, 'A valid 4-digit OTP is required');
  }

  const otpResult = await verifyOtp(session.phone, String(otp).trim(), OTP_SCOPE);

  if (!otpResult.valid) {
    if (otpResult.reason === 'OTP expired') {
      throw new ApiError(410, 'OTP has expired');
    }
    throw new ApiError(401, otpResult.reason || 'Invalid OTP');
  }

  // If no role is requested, check if there are multiple roles
  if (!role) {
    const allRoles = await findAllDriverPortalAccountsByPhone(phone);
    const rolesList = allRoles.map((item) => item.role);

    if (rolesList.length > 1) {
      session.verifiedAt = new Date();
      await session.save();

      return {
        message: 'OTP verified successfully. Multiple roles detected.',
        needsRoleSelection: true,
        availableRoles: rolesList,
      };
    }
  }

  const normalizedRole = role ? normalizeRole(role) : normalizeRole(session.accountRole);
  let account = null;

  if (role) {
    const match = await findDriverPortalAccountByPhone({ phone, role: normalizedRole });
    if (match) {
      account = match.account;
    }
  } else {
    account = await Driver.findById(session.driverId);
  }

  if (!account) {
    throw new ApiError(
      404,
      'Driver account not found',
    );
  }


  session.verifiedAt = new Date();
  session.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await session.save();
  await DriverLoginSession.deleteOne({ _id: session._id });

  return {
    message: 'OTP verified successfully',
    token: signAccessToken({ sub: String(account._id), role: normalizedRole }),
    role: normalizedRole,
    driver: publicDriverPayload(account),
  };
};
