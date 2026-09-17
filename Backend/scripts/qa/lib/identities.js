/**
 * Test identities.
 *
 * Two separate consumers are needed to prove object-level authorization: one
 * owns a record, the other must be refused it. Both are provisioned through the
 * real OTP flow rather than by minting tokens, so the suite exercises the same
 * path a user does.
 *
 * Requires USE_DEFAULT_OTP=true (dev). Without it the suite blocks rather than
 * inventing credentials.
 */
import { post, get } from './http.js';

const signIn = async (phone) => {
  const requested = await post('/auth/otp/request', { body: { audience: 'user', phone } });
  const otp = requested.body?.data?.otp;
  if (!otp) return { error: `no dev OTP returned for ${phone} (USE_DEFAULT_OTP off?)` };

  const verified = await post('/auth/otp/verify', { body: { audience: 'user', phone, otp } });
  const data = verified.body?.data;
  if (!data?.accessToken) {
    // A brand-new number needs its profile completed before a session exists.
    const completed = await post('/auth/otp/complete', {
      body: { audience: 'user', phone, otp, name: `QA ${phone.slice(-4)}` },
    });
    const done = completed.body?.data;
    if (!done?.accessToken) return { error: `could not establish a session for ${phone}` };
    return { phone, token: done.accessToken, user: done.user };
  }
  return { phone, token: data.accessToken, user: data.user };
};

export const provision = async () => {
  const primary = await signIn(process.env.QA_PHONE_A || '8962843670');
  const secondary = await signIn(process.env.QA_PHONE_B || '9000000777');

  let me = null;
  if (primary.token) {
    const res = await get('/food/user/profile', { token: primary.token });
    me = res.body?.data?.user || res.body?.user || null;
  }

  return { primary, secondary, me };
};

/** The seeded platform superadmin, for role-boundary cases. */
export const adminSession = async () => {
  const res = await post('/auth/admin/login', {
    body: {
      email: process.env.QA_ADMIN_EMAIL || 'admin@gmail.com',
      password: process.env.QA_ADMIN_PASSWORD || 'admin123',
    },
  });
  const data = res.body?.data;
  return data?.accessToken ? { token: data.accessToken, user: data.user || data.admin } : { error: res.body?.message || 'admin login failed' };
};
