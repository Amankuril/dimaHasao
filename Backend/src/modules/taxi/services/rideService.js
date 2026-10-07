import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { ApiError } from '../../../utils/ApiError.js';
import { getOrLoadCachedValue } from '../../../utils/cache.js';
import { normalizePoint, toPoint } from '../../../utils/geo.js';
import { RIDE_LIVE_STATUS, RIDE_STATUS } from '../constants/index.js';
import { AdminBusinessSetting } from '../admin/models/AdminBusinessSetting.js';
import { SetPrice } from '../admin/models/SetPrice.js';
import { Vehicle } from '../admin/models/Vehicle.js';
import { Driver } from '../driver/models/Driver.js';
import { WalletTransaction } from '../driver/models/WalletTransaction.js';
import { incrementDriverTodaySummaryForCompletedRide } from '../driver/services/driverTodaySummaryService.js';
import { applyDriverWalletAdjustment, ensureDriverWalletCanAcceptRide, settleCompletedRideWallet } from '../driver/services/walletService.js';
import { Ride } from '../user/models/Ride.js';
import { User } from '../user/models/User.js';
import { UserWallet } from '../user/models/UserWallet.js';
import { applyPromoToRideInTransaction } from './promoService.js';
import { getTipSettings } from './appSettingsService.js';
// Pure helpers; fareService imports resolveSetPriceForRide from here, and this
// direction of the cycle only needs functions that touch no module state.
import { fareFromTariff, fareWithinTolerance } from './fareService.js';
import { DRIVER_ELIGIBLE_FOR_RIDES_FILTER } from './matchingService.js';

const clearUserActiveRideIfPresent = async (user) => {
  if (!user?.currentRideId) {
    return;
  }

  const activeRide = await Ride.findById(user.currentRideId);

  if (!activeRide) {
    user.currentRideId = null;
    await user.save();
    return;
  }

  if ([RIDE_STATUS.COMPLETED, RIDE_STATUS.CANCELLED].includes(activeRide.status)) {
    user.currentRideId = null;
    await user.save();
    return;
  }

  // A booking for later is not in the way of riding now; it is left alone
  // (it used to be cancelled here without telling anyone, driver included).
  if (isRideScheduledForFuture(activeRide)) {
    return;
  }

  /*
   * Booking again used to silently cancel whatever ride was current — even one
   * a driver had accepted or that was already under way, with no cancellation
   * fee, no driver notification and no dispatch cleanup. Only a ride still
   * searching (the rider re-booking after giving up on a search) is replaced.
   */
  if (activeRide.status !== RIDE_STATUS.SEARCHING) {
    throw new ApiError(409, 'You already have a ride in progress. Finish or cancel it before booking another.');
  }

  activeRide.status = RIDE_STATUS.CANCELLED;
  activeRide.liveStatus = RIDE_LIVE_STATUS.CANCELLED;
  await activeRide.save();

  await Promise.all([
    activeRide.driverId ? Driver.findByIdAndUpdate(activeRide.driverId, { isOnRide: false }) : Promise.resolve(),
    User.findByIdAndUpdate(activeRide.userId, { currentRideId: null }),
  ]);

  user.currentRideId = null;
};

export const clearDriverActiveRideIfStale = async (driverOrId) => {
  const driver =
    typeof driverOrId === 'object' && driverOrId?._id
      ? driverOrId
      : await Driver.findById(driverOrId);

  if (!driver?.isOnRide) {
    return driver;
  }

  const activeRide = await Ride.findOne({
    driverId: driver._id,
    status: { $in: activeRideStatuses },
  }).select('_id status liveStatus');

  if (activeRide) {
    return driver;
  }

  driver.isOnRide = false;
  await driver.save();

  return driver;
};

const normalizeRidePaymentMethod = (paymentMethod) => (
  !paymentMethod || String(paymentMethod).trim().toLowerCase() === 'cash' ? 'cash' : 'online'
);

const PAYMENT_PAID_STATUSES = new Set(['paid', 'captured', 'completed']);

/*
 * Whether this ride has server-verified proof an online payment was
 * collected — set only by the QR-payment verify webhook/poll
 * (driverController.js) or the rider's own Razorpay completion verify
 * (rideController.js), never by the client-supplied status-update body.
 */
const hasVerifiedOnlinePaymentCollection = (ride) => (
  Boolean(ride?.driverPaymentCollection?.paidAt)
  || PAYMENT_PAID_STATUSES.has(String(ride?.driverPaymentCollection?.status || '').trim().toLowerCase())
);

const normalizeServiceType = (serviceType) => {
  const normalized = String(serviceType || 'ride').trim().toLowerCase();
  return normalized === 'intercity' ? 'intercity' : 'ride';
};

const ensureUserWallet = async (userId) => {
  if (!userId) {
    return;
  }

  await UserWallet.updateOne(
    { userId },
    { $setOnInsert: { userId, balance: 0, refundWallet: 0, transactions: [] } },
    { upsert: true },
  );
};

const getUserReferralProgramSettings = async () => {
  const setting = await AdminBusinessSetting.findOne({ scope: 'default' }).lean();
  const userReferral = setting?.referral?.user || {};

  return {
    enabled: Boolean(userReferral.enabled),
    type: String(userReferral.type || 'instant_referrer').trim().toLowerCase(),
    amount: Math.max(0, Number(userReferral.amount || 0) || 0),
    rideCount: Math.max(0, Number(userReferral.ride_count || 0) || 0),
  };
};

const getDriverReferralProgramSettings = async () => {
  const setting = await AdminBusinessSetting.findOne({ scope: 'default' }).lean();
  const driverReferral = setting?.referral?.driver || {};

  return {
    enabled: Boolean(driverReferral.enabled),
    type: String(driverReferral.type || 'instant_referrer').trim().toLowerCase(),
    amount: Math.max(0, Number(driverReferral.amount || 0) || 0),
    rideCount: Math.max(0, Number(driverReferral.ride_count || 0) || 0),
  };
};

const creditUserWalletByReference = async ({ userId, amount, title, referenceKey }) => {
  const normalizedAmount = Math.max(0, Number(amount || 0) || 0);
  const normalizedReferenceKey = String(referenceKey || '').trim();

  if (!userId || normalizedAmount <= 0 || !normalizedReferenceKey) {
    return 'skipped';
  }

  await ensureUserWallet(userId);

  const existingTransaction = await UserWallet.findOne({
    userId,
    'transactions.referenceKey': normalizedReferenceKey,
  })
    .select('_id')
    .lean();

  if (existingTransaction) {
    return 'existing';
  }

  await UserWallet.updateOne(
    { userId },
    {
      $inc: { balance: normalizedAmount },
      $push: {
        transactions: {
          $each: [
            {
              kind: 'credit',
              amount: normalizedAmount,
              title: String(title || 'Referral Reward').trim(),
              referenceKey: normalizedReferenceKey,
            },
          ],
          $slice: -50,
        },
      },
    },
  );

  return 'credited';
};

