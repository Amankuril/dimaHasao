import QRCode from "qrcode";
import { Env, StandardCheckoutClient, StandardCheckoutPayRequest, PrefillUserLoginDetails } from "@phonepe-pg/pg-sdk-node";
import { env } from "../../../../config/env.js";
import { ApiError } from "../../../../utils/ApiError.js";
import { normalizePoint, toPoint } from "../../../../utils/geo.js";
import { Driver } from "../models/Driver.js";
import { DriverLoginSession } from "../models/DriverLoginSession.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { WithdrawalRequest } from "../../admin/models/WithdrawalRequest.js";
import { Ride } from "../../user/models/Ride.js";
import { Vehicle } from "../../admin/models/Vehicle.js";
import { AdminBusinessSetting } from "../../admin/models/AdminBusinessSetting.js";
import { Notification } from "../../admin/promotions/models/Notification.js";
import {
  comparePassword,
  hashPassword,
  signAccessToken,
} from "../services/authService.js";
import { cancelScheduledRideByDriver, emitToDriver } from "../../services/dispatchService.js";
import { notifyLateAvailableDriver } from "../../services/dispatchService.js";
import { findZoneByPickup } from "../services/locationService.js";
import { listDriverServiceLocations } from "../services/serviceLocationService.js";
import {
  applyDriverWalletAdjustment,
  ensureDriverWalletCanAcceptRide,
  serializeDriverWallet,
  topUpDriverWallet,
} from "../services/walletService.js";
import {
  startDriverLoginOtp,
  verifyDriverLoginOtp,
} from "../services/loginOtpService.js";
import { verifyAccessToken } from "../../services/tokenService.js";
import { clearDriverActiveRideIfStale } from "../../services/rideService.js";
import { getWalletSettings } from "../../services/appSettingsService.js";
import { RIDE_LIVE_STATUS, RIDE_STATUS } from "../../constants/index.js";
import { listDriverNeededDocuments, listDriverVehicleFieldTemplates } from "../../admin/services/adminService.js";


import { resolveConfiguredGatewayCredentials } from "../../services/paymentGatewayService.js";
import { assignPushTokenToEntity } from "../../services/pushTokenService.js";
import { completeDriverOnboarding, getDriverOnboardingSession, saveDriverDocuments, saveDriverPersonalDetails, saveDriverReferral, saveDriverVehicle, startDriverOnboarding, verifyDriverOtp } from "../services/onboardingService.js";


import {
  buildDriverTodaySummaryFromDocument,
  syncDriverTodaySummaryDocument,
} from "../services/driverTodaySummaryService.js";
import {
  buildPaymentRequestContext,
  logPaymentDiagnostic,
  summarizeCheckoutUrl,
  summarizePhonePeCredentialMeta,
  summarizePhonePePayload,
  summarizePhonePeRequestBody,
} from "../../services/paymentDiagnostics.js";
import { computeExpectedSignature } from '../../../../core/payments/razorpay.service.js';
import { taxiRazorpayRequest } from "../../services/razorpayClient.js";

const generateDriverReferralCode = (driver) => {
  const idPart = String(driver?._id || "")
    .slice(-6)
    .toUpperCase();
  const phonePart = String(driver?.phone || "").slice(-4);
  return `DRV${phonePart}${idPart}`.replace(/\W/g, "");
};

const MAX_EMERGENCY_CONTACTS = 5;
const EMERGENCY_CONTACT_NAME_REGEX = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const DRIVER_NAME_REGEX = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RAZORPAY_QR_MAX_AMOUNT = 500000;
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const toIstDayKey = (value = new Date()) =>
  new Date(new Date(value).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

const toCleanString = (value = "") => String(value || "").trim();
const serializeDriverRouteBooking = (routeBooking = {}) => {
  const coordinates = Array.isArray(routeBooking?.anchorLocation?.coordinates)
    ? routeBooking.anchorLocation.coordinates
    : [];

  return {
    enabled: Boolean(routeBooking?.enabled && coordinates.length === 2),
    coordinates: coordinates.length === 2 ? coordinates : null,
    label: String(routeBooking?.label || "").trim(),
    updatedAt: routeBooking?.updatedAt || null,
  };
};

const serializeDriverBankDetails = (bankDetails = {}) => ({
  accountHolderName: String(bankDetails?.accountHolderName || "").trim(),
  upiId: String(bankDetails?.upiId || "").trim(),
  qrCodeImage: String(bankDetails?.qrCodeImage || "").trim(),
  accountNumber: String(bankDetails?.accountNumber || "").trim(),
  ifsc: String(bankDetails?.ifsc || "").trim().toUpperCase(),
  branchName: String(bankDetails?.branchName || "").trim(),
  verificationStatus: String(bankDetails?.verificationStatus || "").trim(),
  verificationMode: String(bankDetails?.verificationMode || "").trim(),
  verificationMessage: String(bankDetails?.verificationMessage || "").trim(),
  verificationReferenceId: String(bankDetails?.verificationReferenceId || "").trim(),
  verifiedBankName: String(bankDetails?.verifiedBankName || "").trim(),
  verifiedBranchName: String(bankDetails?.verifiedBranchName || "").trim(),
  verifiedAccountHolderName: String(bankDetails?.verifiedAccountHolderName || "").trim(),
  verifiedAt: bankDetails?.verifiedAt || null,
  upiVerificationStatus: String(bankDetails?.upiVerificationStatus || "").trim(),
  upiVerificationMode: String(bankDetails?.upiVerificationMode || "").trim(),
  upiVerificationMessage: String(bankDetails?.upiVerificationMessage || "").trim(),
  upiVerificationReferenceId: String(bankDetails?.upiVerificationReferenceId || "").trim(),
  upiVerifiedName: String(bankDetails?.upiVerifiedName || "").trim(),
  upiAccountIfsc: String(bankDetails?.upiAccountIfsc || "").trim(),
  upiAccountType: String(bankDetails?.upiAccountType || "").trim(),
  upiVerifiedAt: bankDetails?.upiVerifiedAt || null,
  updatedAt: bankDetails?.updatedAt || null,
});

const normalizeDriverBankDetails = (payload = {}, existing = {}) => {
  const next = serializeDriverBankDetails(existing);
  let shouldResetVerification = false;

  if (Object.prototype.hasOwnProperty.call(payload, "accountHolderName")) {
    const accountHolderName = String(payload.accountHolderName || "").trim().slice(0, 120);
    shouldResetVerification = shouldResetVerification || accountHolderName !== next.accountHolderName;
    next.accountHolderName = accountHolderName;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "upiId")) {
    const upiId = String(payload.upiId || "").trim().toLowerCase();
    if (upiId && !/^[a-z0-9.\-_]{2,}@[a-z0-9.\-_]{2,}$/i.test(upiId)) {
      throw new ApiError(400, "Enter a valid UPI ID");
    }
    if (upiId !== next.upiId) {
      next.upiVerificationStatus = "";
      next.upiVerificationMode = "";
      next.upiVerificationMessage = "";
      next.upiVerificationReferenceId = "";
      next.upiVerifiedName = "";
      next.upiAccountIfsc = "";
      next.upiAccountType = "";
      next.upiVerifiedAt = null;
    }
    next.upiId = upiId;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "qrCodeImage")) {
    next.qrCodeImage = String(payload.qrCodeImage || "").trim();
  }

  if (Object.prototype.hasOwnProperty.call(payload, "accountNumber")) {
    const accountNumber = String(payload.accountNumber || "").replace(/\s/g, "");
    if (accountNumber && !/^\d{6,20}$/.test(accountNumber)) {
      throw new ApiError(400, "Account number must be 6 to 20 digits");
    }
    shouldResetVerification = shouldResetVerification || accountNumber !== next.accountNumber;
    next.accountNumber = accountNumber;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "ifsc")) {
    const ifsc = String(payload.ifsc || "").trim().toUpperCase();
    if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      throw new ApiError(400, "Enter a valid IFSC code");
    }
    shouldResetVerification = shouldResetVerification || ifsc !== next.ifsc;
    next.ifsc = ifsc;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "branchName")) {
    next.branchName = String(payload.branchName || "").trim().slice(0, 120);
  }

  if (shouldResetVerification) {
    next.verificationStatus = "";
    next.verificationMode = "";
    next.verificationMessage = "";
    next.verificationReferenceId = "";
    next.verifiedBankName = "";
    next.verifiedBranchName = "";
    next.verifiedAccountHolderName = "";
    next.verifiedAt = null;
  }

  next.updatedAt = new Date();
  return next;
};

const getIstDayStart = (value = new Date()) => {
  const timestamp = new Date(value).getTime();
  const shifted = timestamp + IST_OFFSET_MS;
  const dayStartShifted = Math.floor(shifted / DAY_MS) * DAY_MS;
  return new Date(dayStartShifted - IST_OFFSET_MS);
};

const getIstWeekKey = (value = new Date()) => {
  const dayStart = getIstDayStart(value);
  const shifted = dayStart.getTime() + IST_OFFSET_MS;
  const shiftedDate = new Date(shifted);
  const day = shiftedDate.getUTCDay();
  const mondayDistance = day === 0 ? 6 : day - 1;
  const weekStart = new Date(dayStart.getTime() - mondayDistance * DAY_MS);
  return toIstDayKey(weekStart);
};

