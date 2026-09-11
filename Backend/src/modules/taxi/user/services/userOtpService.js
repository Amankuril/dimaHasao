import { ApiError } from '../../../../utils/ApiError.js';
import { UserAuthSession } from '../models/UserAuthSession.js';
import { User } from '../models/User.js';
import { signAccessToken } from './authService.js';
import { createOrUpdateOtp, verifyOtp } from '../../../../core/otp/otp.service.js';

/**
 * OTP generation, storage, rate limiting and delivery live in core/otp under
 * the 'taxi-user' scope. UserAuthSession is kept, but only for what core does
 * not model: the short-lived "this phone passed OTP and may now finish signup"
 * handshake between verify and the signup call.
 */
const OTP_SCOPE = 'taxi-user';
const VERIFIED_SESSION_TTL_MS = 10 * 60 * 1000;

export const normalizeUserPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '').trim();
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};

export const validateUserPhone = (phone) => {
  if (!/^\d{10}$/.test(phone)) {
    throw new ApiError(400, 'A valid 10-digit phone number is required');
  }
};

const getVisibleOtp = (otp) => (process.env.NODE_ENV !== 'production' ? String(otp) : null);

const ensureUserCanLogin = (user) => {
  if (user?.deletedAt || user?.isActive === false || user?.active === false) {
    throw new ApiError(403, 'User account is not active');
  }
};

const isReusableSignupUser = (user) => Boolean(user?.deletedAt);

const toUserPayload = (user) => ({
  id: user._id,
  name: user.name || '',
  phone: user.phone || '',
  email: user.email || '',
  gender: user.gender || '',
  currentRideId: user.currentRideId || null,
});

const createUserSession = (user) => ({
  token: signAccessToken({ sub: String(user._id), role: 'user' }),
  user: toUserPayload(user),
});

const getOtpSession = async (phone) => {
  const normalizedPhone = normalizeUserPhone(phone);
  const session = await UserAuthSession.findOne({ phone: normalizedPhone });

  if (!session) {
    throw new ApiError(404, 'OTP session not found');
  }

  if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
    await UserAuthSession.deleteOne({ _id: session._id });
    throw new ApiError(410, 'OTP session expired');
  }

  return session;
};

const publicOtpSession = (session, debugOtp = null) => ({
  phone: session.phone,
  status: session.otpVerifiedAt ? 'otp_verified' : 'otp_sent',
  debugOtp,
});

export const startUserOtp = async ({ phone }) => {
  const normalizedPhone = normalizeUserPhone(phone);
  validateUserPhone(normalizedPhone);

  const user = await User.findOne({ phone: normalizedPhone }).lean();

  if (user && !isReusableSignupUser(user)) {
    ensureUserCanLogin(user);
  }

  // core generates, stores, rate-limits and sends.
  const otp = await createOrUpdateOtp(normalizedPhone, OTP_SCOPE);

  // Any half-finished signup handshake from a previous attempt is stale now.
  await UserAuthSession.deleteOne({ phone: normalizedPhone });

  const debugOtp = getVisibleOtp(otp);

  if (debugOtp) {
    console.log(`[userOtpService] OTP for ${normalizedPhone} = ${debugOtp}`);
  }

  return {
    message: 'OTP sent successfully',
    exists: Boolean(user && !isReusableSignupUser(user)),
    session: { phone: normalizedPhone, status: 'otp_sent', debugOtp },
  };
};

export const verifyUserOtp = async ({ phone, otp }) => {
  const normalizedPhone = normalizeUserPhone(phone);
  validateUserPhone(normalizedPhone);
  const normalizedOtp = String(otp || '').trim();

  if (!/^\d{4}$/.test(normalizedOtp)) {
    throw new ApiError(400, 'A valid 4-digit OTP is required');
  }

  const result = await verifyOtp(normalizedPhone, normalizedOtp, OTP_SCOPE);

  if (!result.valid) {
    // core distinguishes expiry from a wrong code; keep the status codes the
    // taxi client already branches on.
    if (result.reason === 'OTP expired') {
      throw new ApiError(410, 'OTP has expired');
    }
    if (result.reason === 'OTP not found') {
      throw new ApiError(404, 'OTP session not found');
    }
    throw new ApiError(401, result.reason || 'Invalid OTP');
  }

  const user = await User.findOne({ phone: normalizedPhone });

  if (user && !isReusableSignupUser(user)) {
    ensureUserCanLogin(user);
    await UserAuthSession.deleteOne({ phone: normalizedPhone });
    return {
      exists: true,
      ...createUserSession(user),
    };
  }

  // No usable account yet — open the signup handshake this phone will present
  // to the signup endpoint.
  const session = await UserAuthSession.findOneAndUpdate(
    { phone: normalizedPhone },
    {
      phone: normalizedPhone,
      otpVerifiedAt: new Date(),
      expiresAt: new Date(Date.now() + VERIFIED_SESSION_TTL_MS),
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  );

  return {
    exists: false,
    phone: normalizedPhone,
    session: publicOtpSession(session),
  };
};

export const requireVerifiedUserSignupSession = async (phone) => {
  const session = await getOtpSession(phone);

  if (!session.otpVerifiedAt) {
    throw new ApiError(400, 'Verify OTP before signup');
  }

  return session;
};

export const consumeUserSignupSession = (session) => UserAuthSession.deleteOne({ _id: session._id });