const creditDriverWalletByReference = async ({ driverId, amount, title, referenceKey, metadata = {} }) => {
  const normalizedAmount = Math.max(0, Number(amount || 0) || 0);
  const normalizedReferenceKey = String(referenceKey || '').trim();

  if (!driverId || normalizedAmount <= 0 || !normalizedReferenceKey) {
    return 'skipped';
  }

  const existingTransaction = await WalletTransaction.findOne({
    driverId,
    'metadata.referenceKey': normalizedReferenceKey,
  })
    .select('_id')
    .lean();

  if (existingTransaction) {
    return 'existing';
  }

  await applyDriverWalletAdjustment({
    driverId,
    amount: normalizedAmount,
    type: 'adjustment',
    description: String(title || 'Referral Reward').trim(),
    metadata: {
      ...metadata,
      referenceKey: normalizedReferenceKey,
      source: 'driver_referral',
    },
  });

  return 'credited';
};

const processCompletedRideReferralReward = async (ride) => {
  if (!ride?.userId) {
    return;
  }

  const referredUser = await User.findById(ride.userId)
    .select('phone referredBy referredRideCompletionCount referralRewardGrantedAt')
    .lean();

  if (!referredUser?.referredBy || referredUser?.referralRewardGrantedAt) {
    return;
  }

  const settings = await getUserReferralProgramSettings();
  const isConditionalProgram =
    settings.enabled &&
    ['conditional_referrer', 'conditional_referrer_new'].includes(settings.type);

  if (!isConditionalProgram) {
    return;
  }

  const completedRideCount = await Ride.countDocuments({
    userId: ride.userId,
    status: RIDE_STATUS.COMPLETED,
    serviceType: { $in: ['ride', 'intercity'] },
  });

  const requiredRideCount = Math.max(1, settings.rideCount || 1);

  await User.updateOne(
    { _id: ride.userId },
    { $set: { referredRideCompletionCount: completedRideCount } },
  );

  if (completedRideCount < requiredRideCount || settings.amount <= 0) {
    return;
  }

  const rewardBaseKey = `user-referral:completed:${String(ride.userId)}:${requiredRideCount}`;
  const referrerResult = await creditUserWalletByReference({
    userId: referredUser.referredBy,
    amount: settings.amount,
    title: `Referral reward after ${completedRideCount} completed rides by ${referredUser.phone || 'referred user'}`,
    referenceKey: `${rewardBaseKey}:referrer`,
  });

  let newUserResult = 'skipped';
  if (settings.type === 'conditional_referrer_new') {
    newUserResult = await creditUserWalletByReference({
      userId: ride.userId,
      amount: settings.amount,
      title: `Referral completion reward after ${completedRideCount} rides`,
      referenceKey: `${rewardBaseKey}:new-user`,
    });
  }

  const rewardSatisfied =
    ['credited', 'existing'].includes(referrerResult) &&
    (settings.type !== 'conditional_referrer_new' || ['credited', 'existing'].includes(newUserResult));

  if (rewardSatisfied) {
    await User.updateOne(
      { _id: ride.userId },
      { $set: { referralRewardGrantedAt: new Date(), referredRideCompletionCount: completedRideCount } },
    );
  }
};

const processCompletedDriverReferralReward = async (ride) => {
  if (!ride?.driverId) {
    return;
  }

  const referredDriver = await Driver.findById(ride.driverId)
    .select('phone referredBy referredRideCompletionCount referralRewardGrantedAt')
    .lean();

  if (!referredDriver?.referredBy || referredDriver?.referralRewardGrantedAt) {
    return;
  }

  const settings = await getDriverReferralProgramSettings();
  const isConditionalProgram =
    settings.enabled &&
    ['conditional_referrer', 'conditional_referrer_new'].includes(settings.type);

  if (!isConditionalProgram) {
    return;
  }

  const completedRideCount = await Ride.countDocuments({
    driverId: ride.driverId,
    status: RIDE_STATUS.COMPLETED,
  });

  const requiredRideCount = Math.max(1, settings.rideCount || 1);

  await Driver.updateOne(
    { _id: ride.driverId },
    { $set: { referredRideCompletionCount: completedRideCount } },
  );

  if (completedRideCount < requiredRideCount || settings.amount <= 0) {
    return;
  }

  const rewardBaseKey = `driver-referral:completed:${String(ride.driverId)}:${requiredRideCount}`;
  const referrerResult = await creditDriverWalletByReference({
    driverId: referredDriver.referredBy,
    amount: settings.amount,
    title: `Referral reward after ${completedRideCount} completed rides by ${referredDriver.phone || 'referred driver'}`,
    referenceKey: `${rewardBaseKey}:referrer`,
    metadata: {
      referredDriverId: String(ride.driverId),
      completedRideCount,
    },
  });

  let newDriverResult = 'skipped';
  if (settings.type === 'conditional_referrer_new') {
    newDriverResult = await creditDriverWalletByReference({
      driverId: ride.driverId,
      amount: settings.amount,
      title: `Referral completion reward after ${completedRideCount} rides`,
      referenceKey: `${rewardBaseKey}:new-driver`,
      metadata: {
        referrerDriverId: String(referredDriver.referredBy),
        completedRideCount,
      },
    });
  }

  const rewardSatisfied =
    ['credited', 'existing'].includes(referrerResult) &&
    (settings.type !== 'conditional_referrer_new' || ['credited', 'existing'].includes(newDriverResult));

  if (rewardSatisfied) {
    await Driver.updateOne(
      { _id: ride.driverId },
      { $set: { referralRewardGrantedAt: new Date(), referredRideCompletionCount: completedRideCount } },
    );
  }
};

const normalizeAddress = (value = '') => String(value || '').trim();
// crypto, not Math.random: the start PIN is what proves the rider is in the car.
const generateRideOtp = () => String(crypto.randomInt(1000, 10000));
const normalizeIntercityPayload = (intercity = {}) => ({
  bookingId: String(intercity.bookingId || '').trim(),
  fromCity: String(intercity.fromCity || '').trim(),
  toCity: String(intercity.toCity || '').trim(),
  tripType: String(intercity.tripType || '').trim(),
  travelDate: String(intercity.travelDate || intercity.date || '').trim(),
  passengers: Math.max(Number(intercity.passengers || 1), 1),
  distance: Math.max(Number(intercity.distance || 0), 0),
  vehicleName: String(intercity.vehicleName || '').trim(),
});

const normalizeScheduledAt = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const DRIVER_SCHEDULE_LOCK_WINDOW_MS = 30 * 60 * 1000;
const DRIVER_SCHEDULE_MIN_DURATION_MINUTES = 30;
const DRIVER_SCHEDULE_TURNOVER_BUFFER_MS = 15 * 60 * 1000;

const getScheduledRideTimestamp = (ride = {}) => {
  const scheduledAt = ride?.scheduledAt ? new Date(ride.scheduledAt) : null;
  const time = scheduledAt?.getTime?.() || NaN;
  return Number.isFinite(time) ? time : NaN;
};