const getIstMonthKey = (value = new Date()) => {
  const shifted = new Date(new Date(value).getTime() + IST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const getConfiguredAppName = async () => {
  try {
    const settings = await AdminBusinessSetting.findOne({ scope: "default" })
      .select("general.app_name")
      .lean();

    return String(settings?.general?.app_name || "").trim() || "App";
  } catch {
    return "App";
  }
};

const pruneDailyActivity = (items = []) =>
  (Array.isArray(items) ? items : [])
    .filter((item) => item?.date)
    .sort((left, right) => String(left.date).localeCompare(String(right.date)))
    .slice(-120);

const pruneClaimedRewards = (items = []) =>
  (Array.isArray(items) ? items : [])
    .filter((item) => item?.rewardType && item?.rewardKey)
    .sort((left, right) => new Date(left.claimedAt || 0) - new Date(right.claimedAt || 0))
    .slice(-200);

const appendDailyActivityMinutes = (dailyActivity = [], dateKey, minutes) => {
  const safeMinutes = Math.max(0, Number(minutes || 0));
  if (!dateKey || safeMinutes <= 0) {
    return pruneDailyActivity(dailyActivity);
  }

  const next = [...(Array.isArray(dailyActivity) ? dailyActivity : [])];
  const index = next.findIndex((item) => item?.date === dateKey);

  if (index >= 0) {
    next[index] = {
      ...next[index],
      activeMinutes: Math.round((Number(next[index]?.activeMinutes || 0) + safeMinutes) * 100) / 100,
    };
  } else {
    next.push({
      date: dateKey,
      activeMinutes: Math.round(safeMinutes * 100) / 100,
    });
  }

  return pruneDailyActivity(next);
};

const mergeOnlineSessionIntoTracking = (tracking = {}, sessionStart, sessionEnd = new Date()) => {
  const start = sessionStart ? new Date(sessionStart) : null;
  const end = sessionEnd ? new Date(sessionEnd) : null;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return {
      ...tracking,
      dailyActivity: pruneDailyActivity(tracking?.dailyActivity),
    };
  }

  let cursor = new Date(start);
  let nextDailyActivity = Array.isArray(tracking?.dailyActivity) ? [...tracking.dailyActivity] : [];

  while (cursor < end) {
    const nextDayStart = new Date(getIstDayStart(cursor).getTime() + DAY_MS);
    const segmentEnd = nextDayStart < end ? nextDayStart : end;
    const minutes = (segmentEnd.getTime() - cursor.getTime()) / 60000;
    nextDailyActivity = appendDailyActivityMinutes(nextDailyActivity, toIstDayKey(cursor), minutes);
    cursor = segmentEnd;
  }

  return {
    ...tracking,
    dailyActivity: nextDailyActivity,
  };
};

const collectWeekWindows = (count = 1, fromDate = new Date()) => {
  const total = Math.max(1, Number(count || 1));
  const windows = [];
  const currentDayStart = getIstDayStart(fromDate);
  const shifted = currentDayStart.getTime() + IST_OFFSET_MS;
  const shiftedDate = new Date(shifted);
  const day = shiftedDate.getUTCDay();
  const mondayDistance = day === 0 ? 6 : day - 1;
  const currentWeekStart = new Date(currentDayStart.getTime() - mondayDistance * DAY_MS);

  for (let index = 0; index < total; index += 1) {
    const start = new Date(currentWeekStart.getTime() - index * 7 * DAY_MS);
    const end = new Date(start.getTime() + 7 * DAY_MS);
    windows.unshift({
      key: toIstDayKey(start),
      start,
      end,
    });
  }

  return windows;
};

const countCompletedRidesInRange = (rides = [], start, end) =>
  rides.filter((ride) => {
    const status = String(ride?.status || "").toLowerCase();
    const liveStatus = String(ride?.liveStatus || "").toLowerCase();
    if (!["completed", "delivered"].includes(status) && !["completed", "delivered"].includes(liveStatus)) {
      return false;
    }

    const rideDate = new Date(ride?.completedAt || ride?.updatedAt || ride?.createdAt || 0);
    return rideDate >= start && rideDate < end;
  }).length;

const countPeakHourTripsInRange = (rides = [], start, end) =>
  rides.filter((ride) => {
    const status = String(ride?.status || "").toLowerCase();
    const liveStatus = String(ride?.liveStatus || "").toLowerCase();
    if (!["completed", "delivered"].includes(status) && !["completed", "delivered"].includes(liveStatus)) {
      return false;
    }
    const rideDate = new Date(ride?.completedAt || ride?.updatedAt || ride?.createdAt || 0);
    if (!(rideDate >= start && rideDate < end)) {
      return false;
    }
    const hour = new Date(rideDate.getTime() + IST_OFFSET_MS).getUTCHours();
    return (hour >= 7 && hour < 11) || (hour >= 17 && hour < 21);
  }).length;

const getCurrentActiveStreak = (dailyActivity = [], minimumMinutes = 1) => {
  const activityMap = new Map((Array.isArray(dailyActivity) ? dailyActivity : []).map((item) => [item.date, Number(item.activeMinutes || 0)]));
  let streak = 0;
  let cursor = getIstDayStart(new Date());

  while (true) {
    const key = toIstDayKey(cursor);
    const minutes = Number(activityMap.get(key) || 0);
    if (minutes < minimumMinutes) {
      break;
    }
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  return streak;
};

const hasClaimedReward = (claimedRewards = [], rewardType, rewardKey, periodKey) =>
  (Array.isArray(claimedRewards) ? claimedRewards : []).some((item) =>
    item?.rewardType === rewardType &&
    item?.rewardKey === rewardKey &&
    item?.periodKey === periodKey,
  );

const buildDriverIncentiveSnapshot = ({ driver, settings, rides }) => {
  const tracking = driver?.incentiveTracking || {};
  const dailyActivity = Array.isArray(tracking.dailyActivity) ? tracking.dailyActivity : [];
  const claimedRewards = Array.isArray(tracking.claimedRewards) ? tracking.claimedRewards : [];
  const milestonePrograms = Array.isArray(settings?.milestone_programs) ? settings.milestone_programs : [];
  const rewardFeatures = Array.isArray(settings?.reward_features) ? settings.reward_features : [];
  const dailyActivityMap = new Map(dailyActivity.map((item) => [item.date, Number(item.activeMinutes || 0)]));

  const milestones = milestonePrograms.map((item, index) => {
    const requiredWeeks = Math.max(1, Number(item.required_weeks || 1));
    const requiredHours = Math.max(0, Number(item.active_hours_per_day || 0));
    const minTripsPerWeek = Math.max(0, Number(item.min_trips_per_week || 0));
    const weekWindows = collectWeekWindows(requiredWeeks, new Date());
    const qualifyingWeeks = weekWindows.filter((week) => {
      const tripCount = countCompletedRidesInRange(rides, week.start, week.end);
      return tripCount >= minTripsPerWeek;
    }).length;

    const targetDays = requiredWeeks * 7;
    let qualifyingDays = 0;
    for (let offset = 0; offset < targetDays; offset += 1) {
      const day = new Date(getIstDayStart(new Date()).getTime() - offset * DAY_MS);
      const dayKey = toIstDayKey(day);
      if ((Number(dailyActivityMap.get(dayKey) || 0) / 60) >= requiredHours) {
        qualifyingDays += 1;
      }
    }

    const periodKey = `milestone:${item.id || index}`;
    const eligible = Boolean(item.enabled) && qualifyingWeeks >= requiredWeeks && qualifyingDays >= targetDays;

    return {
      ...item,
      periodKey,
      progress: {
        qualifyingWeeks,
        targetWeeks: requiredWeeks,
        qualifyingDays,
        targetDays,
      },
      isEligible: eligible,
      isClaimed: hasClaimedReward(claimedRewards, "milestone", item.id || String(index), periodKey),
    };
  });

  const currentWeekWindow = collectWeekWindows(1, new Date())[0];
  const currentWeekTrips = currentWeekWindow ? countCompletedRidesInRange(rides, currentWeekWindow.start, currentWeekWindow.end) : 0;
  const currentPeakTrips = currentWeekWindow ? countPeakHourTripsInRange(rides, currentWeekWindow.start, currentWeekWindow.end) : 0;
  const currentStreak = getCurrentActiveStreak(dailyActivity, 1);
  const weekendCount = collectWeekWindows(4, new Date()).reduce((total, week) => {
    const saturday = new Date(week.start.getTime() + 5 * DAY_MS);
    const sunday = new Date(week.start.getTime() + 6 * DAY_MS);
    const weekendTrips = countCompletedRidesInRange(rides, saturday, new Date(sunday.getTime() + DAY_MS));
    return total + (weekendTrips > 0 ? 1 : 0);
  }, 0);
  const currentMonthKey = getIstMonthKey(new Date());
  const monthStart = new Date(`${currentMonthKey}-01T00:00:00.000Z`);
  const monthCompleted = rides.filter((ride) => {
    const status = String(ride?.status || "").toLowerCase();
    const liveStatus = String(ride?.liveStatus || "").toLowerCase();
    if (!["completed", "delivered"].includes(status) && !["completed", "delivered"].includes(liveStatus)) {
      return false;
    }
    const rideDate = new Date(ride?.completedAt || ride?.updatedAt || ride?.createdAt || 0);
    return getIstMonthKey(rideDate) === currentMonthKey;
  }).length;
  const monthCancelled = rides.filter((ride) => {
    const status = String(ride?.status || "").toLowerCase();
    return status === "cancelled" && getIstMonthKey(new Date(ride?.updatedAt || ride?.createdAt || 0)) === currentMonthKey;
  }).length;
  const cancellationRate = monthCompleted + monthCancelled > 0
    ? Number(((monthCancelled / (monthCompleted + monthCancelled)) * 100).toFixed(2))
    : 0;

  const features = rewardFeatures.map((item, index) => {
    const key = item.key || item.id || `feature_${index + 1}`;
    let currentValue = 0;
    let periodKey = key;

    switch (key) {
      case "daily_active_streak":
        currentValue = currentStreak;
        periodKey = `${key}:${getIstWeekKey(new Date())}`;
        break;
      case "weekly_trip_quest":
        currentValue = currentWeekTrips;
        periodKey = `${key}:${getIstWeekKey(new Date())}`;
        break;
      case "peak_hour_booster":
        currentValue = currentPeakTrips;
        periodKey = `${key}:${getIstWeekKey(new Date())}`;
        break;
      case "weekend_warrior":
        currentValue = weekendCount;
        periodKey = `${key}:${currentMonthKey}`;
        break;
      case "rating_guard":
        currentValue = Number(driver?.rating || 0);
        periodKey = `${key}:${currentMonthKey}`;
        break;
      case "cancellation_guard":
        currentValue = cancellationRate;
        periodKey = `${key}:${currentMonthKey}`;
        break;
      default:
        currentValue = Number(item.target_value || 0);
        periodKey = `${key}:${currentMonthKey}`;
        break;
    }

    const target = Number(item.target_value || 0);
    const isEligible = key === "cancellation_guard"
      ? currentValue <= target
      : currentValue >= target;

    return {
      ...item,
      key,
      periodKey,
      currentValue,
      targetValue: target,
      isEligible: Boolean(item.enabled) && isEligible,
      isClaimed: hasClaimedReward(claimedRewards, "feature", key, periodKey),
    };
  });

  return {
    settings: {
      enabled: Boolean(settings?.enabled),
      milestone_program_enabled: Boolean(settings?.milestone_program_enabled),
      type: settings?.type || "instant_referrer",
    },
    summary: {
      streakDays: currentStreak,
      currentWeekTrips,
      currentPeakTrips,
      weekendCount,
      monthCancellationRate: cancellationRate,
      totalClaimedRewards: claimedRewards.length,
    },
    milestones,
    features,
    claimedRewards,
    walletBalance: Number(driver?.wallet?.balance || 0),
  };
};

const normalizePaymentAmount = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "amount must be a positive number");
  }

  if (amount > RAZORPAY_QR_MAX_AMOUNT) {
    throw new ApiError(400, "amount is too large for QR collection");
  }

  return Math.round(amount * 100);
};

const razorpayRequest = async ({ method, path, body }) => {
  const { keyId, keySecret } = await resolveConfiguredGatewayCredentials("razor_pay");
  return taxiRazorpayRequest({ method, path, body, keyId, keySecret });
};

const shouldFallbackToPaymentLinkQr = (error) => {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.statusCode === 404 ||
    message.includes("requested url was not found") ||
    message.includes("qr") && message.includes("not") && message.includes("enabled")
  );
};

const shouldFallbackToStandardPaymentLink = (error) => {
  const message = String(error?.message || "").toLowerCase();

  return (
    message.includes("upi payment links are not supported in test mode") ||
    message.includes("upi payment link") && message.includes("test mode")
  );
};

const buildPaymentLinkBody = ({ amountInPaise, rideId, driverId, serviceType, expireBy, referenceId, upiLink }) => ({
  ...(upiLink ? { upi_link: true } : {}),
  amount: amountInPaise,
  currency: "INR",
  accept_partial: false,
  expire_by: expireBy,
  reference_id: referenceId,
  description: `Taxi fare for ride ${rideId}`,
  reminder_enable: false,
  notes: {
    rideId: String(rideId),
    driverId: String(driverId),
    serviceType: serviceType || "ride",
    source: "driver_collect_amount",
    fallback: upiLink ? "upi_payment_link_qr" : "standard_payment_link_qr",
  },
});

const createPaymentLinkQr = async ({ amountInPaise, rideId, driverId, serviceType }) => {
  const referenceId = `ride_${String(rideId).slice(-18)}_${Date.now().toString(36)}`.slice(0, 40);
  const expireBy = Math.floor(Date.now() / 1000) + 30 * 60;
  let providerMode = "upi_payment_link_qr";
  let paymentLink;

  try {
    paymentLink = await razorpayRequest({
      method: "POST",
      path: "/payment_links",
      body: buildPaymentLinkBody({
        amountInPaise,
        rideId,
        driverId,
        serviceType,
        expireBy,
        referenceId,
        upiLink: true,
      }),
    });
  } catch (error) {
    if (!shouldFallbackToStandardPaymentLink(error)) {
      throw error;
    }

    providerMode = "standard_payment_link_qr";
    paymentLink = await razorpayRequest({
      method: "POST",
      path: "/payment_links",
      body: buildPaymentLinkBody({
        amountInPaise,
        rideId,
        driverId,
        serviceType,
        expireBy,
        referenceId: `${referenceId}_std`.slice(0, 40),
        upiLink: false,
      }),
    });
  }

  const paymentUrl = paymentLink.short_url || paymentLink.shortUrl || paymentLink.url;

  if (!paymentUrl) {
    throw new ApiError(502, "Razorpay payment link was created without a payment URL");
  }

  const imageUrl = await QRCode.toDataURL(paymentUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 8,
  });

  return {
    id: paymentLink.id,
    entity: paymentLink.entity || "payment_link",
    status: paymentLink.status || "created",
    imageUrl,
    linkUrl: paymentUrl,
    amount: amountInPaise / 100,
    currency: "INR",
    description: paymentLink.description,
    closeBy: paymentLink.expire_by || expireBy,
    rawStatus: paymentLink.status || "created",
    providerMode,
  };
};

