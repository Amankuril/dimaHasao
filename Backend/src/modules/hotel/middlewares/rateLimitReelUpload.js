/**
 * In-memory rate limit: max 5 reel uploads per user per calendar day.
 * For production at scale, replace with Redis (e.g. key: reel_upload:userId:YYYY-MM-DD).
 */
const dailyCounts = new Map();

const getTodayKey = (userId) => {
  const today = new Date().toISOString().slice(0, 10);
  return `${userId}:${today}`;
};

export const rateLimitReelUpload = (req, res, next) => {
  const userId = req.user?._id?.toString();
  if (!userId) return next();

  // Admins do not have daily upload rate limit
  if (req.user?.role === 'admin' || req.user?.role === 'superadmin') {
    return next();
  }

  const key = getTodayKey(userId);
  const count = dailyCounts.get(key) || 0;

  if (count >= 5) {
    return res.status(429).json({
      success: false,
      message: 'You can upload at most 5 reels per day. Try again tomorrow.',
    });
  }

  req._reelUploadIncrement = () => {
    dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
  };
  next();
};