export const isRideScheduledForFuture = (ride = {}, referenceTime = new Date()) => {
  const scheduledTime = getScheduledRideTimestamp(ride);
  return Number.isFinite(scheduledTime) && scheduledTime > new Date(referenceTime).getTime();
};

const getScheduledRideCommitmentWindow = (ride = {}) => {
  const scheduledTime = getScheduledRideTimestamp(ride);

  if (!Number.isFinite(scheduledTime)) {
    return null;
  }

  const durationMinutes = Math.max(
    DRIVER_SCHEDULE_MIN_DURATION_MINUTES,
    Number(ride?.estimatedDurationMinutes || 0),
  );

  return {
    startTime: scheduledTime - DRIVER_SCHEDULE_LOCK_WINDOW_MS,
    endTime:
      scheduledTime +
      (durationMinutes * 60 * 1000) +
      DRIVER_SCHEDULE_TURNOVER_BUFFER_MS,
  };
};

const doRideCommitmentWindowsOverlap = (firstWindow, secondWindow) => (
  Boolean(firstWindow)
  && Boolean(secondWindow)
  && firstWindow.startTime < secondWindow.endTime
  && secondWindow.startTime < firstWindow.endTime
);

export const findDriverConflictingScheduledRide = async ({
  driverId,
  ride,
  excludeRideId = null,
  session = null,
} = {}) => {
  const normalizedDriverId = String(driverId || '').trim();
  const targetWindow = getScheduledRideCommitmentWindow(ride);

  if (!normalizedDriverId || !targetWindow) {
    return null;
  }

  const query = {
    driverId: normalizedDriverId,
    scheduledAt: { $ne: null },
    status: { $in: [RIDE_STATUS.SEARCHING, RIDE_STATUS.ACCEPTED, RIDE_STATUS.ONGOING] },
    liveStatus: { $nin: [RIDE_LIVE_STATUS.CANCELLED, RIDE_LIVE_STATUS.COMPLETED] },
  };

  if (excludeRideId) {
    query._id = { $ne: excludeRideId };
  }

  const ridesQuery = Ride.find(query)
    .select('_id scheduledAt estimatedDurationMinutes status liveStatus')
    .sort({ scheduledAt: 1 })
    .lean();

  if (session) {
    ridesQuery.session(session);
  }

  const rides = await ridesQuery;

  return rides.find((candidateRide) =>
    doRideCommitmentWindowsOverlap(
      targetWindow,
      getScheduledRideCommitmentWindow(candidateRide),
    )) || null;
};

export const getDriverIdsBlockedByUpcomingScheduledRides = async (
  driverIds = [],
  { referenceTime = new Date(), lockWindowMs = DRIVER_SCHEDULE_LOCK_WINDOW_MS, session = null } = {},
) => {
  const normalizedDriverIds = [...new Set((Array.isArray(driverIds) ? driverIds : [driverIds])
    .map((id) => String(id || '').trim())
    .filter(Boolean))];

  if (normalizedDriverIds.length === 0) {
    return new Set();
  }

  const windowStart = new Date(referenceTime);
  const windowEnd = new Date(windowStart.getTime() + Math.max(0, Number(lockWindowMs) || 0));
  const query = {
    driverId: { $in: normalizedDriverIds },
    scheduledAt: {
      $ne: null,
      $gte: windowStart,
      $lte: windowEnd,
    },
    status: { $in: [RIDE_STATUS.ACCEPTED, RIDE_STATUS.ONGOING] },
    liveStatus: { $nin: [RIDE_LIVE_STATUS.CANCELLED, RIDE_LIVE_STATUS.COMPLETED] },
  };

  const ridesQuery = Ride.find(query).select('driverId').lean();
  if (session) {
    ridesQuery.session(session);
  }

  const rides = await ridesQuery;
  return new Set(
    rides
      .map((ride) => String(ride?.driverId || '').trim())
      .filter(Boolean),
  );
};

const normalizeVehicleTypeIds = (vehicleTypeIds = [], vehicleTypeId = null) => {
  const values = Array.isArray(vehicleTypeIds) ? vehicleTypeIds : [vehicleTypeIds];

  if (vehicleTypeId) {
    values.push(vehicleTypeId);
  }

  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
};

const normalizeVehicleKey = (value = '') => String(value || '').trim().toLowerCase();

export const normalizeAllowedRidePaymentMethods = (paymentTypes = []) => {
  const rawItems = Array.isArray(paymentTypes)
    ? paymentTypes
    : typeof paymentTypes === 'string'
      ? paymentTypes.split(',')
      : [];

  const normalized = rawItems
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean)
    .map((item) => (item === 'cash' ? 'cash' : item === 'online' || item === 'wallet' ? 'online' : null))
    .filter(Boolean);

  const unique = [...new Set(normalized)];
  return unique.length ? unique : ['cash', 'online'];
};

const SET_PRICE_CACHE_TTL_MS = 30_000;

export const resolveSetPriceForRide = async ({ zoneId = null, serviceLocationId = null, transportType = 'taxi', vehicleTypeId = null }) => {
  if (!vehicleTypeId) {
    return null;
  }

  const normalizedTransportType = String(transportType || 'taxi').trim().toLowerCase() || 'taxi';
  const filters = [
    ...(zoneId
      ? [
          {
            vehicle_type: vehicleTypeId,
            active: 1,
            status: 'active',
            zone_id: zoneId,
            transport_type: normalizedTransportType,
          },
          {
            vehicle_type: vehicleTypeId,
            active: 1,
            status: 'active',
            zone_id: zoneId,
            transport_type: 'both',
          },
        ]
      : []),
    ...(serviceLocationId
      ? [
          {
            vehicle_type: vehicleTypeId,
            active: 1,
            status: 'active',
            service_location_id: serviceLocationId,
            transport_type: normalizedTransportType,
          },
          {
            vehicle_type: vehicleTypeId,
            active: 1,
            status: 'active',
            service_location_id: serviceLocationId,
            transport_type: 'both',
          },
        ]
      : []),
    {
      vehicle_type: vehicleTypeId,
      active: 1,
      status: 'active',
      transport_type: normalizedTransportType,
    },
    {
      vehicle_type: vehicleTypeId,
      active: 1,
      status: 'active',
      transport_type: 'both',
    },
  ];

  const cacheKey = [
    'cache:set_price',
    String(zoneId || 'none'),
    String(serviceLocationId || 'none'),
    normalizedTransportType,
    String(vehicleTypeId),
  ].join(':');

  return getOrLoadCachedValue(
    cacheKey,
    {
      ttlMs: SET_PRICE_CACHE_TTL_MS,
      load: async () => {
        for (const filter of filters) {
          const match = await SetPrice.findOne(filter).sort({ updatedAt: -1, createdAt: -1 }).lean();
          if (match) {
            return match;
          }
        }

        return null;
      },
    },
  );
};

export const getAllowedRidePaymentMethodsForPricing = async ({ zoneId = null, serviceLocationId = null, transportType = 'taxi', vehicleTypeId = null }) => {
  const pricingRule = await resolveSetPriceForRide({ zoneId, serviceLocationId, transportType, vehicleTypeId });

  return {
    pricingRule,
    allowedPaymentMethods: normalizeAllowedRidePaymentMethods(pricingRule?.payment_type),
  };
};