const PAYMENT_PAID_STATUSES = new Set(["paid", "captured", "completed"]);
const PAYMENT_OPEN_STATUSES = new Set(["created", "active", "issued", "partially_paid"]);

const normalizeCollectionStatus = (status) => {
  const normalized = String(status || "").toLowerCase();

  if (PAYMENT_PAID_STATUSES.has(normalized)) {
    return "paid";
  }

  if (PAYMENT_OPEN_STATUSES.has(normalized)) {
    return normalized === "partially_paid" ? "active" : normalized;
  }

  if (normalized === "closed") {
    return "closed";
  }

  if (["cancelled", "canceled", "expired", "failed"].includes(normalized)) {
    return normalized === "canceled" ? "cancelled" : normalized;
  }

  return normalized || "pending";
};

const getPaymentCollectionPath = ({ providerId, providerMode }) => {
  if (!providerId) {
    throw new ApiError(400, "payment collection id is required");
  }

  if (String(providerMode || "").includes("payment_link")) {
    return `/payment_links/${providerId}`;
  }

  return `/payments/qr_codes/${providerId}`;
};

const serializeDriverPaymentCollection = (collection = {}) => {
  const status = normalizeCollectionStatus(collection.status);

  return {
    provider: collection.provider || "razorpay",
    id: collection.providerId || collection.id || "",
    providerMode: collection.providerMode || "",
    status,
    paid: PAYMENT_PAID_STATUSES.has(status),
    amount: Number(collection.amount || 0),
    currency: collection.currency || "INR",
    linkUrl: collection.linkUrl || "",
    paidAt: collection.paidAt || null,
    updatedAt: collection.updatedAt || null,
  };
};

const refreshDriverPaymentCollection = async (ride) => {
  const collection = ride?.driverPaymentCollection || {};
  const providerId = String(collection.providerId || "").trim();

  if (!providerId) {
    return serializeDriverPaymentCollection(collection);
  }

  const providerMode = collection.providerMode || "";
  const providerPayload = await razorpayRequest({
    method: "GET",
    path: getPaymentCollectionPath({ providerId, providerMode }),
  });
  const receivedAmount = Number(
    providerPayload?.amount_paid ||
      providerPayload?.amount_paid_total ||
      providerPayload?.payments_amount_received ||
      providerPayload?.amount_received ||
      0,
  );
  const expectedAmount = Number(collection.amount || 0) * 100;
  const isProviderAmountPaid = expectedAmount > 0 && receivedAmount >= expectedAmount;
  const providerStatus = normalizeCollectionStatus(providerPayload?.status);
  const isPaid = PAYMENT_PAID_STATUSES.has(providerStatus) || isProviderAmountPaid;
  const nextStatus = isPaid ? "paid" : providerStatus;
  const nextCollection = {
    provider: "razorpay",
    providerId,
    providerMode,
    status: nextStatus,
    amount: Number(collection.amount || 0),
    currency: collection.currency || "INR",
    linkUrl: collection.linkUrl || providerPayload?.short_url || providerPayload?.url || "",
    paidAt: isPaid ? collection.paidAt || new Date() : collection.paidAt || null,
    updatedAt: new Date(),
  };

  ride.driverPaymentCollection = nextCollection;
  await ride.save();

  return serializeDriverPaymentCollection(nextCollection);
};

const sanitizeEmergencyPhone = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(-10);

const serializeEmergencyContact = (contact = {}) => ({
  id: String(contact._id || contact.id || ""),
  name: String(contact.name || "").trim(),
  phone: sanitizeEmergencyPhone(contact.phone),
  source:
    String(contact.source || "manual").toLowerCase() === "device"
      ? "device"
      : "manual",
});

const resolveVehicleMapIcon = async (vehicleTypeId) => {
  if (!vehicleTypeId) {
    return "";
  }

  const vehicle = await Vehicle.findById(vehicleTypeId).select("icon map_icon image").lean();
  return vehicle?.map_icon || vehicle?.icon || vehicle?.image || "";
};

const serializeDriverNotification = (item = {}) => ({
  id: String(item._id || ""),
  title: String(item.push_title || "").trim(),
  body: String(item.message || "").trim(),
  image: String(item.image || "").trim(),
  sendTo: String(item.send_to || "all").trim(),
  serviceLocationName: String(item.service_location_name || "").trim(),
  sentAt: item.sent_at || item.createdAt || null,
  createdAt: item.createdAt || null,
});

const serializeDriverScheduledRide = (ride = {}, currentDriverId = "") => ({
  rideId: String(ride._id || ""),
  type: ride.serviceType || "ride",
  serviceType: ride.serviceType || "ride",
  status: ride.status || RIDE_STATUS.SEARCHING,
  liveStatus: ride.liveStatus || RIDE_LIVE_STATUS.SEARCHING,
  fare: Number(ride.fare || 0),
  baseFare: Number(ride.baseFare || ride.fare || 0),
  bookingMode: ride.bookingMode || "normal",
  estimatedDistanceMeters: Number(ride.estimatedDistanceMeters || 0),
  estimatedDurationMinutes: Number(ride.estimatedDurationMinutes || 0),
  paymentMethod: ride.paymentMethod || "cash",
  pickupLocation: ride.pickupLocation || null,
  pickupAddress: ride.pickupAddress || "",
  dropLocation: ride.dropLocation || null,
  dropAddress: ride.dropAddress || "",
  scheduledAt: ride.scheduledAt || null,
  intercity: ride.intercity || null,
  driverId: ride.driverId ? String(ride.driverId) : null,
  isAssignedToCurrentDriver:
    Boolean(ride.driverId) && String(ride.driverId) === String(currentDriverId || ""),
  vehicleTypeId: ride.vehicleTypeId ? String(ride.vehicleTypeId) : null,
  vehicleTypeIds: Array.isArray(ride.dispatchVehicleTypeIds)
    ? ride.dispatchVehicleTypeIds.map((item) => String(item))
    : [],
  serviceLocationId: ride.service_location_id ? String(ride.service_location_id) : null,
  transportType: ride.transport_type || "taxi",
  user: ride.userId
    ? {
        id: String(ride.userId._id || ""),
        name: ride.userId.name || "Customer",
        phone: ride.userId.phone || "",
        countryCode: ride.userId.countryCode || "",
      }
    : null,
  createdAt: ride.createdAt || null,
  updatedAt: ride.updatedAt || null,
});

export const registerDriver = async (req, res) => {
  const { name, phone, password, vehicleType, location } = req.body;

  if (!name || !phone || !password || !vehicleType || !location) {
    throw new ApiError(
      400,
      "name, phone, password, vehicleType and location are required",
    );
  }

  const existingDriver = await Driver.findOne({ phone });

  if (existingDriver) {
    throw new ApiError(409, "Phone number is already registered");
  }

  const coordinates = normalizePoint(location, "location");
  const zone = await findZoneByPickup(coordinates);

  const driver = await Driver.create({
    name,
    phone,
    password: await hashPassword(password),
    vehicleType,
    approve: true,
    status: "approved",
    zoneId: zone?._id || null,
    location: toPoint(coordinates, "location"),
  });

  const token = signAccessToken({ sub: String(driver._id), role: "driver" });

  res.status(201).json({
    success: true,
    data: {
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        rating: driver.rating,
        status: driver.status,
      },
    },
  });
};

export const loginDriver = async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    throw new ApiError(400, "phone and password are required");
  }

  const driver = await Driver.findOne({ phone }).select("+password");

  if (!driver || !(await comparePassword(password, driver.password))) {
    throw new ApiError(401, "Invalid phone or password");
  }

  if (
    driver.approve === false ||
    String(driver.status || "").toLowerCase() === "pending"
  ) {
    throw new ApiError(403, "Driver account is pending approval");
  }

  await clearDriverActiveRideIfStale(driver);

  const token = signAccessToken({ sub: String(driver._id), role: "driver" });

  res.json({
    success: true,
    data: {
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        isOnline: driver.isOnline,
        isOnRide: driver.isOnRide,
        status: driver.status,
      },
    },
  });
};

export const goOnline = async (req, res) => {
  const { location, selfieImageUrl } = req.body;

  const coordinates = normalizePoint(location, "location");
  const zone = await findZoneByPickup(coordinates);
  const existingDriver = await Driver.findById(req.auth.sub);

  if (!existingDriver) {
    throw new ApiError(404, "Driver not found");
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const hasTodaySelfie =
    String(existingDriver.onlineSelfie?.forDate || "") === todayKey &&
    String(existingDriver.onlineSelfie?.imageUrl || "").trim();

  if (!hasTodaySelfie && !String(selfieImageUrl || "").trim()) {
    throw new ApiError(400, "A selfie is required before going online today");
  }

  await ensureDriverWalletCanAcceptRide(existingDriver);
  await clearDriverActiveRideIfStale(existingDriver);
  const trackingBeforeOnline = mergeOnlineSessionIntoTracking(
    existingDriver.incentiveTracking || {},
    existingDriver.incentiveTracking?.currentOnlineStartedAt,
    new Date(),
  );
  const nextTodaySummary = buildDriverTodaySummaryFromDocument(existingDriver);

  const nextOnlineSelfie =
    hasTodaySelfie && !String(selfieImageUrl || "").trim()
      ? existingDriver.onlineSelfie
      : {
          imageUrl: String(selfieImageUrl || "").trim(),
          capturedAt: new Date(),
          uploadedAt: new Date(),
          forDate: todayKey,
        };

  const driver = await Driver.findByIdAndUpdate(
    req.auth.sub,
    {
      isOnline: true,
      zoneId: zone?._id || null,
      location: toPoint(coordinates, "location"),
      onlineSelfie: nextOnlineSelfie,
      incentiveTracking: {
        ...trackingBeforeOnline,
        currentOnlineStartedAt: new Date(),
        claimedRewards: pruneClaimedRewards(trackingBeforeOnline?.claimedRewards),
      },
      todaySummary: nextTodaySummary,
    },
    { returnDocument: 'after' },
  );

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const vehicleIconUrl = await resolveVehicleMapIcon(driver.vehicleTypeId);

  res.json({
    success: true,
    data: {
      ...driver.toObject(),
      vehicleIconUrl,
      onlineSelfie: driver.onlineSelfie || {},
    },
  });

  notifyLateAvailableDriver(driver._id).catch((error) => {
    console.error("Failed to notify late-available driver on goOnline", error);
  });
};

export const getCurrentDriver = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub)
    .populate("zoneId", "name service_location_id");

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  if (!String(driver.referralCode || "").trim()) {
    driver.referralCode = generateDriverReferralCode(driver);
    await driver.save();
  }

  await clearDriverActiveRideIfStale(driver);
  const vehicleIconUrl = await resolveVehicleMapIcon(driver.vehicleTypeId);
  const todaySummary = await syncDriverTodaySummaryDocument(driver);

  res.json({
    success: true,
    data: {
      id: driver._id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      salary: Number(driver.salary || 0),
      profileImage: driver.profileImage || "",
      gender: driver.gender,
      vehicleType: driver.vehicleType,
      vehicleTypeId: driver.vehicleTypeId,
      vehicleIconType: driver.vehicleIconType,
      vehicleIconUrl,
      vehicleMake: driver.vehicleMake,
      vehicleModel: driver.vehicleModel,
      registerFor: driver.registerFor,
      vehicleNumber: driver.vehicleNumber,
      vehicleColor: driver.vehicleColor,
      vehicleImage: driver.vehicleImage || "",
      city: driver.city,
      approve: driver.approve,
      status: driver.status,
      rating: driver.rating,
      wallet: await serializeDriverWallet(driver),
      bankDetails: serializeDriverBankDetails(driver.bankDetails),
      referralCode: driver.referralCode || "",
      deletionRequest: driver.deletionRequest || { status: "none" },
      isOnline: driver.isOnline,
      isOnRide: driver.isOnRide,
      onlineSelfie: driver.onlineSelfie || {},
      location: driver.location,
      zoneId: driver.zoneId?._id || driver.zoneId || null,
      zone: driver.zoneId
        ? {
            id: String(driver.zoneId._id || driver.zoneId),
            name: driver.zoneId.name || "",
            service_location_id: driver.zoneId.service_location_id
              ? String(driver.zoneId.service_location_id)
              : "",
          }
        : null,
      routeBooking: serializeDriverRouteBooking(driver.routeBooking),
      documents: driver.documents || {},
      emergencyContacts: Array.isArray(driver.emergencyContacts)
        ? driver.emergencyContacts.map(serializeEmergencyContact)
        : [],
      onboarding: driver.onboarding || {},
      todaySummary: todaySummary || buildDriverTodaySummaryFromDocument(driver),
    },
  });
};

export const getDriverEmergencyContacts = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub).lean();

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  res.json({
    success: true,
    data: {
      results: Array.isArray(driver.emergencyContacts)
        ? driver.emergencyContacts.map(serializeEmergencyContact)
        : [],
      limit: MAX_EMERGENCY_CONTACTS,
    },
  });
};

export const getDriverNotifications = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub).lean();

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const serviceLocationId = driver.service_location_id || null;
  const query = {
    status: "sent",
    send_to: { $in: ["all", "drivers"] },
  };

  if (serviceLocationId) {
    query.$or = [
      { service_location_id: serviceLocationId },
      { send_to: "all" },
      { send_to: "drivers" },
    ];
  }

  const notifications = await Notification.find(query)
    .sort({ sent_at: -1, createdAt: -1 })
    .limit(100)
    .lean();

  res.json({
    success: true,
    data: {
      results: notifications.map(serializeDriverNotification),
    },
  });
};

export const getDriverScheduledRides = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub)
    .select("service_location_id vehicleTypeId")
    .lean();

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const safePage = Math.max(1, Number(req.query?.page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(req.query?.limit) || 20));
  const openScheduledRideQuery = {
    driverId: null,
    status: RIDE_STATUS.SEARCHING,
    liveStatus: RIDE_LIVE_STATUS.SEARCHING,
    ...(driver.service_location_id ? { service_location_id: driver.service_location_id } : {}),
  };

  if (driver.vehicleTypeId) {
    openScheduledRideQuery.$or = [
      { vehicleTypeId: driver.vehicleTypeId },
      { dispatchVehicleTypeIds: driver.vehicleTypeId },
    ];
  }

  const query = {
    scheduledAt: { $ne: null, $gte: new Date() },
    $or: [
      openScheduledRideQuery,
      {
        driverId: req.auth.sub,
        status: { $in: [RIDE_STATUS.SEARCHING, RIDE_STATUS.ACCEPTED] },
        liveStatus: {
          $in: [
            RIDE_LIVE_STATUS.SEARCHING,
            RIDE_LIVE_STATUS.ACCEPTED,
            RIDE_LIVE_STATUS.ARRIVING,
          ],
        },
      },
    ],
  };

  const [rides, totalCount] = await Promise.all([
    Ride.find(query)
      .sort({ scheduledAt: 1, createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .select([
        "serviceType",
        "status",
        "liveStatus",
        "fare",
        "baseFare",
        "bookingMode",
        "estimatedDistanceMeters",
        "estimatedDurationMinutes",
        "paymentMethod",
        "pickupLocation",
        "pickupAddress",
        "dropLocation",
        "dropAddress",
        "scheduledAt",
        "driverId",
        "intercity",
        "vehicleTypeId",
        "dispatchVehicleTypeIds",
        "service_location_id",
        "transport_type",
        "userId",
        "createdAt",
        "updatedAt",
      ].join(" "))
      .populate("userId", "name phone countryCode")
      .lean(),
    Ride.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      results: rides.map((ride) => serializeDriverScheduledRide(ride, req.auth.sub)),
      totalCount,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / safeLimit)),
        hasNextPage: safePage * safeLimit < totalCount,
        hasPrevPage: safePage > 1,
      },
    },
  });
};

export const cancelDriverScheduledRide = async (req, res) => {
  const rideId = toCleanString(req.params?.rideId);

  if (!rideId) {
    throw new ApiError(400, "Ride id is required");
  }

  const ride = await cancelScheduledRideByDriver({
    rideId,
    driverId: req.auth.sub,
  });

  if (!ride) {
    throw new ApiError(404, "Scheduled ride not found for this driver");
  }

  res.json({
    success: true,
    message: "Scheduled ride cancelled successfully",
    data: {
      rideId: String(ride._id || ""),
      status: ride.status || RIDE_STATUS.CANCELLED,
      liveStatus: ride.liveStatus || RIDE_LIVE_STATUS.CANCELLED,
    },
  });
};

const DRIVER_PUSH_ROLE_MODEL_MAP = { driver: Driver };

const resolvePushTokenEntityForRole = async (req) => {
  const role = String(req.auth?.role || "").toLowerCase();
  const Model = DRIVER_PUSH_ROLE_MODEL_MAP[role];

  if (!Model) {
    throw new ApiError(403, "Unsupported role for driver push notifications");
  }

  const entity = await Model.findById(req.auth?.sub);

  if (!entity) {
    throw new ApiError(404, "Authenticated account not found");
  }

  return entity;
};

export const saveDriverFcmToken = async (req, res) => {
  const entity = await resolvePushTokenEntityForRole(req);

  const saved = assignPushTokenToEntity(entity, {
    token: req.body?.token,
    platform: req.body?.platform,
  });

  await entity.save();

  res.json({
    success: true,
    data: {
      message: "FCM token saved successfully",
      platform: saved.platform,
      field: saved.fieldName,
      role: String(req.auth?.role || "").toLowerCase(),
    },
  });
};

export const addDriverEmergencyContact = async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const phone = sanitizeEmergencyPhone(req.body?.phone);
  const source =
    String(req.body?.source || "manual").toLowerCase() === "device"
      ? "device"
      : "manual";

  if (!name) {
    throw new ApiError(400, "Contact name is required");
  }

  if (!EMERGENCY_CONTACT_NAME_REGEX.test(name)) {
    throw new ApiError(400, "Contact name can contain alphabets only");
  }

  if (!/^\d{10}$/.test(phone)) {
    throw new ApiError(400, "A valid 10-digit contact number is required");
  }

  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const existingContacts = Array.isArray(driver.emergencyContacts)
    ? driver.emergencyContacts
    : [];

  if (existingContacts.length >= MAX_EMERGENCY_CONTACTS) {
    throw new ApiError(
      400,
      `You can add up to ${MAX_EMERGENCY_CONTACTS} emergency contacts`,
    );
  }

  if (
    existingContacts.some(
      (contact) => sanitizeEmergencyPhone(contact.phone) === phone,
    )
  ) {
    throw new ApiError(409, "This contact number is already added");
  }

  driver.emergencyContacts = [
    ...existingContacts,
    {
      name: name.slice(0, 80),
      phone,
      source,
    },
  ];

  await driver.save();

  const addedContact =
    driver.emergencyContacts[driver.emergencyContacts.length - 1];

  res.status(201).json({
    success: true,
    data: serializeEmergencyContact(addedContact),
  });
};

export const deleteDriverEmergencyContact = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const existingContacts = Array.isArray(driver.emergencyContacts)
    ? driver.emergencyContacts
    : [];
  const nextContacts = existingContacts.filter(
    (contact) => String(contact._id) !== String(req.params.contactId),
  );

  if (nextContacts.length === existingContacts.length) {
    throw new ApiError(404, "Emergency contact not found");
  }

  driver.emergencyContacts = nextContacts;
  await driver.save();

  res.json({
    success: true,
    data: {
      deleted: true,
      results: driver.emergencyContacts.map(serializeEmergencyContact),
    },
  });
};

export const updateCurrentDriver = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "name")) {
    const name = String(req.body.name || "").trim();
    if (!DRIVER_NAME_REGEX.test(name)) {
      throw new ApiError(400, "Full name can contain alphabets only");
    }
    driver.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "email")) {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    if (email && !EMAIL_REGEX.test(email)) {
      throw new ApiError(400, "Enter a valid email address");
    }
    driver.email = email;
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "profileImage")) {
    driver.profileImage = String(req.body.profileImage || "").trim();
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "routeBooking")) {
    const routeBookingPayload = req.body?.routeBooking || {};
    const enabled = Boolean(routeBookingPayload?.enabled);

    if (!enabled) {
      driver.routeBooking = {
        enabled: false,
        anchorLocation: null,
        label: "",
        updatedAt: new Date(),
      };
    } else {
      const coordinates = normalizePoint(
        routeBookingPayload?.coordinates || routeBookingPayload?.anchorLocation,
        "routeBooking.coordinates",
      );

      driver.routeBooking = {
        enabled: true,
        anchorLocation: toPoint(coordinates, "routeBooking.coordinates"),
        label: String(routeBookingPayload?.label || "").trim(),
        updatedAt: new Date(),
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, "bankDetails")) {
    driver.bankDetails = normalizeDriverBankDetails(
      req.body?.bankDetails || {},
      driver.bankDetails || {},
    );
  }

  await driver.save();

  res.json({
    success: true,
    data: {
      id: driver._id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      profileImage: driver.profileImage || "",
      routeBooking: serializeDriverRouteBooking(driver.routeBooking),
      bankDetails: serializeDriverBankDetails(driver.bankDetails),
    },
  });
};

export const requestDriverAccountDeletion = async (req, res) => {
  const driverId = req.auth?.sub;
  const reason = String(req.body?.reason || "").trim();

  if (!reason) {
    throw new ApiError(400, "Deletion reason is required");
  }

  const driver = await Driver.findById(driverId);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  if (
    driver.deletedAt ||
    driver.approve === false ||
    String(driver.status || "").toLowerCase() === "inactive"
  ) {
    throw new ApiError(400, "Account is already inactive");
  }

  if (driver.deletionRequest?.status === "pending") {
    res.json({
      success: true,
      data: {
        deletionRequestStatus: "pending",
        requestedAt: driver.deletionRequest.requestedAt || null,
      },
      message: "Deletion request is already pending admin review",
    });
    return;
  }

  driver.deletionRequest = {
    status: "pending",
    reason: reason.slice(0, 300),
    requestedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    adminNote: "",
  };

  await driver.save();

  res.status(201).json({
    success: true,
    data: {
      deletionRequestStatus: driver.deletionRequest.status,
      requestedAt: driver.deletionRequest.requestedAt,
    },
  });
};