const normalizeRideTransportType = (value = 'taxi') => {
  const normalized = String(value || 'taxi').trim().toLowerCase() || 'taxi';

  if (normalized === 'both' || normalized === 'all') {
    return 'taxi';
  }

  return normalized;
};

const buildDriverVehicleAcceptFilter = async (ride) => {
  const vehicleTypeIds = normalizeVehicleTypeIds(ride.dispatchVehicleTypeIds || [], ride.vehicleTypeId);

  if (vehicleTypeIds.length === 0) {
    const fallbackKeys = [
      ride?.vehicleIconType,
      ride?.vehicleType,
      String(ride?.vehicleIconType || '').replace(/\s+/g, '_'),
      String(ride?.vehicleType || '').replace(/\s+/g, '_'),
    ]
      .map(normalizeVehicleKey)
      .filter(Boolean);
    const clauses = [
      ...([...(new Set(fallbackKeys))].length
        ? [
            { vehicleType: { $in: [...(new Set(fallbackKeys))] } },
            { vehicleIconType: { $in: [...(new Set(fallbackKeys))] } },
          ]
        : []),
    ];

    return clauses.length > 1 ? { $or: clauses } : clauses[0] || {};
  }

  return { vehicleTypeId: { $in: vehicleTypeIds } };
};

export const createRideRecord = async ({
  userId,
  pickupCoords,
  dropCoords,
  pickupAddress,
  dropAddress,
  fare,
  estimatedDistanceMeters,
  estimatedDurationMinutes,
  vehicleTypeId,
  vehicleTypeIds,
  vehicleIconType,
  vehicleIconUrl,
  paymentMethod,
  serviceType,
  intercity,
  promo_code,
  zone_id,
  service_location_id,
  transport_type,
  scheduledAt,
  bookingMode,
}) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await clearUserActiveRideIfPresent(user);

  const safeFare = Number(fare);
  const safeEstimatedDistanceMeters = Math.max(0, Number(estimatedDistanceMeters || 0));
  const safeEstimatedDurationMinutes = Math.max(0, Number(estimatedDurationMinutes || 0));

  if (!Number.isFinite(safeFare) || safeFare < 0) {
    throw new ApiError(400, 'fare must be a positive number or zero');
  }

  const dispatchVehicleTypeIds = normalizeVehicleTypeIds(vehicleTypeIds, vehicleTypeId);

  if (dispatchVehicleTypeIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw new ApiError(400, 'vehicleTypeId is invalid');
  }

  const primaryVehicleTypeId = dispatchVehicleTypeIds[0] || null;
  const primaryVehicle = primaryVehicleTypeId
    ? await Vehicle.findById(primaryVehicleTypeId).select('icon map_icon image dispatch_type admin_commission_type_from_driver admin_commission_from_driver').lean()
    : null;
  const resolvedVehicleIconUrl = String(
    vehicleIconUrl || primaryVehicle?.image || primaryVehicle?.map_icon || primaryVehicle?.icon || '',
  ).trim();
  const normalizedTransportType = normalizeRideTransportType(transport_type);
  const resolvedZoneId =
    zone_id && mongoose.Types.ObjectId.isValid(zone_id)
      ? new mongoose.Types.ObjectId(zone_id)
      : null;
  const resolvedServiceLocationId =
    service_location_id && mongoose.Types.ObjectId.isValid(service_location_id)
      ? new mongoose.Types.ObjectId(service_location_id)
      : null;
  const { pricingRule, allowedPaymentMethods } = await getAllowedRidePaymentMethodsForPricing({
    zoneId: resolvedZoneId,
    serviceLocationId: resolvedServiceLocationId,
    transportType: normalizedTransportType,
    vehicleTypeId: primaryVehicleTypeId,
  });
  /*
   * The fare is the server's, not the caller's.
   *
   * The submitted figure used to be stored as given, checked only for being a
   * non-negative number — a 50 km trip could be booked for ₹1. The tariff was
   * already resolved right above this, for payment methods; it is read here for
   * the price it was written to hold.
   *
   * When no tariff covers this combination the submitted fare stands, because
   * refusing every ride on a platform with no tariffs configured would take the
   * module down rather than protect it. That case is logged as the
   * configuration gap it is, and TAXI_ENFORCE_FARE=true turns it into a refusal
   * once tariffs exist.
   */
  const computedFare = fareFromTariff(pricingRule, {
    distanceMeters: safeEstimatedDistanceMeters,
    durationMinutes: safeEstimatedDurationMinutes,
    outstation: normalizeServiceType(serviceType) === 'intercity',
  });

  if (computedFare) {
    if (!fareWithinTolerance(safeFare, computedFare.total)) {
      throw new ApiError(
        400,
        `Fare does not match the tariff for this trip. Expected about ₹${computedFare.total}.`,
      );
    }
  } else if (String(process.env.TAXI_ENFORCE_FARE || '').toLowerCase() === 'true') {
    throw new ApiError(422, 'No fare is configured for this vehicle and route. Please contact support.');
  } else {
    console.warn(
      '[taxi] no tariff resolved for this ride — the submitted fare was accepted unchecked.',
      { vehicleTypeId: String(primaryVehicleTypeId || ''), transportType: normalizedTransportType },
    );
  }

  const normalizedPaymentMethod = normalizeRidePaymentMethod(paymentMethod);
  const resolvedRequestedPaymentMethod = allowedPaymentMethods.includes(normalizedPaymentMethod)
    ? normalizedPaymentMethod
    : (allowedPaymentMethods[0] || 'cash');
  const normalizedServiceType = normalizeServiceType(serviceType);
  const pricingSnapshot = {
    setPriceId: pricingRule?._id || null,
    admin_commission_type_from_driver: Number(pricingRule?.admin_commission_type_from_driver ?? 1),
    admin_commission_from_driver: Number(pricingRule?.admin_commission_from_driver ?? 0),
    waiting_charge: Number(pricingRule?.waiting_charge ?? 0),
    free_waiting_before: Number(pricingRule?.free_waiting_before ?? 0),
    free_waiting_after: Number(pricingRule?.free_waiting_after ?? 0),
    allowed_payment_methods: allowedPaymentMethods,
    resolvedAt: pricingRule ? new Date() : null,
  };

  const promoCode = typeof promo_code === 'string' ? promo_code.trim() : '';
  const normalizedScheduledAt = normalizeScheduledAt(scheduledAt);
  if (scheduledAt && !normalizedScheduledAt) {
    throw new ApiError(400, 'scheduledAt is invalid');
  }

  if (!promoCode) {
    const ride = await Ride.create({
      userId,
      vehicleTypeId: primaryVehicleTypeId,
      dispatchVehicleTypeIds,
      vehicleIconType: vehicleIconType || '',
      vehicleIconUrl: resolvedVehicleIconUrl,
      serviceType: normalizedServiceType,
      pickupLocation: toPoint(pickupCoords, 'pickup'),
      pickupAddress: normalizeAddress(pickupAddress),
      dropLocation: toPoint(dropCoords, 'drop'),
      dropAddress: normalizeAddress(dropAddress),
      fare: safeFare,
      baseFare: safeFare,
      estimatedDistanceMeters: safeEstimatedDistanceMeters,
      estimatedDurationMinutes: safeEstimatedDurationMinutes,
      paymentMethod: resolvedRequestedPaymentMethod,
      otp: generateRideOtp(),
      service_location_id: resolvedServiceLocationId,
      transport_type: normalizedTransportType,
      pricingSnapshot,
      intercity: normalizeIntercityPayload(intercity),
      scheduledAt: normalizedScheduledAt,
      status: RIDE_STATUS.SEARCHING,
      liveStatus: RIDE_LIVE_STATUS.SEARCHING,
    });

    user.currentRideId = ride._id;
    await user.save();

    return ride;
  }

  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const ride = await Ride.create(
        [
          {
            userId,
            vehicleTypeId: primaryVehicleTypeId,
            dispatchVehicleTypeIds,
            vehicleIconType: vehicleIconType || '',
            vehicleIconUrl: resolvedVehicleIconUrl,
            serviceType: normalizedServiceType,
            pickupLocation: toPoint(pickupCoords, 'pickup'),
            pickupAddress: normalizeAddress(pickupAddress),
            dropLocation: toPoint(dropCoords, 'drop'),
            dropAddress: normalizeAddress(dropAddress),
            fare: safeFare,
            baseFare: safeFare,
            estimatedDistanceMeters: safeEstimatedDistanceMeters,
            estimatedDurationMinutes: safeEstimatedDurationMinutes,
            paymentMethod: resolvedRequestedPaymentMethod,
            otp: generateRideOtp(),
            service_location_id: resolvedServiceLocationId,
            transport_type: normalizedTransportType,
            pricingSnapshot,
            intercity: normalizeIntercityPayload(intercity),
            scheduledAt: normalizedScheduledAt,
            status: RIDE_STATUS.SEARCHING,
            liveStatus: RIDE_LIVE_STATUS.SEARCHING,
          },
        ],
        { session },
      );

      const rideDoc = ride[0];

      user.currentRideId = rideDoc._id;
      await user.save({ session });

      await applyPromoToRideInTransaction({
        session,
        ride: rideDoc,
        userId,
        code: promoCode,
        fare: safeFare,
        service_location_id,
        transport_type: transport_type || 'taxi',
      });

      await session.commitTransaction();
      return rideDoc;
    } catch (error) {
      lastError = error;
      await session.abortTransaction();

      const isTransient =
        typeof error?.hasErrorLabel === 'function' &&
        (error.hasErrorLabel('TransientTransactionError') || error.hasErrorLabel('UnknownTransactionCommitResult'));

      if (!isTransient || attempt === 2) {
        throw error;
      }
    } finally {
      session.endSession();
    }
  }

  throw lastError || new ApiError(500, 'Failed to create ride with promo');
};