export const updateCurrentDriverDocument = async (req, res) => {
  const documentKey = String(req.params.documentKey || "").trim();
  const document = req.body?.document || {};

  if (!documentKey) {
    throw new ApiError(400, "Document key is required");
  }

  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const existingDocument = driver.documents?.[documentKey] || {};
  const previewUrl = String(
    document.previewUrl || document.secureUrl || document.url || existingDocument.previewUrl || existingDocument.secureUrl || existingDocument.url || "",
  ).trim();

  if (!previewUrl) {
    throw new ApiError(400, "Uploaded document image URL is required");
  }

  const existingStatus = String(
    existingDocument.status ||
    existingDocument.verificationStatus ||
    existingDocument.approvalStatus ||
    existingDocument.reviewStatus ||
    "",
  ).trim().toLowerCase();

  const updatedDocument = {
    ...(typeof existingDocument === "object" ? existingDocument : {}),
    ...(typeof document === "object" ? document : {}),
    key: documentKey,
    fileName: String(document.fileName || documentKey).trim(),
    fileNames: [String(document.fileName || documentKey).trim()],
    uploaded: true,
    uploadedAt: new Date().toISOString(),
    previewUrl,
    secureUrl: String(document.secureUrl || previewUrl).trim(),
    imageUrl: previewUrl,
    images: [previewUrl],
    identifyNumber: String(
      document.identifyNumber ||
      document.identify_number ||
      document.documentNumber ||
      document.document_number ||
      existingDocument.identifyNumber ||
      existingDocument.identify_number ||
      existingDocument.documentNumber ||
      existingDocument.document_number ||
      "",
    ).trim().toUpperCase(),
    identify_number: String(
      document.identifyNumber ||
      document.identify_number ||
      document.documentNumber ||
      document.document_number ||
      existingDocument.identifyNumber ||
      existingDocument.identify_number ||
      existingDocument.documentNumber ||
      existingDocument.document_number ||
      "",
    ).trim().toUpperCase(),
    documentNumber: String(
      document.identifyNumber ||
      document.identify_number ||
      document.documentNumber ||
      document.document_number ||
      existingDocument.identifyNumber ||
      existingDocument.identify_number ||
      existingDocument.documentNumber ||
      existingDocument.document_number ||
      "",
    ).trim().toUpperCase(),
    document_number: String(
      document.identifyNumber ||
      document.identify_number ||
      document.documentNumber ||
      document.document_number ||
      existingDocument.identifyNumber ||
      existingDocument.identify_number ||
      existingDocument.documentNumber ||
      existingDocument.document_number ||
      "",
    ).trim().toUpperCase(),
    birthDate: String(document.birthDate || document.birth_date || existingDocument.birthDate || existingDocument.birth_date || "").trim(),
    birth_date: String(document.birthDate || document.birth_date || existingDocument.birthDate || existingDocument.birth_date || "").trim(),
    expiryDate: String(document.expiryDate || document.expiry_date || existingDocument.expiryDate || existingDocument.expiry_date || "").trim(),
    expiry_date: String(document.expiryDate || document.expiry_date || existingDocument.expiryDate || existingDocument.expiry_date || "").trim(),
    expiresAt: String(document.expiryDate || document.expiry_date || existingDocument.expiryDate || existingDocument.expiry_date || "").trim(),
    status: document.status ? String(document.status).trim() : "pending",
    verificationStatus: document.verificationStatus ? String(document.verificationStatus).trim() : "pending",
    reviewStatus: document.reviewStatus ? String(document.reviewStatus).trim() : "pending",
    comment: document.comment !== undefined ? String(document.comment || "").trim() : "",
    remarks: document.remarks !== undefined ? String(document.remarks || "").trim() : "",
    reason: document.reason !== undefined ? String(document.reason || "").trim() : "",
    admin_comment: document.admin_comment !== undefined ? String(document.admin_comment || "").trim() : "",
    rejection_reason: document.rejection_reason !== undefined ? String(document.rejection_reason || "").trim() : "",
    reviewedAt: null,
    reverificationRequestedAt: new Date().toISOString(),
  };

  driver.documents = {
    ...(driver.documents || {}),
    [documentKey]: updatedDocument,
  };

  driver.markModified("documents");
  await driver.save();

  res.json({
    success: true,
    data: {
      document: updatedDocument,
      documents: driver.documents || {},
    },
  });
};

export const deleteCurrentDriverAccount = async (req, res) => {
  const driverId = req.auth?.sub;
  const authRole = String(req.auth?.role || "").toLowerCase();
  const reason = String(req.body?.reason || "").trim();

  const activeRide = await Ride.findOne({
    driverId,
    status: { $in: [RIDE_STATUS.ACCEPTED, RIDE_STATUS.ONGOING] },
  }).select("_id status");

  if (activeRide) {
    throw new ApiError(409, "Complete or cancel your active ride before deleting your account");
  }

  const driver = await Driver.findById(driverId);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  if (driver.deletedAt) {
    res.json({
      success: true,
      data: {
        deleted: true,
        softDeleted: true,
        driverId: String(driver._id),
      },
      message: "Driver account already deleted",
    });
    return;
  }

  const deletionReason = reason || driver.deletionRequest?.reason || driver.deletion_reason || "Deleted by account owner";
  const now = new Date();

  driver.deletedAt = now;
  driver.deletion_reason = deletionReason.slice(0, 300);
  driver.approve = false;
  driver.status = "inactive";
  driver.isOnline = false;
  driver.isOnRide = false;
  driver.socketId = null;
  driver.deletionRequest = {
    ...(driver.deletionRequest || {}),
    status: "approved",
    reason: deletionReason.slice(0, 300),
    requestedAt: driver.deletionRequest?.requestedAt || now,
    reviewedAt: now,
    reviewedBy: null,
    adminNote: "",
  };

  await driver.save();

  await DriverLoginSession.deleteMany({
    $or: [
      { driverId: driver._id },
      { phone: driver.phone },
    ],
  });

  res.json({
    success: true,
    data: {
      deleted: true,
      softDeleted: true,
      driverId: String(driver._id),
    },
    message: "Driver account deleted successfully",
  });
};

export const getMyWallet = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const transactions = await WalletTransaction.find({ driverId: req.auth.sub })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const withdrawalRequests = await WithdrawalRequest.find({ driver_id: req.auth.sub })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  const walletSettings = await getWalletSettings();

  res.json({
    success: true,
    data: {
      wallet: await serializeDriverWallet(driver),
      transactions,
      withdrawalRequests,
      settings: walletSettings,
    },
  });
};

export const createDriverWithdrawalRequest = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const wallet = await serializeDriverWallet(driver);
  const walletSettings = await getWalletSettings();
  const isTransferEnabled = ['1', 'true', 'yes', 'on'].includes(
    String(walletSettings.enable_wallet_transfer_driver ?? '1').trim().toLowerCase(),
  );
  const minimumTransferAmount = Number(wallet.minimumTransferAmount ?? walletSettings.minimum_wallet_amount_for_transfer ?? 0);
  const amount = Number(req.body?.amount);
  const paymentMethod = String(req.body?.payment_method || req.body?.paymentMethod || 'bank_transfer').trim().toLowerCase() || 'bank_transfer';

  if (!isTransferEnabled) {
    throw new ApiError(403, "Withdrawals are disabled by admin");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "amount must be greater than zero");
  }

  if (minimumTransferAmount > 0 && amount < minimumTransferAmount) {
    throw new ApiError(400, `amount must be at least ${minimumTransferAmount}`);
  }

  if (amount > Number(wallet.balance || 0)) {
    throw new ApiError(400, "Withdrawal amount cannot exceed current balance");
  }

  const pendingRequest = await WithdrawalRequest.findOne({
    driver_id: req.auth.sub,
    amount,
    status: 'pending',
  })
    .sort({ createdAt: -1 })
    .lean();

  if (pendingRequest && (Date.now() - new Date(pendingRequest.createdAt).getTime()) < 60 * 1000) {
    throw new ApiError(409, "A similar withdrawal request was just submitted");
  }

  const created = await WithdrawalRequest.create({
    transactionId: `wdr_${Date.now().toString(36)}`,
    driver_id: req.auth.sub,
    amount: Math.round(amount * 100) / 100,
    payment_method: paymentMethod,
    bank_details_snapshot: serializeDriverBankDetails(driver.bankDetails || {}),
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    data: {
      request: created,
      wallet,
    },
    message: "Withdrawal request sent to admin",
  });
};

export const topUpMyWallet = async (req, res) => {
  const amount = Number(req.body.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "amount must be greater than zero");
  }

  const result = await topUpDriverWallet({
    driverId: req.auth.sub,
    amount,
    metadata: {
      source: req.body.source || "manual",
      referenceId: req.body.referenceId || null,
    },
  });

  const payload = {
    wallet: result.wallet,
    transaction: result.transaction,
  };

  emitToDriver(req.auth.sub, "driver:wallet:updated", payload);

  res.json({
    success: true,
    data: payload,
  });
};

export const createDriverPaymentQr = async (req, res) => {
  const amountInPaise = normalizePaymentAmount(req.body.amount);
  const rideId = String(req.body.rideId || "").trim();

  if (!rideId) {
    throw new ApiError(400, "rideId is required");
  }

  const ride = await Ride.findOne({
    _id: rideId,
    driverId: req.auth.sub,
  })
    .select("_id fare paymentMethod serviceType driverPaymentCollection");

  if (!ride) {
    throw new ApiError(404, "Ride not found for this driver");
  }

  let payload;

  try {
    const appName = await getConfiguredAppName();
    const qr = await razorpayRequest({
      method: "POST",
      path: "/payments/qr_codes",
      body: {
        type: "upi_qr",
        name: `${appName} Taxi Fare`,
        usage: "single_use",
        fixed_amount: true,
        payment_amount: amountInPaise,
        description: `Taxi fare for ride ${rideId}`,
        close_by: Math.floor(Date.now() / 1000) + 30 * 60,
        notes: {
          rideId,
          driverId: String(req.auth.sub),
          serviceType: ride.serviceType || "ride",
          source: "driver_collect_amount",
        },
      },
    });

    payload = {
      id: qr.id,
      entity: qr.entity,
      status: qr.status,
      imageUrl: qr.image_url,
      linkUrl: qr.image_url,
      amount: amountInPaise / 100,
      currency: "INR",
      description: qr.description,
      closeBy: qr.close_by || null,
      rawStatus: qr.status,
      providerMode: "razorpay_qr",
    };
  } catch (error) {
    if (!shouldFallbackToPaymentLinkQr(error)) {
      throw error;
    }

    payload = await createPaymentLinkQr({
      amountInPaise,
      rideId,
      driverId: req.auth.sub,
      serviceType: ride.serviceType,
    });
  }

  ride.driverPaymentCollection = {
    provider: "razorpay",
    providerId: payload.id,
    providerMode: payload.providerMode,
    status: normalizeCollectionStatus(payload.rawStatus || payload.status),
    amount: payload.amount,
    currency: payload.currency || "INR",
    linkUrl: payload.linkUrl || "",
    paidAt: null,
    updatedAt: new Date(),
  };
  await ride.save();

  res.json({
    success: true,
    data: payload,
  });
};

const resolveRazorpayCredentials = async () => {
  return resolveConfiguredGatewayCredentials("razor_pay");
};

const resolvePhonePeCredentials = async () => {
  return resolveConfiguredGatewayCredentials("phone_pay");
};

const normalizeOriginCandidate = (value = "") => {
  const trimmedValue = String(value || "").trim();
  if (!trimmedValue || trimmedValue === "*") {
    return "";
  }

  try {
    return new URL(trimmedValue).origin.replace(/\/+$/, "");
  } catch {
    return "";
  }
};

const isPublicWebOrigin = (value = "") => {
  const origin = normalizeOriginCandidate(value);
  if (!origin) {
    return false;
  }

  try {
    const { protocol, hostname } = new URL(origin);
    if (!["http:", "https:"].includes(protocol)) {
      return false;
    }

    return !["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname);
  } catch {
    return false;
  }
};

const getFrontendBaseUrl = (req) => {
  const configuredOrigins = [
    env.phonePeRedirectBaseUrl,
    env.publicFrontendUrl,
    ...String(env.corsOrigin || "")
      .split(",")
      .map((value) => value.trim()),
  ]
    .map(normalizeOriginCandidate)
    .filter(Boolean);

  const requestCandidates = [
    normalizeOriginCandidate(req?.get?.("origin")),
    normalizeOriginCandidate(req?.get?.("referer")),
    (() => {
      const forwardedProto = String(req?.get?.("x-forwarded-proto") || "").trim();
      const forwardedHost = String(req?.get?.("x-forwarded-host") || "").trim();
      if (!forwardedProto || !forwardedHost) {
        return "";
      }
      return normalizeOriginCandidate(`${forwardedProto}://${forwardedHost}`);
    })(),
    (() => {
      const host = String(req?.get?.("host") || "").trim();
      const proto =
        String(req?.protocol || "").trim() ||
        String(req?.get?.("x-forwarded-proto") || "").trim() ||
        "http";
      if (!host) {
        return "";
      }
      return normalizeOriginCandidate(`${proto}://${host}`);
    })(),
  ].filter(Boolean);

  const preferredPublicOrigin =
    configuredOrigins.find(isPublicWebOrigin) ||
    requestCandidates.find(isPublicWebOrigin);

  if (preferredPublicOrigin) {
    return preferredPublicOrigin;
  }

  return (
    configuredOrigins[0] ||
    requestCandidates[0] ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");
};

const phonePeClientCache = new Map();

const getPhonePeCheckoutClient = ({
  clientId,
  clientSecret,
  clientVersion,
  environment,
}) => {
  const normalizedEnvironment = String(environment || "test").trim().toLowerCase();
  const normalizedVersion = Number.parseInt(String(clientVersion || "1"), 10) || 1;
  const cacheKey = `${normalizedEnvironment}::${clientId}::${normalizedVersion}`;

  if (phonePeClientCache.has(cacheKey)) {
    return phonePeClientCache.get(cacheKey);
  }

  const client = StandardCheckoutClient.getInstance(
    clientId,
    clientSecret,
    normalizedVersion,
    normalizedEnvironment === "production" ? Env.PRODUCTION : Env.SANDBOX,
  );

  phonePeClientCache.set(cacheKey, client);
  return client;
};

const phonePeRequest = async ({
  method,
  path,
  body,
  clientId,
  clientSecret,
  clientVersion,
  environment,
}) => {
  const normalizedMethod = String(method || "GET").trim().toUpperCase();
  logPaymentDiagnostic({
    provider: "phonepe",
    scope: "driver",
    stage: "api-request",
    method: normalizedMethod,
    path,
    ...summarizePhonePeCredentialMeta({ clientId, clientVersion, environment }),
    request: summarizePhonePeRequestBody(body || {}),
  });
  const client = getPhonePeCheckoutClient({
    clientId,
    clientSecret,
    clientVersion,
    environment,
  });

  try {
    let payload = null;

    if (normalizedMethod === "POST" && path === "/checkout/v2/pay") {
      const merchantOrderId = String(body?.merchantOrderId || "").trim();
      const amount = Number(body?.amount || 0);
      const redirectUrl = String(body?.paymentFlow?.merchantUrls?.redirectUrl || "").trim();

      if (!merchantOrderId || !amount || !redirectUrl) {
        throw new ApiError(400, "PhonePe merchant order id, amount, and redirect URL are required");
      }

      const builder = StandardCheckoutPayRequest.builder()
        .merchantOrderId(merchantOrderId)
        .amount(amount)
        .redirectUrl(redirectUrl);

      if (body?.paymentFlow?.message) {
        builder.message(String(body.paymentFlow.message));
      }
      if (body?.expireAfter) {
        builder.expireAfter(Number(body.expireAfter));
      }
      if (body?.prefillUserLoginDetails?.phoneNumber) {
        const prefill = PrefillUserLoginDetails.builder()
          .phoneNumber(String(body.prefillUserLoginDetails.phoneNumber))
          .build();
        builder.prefillUserLoginDetails(prefill);
      }
      if (body?.metaInfo) {
        builder.metaInfo(body.metaInfo);
      }

      const request = builder.build();
      payload = await client.pay(request);
    } else if (normalizedMethod === "GET" && path.includes("/checkout/v2/order/")) {
      const orderMatch = path.match(/\/checkout\/v2\/order\/([^/]+)\/status/i);
      const merchantOrderId = decodeURIComponent(orderMatch?.[1] || "").trim();

      if (!merchantOrderId) {
        throw new ApiError(400, "PhonePe merchant order id is required");
      }

      payload = await client.getOrderStatus(merchantOrderId);
    } else {
      throw new ApiError(400, `Unsupported PhonePe operation: ${normalizedMethod} ${path}`);
    }

    logPaymentDiagnostic({
      provider: "phonepe",
      scope: "driver",
      stage: "api-success",
      method: normalizedMethod,
      path,
      statusCode: 200,
      ...summarizePhonePeCredentialMeta({ clientId, clientVersion, environment }),
      response: summarizePhonePePayload(payload || {}),
    });

    return payload;
  } catch (error) {
    const payload = error?.response || error?.payload || error?.data || null;
    const statusCode = Number(error?.statusCode || error?.status || 502);

    logPaymentDiagnostic({
      provider: "phonepe",
      scope: "driver",
      stage: "api-failed",
      level: "error",
      method: normalizedMethod,
      path,
      statusCode,
      ...summarizePhonePeCredentialMeta({ clientId, clientVersion, environment }),
      response: summarizePhonePePayload(payload || {}),
      providerMessage:
        error?.message ||
        payload?.message ||
        payload?.responseCodeDescription ||
        payload?.detailedErrorCode ||
        "",
    });
    throw new ApiError(
      statusCode,
      error?.message || payload?.message || payload?.code || "PhonePe request failed",
    );
  }
};

const fetchRazorpay = taxiRazorpayRequest;

export const createDriverWalletTopupOrder = async (req, res) => {
  const settings = await getWalletSettings();
  const minTopUp = Number(settings.minimum_amount_added_to_wallet || 0);
  const amount = Math.round(Number(req.body.amount) * 100) / 100;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "Invalid top-up amount");
  }

  if (amount < minTopUp) {
    throw new ApiError(400, `Minimum top-up amount is Rs ${minTopUp}`);
  }

  const { keyId, keySecret } = await resolveRazorpayCredentials();

  const amountPaise = Math.round(amount * 100);
  const driverId = String(req.auth?.sub || "");
  const compactDriverId = driverId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "drv";
  const receipt = `dwal_${compactDriverId}_${Date.now().toString(36)}`;

  // Build the callback URL that Razorpay will redirect to after payment.
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5000';
  const backendOrigin = `${proto}://${host}`;
  /*
   * The taxi module is mounted at /api/v1/taxi, so a callback path written
   * without that segment resolves to nothing: Razorpay took the payment and
   * then redirected the driver to a 404, leaving the wallet uncredited.
   */
  const callbackUrl = `${backendOrigin}/api/v1/taxi/drivers/wallet/top-up/razorpay/callback`;

  const userAgent = String(req.headers["user-agent"] || "");
  const isWebView = /; wv\)/i.test(userAgent) || /Version\/[\d.]+/i.test(userAgent) || req.body.usePaymentLink === true;

  if (isWebView) {
    const driver = driverId ? await Driver.findById(driverId).select("name phone email").lean() : null;
    const cleanedPhone = String(driver?.phone || "").replace(/\D/g, "");
    const customerPhone = cleanedPhone.length === 10 ? `+91${cleanedPhone}` : (cleanedPhone.length === 12 && cleanedPhone.startsWith("91")) ? `+${cleanedPhone}` : "";

    const paymentLink = await razorpayRequest({
      method: "POST",
      path: "/payment_links",
      body: {
        amount: amountPaise,
        currency: "INR",
        accept_partial: false,
        expire_by: Math.floor(Date.now() / 1000) + 20 * 60,
        reference_id: receipt,
        description: "Driver Wallet Topup",
        callback_url: callbackUrl,
        callback_method: "get",
        customer: {
          name: driver?.name || "Driver",
          email: driver?.email || "",
          contact: customerPhone || undefined,
        },
        notes: {
          driverId,
          source: "driver_wallet_topup",
        },
      },
      keyId,
      keySecret,
    });

    const checkoutUrl = paymentLink.short_url || paymentLink.shortUrl || paymentLink.url;

    res.status(201).json({
      success: true,
      data: {
        keyId,
        checkoutUrl,
        amount: amountPaise,
        currency: "INR",
        callbackUrl,
      },
    });
    return;
  }

  const order = await fetchRazorpay({
    method: "POST",
    path: "/orders",
    body: {
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: { driverId },
    },
    keyId,
    keySecret,
  });

  res.status(201).json({
    success: true,
    data: {
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency || "INR",
      callbackUrl,
    },
  });
};

const DRIVER_RAZORPAY_PAYMENT_SUCCESS_STATUSES = new Set(["authorized", "captured", "paid"]);
const DRIVER_RAZORPAY_LINK_SUCCESS_STATUSES = new Set(["paid"]);

const verifyAndApplyDriverRazorpayWalletTopup = async ({
  orderId,
  paymentId,
  signature,
  paymentLinkId = "",
  paymentLinkReferenceId = "",
  paymentLinkStatus = "",
  driverId: requestedDriverId = "",
} = {}) => {
  const normalizedOrderId = String(orderId || "").trim();
  const normalizedPaymentId = String(paymentId || "").trim();
  const normalizedSignature = String(signature || "").trim();
  const normalizedPaymentLinkId = String(paymentLinkId || "").trim();
  const normalizedPaymentLinkReferenceId = String(paymentLinkReferenceId || "").trim();
  const normalizedPaymentLinkStatus = String(paymentLinkStatus || "").trim().toLowerCase();

  if (!normalizedPaymentId) {
    throw new ApiError(400, "Payment verification fields are required");
  }

  if (!normalizedOrderId && !normalizedPaymentLinkId) {
    throw new ApiError(400, "Payment verification fields are required");
  }

  const { keyId, keySecret } = await resolveRazorpayCredentials();

  let effectiveOrderId = normalizedOrderId;
  let amountPaise = 0;
  let resolvedDriverId = "";

  if (effectiveOrderId) {
    if (!normalizedSignature) {
      throw new ApiError(400, "Payment verification signature is required");
    }

    // Shared digest helper; the secret stays taxi's own admin-configured
    // gateway credential rather than the platform env key.
    const expectedSignature = computeExpectedSignature({
      orderId: effectiveOrderId,
      paymentId: normalizedPaymentId,
      secret: keySecret,
    });

    if (expectedSignature !== normalizedSignature) {
      throw new ApiError(400, "Invalid payment signature");
    }

    const order = await fetchRazorpay({
      method: "GET",
      path: `/orders/${encodeURIComponent(effectiveOrderId)}`,
      keyId,
      keySecret,
    });

    amountPaise = Number(order?.amount);
    resolvedDriverId = String(order?.notes?.driverId || "").trim();
  } else {
    const [payment, paymentLink] = await Promise.all([
      fetchRazorpay({
        method: "GET",
        path: `/payments/${encodeURIComponent(normalizedPaymentId)}`,
        keyId,
        keySecret,
      }),
      fetchRazorpay({
        method: "GET",
        path: `/payment_links/${encodeURIComponent(normalizedPaymentLinkId)}`,
        keyId,
        keySecret,
      }),
    ]);

    const paymentStatus = String(payment?.status || "").trim().toLowerCase();
    const linkStatus = String(paymentLink?.status || normalizedPaymentLinkStatus || "").trim().toLowerCase();
    const linkPaymentId = String(
      paymentLink?.payments?.[0]?.payment_id ||
      paymentLink?.payment_id ||
      payment?.id ||
      "",
    ).trim();

    if (!DRIVER_RAZORPAY_PAYMENT_SUCCESS_STATUSES.has(paymentStatus)) {
      throw new ApiError(400, "Razorpay payment is not successful yet");
    }

    if (linkStatus && !DRIVER_RAZORPAY_LINK_SUCCESS_STATUSES.has(linkStatus)) {
      throw new ApiError(400, "Razorpay payment link is not marked as paid");
    }

    if (linkPaymentId && linkPaymentId !== normalizedPaymentId) {
      throw new ApiError(400, "Payment link callback does not match the payment id");
    }

    if (
      normalizedPaymentLinkReferenceId &&
      paymentLink?.reference_id &&
      String(paymentLink.reference_id).trim() !== normalizedPaymentLinkReferenceId
    ) {
      throw new ApiError(400, "Payment link callback reference did not match");
    }

    effectiveOrderId = String(payment?.order_id || "").trim();
    amountPaise = Number(payment?.amount || paymentLink?.amount_paid || paymentLink?.amount || 0);
    resolvedDriverId = String(paymentLink?.notes?.driverId || payment?.notes?.driverId || "").trim();
  }

  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new ApiError(400, "Invalid order amount");
  }

  const effectiveDriverId = String(requestedDriverId || resolvedDriverId).trim();

  if (!effectiveDriverId) {
    throw new ApiError(400, "Driver reference is missing from this Razorpay order");
  }

  if (requestedDriverId && resolvedDriverId && requestedDriverId !== resolvedDriverId) {
    throw new ApiError(403, "This Razorpay order does not belong to the authenticated driver");
  }

  const amount = Math.round(amountPaise) / 100;
  const alreadyCredited = await WalletTransaction.findOne({
    driverId: effectiveDriverId,
    "metadata.providerPaymentId": normalizedPaymentId,
  })
    .select("_id")
    .lean();

  if (alreadyCredited) {
    const driver = await Driver.findById(effectiveDriverId);
    return {
      driverId: effectiveDriverId,
      wallet: driver ? await serializeDriverWallet(driver) : null,
      transaction: null,
      alreadyCredited: true,
    };
  }

  const result = await topUpDriverWallet({
    driverId: effectiveDriverId,
    amount,
    metadata: {
      source: "razorpay",
      provider: "razorpay",
      providerOrderId: effectiveOrderId,
      providerPaymentId: normalizedPaymentId,
      providerPaymentLinkId: normalizedPaymentLinkId,
    },
  });

  const payload = {
    wallet: result.wallet,
    transaction: result.transaction,
  };

  emitToDriver(effectiveDriverId, "driver:wallet:updated", payload);

  return {
    driverId: effectiveDriverId,
    ...payload,
    alreadyCredited: false,
  };
};