export const getRideDetails = async (rideId) => {
  const ride = await Ride.findById(rideId)
    .populate('userId', 'name phone')
    .populate('driverId', 'name phone profileImage vehicleType vehicleIconType vehicleNumber vehicleColor vehicleMake vehicleModel vehicleImage rating');

  if (!ride) {
    throw new ApiError(404, 'Ride not found');
  }

  return ride;
};

export const getRideRoom = (rideId) => `ride_${rideId}`;

const activeRideStatuses = [RIDE_STATUS.SEARCHING, RIDE_STATUS.ACCEPTED, RIDE_STATUS.ONGOING];

const populateRideRealtime = async (rideId) =>
  Ride.findById(rideId)
    .populate('userId', 'name phone')
    .populate('driverId', 'name phone profileImage vehicleType vehicleIconType vehicleNumber vehicleColor vehicleMake vehicleModel vehicleImage rating');

/*
 * viewerRole decides whether the start PIN is included: only the rider gets
 * it. Anything broadcast to the ride room (rider AND driver) or mirrored out
 * must be serialized without a viewerRole, which leaves the PIN out.
 */
export const serializeRideRealtime = (ride, { viewerRole = null } = {}) => ({
  rideId: String(ride._id),
  room: getRideRoom(ride._id),
  type: ride.serviceType || 'ride',
  serviceType: ride.serviceType || 'ride',
  status: ride.status,
  liveStatus: ride.liveStatus,
  fare: ride.fare,
  baseFare: Number(ride.baseFare || ride.fare || 0),
  estimatedDistanceMeters: ride.estimatedDistanceMeters || 0,
  estimatedDurationMinutes: ride.estimatedDurationMinutes || 0,
  paymentMethod: ride.paymentMethod,
  driverPaymentCollection: ride.driverPaymentCollection
    ? {
        provider: ride.driverPaymentCollection.provider || '',
        providerId: ride.driverPaymentCollection.providerId || '',
        providerOrderId: ride.driverPaymentCollection.providerOrderId || '',
        providerPaymentId: ride.driverPaymentCollection.providerPaymentId || '',
        providerMode: ride.driverPaymentCollection.providerMode || '',
        source: ride.driverPaymentCollection.source || '',
        status: ride.driverPaymentCollection.status || 'pending',
        amount: Number(ride.driverPaymentCollection.amount || 0),
        currency: ride.driverPaymentCollection.currency || 'INR',
        linkUrl: ride.driverPaymentCollection.linkUrl || '',
        paidAt: ride.driverPaymentCollection.paidAt || null,
        updatedAt: ride.driverPaymentCollection.updatedAt || null,
      }
    : null,
  ...(viewerRole === 'user' ? { otp: ride.otp || '' } : {}),
  intercity: ride.intercity || null,
  commissionAmount: ride.commissionAmount,
  driverEarnings: ride.driverEarnings,
  promo: ride.promo?.code ? ride.promo : null,
  pricingSnapshot: ride.pricingSnapshot
    ? {
        setPriceId: ride.pricingSnapshot.setPriceId || null,
        admin_commission_type_from_driver: Number(ride.pricingSnapshot.admin_commission_type_from_driver ?? 1),
        admin_commission_from_driver: Number(ride.pricingSnapshot.admin_commission_from_driver ?? 0),
        waiting_charge: Number(ride.pricingSnapshot.waiting_charge ?? 0),
        free_waiting_before: Number(ride.pricingSnapshot.free_waiting_before ?? 0),
        free_waiting_after: Number(ride.pricingSnapshot.free_waiting_after ?? 0),
        allowed_payment_methods: normalizeAllowedRidePaymentMethods(ride.pricingSnapshot.allowed_payment_methods),
        resolvedAt: ride.pricingSnapshot.resolvedAt || null,
      }
    : null,
  vehicleIconType: ride.vehicleIconType || '',
  vehicleIconUrl: ride.vehicleIconUrl || '',
  pickupLocation: ride.pickupLocation,
  pickupAddress: ride.pickupAddress || '',
  dropLocation: ride.dropLocation,
  dropAddress: ride.dropAddress || '',
  scheduledAt: ride.scheduledAt || null,
  acceptedAt: ride.acceptedAt,
  arrivedAt: ride.arrivedAt,
  startedAt: ride.startedAt,
  completedAt: ride.completedAt,
  feedback: ride.feedback || null,
  lastDriverLocation: ride.lastDriverLocation?.coordinates?.length
    ? {
        type: ride.lastDriverLocation.type,
        coordinates: ride.lastDriverLocation.coordinates,
        heading: ride.lastDriverLocation.heading,
        speed: ride.lastDriverLocation.speed,
        updatedAt: ride.lastDriverLocation.updatedAt,
      }
    : null,
  user: ride.userId,
  driver: ride.driverId,
  messages: (ride.messages || []).slice(-30).map((message) => ({
    id: String(message._id),
    senderRole: message.senderRole,
    senderId: String(message.senderId),
    message: message.message,
    sentAt: message.sentAt,
  })),
});