export const handleDriverRazorpayWalletTopupCallback = async (req, res) => {
  const frontendBaseUrl = getFrontendBaseUrl(req);
  const redirectUrl = new URL(`${frontendBaseUrl}/razorpay/status`);
  redirectUrl.searchParams.set("flow", "driver-wallet");
  const callbackPayload = {
    razorpay_order_id: req.body?.razorpay_order_id || req.query?.razorpay_order_id,
    razorpay_payment_id: req.body?.razorpay_payment_id || req.query?.razorpay_payment_id,
    razorpay_signature: req.body?.razorpay_signature || req.query?.razorpay_signature,
    razorpay_payment_link_id: req.body?.razorpay_payment_link_id || req.query?.razorpay_payment_link_id,
    razorpay_payment_link_reference_id:
      req.body?.razorpay_payment_link_reference_id || req.query?.razorpay_payment_link_reference_id,
    razorpay_payment_link_status:
      req.body?.razorpay_payment_link_status || req.query?.razorpay_payment_link_status,
  };

  try {
    const errorCode = String(
      req.body?.error?.code || req.body?.error?.reason || req.query?.error_code || "",
    ).trim();
    const errorDescription = String(
      req.body?.error?.description || req.query?.error_description || "",
    ).trim();

    if (errorCode || errorDescription) {
      redirectUrl.searchParams.set("status", "failure");
      if (errorCode) {
        redirectUrl.searchParams.set("error_code", errorCode);
      }
      if (errorDescription) {
        redirectUrl.searchParams.set("error_description", errorDescription);
      }
      res.redirect(302, redirectUrl.toString());
      return;
    }

    await verifyAndApplyDriverRazorpayWalletTopup({
      orderId: callbackPayload.razorpay_order_id,
      paymentId: callbackPayload.razorpay_payment_id,
      signature: callbackPayload.razorpay_signature,
      paymentLinkId: callbackPayload.razorpay_payment_link_id,
      paymentLinkReferenceId: callbackPayload.razorpay_payment_link_reference_id,
      paymentLinkStatus: callbackPayload.razorpay_payment_link_status,
    });

    redirectUrl.searchParams.set("status", "success");
  } catch (error) {
    redirectUrl.searchParams.set("status", "failure");
    redirectUrl.searchParams.set(
      "error_description",
      String(error?.message || "Payment verification failed."),
    );
  }

  res.redirect(302, redirectUrl.toString());
};

export const createDriverPhonePeWalletTopupOrder = async (req, res) => {
  const settings = await getWalletSettings();
  const minTopUp = Number(settings.minimum_amount_added_to_wallet || 0);
  const amount = Math.round(Number(req.body.amount) * 100) / 100;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "Invalid top-up amount");
  }

  if (amount < minTopUp) {
    throw new ApiError(400, `Minimum top-up amount is Rs ${minTopUp}`);
  }

  const { clientId, clientSecret, clientVersion, environment } = await resolvePhonePeCredentials();
  const driverId = String(req.auth?.sub || "");
  const compactDriverId = driverId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "drv";
  const merchantTransactionId = `DWAL${Date.now()}${compactDriverId}`.slice(0, 34);
  const frontendBaseUrl = getFrontendBaseUrl(req);
  const redirectUrl = `${frontendBaseUrl}/phonepe/status?flow=driver-wallet&phonepe_txn=${encodeURIComponent(merchantTransactionId)}`;
  const driver = driverId ? await Driver.findById(driverId).select("phone").lean() : null;
  logPaymentDiagnostic({
    provider: "phonepe",
    scope: "driver-wallet",
    stage: "create-order-start",
    merchantTransactionId,
    amountRupees: amount,
    request: buildPaymentRequestContext(req),
    metadata: {
      redirectUrl: summarizeCheckoutUrl(redirectUrl),
    },
  });
  const payload = await phonePeRequest({
    method: "POST",
    path: "/checkout/v2/pay",
    body: {
      merchantOrderId: merchantTransactionId,
      amount: Math.round(amount * 100),
      expireAfter: 1200,
      paymentFlow: {
        type: "PG_CHECKOUT",
        merchantUrls: {
          redirectUrl,
        },
        message: "Wallet top-up",
      },
      prefillUserLoginDetails: (() => {
        const cleaned = String(driver?.phone || "").replace(/\D/g, "");
        const finalPhone = (cleaned.length === 12 && cleaned.startsWith("91")) ? cleaned.slice(2) : cleaned;
        return finalPhone.length === 10 ? { phoneNumber: finalPhone } : undefined;
      })(),
    },
    clientId,
    clientSecret,
    clientVersion,
    environment,
  });

  const checkoutUrl = payload?.redirectUrl || "";
  if (!checkoutUrl) {
    logPaymentDiagnostic({
      provider: "phonepe",
      scope: "driver-wallet",
      stage: "create-order-missing-checkout-url",
      level: "error",
      merchantTransactionId,
      response: summarizePhonePePayload(payload || {}),
    });
    throw new ApiError(502, "PhonePe payment URL was not returned");
  }

  logPaymentDiagnostic({
    provider: "phonepe",
    scope: "driver-wallet",
    stage: "create-order-success",
    merchantTransactionId,
    amountPaise: Math.round(amount * 100),
    checkoutUrl: summarizeCheckoutUrl(checkoutUrl),
    response: summarizePhonePePayload(payload || {}),
  });

  res.status(201).json({
    success: true,
    data: {
      gateway: "phonepe",
      merchantTransactionId,
      amount: Math.round(amount * 100),
      currency: "INR",
      checkoutUrl,
    },
  });
};

export const verifyDriverWalletTopup = async (req, res) => {
  const payload = await verifyAndApplyDriverRazorpayWalletTopup({
    orderId: req.body?.razorpay_order_id,
    paymentId: req.body?.razorpay_payment_id,
    signature: req.body?.razorpay_signature,
    driverId: req.auth?.sub,
  });

  res.json({
    success: true,
    data: {
      wallet: payload.wallet,
      ...(payload.transaction ? { transaction: payload.transaction } : {}),
    },
  });
};

export const verifyDriverPhonePeWalletTopup = async (req, res) => {
  const merchantTransactionId = toCleanString(
    req.params?.merchantTransactionId || req.query?.merchantTransactionId || req.query?.transactionId,
  );

  if (!merchantTransactionId) {
    throw new ApiError(400, "merchantTransactionId is required");
  }

  logPaymentDiagnostic({
    provider: "phonepe",
    scope: "driver-wallet",
    stage: "verify-start",
    merchantTransactionId,
    request: buildPaymentRequestContext(req),
  });

  const { clientId, clientSecret, clientVersion, environment } = await resolvePhonePeCredentials();
  const payload = await phonePeRequest({
    method: "GET",
    path: `/checkout/v2/order/${encodeURIComponent(merchantTransactionId)}/status?details=false`,
    clientId,
    clientSecret,
    clientVersion,
    environment,
  });

  const paymentDetails = Array.isArray(payload?.paymentDetails) ? payload.paymentDetails : [];
  const latestPayment = paymentDetails[0] || {};
  const paymentState = String(payload?.state || latestPayment?.state || "").trim().toUpperCase();
  const paymentId = toCleanString(latestPayment?.transactionId || latestPayment?.paymentTransactionId || merchantTransactionId);
  const amount = Math.round(Number(payload?.amount || latestPayment?.amount || 0)) / 100;
  const driverId = req.auth?.sub;

  logPaymentDiagnostic({
    provider: "phonepe",
    scope: "driver-wallet",
    stage: "verify-response",
    merchantTransactionId,
    driverId,
    paymentState,
    paymentId,
    amountRupees: amount,
    response: summarizePhonePePayload(payload || {}),
  });

  if (paymentState === "COMPLETED") {
    const alreadyCredited = await WalletTransaction.findOne({
      driverId,
      $or: [
        { "metadata.providerPaymentId": paymentId },
        { "metadata.providerOrderId": merchantTransactionId },
      ],
    })
      .select("_id")
      .lean();

    let result = null;
    if (!alreadyCredited) {
      result = await topUpDriverWallet({
        driverId,
        amount,
        metadata: {
          source: "phonepe",
          provider: "phonepe",
          providerOrderId: merchantTransactionId,
          providerPaymentId: paymentId,
        },
      });
    }

    const driver = await Driver.findById(driverId);
    logPaymentDiagnostic({
      provider: "phonepe",
      scope: "driver-wallet",
      stage: "verify-paid",
      merchantTransactionId,
      driverId,
      paymentId,
      amountRupees: amount,
      alreadyCredited: Boolean(alreadyCredited),
    });
    res.json({
      success: true,
      data: {
        status: "paid",
        gateway: "phonepe",
        merchantTransactionId,
        transactionId: paymentId,
        wallet: result?.wallet || await serializeDriverWallet(driver),
        transaction: result?.transaction || null,
      },
    });
    return;
  }

  if (paymentState === "PENDING") {
    logPaymentDiagnostic({
      provider: "phonepe",
      scope: "driver-wallet",
      stage: "verify-pending",
      merchantTransactionId,
      driverId,
      paymentId,
      amountRupees: amount,
    });
    res.json({
      success: true,
      data: {
        status: "pending",
        gateway: "phonepe",
        merchantTransactionId,
        transactionId: paymentId,
      },
      message: payload?.message || "PhonePe payment is still pending",
    });
    return;
  }

  logPaymentDiagnostic({
    provider: "phonepe",
    scope: "driver-wallet",
    stage: "verify-failed",
    level: "warn",
    merchantTransactionId,
    driverId,
    paymentId,
    paymentState,
    amountRupees: amount,
    code: payload?.code || latestPayment?.responseCode || "",
    providerMessage:
      payload?.message ||
      latestPayment?.responseCodeDescription ||
      latestPayment?.detailedErrorCode ||
      "",
    response: summarizePhonePePayload(payload || {}),
  });
  const driverProviderCode = payload?.code || latestPayment?.responseCode || "";
  const driverProviderMessage =
    payload?.message ||
    latestPayment?.responseCodeDescription ||
    latestPayment?.detailedErrorCode ||
    "PhonePe payment was not completed";
  res.json({
    success: true,
    data: {
      status: "failed",
      gateway: "phonepe",
      merchantTransactionId,
      transactionId: paymentId,
      code: driverProviderCode,
      state: paymentState,
      providerMessage: driverProviderMessage,
    },
    message: driverProviderMessage,
  });
};


export const getDriverPaymentQrStatus = async (req, res) => {
  const rideId = String(req.query.rideId || req.params.rideId || "").trim();

  if (!rideId) {
    throw new ApiError(400, "rideId is required");
  }

  const ride = await Ride.findOne({
    _id: rideId,
    driverId: req.auth.sub,
  }).select("_id driverPaymentCollection");

  if (!ride) {
    throw new ApiError(404, "Ride not found for this driver");
  }

  if (!ride.driverPaymentCollection?.providerId) {
    res.json({
      success: true,
      data: serializeDriverPaymentCollection(ride.driverPaymentCollection),
    });
    return;
  }

  const collection = await refreshDriverPaymentCollection(ride);

  res.json({
    success: true,
    data: collection,
  });
};

const getGenericVehicleType = (vehicle = {}) => {
  const value = String(vehicle.icon_types || vehicle.name || "").toLowerCase();

  if (value.includes("bike")) {
    return "bike";
  }

  if (value.includes("auto")) {
    return "auto";
  }

  return "car";
};