export const ensureRideParticipantAccess = async ({ rideId, role, entityId }) => {
  const ride = await Ride.findById(rideId).select('userId driverId status liveStatus');

  if (!ride) {
    throw new ApiError(404, 'Ride not found');
  }

  const actorId = String(entityId);
  const isUser = role === 'user' && String(ride.userId) === actorId;
  const isDriver = role === 'driver' && ride.driverId && String(ride.driverId) === actorId;

  if (!isUser && !isDriver) {
    throw new ApiError(403, 'You are not allowed to access this ride room');
  }

  return ride;
};

export const getActiveRideForIdentity = async ({ role, entityId }) => {
  if (role === 'user') {
    const user = await User.findById(entityId).select('currentRideId');

    if (!user?.currentRideId) {
      return null;
    }

    return populateRideRealtime(user.currentRideId);
  }

  if (role === 'driver') {
    const rides = await Ride.find({
      driverId: entityId,
      status: { $in: activeRideStatuses },
    })
      .sort({ updatedAt: -1 })
      .populate('userId', 'name phone')
      .populate('driverId', 'name phone profileImage vehicleType vehicleIconType vehicleNumber vehicleColor vehicleMake vehicleModel vehicleImage rating');

    return rides.find((ride) => !isRideScheduledForFuture(ride)) || null;
  }

  return null;
};