export const updateDriverVehicle = async (req, res) => {
  const {
    vehicleTypeId,
    vehicleNumber,
    vehicleColor,
    vehicleMake,
    vehicleModel,
    vehicleImage,
  } = req.body;

  let selectedVehicle = null;

  if (vehicleTypeId) {
    selectedVehicle = await Vehicle.findById(vehicleTypeId);

    if (
      !selectedVehicle ||
      selectedVehicle.active === false ||
      Number(selectedVehicle.status) === 0
    ) {
      throw new ApiError(404, "Active vehicle type not found");
    }
  }

  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const update = {};
  let vehicleChanged = false;

  if (selectedVehicle) {
    const nextVehicleType = getGenericVehicleType(selectedVehicle);
    const nextVehicleIconType = selectedVehicle.icon_types || nextVehicleType;

    update.vehicleTypeId = selectedVehicle._id;
    update.vehicleType = nextVehicleType;
    update.vehicleIconType = nextVehicleIconType;

    if (
      String(driver.vehicleTypeId || "") !== String(selectedVehicle._id || "") ||
      String(driver.vehicleType || "") !== String(nextVehicleType) ||
      String(driver.vehicleIconType || "") !== String(nextVehicleIconType)
    ) {
      vehicleChanged = true;
    }
  }

  if (vehicleNumber !== undefined) {
    const normalizedVehicleNumber = String(vehicleNumber || "")
      .trim()
      .toUpperCase();
    update.vehicleNumber = normalizedVehicleNumber;
    if (String(driver.vehicleNumber || "") !== normalizedVehicleNumber) {
      vehicleChanged = true;
    }
  }
  if (vehicleColor !== undefined) {
    const normalizedVehicleColor = String(vehicleColor || "").trim();
    update.vehicleColor = normalizedVehicleColor;
    if (String(driver.vehicleColor || "") !== normalizedVehicleColor) {
      vehicleChanged = true;
    }
  }
  if (vehicleMake !== undefined) {
    const normalizedVehicleMake = String(vehicleMake || "").trim();
    update.vehicleMake = normalizedVehicleMake;
    if (String(driver.vehicleMake || "") !== normalizedVehicleMake) {
      vehicleChanged = true;
    }
  }
  if (vehicleModel !== undefined) {
    const normalizedVehicleModel = String(vehicleModel || "").trim();
    update.vehicleModel = normalizedVehicleModel;
    if (String(driver.vehicleModel || "") !== normalizedVehicleModel) {
      vehicleChanged = true;
    }
  }
  if (vehicleImage !== undefined) {
    const normalizedVehicleImage = String(vehicleImage || "").trim();
    update.vehicleImage = normalizedVehicleImage;
    if (String(driver.vehicleImage || "") !== normalizedVehicleImage) {
      vehicleChanged = true;
    }
  }

  if (vehicleChanged) {
    update.approve = false;
    update.status = "pending";
    update.isOnline = false;
  }

  const updatedDriver = await Driver.findByIdAndUpdate(req.auth.sub, update, {
    returnDocument: 'after',
  });

  const vehicleIconUrl = await resolveVehicleMapIcon(updatedDriver.vehicleTypeId);

  res.json({
    success: true,
    message: vehicleChanged
      ? "Vehicle updated and sent to admin for approval"
      : "Vehicle updated successfully",
    data: {
      id: updatedDriver._id,
      name: updatedDriver.name,
      phone: updatedDriver.phone,
      vehicleType: updatedDriver.vehicleType,
      vehicleTypeId: updatedDriver.vehicleTypeId,
      vehicleIconType: updatedDriver.vehicleIconType,
      vehicleIconUrl,
      vehicleMake: updatedDriver.vehicleMake,
      vehicleModel: updatedDriver.vehicleModel,
      vehicleNumber: updatedDriver.vehicleNumber,
      vehicleColor: updatedDriver.vehicleColor,
      vehicleImage: updatedDriver.vehicleImage || "",
      registerFor: updatedDriver.registerFor,
      approve: updatedDriver.approve,
      status: updatedDriver.status,
      isOnline: updatedDriver.isOnline,
      isOnRide: updatedDriver.isOnRide,
      vehicleApprovalRequested: vehicleChanged,
    },
  });
};

export const getDriverApprovalStatus = async (req, res) => {
  const authorization = req.headers.authorization || "";
  const [, token] = authorization.split(" ");

  if (!token) {
    throw new ApiError(401, "Authorization token is required");
  }

  const payload = verifyAccessToken(token);

  const normalizedRole = String(payload.role || "").toLowerCase();

  if (normalizedRole !== "driver") {
    throw new ApiError(403, "Insufficient permissions for this resource. Role: " + normalizedRole);
  }

  const driver = await Driver.findById(payload.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.json({
    success: true,
    data: {
      id: driver._id,
      name: driver.name,
      phone: driver.phone,
      approve: driver.approve,
      status: driver.status,
      documents: driver.documents || {},
      onboarding: driver.onboarding || {},
      isOnline: driver.isOnline,
      isOnRide: driver.isOnRide,
    },
  });
};

export const getServiceLocations = async (_req, res) => {
  const results = await listDriverServiceLocations();

  res.json({
    success: true,
    data: { results },
  });
};

export const getDriverDocumentTemplates = async (_req, res) => {
  const results = await listDriverNeededDocuments({
    activeOnly: true,
    includeFields: true,
  });

  res.json({ success: true, data: { results } });
};

export const getDriverVehicleFieldTemplates = async (_req, res) => {
  const results = await listDriverVehicleFieldTemplates({ activeOnly: true });

  // Only the driver's own fields remain — the fleet_drivers rows belonged to
  // the owner module and no account can ask for them any more.
  const matchesAccountType = (accountType) => {
    const normalizedAccountType = String(accountType || "").trim().toLowerCase() || "individual";
    return normalizedAccountType === "both" || normalizedAccountType === "individual";
  };

  res.json({
    success: true,
    data: {
      results: results.filter((item) => matchesAccountType(item.account_type)),
    },
  });
};

export const startDriverLoginOtpRequest = async (req, res) => {
  const result = await startDriverLoginOtp(req.body);
  res.status(201).json({ success: true, data: result });
};

export const verifyDriverLoginOtpRequest = async (req, res) => {
  const result = await verifyDriverLoginOtp(req.body);
  res.json({ success: true, data: result });
};

export const startOnboarding = async (req, res) => {
  const result = await startDriverOnboarding(req.body);
  res.status(201).json({ success: true, data: result });
};

export const verifyOnboardingOtp = async (req, res) => {
  const result = await verifyDriverOtp(req.body);
  res.json({ success: true, data: result });
};

export const saveOnboardingPersonal = async (req, res) => {
  const result = await saveDriverPersonalDetails(req.body);
  res.json({ success: true, data: result });
};

export const saveOnboardingReferral = async (req, res) => {
  const result = await saveDriverReferral(req.body);
  res.json({ success: true, data: result });
};

export const saveOnboardingVehicle = async (req, res) => {
  const result = await saveDriverVehicle(req.body);
  res.json({ success: true, data: result });
};

export const saveOnboardingDocuments = async (req, res) => {
  const result = await saveDriverDocuments(req.body);
  res.json({ success: true, data: result });
};

export const completeOnboarding = async (req, res) => {
  const result = await completeDriverOnboarding(req.body);
  res.status(201).json({ success: true, data: result });
};

export const getOnboardingSession = async (req, res) => {
  const result = await getDriverOnboardingSession({
    registrationId: req.params.registrationId,
    phone: req.query.phone,
  });
  res.json({ success: true, data: result });
};

export const goOffline = async (req, res) => {
  const existingDriver = await Driver.findById(req.auth.sub);

  if (!existingDriver) {
    throw new ApiError(404, "Driver not found");
  }

  const finalizedTracking = mergeOnlineSessionIntoTracking(
    existingDriver.incentiveTracking || {},
    existingDriver.incentiveTracking?.currentOnlineStartedAt,
    new Date(),
  );
  const finalizedTodaySummary = buildDriverTodaySummaryFromDocument(existingDriver);

  const driver = await Driver.findByIdAndUpdate(
    req.auth.sub,
    {
      isOnline: false,
      socketId: null,
      incentiveTracking: {
        ...finalizedTracking,
        currentOnlineStartedAt: null,
        claimedRewards: pruneClaimedRewards(finalizedTracking?.claimedRewards),
      },
      todaySummary: finalizedTodaySummary,
    },
    { returnDocument: 'after' },
  );

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  res.json({
    success: true,
    data: driver,
  });
};

export const getDriverIncentives = async (req, res) => {
  const driver = await Driver.findById(req.auth.sub).lean();

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const liveDriver = {
    ...driver,
    incentiveTracking: {
      ...(driver.incentiveTracking || {}),
      ...mergeOnlineSessionIntoTracking(
        driver.incentiveTracking || {},
        driver.incentiveTracking?.currentOnlineStartedAt,
        new Date(),
      ),
    },
  };

  const settingsDoc = await AdminBusinessSetting.findOne({ scope: "default" }).lean();
  const driverSettings = settingsDoc?.referral?.driver || {};
  const rides = await Ride.find({ driverId: driver._id }).select("status liveStatus createdAt updatedAt completedAt").lean();

  const snapshot = buildDriverIncentiveSnapshot({
    driver: liveDriver,
    settings: driverSettings,
    rides,
  });

  res.json({
    success: true,
    data: snapshot,
  });
};

export const claimDriverIncentiveReward = async (req, res) => {
  const { rewardType, rewardKey } = req.body || {};
  const normalizedRewardType = String(rewardType || "").trim().toLowerCase();
  const normalizedRewardKey = String(rewardKey || "").trim();

  if (!["milestone", "feature"].includes(normalizedRewardType) || !normalizedRewardKey) {
    throw new ApiError(400, "Valid reward type and reward key are required");
  }

  const driver = await Driver.findById(req.auth.sub);

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const settingsDoc = await AdminBusinessSetting.findOne({ scope: "default" }).lean();
  const driverSettings = settingsDoc?.referral?.driver || {};
  const rides = await Ride.find({ driverId: driver._id }).select("status liveStatus createdAt updatedAt completedAt").lean();
  const liveDriver = {
    ...driver.toObject(),
    incentiveTracking: {
      ...(driver.incentiveTracking || {}),
      ...mergeOnlineSessionIntoTracking(
        driver.incentiveTracking || {},
        driver.incentiveTracking?.currentOnlineStartedAt,
        new Date(),
      ),
    },
  };
  const snapshot = buildDriverIncentiveSnapshot({
    driver: liveDriver,
    settings: driverSettings,
    rides,
  });

  const targetReward =
    normalizedRewardType === "milestone"
      ? snapshot.milestones.find((item) => String(item.id) === normalizedRewardKey)
      : snapshot.features.find((item) => String(item.key) === normalizedRewardKey);

  if (!targetReward) {
    throw new ApiError(404, "Reward not found");
  }

  if (!targetReward.isEligible) {
    throw new ApiError(400, "Reward is not eligible yet");
  }

  if (targetReward.isClaimed) {
    throw new ApiError(400, "Reward already claimed");
  }

  const claimedRewards = pruneClaimedRewards([
    ...(Array.isArray(driver.incentiveTracking?.claimedRewards) ? driver.incentiveTracking.claimedRewards : []),
    {
      rewardType: normalizedRewardType,
      rewardKey: normalizedRewardType === "milestone" ? String(targetReward.id) : String(targetReward.key),
      periodKey: targetReward.periodKey,
      amount: Number(targetReward.payout_amount ?? targetReward.reward_amount ?? 0),
      claimedAt: new Date(),
      metadata: {
        label: targetReward.name || targetReward.label || "",
        targetValue: targetReward.targetValue ?? targetReward.progress?.targetWeeks ?? 0,
      },
    },
  ]);

  driver.incentiveTracking = {
    ...(liveDriver.incentiveTracking || {}),
    dailyActivity: pruneDailyActivity(liveDriver.incentiveTracking?.dailyActivity),
    claimedRewards,
  };
  await driver.save();

  const rewardAmount = Number(targetReward.payout_amount ?? targetReward.reward_amount ?? 0);

  const walletResult = await applyDriverWalletAdjustment({
    driverId: driver._id,
    amount: rewardAmount,
    type: "adjustment",
    description: `Incentive reward credited for ${targetReward.name || targetReward.label || "milestone"}`,
    metadata: {
      category: "driver_incentive",
      rewardType: normalizedRewardType,
      rewardKey: normalizedRewardType === "milestone" ? String(targetReward.id) : String(targetReward.key),
      periodKey: targetReward.periodKey,
    },
  });

  res.json({
    success: true,
    data: {
      wallet: walletResult.wallet,
      transaction: walletResult.transaction,
      claimedReward: {
        rewardType: normalizedRewardType,
        rewardKey: normalizedRewardKey,
        amount: rewardAmount,
        periodKey: targetReward.periodKey,
      },
    },
  });
};