export const listRideHistoryForIdentity = async ({ role, entityId, limit = 50, page = 1, category = 'all' }) => {
  if (!['user', 'driver'].includes(role)) {
    throw new ApiError(403, 'Only riders and drivers can access ride history');
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const query = role === 'driver' ? { driverId: entityId } : { userId: entityId };
  const normalizedCategory = String(category || 'all').trim().toLowerCase();

  if (normalizedCategory === 'rides') {
    query.serviceType = 'ride';
    query.scheduledAt = null;
  } else if (normalizedCategory === 'outstation') {
    query.scheduledAt = null;
    query.serviceType = 'intercity';
  } else if (normalizedCategory === 'scheduled') {
    query.scheduledAt = { $ne: null };
  }

  const counterpartPath = role === 'driver' ? 'userId' : 'driverId';
  const counterpartSelect =
    role === 'driver'
      ? 'name phone profileImage'
      : 'name phone profileImage vehicleType vehicleIconType vehicleNumber vehicleColor vehicleMake vehicleModel vehicleImage rating';

  const ridesQuery = Ride.find(query)
    .select([
      '_id',
      'serviceType',
      'status',
      'liveStatus',
      'fare',
      'baseFare',
      'estimatedDistanceMeters',
      'estimatedDurationMinutes',
      'paymentMethod',
      'otp',
      'intercity',
      'pricingSnapshot',
      'commissionAmount',
      'driverEarnings',
      'vehicleIconType',
      'vehicleIconUrl',
      'pickupLocation',
      'pickupAddress',
      'dropLocation',
      'dropAddress',
      'scheduledAt',
      'acceptedAt',
      'arrivedAt',
      'startedAt',
      'completedAt',
      'feedback',
      'createdAt',
      'updatedAt',
      'userId',
      'driverId',
    ].join(' '))
    .sort({ createdAt: -1 })
    .skip((safePage - 1) * safeLimit)
    .limit(safeLimit)
    .populate(counterpartPath, counterpartSelect)
    .lean();

  if (role === 'user') {
  }

  const [rides, total] = await Promise.all([
    ridesQuery,
    Ride.countDocuments(query),
  ]);

  return {
    results: rides.map((ride) => ({
    rideId: String(ride._id),
    type: ride.serviceType || 'ride',
    serviceType: ride.serviceType || 'ride',
    status: ride.status,
    liveStatus: ride.liveStatus,
    fare: ride.fare,
    baseFare: Number(ride.baseFare || ride.fare || 0),
    estimatedDistanceMeters: ride.estimatedDistanceMeters || 0,
    estimatedDurationMinutes: ride.estimatedDurationMinutes || 0,
    paymentMethod: ride.paymentMethod,
    // Rider history only; the driver must never be sent the start PIN.
    ...(role === 'user' ? { otp: ride.otp || '' } : {}),
    intercity: ride.intercity || null,
    pricingSnapshot: ride.pricingSnapshot || null,
    commissionAmount: ride.commissionAmount,
    driverEarnings: ride.driverEarnings,
    vehicleIconType: ride.vehicleIconType,
    // Keep history responses light; giant data URLs can stall the activity screen.
    vehicleIconUrl: String(ride.vehicleIconUrl || '').startsWith('data:') ? '' : (ride.vehicleIconUrl || ''),
    pickupLocation: ride.pickupLocation,
    pickupAddress: ride.pickupAddress || '',
    dropLocation: ride.dropLocation,
    dropAddress: ride.dropAddress || '',
    scheduledAt: ride.scheduledAt || null,
    acceptedAt: ride.acceptedAt,
    arrivedAt: ride.arrivedAt,
    startedAt: ride.startedAt,
    completedAt: ride.completedAt,
    feedback: ride.feedback || null,
    createdAt: ride.createdAt,
    updatedAt: ride.updatedAt,
    user: role === 'driver' ? (ride.userId || null) : null,
    driver: role === 'user' ? (ride.driverId || null) : null,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      hasNextPage: safePage * safeLimit < total,
      hasPrevPage: safePage > 1,
    },
  };
};

export const acceptRideAssignment = async ({ rideId, driverId }) => {
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const ride = await Ride.findOne({
        _id: rideId,
        status: RIDE_STATUS.SEARCHING,
        driverId: null,
      }).session(session);

      if (!ride) {
        throw new ApiError(409, 'Ride is no longer available for acceptance');
      }

      const driverVehicleFilter = await buildDriverVehicleAcceptFilter(ride);
      const driver = await Driver.findOne({
        _id: driverId,
        isOnline: true,
        isOnRide: false,
        'wallet.isBlocked': { $ne: true },
        // Same eligibility as matching: a disabled/unapproved driver who still
        // had a request on screen must not be able to take it.
        ...DRIVER_ELIGIBLE_FOR_RIDES_FILTER,
        ...driverVehicleFilter,
      }).session(session);

      if (!driver) {
        throw new ApiError(409, 'Driver is unavailable to accept this ride');
      }

      const blockedDriverIds = await getDriverIdsBlockedByUpcomingScheduledRides([driverId], { session });
      if (blockedDriverIds.has(String(driverId))) {
        throw new ApiError(409, 'Driver is blocked from new rides within 30 minutes of a scheduled trip');
      }

      const conflictingScheduledRide = await findDriverConflictingScheduledRide({
        driverId,
        ride,
        excludeRideId: ride._id,
        session,
      });
      if (conflictingScheduledRide) {
        throw new ApiError(409, 'Driver already has another scheduled trip in a similar time range');
      }

      await ensureDriverWalletCanAcceptRide(driver, { session });

      ride.driverId = driver._id;
      ride.status = RIDE_STATUS.ACCEPTED;
      ride.liveStatus = RIDE_LIVE_STATUS.ACCEPTED;
      ride.acceptedAt = new Date();
      driver.isOnRide = !isRideScheduledForFuture(ride);

      await ride.save({ session });
      await driver.save({ session });
      await session.commitTransaction();

      return ride;
    } catch (error) {
      lastError = error;
      await session.abortTransaction();

      const isTransient =
        typeof error?.hasErrorLabel === 'function' &&
        (error.hasErrorLabel('TransientTransactionError') || error.hasErrorLabel('UnknownTransactionCommitResult'));

      if (!isTransient || attempt === 2) {
        throw error;
      }
    } finally {
      session.endSession();
    }
  }

  throw lastError || new ApiError(500, 'Failed to accept ride');
};

const rideStatusConfig = {
  [RIDE_LIVE_STATUS.ACCEPTED]: {
    persistedStatus: RIDE_STATUS.ACCEPTED,
    allowedCurrent: [RIDE_LIVE_STATUS.ACCEPTED, RIDE_LIVE_STATUS.ARRIVING],
  },
  [RIDE_LIVE_STATUS.ARRIVING]: {
    persistedStatus: RIDE_STATUS.ACCEPTED,
    allowedCurrent: [RIDE_LIVE_STATUS.ACCEPTED, RIDE_LIVE_STATUS.ARRIVING],
  },
  [RIDE_LIVE_STATUS.STARTED]: {
    persistedStatus: RIDE_STATUS.ONGOING,
    allowedCurrent: [RIDE_LIVE_STATUS.ACCEPTED, RIDE_LIVE_STATUS.ARRIVING, RIDE_LIVE_STATUS.STARTED],
  },
  [RIDE_LIVE_STATUS.ARRIVED]: {
    persistedStatus: RIDE_STATUS.ONGOING,
    allowedCurrent: [RIDE_LIVE_STATUS.STARTED, RIDE_LIVE_STATUS.ARRIVED],
  },
  // Only a ride that actually started can complete. Accepted/arriving used to
  // be allowed too, which let a driver "complete" a trip the rider never took
  // (no PIN, no pickup) and have it settled into their wallet.
  [RIDE_LIVE_STATUS.COMPLETED]: {
    persistedStatus: RIDE_STATUS.COMPLETED,
    allowedCurrent: [RIDE_LIVE_STATUS.STARTED, RIDE_LIVE_STATUS.ARRIVED],
  },
};

const RIDE_OTP_MAX_ATTEMPTS = 5;
const RIDE_OTP_LOCK_MS = 10 * 60 * 1000;

const ridePinMatches = (expected, provided) => {
  const a = Buffer.from(String(expected || ''));
  const b = Buffer.from(String(provided || '').trim());
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

/*
 * The start PIN is the rider's proof they are in the car. It used to be
 * compared only in the driver app — which was sent the PIN to compare against —
 * so any driver could start (and then complete and get paid for) a trip with
 * no rider. It is checked here now, and never sent to the driver.
 */
const verifyRideStartOtp = async (ride, otp) => {
  if (!ride.otp) {
    // Every ride is created with a PIN; a ride without one has nothing to check.
    return;
  }

  const lockedUntil = ride.otpLockedUntil ? new Date(ride.otpLockedUntil).getTime() : 0;
  if (lockedUntil > Date.now()) {
    throw new ApiError(429, 'Too many wrong PINs. Try again in a few minutes.');
  }

  if (ridePinMatches(ride.otp, otp)) {
    return;
  }

  const updated = await Ride.findOneAndUpdate(
    { _id: ride._id },
    { $inc: { otpFailedAttempts: 1 } },
    { returnDocument: 'after', projection: { otpFailedAttempts: 1 } },
  ).lean();

  if (Number(updated?.otpFailedAttempts || 0) >= RIDE_OTP_MAX_ATTEMPTS) {
    await Ride.updateOne(
      { _id: ride._id },
      { $set: { otpFailedAttempts: 0, otpLockedUntil: new Date(Date.now() + RIDE_OTP_LOCK_MS) } },
    );
    throw new ApiError(429, 'Too many wrong PINs. Try again in a few minutes.');
  }

  throw new ApiError(400, 'Wrong PIN. Ask the passenger again.');
};

export const updateRideLifecycle = async ({ rideId, driverId, nextStatus, paymentMethod, otp }) => {
  const config = rideStatusConfig[nextStatus];

  if (!config) {
    throw new ApiError(400, 'Unsupported ride status');
  }

  const ride = await Ride.findOne({ _id: rideId, driverId });

  if (!ride) {
    throw new ApiError(404, 'Assigned ride not found');
  }

  if (!config.allowedCurrent.includes(ride.liveStatus)) {
    throw new ApiError(409, `Ride cannot move from ${ride.liveStatus} to ${nextStatus}`);
  }

  const previousLiveStatus = ride.liveStatus;

  // started -> started is the idempotent re-publish the driver app sends over
  // the socket after its REST call; the PIN was already checked on the way in.
  if (nextStatus === RIDE_LIVE_STATUS.STARTED && previousLiveStatus !== RIDE_LIVE_STATUS.STARTED) {
    await verifyRideStartOtp(ride, otp);
  }

  const updates = {
    liveStatus: nextStatus,
    status: config.persistedStatus,
  };

  if (nextStatus === RIDE_LIVE_STATUS.ACCEPTED) {
    updates.arrivedAt = null;
  }

  if (nextStatus === RIDE_LIVE_STATUS.ARRIVING && !ride.arrivedAt) {
    updates.arrivedAt = new Date();
  }

  if (nextStatus === RIDE_LIVE_STATUS.STARTED && !ride.startedAt) {
    updates.startedAt = new Date();
    updates.otpFailedAttempts = 0;
    updates.otpLockedUntil = null;
  }

  if (paymentMethod !== undefined && paymentMethod !== null && String(paymentMethod).trim()) {
    const requestedPaymentMethod = normalizeRidePaymentMethod(paymentMethod);

    /*
     * Wallet settlement below reads ride.paymentMethod alone to decide
     * whether to credit the driver the full fare ('online') or just deduct
     * commission ('cash') — it has no other signal that money actually
     * moved. A driver claiming 'online' with no verified collection would
     * self-credit the fare for free on top of any cash already pocketed, so
     * that claim is only honoured when it was already the ride's booked
     * method or a QR/Razorpay collection has actually been verified paid.
     */
    if (requestedPaymentMethod !== 'online' || ride.paymentMethod === 'online' || hasVerifiedOnlinePaymentCollection(ride)) {
      updates.paymentMethod = requestedPaymentMethod;
    }
  }

  if (nextStatus === RIDE_LIVE_STATUS.COMPLETED) {
    updates.completedAt = new Date();
  }

  /*
   * Conditional on the status we validated against. This used to be a
   * read-then-save, so a rider cancelling between the read and the save had
   * the cancellation silently overwritten by the driver's update (and a
   * cancelled ride could then be completed and settled).
   */
  const updatedRide = await Ride.findOneAndUpdate(
    {
      _id: ride._id,
      driverId,
      liveStatus: previousLiveStatus,
      status: { $ne: RIDE_STATUS.CANCELLED },
    },
    { $set: updates },
    { returnDocument: 'after' },
  );

  if (!updatedRide) {
    throw new ApiError(409, 'Ride status changed. Please refresh and try again.');
  }

  // A repeat 'completed' must not settle the wallet twice: only the call that
  // actually moved the ride into completed runs the side effects below.
  const justCompleted = nextStatus === RIDE_LIVE_STATUS.COMPLETED && previousLiveStatus !== RIDE_LIVE_STATUS.COMPLETED;

  let walletUpdate = null;

  if (justCompleted) {
    await Promise.all([
      User.findByIdAndUpdate(updatedRide.userId, { currentRideId: null }),
      Driver.findByIdAndUpdate(driverId, { isOnRide: false }),
    ]);

    walletUpdate = await settleCompletedRideWallet({ rideId: ride._id });
    const settledRide = await Ride.findById(ride._id).select('completedAt driverEarnings estimatedDistanceMeters');

    await incrementDriverTodaySummaryForCompletedRide({
      driverId,
      completedAt: settledRide?.completedAt || updatedRide.completedAt,
      driverEarnings: settledRide?.driverEarnings,
      distanceMeters: settledRide?.estimatedDistanceMeters,
    });

    await processCompletedRideReferralReward(updatedRide);
    await processCompletedDriverReferralReward(updatedRide);
  }

  const populatedRide = await populateRideRealtime(ride._id);
  populatedRide.$locals.walletUpdate = walletUpdate;

  return populatedRide;
};

export const appendRideMessage = async ({ rideId, role, senderId, message }) => {
  const trimmedMessage = String(message || '').trim();

  if (!trimmedMessage) {
    throw new ApiError(400, 'Message is required');
  }

  if (!['user', 'driver'].includes(role)) {
    throw new ApiError(403, 'Only rider and driver can send ride messages');
  }

  await ensureRideParticipantAccess({ rideId, role, entityId: senderId });

  const ride = await Ride.findById(rideId);

  if (!ride) {
    throw new ApiError(404, 'Ride not found');
  }

  ride.messages.push({
    senderRole: role,
    senderId,
    message: trimmedMessage,
  });

  if (ride.messages.length > 200) {
    ride.messages = ride.messages.slice(-200);
  }

  await ride.save();

  const latestMessage = ride.messages[ride.messages.length - 1];

  return {
    id: String(latestMessage._id),
    rideId: String(ride._id),
    senderRole: latestMessage.senderRole,
    senderId: String(latestMessage.senderId),
    message: latestMessage.message,
    sentAt: latestMessage.sentAt,
  };
};

export const updateRideDriverLocation = async ({ rideId, driverId, coordinates, heading = null, speed = null }) => {
  const normalizedCoords = normalizePoint(coordinates, 'coordinates');
  const nextDriverLocation = {
    type: 'Point',
    coordinates: normalizedCoords,
    heading: Number.isFinite(Number(heading)) ? Number(heading) : null,
    speed: Number.isFinite(Number(speed)) ? Number(speed) : null,
    updatedAt: new Date(),
  };
  const ride = await Ride.findOneAndUpdate(
    { _id: rideId, driverId },
    {
      $set: {
        lastDriverLocation: nextDriverLocation,
      },
    },
    {
      returnDocument: 'after',
      projection: {
        _id: 1,
        lastDriverLocation: 1,
      },
    },
  ).lean();

  if (!ride) {
    throw new ApiError(404, 'Assigned ride not found');
  }

  return {
    rideId: String(ride._id),
    coordinates: ride.lastDriverLocation?.coordinates || normalizedCoords,
    heading: ride.lastDriverLocation.heading,
    speed: ride.lastDriverLocation.speed,
    updatedAt: ride.lastDriverLocation.updatedAt,
  };
};

export const submitRideFeedback = async ({ rideId, userId, rating, comment = '', tipAmount = 0 }) => {
  const numericRating = Number(rating);
  const numericTip = Number(tipAmount || 0);

  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw new ApiError(400, 'rating must be an integer between 1 and 5');
  }

  if (!Number.isFinite(numericTip) || numericTip < 0) {
    throw new ApiError(400, 'tipAmount must be zero or greater');
  }

  const tipSettings = await getTipSettings();
  const tipsEnabled = String(tipSettings.enable_tips || '1') === '1';
  const minimumTipAmount = Number(tipSettings.min_tip_amount || 0);

  if (!tipsEnabled && numericTip > 0) {
    throw new ApiError(400, 'Tips are currently disabled');
  }

  if (
    tipsEnabled &&
    numericTip > 0 &&
    Number.isFinite(minimumTipAmount) &&
    minimumTipAmount > 0 &&
    numericTip < minimumTipAmount
  ) {
    throw new ApiError(400, `tipAmount must be at least ${minimumTipAmount}`);
  }

  const ride = await Ride.findOne({
    _id: rideId,
    userId,
    status: RIDE_STATUS.COMPLETED,
  });

  if (!ride) {
    throw new ApiError(404, 'Completed ride not found');
  }

  if (!ride.driverId) {
    throw new ApiError(409, 'Ride has no assigned driver');
  }

  if (ride.feedback?.submittedAt) {
    throw new ApiError(409, 'Feedback already submitted for this ride');
  }

  const driver = await Driver.findById(ride.driverId);

  if (!driver) {
    throw new ApiError(404, 'Driver not found');
  }

  ride.feedback = {
    rating: numericRating,
    comment: String(comment || '').trim(),
    tipAmount: numericTip,
    submittedAt: new Date(),
  };

  driver.ratingCount = Number(driver.ratingCount || 0) + 1;
  driver.totalRatingScore = Number(driver.totalRatingScore || 0) + numericRating;
  driver.rating = Number((driver.totalRatingScore / driver.ratingCount).toFixed(1));

  await Promise.all([ride.save(), driver.save()]);

  return populateRideRealtime(ride._id);
};
