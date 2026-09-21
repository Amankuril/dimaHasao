import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Env, StandardCheckoutClient, StandardCheckoutPayRequest, PrefillUserLoginDetails } from '@phonepe-pg/pg-sdk-node';
import { ApiError } from '../../../../utils/ApiError.js';
import { asyncHandler } from '../../../../utils/asyncHandler.js';
import { User } from '../models/User.js';
import { UserWallet } from '../models/UserWallet.js';
import { AdminBusinessSetting } from '../../admin/models/AdminBusinessSetting.js';
import { Notification } from '../../admin/promotions/models/Notification.js';
import { Driver } from '../../driver/models/Driver.js';
import { comparePassword, hashPassword, signAccessToken } from '../services/authService.js';
import { env } from '../../../../config/env.js';
import { uploadDataUrlToCloudinary } from '../../../../utils/cloudinaryUpload.js';
import { resolveConfiguredGatewayCredentials } from '../../services/paymentGatewayService.js';
import { getTransportRideSettings } from '../../services/transportSettingsService.js';
import {
  consumeUserSignupSession,
  requireVerifiedUserSignupSession,
  startUserOtp,
  verifyUserOtp,
} from '../services/userOtpService.js';
import { assignPushTokenToEntity } from '../../services/pushTokenService.js';
import { RentalBookingRequest } from '../../admin/models/RentalBookingRequest.js';
import { RentalQuoteRequest } from '../../admin/models/RentalQuoteRequest.js';
import { RentalVehicleType } from '../../admin/models/RentalVehicleType.js';
import { ServiceStore } from '../../admin/models/ServiceStore.js';
import { SetPrice } from '../../admin/models/SetPrice.js';
import { applyDriverWalletAdjustment } from '../../driver/services/walletService.js';
import { emitToDriver } from '../../services/dispatchService.js';
import { sendPushNotificationToEntities } from '../../services/pushNotificationService.js';
import { buildRentalTrackingSnapshot, updateUserRentalTracking } from '../../services/rentalTrackingService.js';
import { listDriverServiceLocations } from '../../driver/services/serviceLocationService.js';
import { listServiceStores, listSetPrices, listZones } from '../../admin/services/adminService.js';
import {
  getUserSubscriptionSummary,
  listCustomerSubscriptionPlans,
  purchaseUserSubscription,
} from '../services/subscriptionService.js';
import { computeExpectedSignature } from '../../../../core/payments/razorpay.service.js';
import {
  buildPaymentRequestContext,
  logPaymentDiagnostic,
  summarizeCheckoutUrl,
  summarizePhonePeCredentialMeta,
  summarizePhonePePayload,
  summarizePhonePeRequestBody,
} from '../../services/paymentDiagnostics.js';

const VALID_GENDERS = new Set(['male', 'female', 'other', 'prefer-not-to-say', '']);

const toCleanString = (value) => String(value || '').trim();

const normalizePhone = (value) => {
  const digits = toCleanString(value).replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};

const normalizeEmail = (value) => toCleanString(value).toLowerCase();
const normalizeReferralCode = (value) => toCleanString(value).toUpperCase();

const normalizeGender = (value) => {
  const gender = toCleanString(value).toLowerCase();
  return VALID_GENDERS.has(gender) ? gender : 'prefer-not-to-say';
};

const validatePhone = (phone) => {
  if (!/^\d{10}$/.test(phone)) {
    throw new ApiError(400, 'A valid 10-digit phone number is required');
  }
};

const validateName = (name) => {
  if (!name || name.length < 2 || name.length > 80) {
    throw new ApiError(400, 'name must be between 2 and 80 characters');
  }
};

const validateEmail = (email) => {
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'A valid email address is required');
  }
};

const normalizeMoneyAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, 'amount must be a positive number');
  }
  return Math.round(amount * 100) / 100;
};

const ensureUserWallet = async (userId) => {
  if (!userId) return;
  await UserWallet.updateOne(
    { userId },
    { $setOnInsert: { userId, balance: 0, refundWallet: 0, transactions: [] } },
    { upsert: true },
  );
};

const serializeUserWalletTransaction = (entry = {}) => ({
  id: entry._id,
  kind: entry.kind,
  amount: Number(entry.amount || 0),
  title: entry.title || '',
  counterpartyPhone: entry.counterpartyPhone || '',
  createdAt: entry.createdAt || null,
});

const buildUserWalletPayload = (wallet) => {
  const transactions = Array.isArray(wallet?.transactions) ? wallet.transactions : [];

  return {
    balance: Number(wallet?.balance || 0),
    refundWallet: Number(wallet?.refundWallet || 0),
    currency: 'INR',
    recentTransactions: transactions
      .slice()
      .reverse()
      .map(serializeUserWalletTransaction),
  };
};

const resolveRazorpayCredentials = async () => {
  return resolveConfiguredGatewayCredentials('razor_pay');
};

const resolvePhonePeCredentials = async () => {
  return resolveConfiguredGatewayCredentials('phone_pay');
};

const isActiveEntity = (item = {}) =>
  item?.active !== false && String(item?.status || 'active').toLowerCase() === 'active';

export const listPublicServiceLocations = async (_req, res) => {
  const results = await listDriverServiceLocations();

  res.json({
    success: true,
    data: {
      results,
    },
  });
};

export const listPublicServiceStores = async (_req, res) => {
  const results = (await listServiceStores())
    .filter(isActiveEntity)
    .map((store) => {
      const resolvedServiceLocationId =
        store.service_location_id ||
        store.zone_id?.service_location_id ||
        null;

      return {
        _id: store._id,
        id: store.id || store._id,
        name: store.name || '',
        address: store.address || '',
        owner_name: store.owner_name || '',
        owner_phone: store.owner_phone || '',
        service_location_id: resolvedServiceLocationId,
        zone_id: store.zone_id,
        latitude: Number(store.latitude ?? null),
        longitude: Number(store.longitude ?? null),
        status: store.status || 'active',
        active: store.active !== false,
      };
    });

  res.json({
    success: true,
    data: {
      results,
    },
  });
};

const normalizeOriginCandidate = (value = '') => {
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue || trimmedValue === '*') {
    return '';
  }

  try {
    return new URL(trimmedValue).origin.replace(/\/+$/, '');
  } catch {
    return '';
  }
};

const isPublicWebOrigin = (value = '') => {
  const origin = normalizeOriginCandidate(value);
  if (!origin) {
    return false;
  }

  try {
    const { protocol, hostname } = new URL(origin);
    if (!['http:', 'https:'].includes(protocol)) {
      return false;
    }

    return !['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname);
  } catch {
    return false;
  }
};

const getFrontendBaseUrl = (req) => {
  const configuredOrigins = [
    env.phonePeRedirectBaseUrl,
    env.publicFrontendUrl,
    ...String(env.corsOrigin || '')
      .split(',')
      .map((value) => value.trim()),
  ]
    .map(normalizeOriginCandidate)
    .filter(Boolean);

  const requestCandidates = [
    normalizeOriginCandidate(req?.get?.('origin')),
    normalizeOriginCandidate(req?.get?.('referer')),
    (() => {
      const forwardedProto = String(req?.get?.('x-forwarded-proto') || '').trim();
      const forwardedHost = String(req?.get?.('x-forwarded-host') || '').trim();
      if (!forwardedProto || !forwardedHost) {
        return '';
      }
      return normalizeOriginCandidate(`${forwardedProto}://${forwardedHost}`);
    })(),
    (() => {
      const host = String(req?.get?.('host') || '').trim();
      const proto =
        String(req?.protocol || '').trim() ||
        String(req?.get?.('x-forwarded-proto') || '').trim() ||
        'http';
      if (!host) {
        return '';
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
    'http://localhost:5173'
  ).replace(/\/+$/, '');
};

const phonePeClientCache = new Map();

const getPhonePeCheckoutClient = ({
  clientId,
  clientSecret,
  clientVersion,
  environment,
}) => {
  const normalizedEnvironment = String(environment || 'test').trim().toLowerCase();
  const normalizedVersion = Number.parseInt(String(clientVersion || '1'), 10) || 1;
  const cacheKey = `${normalizedEnvironment}::${clientId}::${normalizedVersion}`;

  if (phonePeClientCache.has(cacheKey)) {
    return phonePeClientCache.get(cacheKey);
  }

  const client = StandardCheckoutClient.getInstance(
    clientId,
    clientSecret,
    normalizedVersion,
    normalizedEnvironment === 'production' ? Env.PRODUCTION : Env.SANDBOX,
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
  const normalizedMethod = String(method || 'GET').trim().toUpperCase();
  logPaymentDiagnostic({
    provider: 'phonepe',
    scope: 'user',
    stage: 'api-request',
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

    if (normalizedMethod === 'POST' && path === '/checkout/v2/pay') {
      const merchantOrderId = String(body?.merchantOrderId || '').trim();
      const amount = Number(body?.amount || 0);
      const redirectUrl = String(body?.paymentFlow?.merchantUrls?.redirectUrl || '').trim();

      if (!merchantOrderId || !amount || !redirectUrl) {
        throw new ApiError(400, 'PhonePe merchant order id, amount, and redirect URL are required');
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
    } else if (normalizedMethod === 'GET' && path.includes('/checkout/v2/order/')) {
      const orderMatch = path.match(/\/checkout\/v2\/order\/([^/]+)\/status/i);
      const merchantOrderId = decodeURIComponent(orderMatch?.[1] || '').trim();

      if (!merchantOrderId) {
        throw new ApiError(400, 'PhonePe merchant order id is required');
      }

      payload = await client.getOrderStatus(merchantOrderId);
    } else {
      throw new ApiError(400, `Unsupported PhonePe operation: ${normalizedMethod} ${path}`);
    }

    logPaymentDiagnostic({
      provider: 'phonepe',
      scope: 'user',
      stage: 'api-success',
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
      provider: 'phonepe',
      scope: 'user',
      stage: 'api-failed',
      level: 'error',
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
        '',
    });
    throw new ApiError(
      statusCode,
      error?.message || payload?.message || payload?.code || 'PhonePe request failed',
    );
  }
};

const razorpayRequest = async ({ method, path, body, keyId, keySecret }) => {
  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status || 502, payload?.error?.description || payload?.error?.message || 'Razorpay request failed');
  }

  return payload;
};

export const getIntercityPackageCatalog = async (_req, res) => {
  const items = await SetPrice.find({
    pricing_scope: 'package',
    active: 1,
    status: 'active',
    package_availability: 'available',
  })
    .populate('service_location_id', 'name service_location_name')
    .populate('package_type_id', 'name')
    .populate('package_vehicle_prices.vehicle_type', 'name capacity icon map_icon image icon_types dispatch_type')
    .sort({ package_destination: 1, createdAt: -1 })
    .lean();

  const results = items.map((item) => {
    const serviceLocation = item.service_location_id || {};
    const packageType = item.package_type_id || {};

    return {
      id: String(item._id),
      serviceLocationId: serviceLocation._id ? String(serviceLocation._id) : '',
      serviceLocationName: serviceLocation.name || serviceLocation.service_location_name || '',
      packageTypeId: packageType._id ? String(packageType._id) : '',
      packageTypeName: packageType.name || '',
      destination: String(item.package_destination || '').trim(),
      availability: String(item.package_availability || 'available').trim().toLowerCase(),
      vehicles: Array.isArray(item.package_vehicle_prices)
        ? item.package_vehicle_prices
            .filter((row) => row?.vehicle_type)
            .map((row, index) => ({
              id: `${String(item._id)}:${String(row.vehicle_type?._id || index)}`,
              vehicleTypeId: row.vehicle_type?._id ? String(row.vehicle_type._id) : '',
              vehicleName: row.vehicle_type?.name || 'Vehicle',
              capacity: Number(row.vehicle_type?.capacity || 0),
              icon: row.vehicle_type?.map_icon || row.vehicle_type?.icon || row.vehicle_type?.image || '',
              iconType: row.vehicle_type?.icon_types || row.vehicle_type?.name || '',
              dispatchType: String(row.vehicle_type?.dispatch_type || 'normal').trim().toLowerCase(),
              basePrice: Number(row.base_price ?? 0),
              freeDistance: Number(row.free_distance ?? 0),
              distancePrice: Number(row.distance_price ?? 0),
              freeTime: Number(row.free_time ?? 0),
              timePrice: Number(row.time_price ?? 0),
              adminCommisionType: Number(row.admin_commision_type ?? 1),
              adminCommision: Number(row.admin_commision ?? 0),
              adminCommissionTypeFromDriver: Number(row.admin_commission_type_from_driver ?? 1),
              adminCommissionFromDriver: Number(row.admin_commission_from_driver ?? 0),
              adminCommissionTypeForOwner: Number(row.admin_commission_type_for_owner ?? 1),
              adminCommissionForOwner: Number(row.admin_commission_for_owner ?? 0),
              serviceTax: Number(row.service_tax ?? 0),
              cancellationFee: Number(row.cancellation_fee ?? 0),
            }))
        : [],
    };
  });

  res.json({
    success: true,
    results,
  });
};

const serializeRentalQuoteRequest = (item = {}) => ({
  id: String(item._id || item.id || ''),
  vehicleTypeId: item.vehicleTypeId ? String(item.vehicleTypeId) : '',
  vehicleName: item.vehicleName || '',
  contactName: item.contactName || '',
  contactPhone: item.contactPhone || '',
  contactEmail: item.contactEmail || '',
  requestedHours: Number(item.requestedHours || 0),
  pickupDateTime: item.pickupDateTime || null,
  returnDateTime: item.returnDateTime || null,
  seatsNeeded: Number(item.seatsNeeded || 1),
  luggageNeeded: Number(item.luggageNeeded || 0),
  pickupLocation: item.pickupLocation || '',
  dropLocation: item.dropLocation || '',
  specialRequirements: item.specialRequirements || '',
  status: item.status || 'pending',
  adminQuotedAmount: Number(item.adminQuotedAmount || 0),
  adminNote: item.adminNote || '',
  createdAt: item.createdAt || null,
});

const serializeRentalBookingRequest = (item = {}) => ({
  id: String(item._id || item.id || ''),
  bookingReference: item.bookingReference || '',
  userId: item.userId ? String(item.userId) : '',
  vehicleTypeId: item.vehicleTypeId ? String(item.vehicleTypeId) : '',
  vehicleName: item.vehicleName || '',
  vehicleCategory: item.vehicleCategory || '',
  vehicleImage: item.vehicleImage || '',
  selectedPackage: {
    packageId: item.selectedPackage?.packageId || '',
    label: item.selectedPackage?.label || '',
    durationHours: Number(item.selectedPackage?.durationHours || 0),
    price: Number(item.selectedPackage?.price || 0),
    extraHourPrice: Number(item.selectedPackage?.extraHourPrice || 0),
  },
  serviceLocation: {
    locationId: item.serviceLocation?.locationId || '',
    name: item.serviceLocation?.name || '',
    address: item.serviceLocation?.address || '',
    city: item.serviceLocation?.city || '',
    latitude: item.serviceLocation?.latitude ?? null,
    longitude: item.serviceLocation?.longitude ?? null,
    distanceKm: item.serviceLocation?.distanceKm ?? null,
  },
  pickupDateTime: item.pickupDateTime || null,
  returnDateTime: item.returnDateTime || null,
  requestedHours: Number(item.requestedHours || 0),
  totalCost: Number(item.totalCost || 0),
  payableNow: Number(item.payableNow || 0),
  advancePaymentLabel: item.advancePaymentLabel || '',
  paymentStatus: item.paymentStatus || 'pending',
  paymentMethod: item.paymentMethod || '',
  paymentMethodLabel: item.paymentMethodLabel || '',
  payment: {
    provider: item.payment?.provider || '',
    status: item.payment?.status || '',
    amount: Number(item.payment?.amount || 0),
    currency: item.payment?.currency || 'INR',
    orderId: item.payment?.orderId || '',
    paymentId: item.payment?.paymentId || '',
    signature: item.payment?.signature || '',
  },
  contactName: item.contactName || '',
  contactPhone: item.contactPhone || '',
  contactEmail: item.contactEmail || '',
  kycCompleted: Boolean(item.kycCompleted),
  kycDocuments: {
    drivingLicense: {
      imageUrl: item.kycDocuments?.drivingLicense?.imageUrl || '',
      fileName: item.kycDocuments?.drivingLicense?.fileName || '',
      uploadedAt: item.kycDocuments?.drivingLicense?.uploadedAt || null,
    },
    aadhaarCard: {
      imageUrl: item.kycDocuments?.aadhaarCard?.imageUrl || '',
      fileName: item.kycDocuments?.aadhaarCard?.fileName || '',
      uploadedAt: item.kycDocuments?.aadhaarCard?.uploadedAt || null,
    },
  },
  assignedVehicle: {
    vehicleId: item.assignedVehicle?.vehicleId ? String(item.assignedVehicle.vehicleId) : '',
    name: item.assignedVehicle?.name || '',
    vehicleCategory: item.assignedVehicle?.vehicleCategory || '',
    image: item.assignedVehicle?.image || '',
  },
  commissionSnapshot: {
    serviceStoreId: item.commissionSnapshot?.serviceStoreId
      ? String(item.commissionSnapshot.serviceStoreId)
      : '',
    serviceStoreName: item.commissionSnapshot?.serviceStoreName || '',
    ownerName: item.commissionSnapshot?.ownerName || '',
    serviceStoreCommissionType:
      item.commissionSnapshot?.serviceStoreCommissionType === 'fixed' ? 'fixed' : 'percentage',
    serviceStoreCommissionValue: Number(item.commissionSnapshot?.serviceStoreCommissionValue || 0),
    ownerCommissionType:
      item.commissionSnapshot?.ownerCommissionType === 'fixed' ? 'fixed' : 'percentage',
    ownerCommissionValue: Number(item.commissionSnapshot?.ownerCommissionValue || 0),
    serviceTaxPercentage: Math.max(0, Number(item.commissionSnapshot?.serviceTaxPercentage || 0)),
  },
  status: item.status || 'pending',
  adminNote: item.adminNote || '',
  assignedAt: item.assignedAt || null,
  completionRequestedAt: item.completionRequestedAt || null,
  completedAt: item.completedAt || null,
  finalCharge: Number(item.finalCharge || 0),
  finalElapsedMinutes: Number(item.finalElapsedMinutes || 0),
  createdAt: item.createdAt || null,
  updatedAt: item.updatedAt || null,
  rentalTracking: buildRentalTrackingSnapshot(item),
});

const computeRentalCommissionBreakdown = (snapshot = {}, grossAmount = 0) => {
  const baseAmount = Math.max(0, Number(grossAmount || 0));
  const serviceStoreType =
    snapshot?.serviceStoreCommissionType === 'fixed' ? 'fixed' : 'percentage';
  const ownerType = snapshot?.ownerCommissionType === 'fixed' ? 'fixed' : 'percentage';
  const serviceStoreValue = Math.max(0, Number(snapshot?.serviceStoreCommissionValue || 0));
  const ownerValue = Math.max(0, Number(snapshot?.ownerCommissionValue || 0));
  const calculateAmount = (amount, type, value) =>
    type === 'fixed'
      ? Math.min(amount, value)
      : Math.min(amount, Math.max(0, (amount * value) / 100));
  const serviceStoreAmountRaw = calculateAmount(baseAmount, serviceStoreType, serviceStoreValue);
  const ownerAmountRaw = calculateAmount(
    Math.max(0, baseAmount - serviceStoreAmountRaw),
    ownerType,
    ownerValue,
  );
  const adminAmountRaw = Math.max(0, baseAmount - serviceStoreAmountRaw - ownerAmountRaw);
  const serviceTaxPercentage = Math.max(0, Number(snapshot?.serviceTaxPercentage || 0));
  const serviceTaxAmountRaw = (baseAmount * serviceTaxPercentage) / 100;
  const round = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

  return {
    grossAmount: round(baseAmount),
    grossAmountWithTax: round(baseAmount + serviceTaxAmountRaw),
    serviceTax: {
      percentage: round(serviceTaxPercentage),
      amount: round(serviceTaxAmountRaw),
    },
    serviceStore: {
      id: snapshot?.serviceStoreId ? String(snapshot.serviceStoreId) : '',
      name: snapshot?.serviceStoreName || '',
      type: serviceStoreType,
      value: round(serviceStoreValue),
      amount: round(serviceStoreAmountRaw),
    },
    owner: {
      name: snapshot?.ownerName || '',
      type: ownerType,
      value: round(ownerValue),
      amount: round(ownerAmountRaw),
    },
    admin: {
      amount: round(adminAmountRaw),
    },
  };
};

const resolveRentalSelectedPackagePricing = (item = {}) => {
  const selectedPackage = item.selectedPackage || {};
  const normalizedPackageId = String(selectedPackage.packageId || '').trim();
  const vehiclePricing = Array.isArray(item.vehicleTypeId?.pricing) ? item.vehicleTypeId.pricing : [];
  const matchedPackage = vehiclePricing.find((entry) => String(entry?.id || entry?.packageId || '').trim() === normalizedPackageId);

  const includedHours = Math.max(
    Number(selectedPackage.durationHours || 0),
    Number(matchedPackage?.durationHours || 0),
    1,
  );
  const basePrice = Math.max(
    Number(selectedPackage.price || 0),
    Number(matchedPackage?.price || 0),
    0,
  );
  const extraHourPrice = Math.max(
    Number(selectedPackage.extraHourPrice || 0),
    Number(matchedPackage?.extraHourPrice || 0),
    0,
  );

  return {
    includedHours,
    basePrice,
    extraHourPrice,
  };
};

const computeRentalRideMetrics = (item = {}, endedAt = null) => {
  const startDate = item.assignedAt || item.pickupDateTime || item.createdAt;
  const startMs = startDate ? new Date(startDate).getTime() : NaN;
  const endMs = endedAt ? new Date(endedAt).getTime() : Date.now();
  const { includedHours, basePrice, extraHourPrice } = resolveRentalSelectedPackagePricing(item);
  const hourlyRate = includedHours > 0 ? basePrice / includedHours : 0;

  if (!Number.isFinite(startMs)) {
    return {
      hourlyRate: Math.max(0, hourlyRate),
      includedHours,
      basePrice,
      extraHourRate: extraHourPrice,
      elapsedMinutes: 0,
      elapsedHours: 0,
      currentCharge: Math.max(basePrice, Number(item.payableNow || 0)),
      remainingDue: Math.max(0, Math.max(basePrice, Number(item.payableNow || 0)) - Number(item.payableNow || 0)),
    };
  }

  const elapsedMs = Math.max(0, endMs - startMs);
  const elapsedMinutes = Math.max(0, Math.ceil(elapsedMs / 60000));
  const elapsedHours = elapsedMs / 3600000;
  const elapsedChargeWithinPackage = elapsedHours <= includedHours
    ? basePrice
    : basePrice + Math.ceil(Math.max(0, elapsedHours - includedHours)) * extraHourPrice;
  const uncappedCharge = Math.max(Number(item.payableNow || 0), elapsedChargeWithinPackage);
  const currentCharge = Math.round((uncappedCharge + Number.EPSILON) * 100) / 100;
  const remainingDue = Math.max(0, Math.round((currentCharge - Number(item.payableNow || 0) + Number.EPSILON) * 100) / 100);

  return {
    hourlyRate: Math.max(0, Math.round((hourlyRate + Number.EPSILON) * 100) / 100),
    includedHours,
    basePrice: Math.round((basePrice + Number.EPSILON) * 100) / 100,
    extraHourRate: Math.round((extraHourPrice + Number.EPSILON) * 100) / 100,
    elapsedMinutes,
    elapsedHours: Math.round((elapsedHours + Number.EPSILON) * 100) / 100,
    currentCharge,
    remainingDue,
  };
};

const resolveAuthenticatedUserObjectId = (req) => {
  const userId = String(req.auth?.sub || '').trim();
  return mongoose.Types.ObjectId.isValid(userId) ? userId : '';
};

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildPagination = ({ page = 1, limit = 10, total = 0 }) => {
  const safeLimit = Math.max(1, Number(limit) || 10);
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);

  return {
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
};

const toUserPayload = (user, options = {}) => ({
  id: user._id,
  name: user.name || '',
  phone: user.phone || '',
  email: user.email || '',
  gender: user.gender || '',
  profileImage: user.profileImage || '',
  governmentIdProof: user.governmentIdProof || {
    type: '',
    imageUrl: '',
    backImageUrl: '',
    fileName: '',
    backFileName: '',
    uploadedAt: null,
    backUploadedAt: null,
  },
  referralCode: user.referralCode || '',
  referralCount: Number(user.referralCount || 0),
  deletionRequestStatus: user.deletionRequest?.status || 'none',
  referralCode: user.referralCode || '',
  referralCount: Number(user.referralCount || 0),
  currentRideId: user.currentRideId || null,
  subscriptionSummary: options.subscriptionSummary || {
    activeCount: 0,
    hasUnlimitedPlan: false,
    availableRideCredits: 0,
    activePlans: [],
  },
});

const ensureUserCanLogin = (user) => {
  if (user.deletedAt || user.isActive === false || user.active === false) {
    throw new ApiError(403, 'User account is not active');
  }
};

const canRestoreUserForSignup = (user) => Boolean(user?.deletedAt);

const VALID_GOVERNMENT_ID_TYPES = new Set(['aadhaar', 'voter_id', 'passport', 'driving_license', 'other']);

const normalizeGovernmentIdProof = (input = {}, { required = false } = {}) => {
  const type = toCleanString(input.type).toLowerCase();
  const imageUrl = toCleanString(input.imageUrl || input.url || input.secureUrl);
  const backImageUrl = toCleanString(input.backImageUrl || input.backUrl || input.backSecureUrl);
  const fileName = toCleanString(input.fileName || input.name || 'government-id');
  const backFileName = toCleanString(input.backFileName || input.backName || 'government-id-back');

  if (!imageUrl && !backImageUrl && !required) {
    return {
      type: '',
      imageUrl: '',
      backImageUrl: '',
      fileName: '',
      backFileName: '',
      uploadedAt: null,
      backUploadedAt: null,
    };
  }

  if (!VALID_GOVERNMENT_ID_TYPES.has(type)) {
    throw new ApiError(400, 'A valid government ID type is required');
  }

  if (required && !imageUrl) {
    throw new ApiError(400, 'Government ID front image is required');
  }

  if (required && !backImageUrl) {
    throw new ApiError(400, 'Government ID back image is required');
  }

  return {
    type,
    imageUrl,
    backImageUrl,
    fileName: fileName || `${type}-proof`,
    backFileName: backFileName || `${type}-proof-back`,
    uploadedAt: input.uploadedAt ? new Date(input.uploadedAt) : new Date(),
    backUploadedAt: backImageUrl
      ? input.backUploadedAt
        ? new Date(input.backUploadedAt)
        : new Date()
      : null,
  };
};

const buildRentalBookingResponse = (item = {}, endedAt = null) => {
  const rideMetrics = computeRentalRideMetrics(item, endedAt);

  return {
    ...serializeRentalBookingRequest(item),
    rideMetrics,
    commissionBreakdown: {
      estimated: computeRentalCommissionBreakdown(item.commissionSnapshot, Number(item.totalCost || 0)),
      live: computeRentalCommissionBreakdown(
        item.commissionSnapshot,
        Number(item.finalCharge || rideMetrics.currentCharge || item.totalCost || 0),
      ),
    },
  };
};

const buildReactivatedUserPayload = async ({
  req,
  name,
  phone,
  email,
  countryCode,
  gender,
  profileImage,
  governmentIdProof,
  referrer,
}) => ({
  name,
  phone,
  countryCode,
  email,
  gender,
  profileImage,
  governmentIdProof,
  password: await hashPassword(String(req.body.password || '').trim() || crypto.randomBytes(24).toString('hex')),
  isVerified: true,
  referredBy: referrer?._id || null,
  deletedAt: null,
  deletion_reason: '',
  active: true,
  isActive: true,
  deletionRequest: {
    status: 'none',
    reason: '',
    requestedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    adminNote: '',
  },
});

const createUserSession = (user) => ({
  token: signAccessToken({ sub: String(user._id), role: 'user' }),
  user: toUserPayload(user),
});

const generateUserReferralCode = (user) => {
  const idPart = String(user?._id || '').slice(-6).toUpperCase();
  const phonePart = String(user?.phone || '').slice(-4);
  return `USR${phonePart}${idPart}`.replace(/\W/g, '');
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

const findUserByReferralCode = async (referralCode) => {
  const normalizedCode = normalizeReferralCode(referralCode);

  if (!normalizedCode) {
    return null;
  }

  return User.findOne({ referralCode: normalizedCode });
};

const creditUserWalletByReference = async ({ userId, amount, title, referenceKey }) => {
  const normalizedAmount = Math.max(0, Number(amount || 0) || 0);
  const normalizedReferenceKey = toCleanString(referenceKey);

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
              title: toCleanString(title) || 'Referral Reward',
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

const processSignupReferralRewards = async ({ user, referrer }) => {
  if (!user?._id || !referrer?._id) {
    return;
  }

  const settings = await getUserReferralProgramSettings();
  if (!settings.enabled || settings.amount <= 0) {
    return;
  }

  const referralType = settings.type;
  const rewardBaseKey = `user-referral:signup:${String(user._id)}`;

  if (referralType === 'instant_referrer' || referralType === 'instant_referrer_new') {
    await creditUserWalletByReference({
      userId: referrer._id,
      amount: settings.amount,
      title: `Referral reward for inviting ${user.phone}`,
      referenceKey: `${rewardBaseKey}:referrer`,
    });
  }

  if (referralType === 'instant_referrer_new') {
    await creditUserWalletByReference({
      userId: user._id,
      amount: settings.amount,
      title: 'Welcome referral reward',
      referenceKey: `${rewardBaseKey}:new-user`,
    });
    user.referralRewardGrantedAt = user.referralRewardGrantedAt || new Date();
    await user.save();
  }
};

export const registerUser = async (req, res) => {
  const name = toCleanString(req.body.name);
  const phone = normalizePhone(req.body.phone);
  const email = normalizeEmail(req.body.email);
  const countryCode = toCleanString(req.body.countryCode) || '+91';
  const gender = normalizeGender(req.body.gender);
  const profileImage = toCleanString(req.body.profileImage);
  const governmentIdProof = normalizeGovernmentIdProof(req.body.governmentIdProof || {}, { required: false });
  const referralCode = normalizeReferralCode(req.body.referralCode);

  validateName(name);
  validatePhone(phone);
  validateEmail(email);

  const existingUser = await User.findOne({ phone });

  const referrer = referralCode ? await findUserByReferralCode(referralCode) : null;

  if (referralCode && !referrer) {
    throw new ApiError(400, 'Invalid referral code');
  }

  if (existingUser && !canRestoreUserForSignup(existingUser)) {
    throw new ApiError(409, 'Phone number is already registered');
  }

  const userPayload = await buildReactivatedUserPayload({
    req,
    name,
    phone,
    email,
    countryCode,
    gender,
    profileImage,
    governmentIdProof,
    referrer,
  });

  const user = existingUser
    ? await User.findByIdAndUpdate(existingUser._id, { $set: userPayload }, { new: true, runValidators: true })
    : await User.create(userPayload);

  if (!String(user.referralCode || '').trim()) {
    user.referralCode = generateUserReferralCode(user);
    await user.save();
  }

  if (referrer?._id) {
    await User.updateOne({ _id: referrer._id }, { $inc: { referralCount: 1 } });
    await processSignupReferralRewards({ user, referrer });
  }

  res.status(201).json({
    success: true,
    data: createUserSession(user),
  });
};

const serializeUserNotification = (item = {}) => ({
  id: String(item._id || ''),
  title: String(item.push_title || '').trim(),
  body: String(item.message || '').trim(),
  image: item.image || '',
  sentAt: item.sent_at || item.createdAt || null,
  serviceLocationId: item.service_location_id || null,
});

export const getUserNotifications = async (req, res) => {
  const user = await User.findById(req.auth.sub).lean();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Users don't typically have a service_location_id in their profile like drivers do in this schema,
  // but if they did, we would use it. For now, we fetch all user-targeted notifications.
  const query = {
    status: 'sent',
    send_to: { $in: ['all', 'users'] },
  };

  const notifications = await Notification.find(query)
    .sort({ sent_at: -1, createdAt: -1 })
    .limit(100)
    .lean();

  res.json({
    success: true,
    data: {
      results: notifications.map(serializeUserNotification),
    },
  });
};

export const deleteUserNotification = async (req, res) => {
  // In a real multi-tenant app, you'd mark it as read/deleted for THIS user in a pivot table.
  // However, the current driver implementation seems to imply a simpler model or global clear for the demo.
  // For consistency with the user's request for "single clear", we'll just return success 
  // as the frontend is already filtering its local state.
  // If we wanted to persist this per user, we'd need a UserNotification model.
  res.json({
    success: true,
    message: 'Notification removed',
  });
};

export const clearAllUserNotifications = async (req, res) => {
  res.json({
    success: true,
    message: 'All notifications cleared',
  });
};

export const signupUser = async (req, res) => {
  const name = toCleanString(req.body.name);
  const phone = normalizePhone(req.body.phone);
  const email = normalizeEmail(req.body.email);
  const countryCode = toCleanString(req.body.countryCode) || '+91';
  const gender = normalizeGender(req.body.gender);
  const profileImage = toCleanString(req.body.profileImage);
  const governmentIdProof = normalizeGovernmentIdProof(req.body.governmentIdProof || {}, { required: false });
  const referralCode = normalizeReferralCode(req.body.referralCode);

  validateName(name);
  validatePhone(phone);
  validateEmail(email);

  const signupSession = await requireVerifiedUserSignupSession(phone);

  const existingUser = await User.findOne({ phone });

  const referrer = referralCode ? await findUserByReferralCode(referralCode) : null;

  if (referralCode && !referrer) {
    throw new ApiError(400, 'Invalid referral code');
  }

  if (existingUser && !canRestoreUserForSignup(existingUser)) {
    throw new ApiError(409, 'Phone number is already registered');
  }

  const userPayload = await buildReactivatedUserPayload({
    req,
    name,
    phone,
    email,
    countryCode,
    gender,
    profileImage,
    governmentIdProof,
    referrer,
  });

  const user = existingUser
    ? await User.findByIdAndUpdate(existingUser._id, { $set: userPayload }, { new: true, runValidators: true })
    : await User.create(userPayload);

  if (!String(user.referralCode || '').trim()) {
    user.referralCode = generateUserReferralCode(user);
    await user.save();
  }

  if (referrer?._id) {
    await User.updateOne({ _id: referrer._id }, { $inc: { referralCount: 1 } });
    await processSignupReferralRewards({ user, referrer });
  }

  await consumeUserSignupSession(signupSession);

  res.status(201).json({
    success: true,
    data: createUserSession(user),
  });
};

export const startUserOtpRequest = async (req, res) => {
  const result = await startUserOtp(req.body);
  res.status(201).json({ success: true, data: result });
};

export const verifyUserOtpRequest = async (req, res) => {
  const result = await verifyUserOtp(req.body);
  res.json({ success: true, data: result });
};

export const loginUser = async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const password = String(req.body.password || '');

  validatePhone(phone);

  if (!password) {
    throw new ApiError(400, 'password is required');
  }

  const user = await User.findOne({ phone }).select('+password');

  if (!user || !user.password || !(await comparePassword(password, user.password))) {
    throw new ApiError(401, 'Invalid phone or password');
  }

  ensureUserCanLogin(user);

  res.json({
    success: true,
    data: createUserSession(user),
  });
};

export const verifyUserPhoneForOtpLogin = async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  validatePhone(phone);

  const user = await User.findOne({ phone }).lean();

  if (!user || user.deletedAt) {
    res.json({
      success: true,
      data: {
        exists: false,
        user: null,
      },
    });
    return;
  }

  ensureUserCanLogin(user);

  res.json({
    success: true,
    data: {
      exists: true,
      ...createUserSession(user),
    },
  });
};

export const saveUserFcmToken = async (req, res) => {
  const user = await User.findById(req.auth?.sub);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  ensureUserCanLogin(user);

  const saved = assignPushTokenToEntity(user, {
    token: req.body?.token,
    platform: req.body?.platform,
  });

  await user.save();

  res.json({
    success: true,
    data: {
      message: 'FCM token saved successfully',
      platform: saved.platform,
      field: saved.fieldName,
    },
  });
};

export const getCurrentUser = async (req, res) => {
  /*
   * The account and the subscription summary are fetched together.
   *
   * The summary only ever needed the id, which is already in the token — it was
   * waiting on findById for nothing, and this endpoint reads 0.5kb in ~138ms
   * against a nearly empty database. getUserSubscriptionSummary is a pure read
   * (the wallet upsert nearby belongs to purchaseUserSubscription, not to
   * this), so running it before we know the account exists writes nothing; the
   * 404 below is unchanged and still wins.
   */
  const userId = req.auth?.sub;
  const [user, subscriptionSummary] = await Promise.all([
    User.findById(userId),
    getUserSubscriptionSummary(userId),
  ]);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!String(user.referralCode || '').trim()) {
    user.referralCode = generateUserReferralCode(user);
    await user.save();
  }

  res.json({
    success: true,
    data: {
      user: {
        ...toUserPayload(user, { subscriptionSummary }),
        createdAt: user.createdAt || null,
      },
    },
  });
};

export const uploadUserProfileImage = async (req, res) => {
  const dataUrl = String(req.body?.dataUrl || '');

  if (!dataUrl) {
    throw new ApiError(400, 'dataUrl is required');
  }

  if (dataUrl.length > 12_000_000) {
    throw new ApiError(413, 'Image is too large');
  }

  const uploadResult = await uploadDataUrlToCloudinary({
    dataUrl,
    folder: `${env.uploadFolder}/user-profile`,
    publicIdPrefix: 'user-profile',
  });

  res.status(201).json({
    success: true,
    data: {
      secureUrl: uploadResult.secureUrl,
      publicId: uploadResult.publicId,
    },
  });
};

export const updateCurrentUser = async (req, res) => {
  const userId = req.auth?.sub;

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'name')) {
    const name = toCleanString(req.body.name);
    validateName(name);
    user.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'email')) {
    const email = normalizeEmail(req.body.email);
    validateEmail(email);
    user.email = email;
  }

  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'profileImage')) {
    user.profileImage = toCleanString(req.body.profileImage);
  }

  await user.save();

  res.json({
    success: true,
    data: {
      user: toUserPayload(user),
    },
  });
};

export const getAvailableSubscriptionPlans = async (_req, res) => {
  const plans = await listCustomerSubscriptionPlans();

  res.json({
    success: true,
    data: {
      results: plans,
    },
  });
};

export const getMySubscriptions = async (req, res) => {
  const summary = await getUserSubscriptionSummary(req.auth?.sub);

  res.json({
    success: true,
    data: summary,
  });
};

export const buySubscription = async (req, res) => {
  const result = await purchaseUserSubscription({
    userId: req.auth?.sub,
    planId: req.body?.planId,
    paymentSource: 'wallet',
  });

  res.status(201).json({
    success: true,
    data: result,
    message: 'Subscription purchased successfully',
  });
};

export const requestAccountDeletion = async (req, res) => {
  const userId = req.auth?.sub;
  const reason = toCleanString(req.body?.reason);

  if (!reason) {
    throw new ApiError(400, 'Deletion reason is required');
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.deletedAt || user.isActive === false || user.active === false) {
    throw new ApiError(400, 'Account is already inactive');
  }

  if (user.deletionRequest?.status === 'pending') {
    res.json({
      success: true,
      data: {
        deletionRequestStatus: 'pending',
        requestedAt: user.deletionRequest.requestedAt || null,
      },
      message: 'Deletion request is already pending admin review',
    });
    return;
  }

  user.deletionRequest = {
    status: 'pending',
    reason: reason.slice(0, 300),
    requestedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    adminNote: '',
  };

  await user.save();

  res.status(201).json({
    success: true,
    data: {
      deletionRequestStatus: user.deletionRequest.status,
      requestedAt: user.deletionRequest.requestedAt,
    },
  });
};

export const getUserWallet = async (req, res) => {
  const userId = req.auth?.sub;
  const user = await User.findById(userId).select('_id').lean();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await ensureUserWallet(userId);
  const wallet = await UserWallet.findOne({ userId }).select('balance refundWallet transactions').slice('transactions', -10).lean();
  const transactions = Array.isArray(wallet?.transactions) ? wallet.transactions : [];

  res.json({
    success: true,
    data: buildUserWalletPayload({ ...wallet, transactions }),
  });
};

export const topupUserWallet = async (req, res) => {
  const amount = normalizeMoneyAmount(req.body?.amount);
  const userId = req.auth?.sub;
  const user = await User.findById(userId).select('_id').lean();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const tx = {
    kind: 'credit',
    amount,
    title: 'Wallet Refilled',
    provider: 'manual',
  };

  await ensureUserWallet(userId);

  await UserWallet.updateOne(
    { userId },
    {
      $inc: { balance: amount },
      $push: { transactions: { $each: [tx], $slice: -50 } },
    },
  );

  const updatedWallet = await UserWallet.findOne({ userId }).select('balance transactions').slice('transactions', -10).lean();
  const updatedWalletWithRefund = updatedWallet
    ? { ...updatedWallet, refundWallet: Number(updatedWallet.refundWallet || 0) }
    : updatedWallet;
  const transactions = Array.isArray(updatedWallet?.transactions) ? updatedWallet.transactions : [];

  res.status(201).json({
    success: true,
    data: buildUserWalletPayload({ ...updatedWalletWithRefund, transactions }),
  });
};

export const transferUserWallet = async (req, res) => {
  const amount = normalizeMoneyAmount(req.body?.amount);
  const recipientPhone = normalizePhone(req.body?.phone);
  validatePhone(recipientPhone);

  const senderId = req.auth?.sub;

  const sender = await User.findById(senderId).select({ phone: 1 }).lean();
  if (!sender) {
    throw new ApiError(404, 'User not found');
  }

  if (sender.phone === recipientPhone) {
    throw new ApiError(400, 'Cannot transfer to same phone number');
  }

  const recipient = await User.findOne({ phone: recipientPhone }).select({ _id: 1 }).lean();
  if (!recipient) {
    throw new ApiError(404, 'Recipient not found');
  }

  await ensureUserWallet(senderId);
  await ensureUserWallet(recipient._id);

  const transferId = crypto.randomUUID();

  const debitTx = {
    kind: 'debit',
    amount,
    title: 'Wallet Transfer',
    counterpartyPhone: recipientPhone,
    provider: 'internal',
    providerPaymentId: transferId,
  };

  const creditTx = {
    kind: 'credit',
    amount,
    title: 'Wallet Received',
    counterpartyPhone: sender.phone || '',
    provider: 'internal',
    providerPaymentId: transferId,
  };

  const senderUpdate = await UserWallet.updateOne(
    { userId: senderId, balance: { $gte: amount } },
    { $inc: { balance: -amount }, $push: { transactions: { $each: [debitTx], $slice: -50 } } },
  );

  if (!senderUpdate?.modifiedCount) {
    throw new ApiError(400, 'Insufficient wallet balance');
  }

  const recipientUpdate = await UserWallet.updateOne(
    { userId: recipient._id },
    { $inc: { balance: amount }, $push: { transactions: { $each: [creditTx], $slice: -50 } } },
  );

  if (!recipientUpdate?.modifiedCount) {
    await UserWallet.updateOne(
      { userId: senderId },
      { $inc: { balance: amount }, $pull: { transactions: { providerPaymentId: transferId } } },
    );
    throw new ApiError(500, 'Transfer failed');
  }

  const wallet = await UserWallet.findOne({ userId: senderId }).select('balance refundWallet transactions').slice('transactions', -10).lean();

  const transactions = Array.isArray(wallet?.transactions) ? wallet.transactions : [];

  res.status(201).json({
    success: true,
    data: buildUserWalletPayload({ ...wallet, transactions }),
  });
};

export const transferUserWalletToDriver = async (req, res) => {
  const amount = normalizeMoneyAmount(req.body?.amount);
  const driverPhone = normalizePhone(req.body?.phone);
  validatePhone(driverPhone);

  const senderId = req.auth?.sub;
  const sender = await User.findById(senderId).select({ phone: 1, firstName: 1, lastName: 1, name: 1 }).lean();

  if (!sender) {
    throw new ApiError(404, 'User not found');
  }

  if (sender.phone === driverPhone) {
    throw new ApiError(400, 'Cannot transfer to same phone number');
  }

  const recipientDriver = await Driver.findOne({ phone: driverPhone })
    .select({ _id: 1, phone: 1, firstName: 1, lastName: 1, name: 1 })
    .lean();

  if (!recipientDriver) {
    throw new ApiError(404, 'Driver not found');
  }

  await ensureUserWallet(senderId);
  const transferId = crypto.randomUUID();
  const senderDisplayName = String(
    sender.name || [sender.firstName, sender.lastName].filter(Boolean).join(' ') || 'Rider',
  ).trim();
  const driverDisplayName = String(
    recipientDriver.name || [recipientDriver.firstName, recipientDriver.lastName].filter(Boolean).join(' ') || 'Driver',
  ).trim();

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const senderWallet = await UserWallet.findOne({ userId: senderId }).session(session);
    if (!senderWallet) {
      throw new ApiError(404, 'User wallet not found');
    }

    if (Number(senderWallet.balance || 0) < amount) {
      throw new ApiError(400, 'Insufficient wallet balance');
    }

    senderWallet.balance = Math.round((Number(senderWallet.balance || 0) - amount) * 100) / 100;
    senderWallet.transactions.push({
      kind: 'debit',
      amount,
      title: `Sent to driver ${driverDisplayName}`,
      counterpartyPhone: driverPhone,
      provider: 'internal_driver_wallet_transfer',
      providerPaymentId: transferId,
    });
    senderWallet.transactions = senderWallet.transactions.slice(-50);
    await senderWallet.save({ session });

    const walletUpdate = await applyDriverWalletAdjustment({
      driverId: recipientDriver._id,
      amount,
      type: 'adjustment',
      description: `Received from rider wallet (${senderDisplayName})`,
      metadata: {
        source: 'user_wallet_transfer',
        transferId,
        senderUserId: senderId,
        senderPhone: sender.phone || '',
        senderName: senderDisplayName,
      },
      session,
    });

    await session.commitTransaction();

    emitToDriver(recipientDriver._id, 'driver:wallet:updated', {
      wallet: walletUpdate.wallet,
      transaction: walletUpdate.transaction,
      notification: {
        title: 'Wallet credited',
        body: `Rs ${amount.toFixed(2)} received from rider wallet`,
      },
    });

    sendPushNotificationToEntities({
      driverIds: [recipientDriver._id],
      title: 'Wallet credited',
      body: `Rs ${amount.toFixed(2)} received from rider wallet`,
      data: {
        type: 'driver_wallet_credit',
        amount: String(amount),
        transferId,
      },
    }).catch(() => {});

    const refreshedWallet = await UserWallet.findOne({ userId: senderId })
      .select('balance refundWallet transactions')
      .slice('transactions', -10)
      .lean();

    res.status(201).json({
      success: true,
      data: {
        ...buildUserWalletPayload(refreshedWallet),
        transfer: {
          id: transferId,
          amount,
          driverPhone,
          driverName: driverDisplayName,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const createRazorpayWalletTopupOrder = async (req, res) => {
  const amount = normalizeMoneyAmount(req.body?.amount);
  const { keyId, keySecret } = await resolveRazorpayCredentials();

  const amountPaise = Math.round(amount * 100);
  const userId = String(req.auth?.sub || '');
  const compactUserId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'usr';
  const receipt = `uwal_${compactUserId}_${Date.now().toString(36)}`;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:5000';
  const backendOrigin = `${proto}://${host}`;
  const callbackUrl = `${backendOrigin}/api/v1/users/wallet/razorpay/callback`;

  const order = await razorpayRequest({
    method: 'POST',
    path: '/orders',
    body: {
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: { userId },
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
      currency: order.currency || 'INR',
      callbackUrl,
    },
  });
};

const verifyAndApplyUserRazorpayWalletTopup = async ({
  orderId,
  paymentId,
  signature,
  userId: requestedUserId = '',
} = {}) => {
  const normalizedOrderId = String(orderId || '').trim();
  const normalizedPaymentId = String(paymentId || '').trim();
  const normalizedSignature = String(signature || '').trim();

  if (!normalizedOrderId || !normalizedPaymentId || !normalizedSignature) {
    throw new ApiError(400, 'Payment verification fields are required');
  }

  const { keyId, keySecret } = await resolveRazorpayCredentials();

  // Shared digest helper; the secret stays taxi's own admin-configured
  // gateway credential rather than the platform env key.
  const expectedSignature = computeExpectedSignature({
    orderId: normalizedOrderId,
    paymentId: normalizedPaymentId,
    secret: keySecret,
  });

  if (expectedSignature !== normalizedSignature) {
    throw new ApiError(400, 'Invalid payment signature');
  }

  const order = await razorpayRequest({
    method: 'GET',
    path: `/orders/${encodeURIComponent(normalizedOrderId)}`,
    keyId,
    keySecret,
  });

  const amountPaise = Number(order?.amount);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new ApiError(400, 'Invalid order amount');
  }

  const orderUserId = String(order?.notes?.userId || '').trim();
  const effectiveUserId = String(requestedUserId || orderUserId).trim();

  if (!effectiveUserId) {
    throw new ApiError(400, 'User reference is missing from this Razorpay order');
  }

  if (requestedUserId && orderUserId && requestedUserId !== orderUserId) {
    throw new ApiError(403, 'This Razorpay order does not belong to the authenticated user');
  }

  const amount = Math.round(amountPaise) / 100;

  await ensureUserWallet(effectiveUserId);

  const alreadyCredited = await UserWallet.findOne({
    userId: effectiveUserId,
    'transactions.providerPaymentId': normalizedPaymentId,
  })
    .select('_id')
    .lean();

  if (!alreadyCredited) {
    const tx = {
      kind: 'credit',
      amount,
      title: 'Wallet Refilled',
      provider: 'razorpay',
      providerOrderId: normalizedOrderId,
      providerPaymentId: normalizedPaymentId,
    };

    await UserWallet.updateOne(
      { userId: effectiveUserId },
      {
        $inc: { balance: amount },
        $push: { transactions: { $each: [tx], $slice: -50 } },
      },
    );
  }

  const wallet = await UserWallet.findOne({ userId: effectiveUserId })
    .select('balance refundWallet transactions')
    .slice('transactions', -10)
    .lean();

  if (!wallet) {
    throw new ApiError(404, 'User not found');
  }

  return buildUserWalletPayload(wallet);
};

export const createRentalAdvancePaymentOrder = async (req, res) => {
  const amount = normalizeMoneyAmount(req.body?.amount);
  const vehicleId = String(req.body?.vehicleId || '').trim();
  const vehicleName = String(req.body?.vehicleName || 'Rental booking').trim();
  const pickup = String(req.body?.pickup || '').trim();
  const returnTime = String(req.body?.returnTime || '').trim();
  const { keyId, keySecret } = await resolveRazorpayCredentials();

  const amountPaise = Math.round(amount * 100);
  const userId = String(req.auth?.sub || '');
  const compactUserId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'guest';
  const receipt = `rentadv_${compactUserId}_${Date.now().toString(36)}`;

  const order = await razorpayRequest({
    method: 'POST',
    path: '/orders',
    body: {
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId,
        vehicleId,
        vehicleName,
        pickup,
        returnTime,
        purpose: 'rental_advance_payment',
      },
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
      currency: order.currency || 'INR',
      bookingReference: `RNT-${Date.now().toString(36).slice(-6).toUpperCase()}`,
    },
  });
};

export const createPhonePeRentalAdvancePaymentOrder = async (req, res) => {
  const amount = normalizeMoneyAmount(req.body?.amount);
  const vehicleId = String(req.body?.vehicleId || '').trim();
  const vehicleName = String(req.body?.vehicleName || 'Rental booking').trim();
  const pickup = String(req.body?.pickup || '').trim();
  const returnTime = String(req.body?.returnTime || '').trim();
  const bookingReference =
    toCleanString(req.body?.bookingReference) || `RNT-${Date.now().toString(36).slice(-6).toUpperCase()}`;
  const { clientId, clientSecret, clientVersion, environment } = await resolvePhonePeCredentials();
  const userId = String(req.auth?.sub || '');
  const compactUserId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'usr';
  const merchantTransactionId = `URNT${Date.now()}${compactUserId}`.slice(0, 34);
  const frontendBaseUrl = getFrontendBaseUrl(req);
  const redirectUrl = `${frontendBaseUrl}/phonepe/status?flow=user-rental&phonepe_txn=${encodeURIComponent(merchantTransactionId)}`;
  const user = userId ? await User.findById(userId).select('phone').lean() : null;
  logPaymentDiagnostic({
    provider: 'phonepe',
    scope: 'user-rental',
    stage: 'create-order-start',
    merchantTransactionId,
    bookingReference,
    amountRupees: amount,
    request: buildPaymentRequestContext(req),
    metadata: {
      vehicleId,
      vehicleName,
      pickup,
      returnTime,
      redirectUrl: summarizeCheckoutUrl(redirectUrl),
    },
  });
  const payload = await phonePeRequest({
    method: 'POST',
    path: '/checkout/v2/pay',
    body: {
      merchantOrderId: merchantTransactionId,
      amount: Math.round(amount * 100),
      expireAfter: 1200,
      paymentFlow: {
        type: 'PG_CHECKOUT',
        merchantUrls: {
          redirectUrl,
        },
        message: 'Rental advance payment',
      },
      metaInfo: {
        udf1: vehicleId || 'rental',
        udf2: vehicleName.slice(0, 120) || 'Rental booking',
        udf3: bookingReference,
      },
      prefillUserLoginDetails: normalizePhone(user?.phone || '')
        ? { phoneNumber: normalizePhone(user?.phone || '') }
        : undefined,
    },
    clientId,
    clientSecret,
    clientVersion,
    environment,
  });

  const checkoutUrl = payload?.redirectUrl || '';
  if (!checkoutUrl) {
    logPaymentDiagnostic({
      provider: 'phonepe',
      scope: 'user-rental',
      stage: 'create-order-missing-checkout-url',
      level: 'error',
      merchantTransactionId,
      bookingReference,
      response: summarizePhonePePayload(payload || {}),
    });
    throw new ApiError(502, 'PhonePe payment URL was not returned');
  }

  logPaymentDiagnostic({
    provider: 'phonepe',
    scope: 'user-rental',
    stage: 'create-order-success',
    merchantTransactionId,
    bookingReference,
    amountPaise: Math.round(amount * 100),
    checkoutUrl: summarizeCheckoutUrl(checkoutUrl),
    response: summarizePhonePePayload(payload || {}),
  });

  res.status(201).json({
    success: true,
    data: {
      gateway: 'phonepe',
      merchantTransactionId,
      bookingReference,
      amount: Math.round(amount * 100),
      currency: 'INR',
      checkoutUrl,
      metadata: {
        vehicleId,
        vehicleName,
        pickup,
        returnTime,
      },
    },
  });
};

export const createPhonePeWalletTopupOrder = async (req, res) => {
  const amount = normalizeMoneyAmount(req.body?.amount);
  const { clientId, clientSecret, clientVersion, environment } = await resolvePhonePeCredentials();
  const userId = String(req.auth?.sub || '');
  const compactUserId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'usr';
  const merchantTransactionId = `UWAL${Date.now()}${compactUserId}`.slice(0, 34);
  const frontendBaseUrl = getFrontendBaseUrl(req);
  const redirectUrl = `${frontendBaseUrl}/phonepe/status?flow=user-wallet&phonepe_txn=${encodeURIComponent(merchantTransactionId)}`;
  const user = userId ? await User.findById(userId).select('phone').lean() : null;
  logPaymentDiagnostic({
    provider: 'phonepe',
    scope: 'user-wallet',
    stage: 'create-order-start',
    merchantTransactionId,
    amountRupees: amount,
    request: buildPaymentRequestContext(req),
    metadata: {
      redirectUrl: summarizeCheckoutUrl(redirectUrl),
    },
  });
  const payload = await phonePeRequest({
    method: 'POST',
    path: '/checkout/v2/pay',
    body: {
      merchantOrderId: merchantTransactionId,
      amount: Math.round(amount * 100),
      expireAfter: 1200,
      paymentFlow: {
        type: 'PG_CHECKOUT',
        merchantUrls: {
          redirectUrl,
        },
        message: 'Wallet top-up',
      },
      prefillUserLoginDetails: normalizePhone(user?.phone || '')
        ? { phoneNumber: normalizePhone(user?.phone || '') }
        : undefined,
    },
    clientId,
    clientSecret,
    clientVersion,
    environment,
  });

  const checkoutUrl = payload?.redirectUrl || '';
  if (!checkoutUrl) {
    logPaymentDiagnostic({
      provider: 'phonepe',
      scope: 'user-wallet',
      stage: 'create-order-missing-checkout-url',
      level: 'error',
      merchantTransactionId,
      response: summarizePhonePePayload(payload || {}),
    });
    throw new ApiError(502, 'PhonePe payment URL was not returned');
  }

  logPaymentDiagnostic({
    provider: 'phonepe',
    scope: 'user-wallet',
    stage: 'create-order-success',
    merchantTransactionId,
    amountPaise: Math.round(amount * 100),
    checkoutUrl: summarizeCheckoutUrl(checkoutUrl),
    response: summarizePhonePePayload(payload || {}),
  });

  res.status(201).json({
    success: true,
    data: {
      gateway: 'phonepe',
      merchantTransactionId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      checkoutUrl,
      method: payload?.data?.instrumentResponse?.redirectInfo?.method || 'GET',
    },
  });
};

export const payRentalAdvanceWithWallet = async (req, res) => {
  const amount = normalizeMoneyAmount(req.body?.amount);
  const bookingReference =
    toCleanString(req.body?.bookingReference) || `RNT-${Date.now().toString(36).slice(-6).toUpperCase()}`;
  const userId = req.auth?.sub;

  await ensureUserWallet(userId);

  const wallet = await UserWallet.findOne({ userId });
  if (!wallet) {
    throw new ApiError(404, 'User wallet not found');
  }

  const referenceKey = `rental_advance_${bookingReference}`;
  const existingTransaction = Array.isArray(wallet.transactions)
    ? wallet.transactions.find(
        (item) => item?.kind === 'debit' && String(item.referenceKey || '') === referenceKey,
      )
    : null;

  if (!existingTransaction) {
    if (Number(wallet.balance || 0) < amount) {
      throw new ApiError(400, 'Insufficient wallet balance');
    }

    wallet.balance = Math.round((Number(wallet.balance || 0) - amount) * 100) / 100;
    wallet.transactions.push({
      kind: 'debit',
      amount,
      title: 'Rental Advance Payment',
      provider: 'wallet',
      providerPaymentId: bookingReference,
      referenceKey,
    });

    if (wallet.transactions.length > 50) {
      wallet.transactions = wallet.transactions.slice(-50);
    }

    await wallet.save();
  }

  res.status(201).json({
    success: true,
    data: {
      provider: 'wallet',
      status: 'paid',
      amount,
      currency: 'INR',
      orderId: '',
      paymentId: bookingReference,
      signature: '',
      referenceKey,
      bookingReference,
      balance: Number(wallet.balance || 0),
    },
    message: 'Rental advance payment collected from wallet successfully',
  });
};

export const verifyRazorpayWalletTopup = async (req, res) => {
  const wallet = await verifyAndApplyUserRazorpayWalletTopup({
    orderId: req.body?.razorpay_order_id,
    paymentId: req.body?.razorpay_payment_id,
    signature: req.body?.razorpay_signature,
    userId: req.auth?.sub,
  });

  res.status(201).json({
    success: true,
    data: wallet,
  });
};

export const handleUserRazorpayWalletTopupCallback = async (req, res) => {
  const frontendBaseUrl = getFrontendBaseUrl(req);
  const redirectUrl = new URL(`${frontendBaseUrl}/razorpay/status`);
  redirectUrl.searchParams.set('flow', 'user-wallet');

  try {
    const errorCode = String(
      req.body?.error?.code || req.body?.error?.reason || req.query?.error_code || '',
    ).trim();
    const errorDescription = String(
      req.body?.error?.description || req.query?.error_description || '',
    ).trim();

    if (errorCode || errorDescription) {
      redirectUrl.searchParams.set('status', 'failure');
      if (errorCode) {
        redirectUrl.searchParams.set('error_code', errorCode);
      }
      if (errorDescription) {
        redirectUrl.searchParams.set('error_description', errorDescription);
      }
      res.redirect(302, redirectUrl.toString());
      return;
    }

    await verifyAndApplyUserRazorpayWalletTopup({
      orderId: req.body?.razorpay_order_id || req.query?.razorpay_order_id,
      paymentId: req.body?.razorpay_payment_id || req.query?.razorpay_payment_id,
      signature: req.body?.razorpay_signature || req.query?.razorpay_signature,
    });

    redirectUrl.searchParams.set('status', 'success');
  } catch (error) {
    redirectUrl.searchParams.set('status', 'failure');
    redirectUrl.searchParams.set(
      'error_description',
      String(error?.message || 'Payment verification failed.'),
    );
  }

  res.redirect(302, redirectUrl.toString());
};

export const verifyPhonePeWalletTopup = async (req, res) => {
  const merchantTransactionId = toCleanString(
    req.params?.merchantTransactionId || req.query?.merchantTransactionId || req.query?.transactionId,
  );

  if (!merchantTransactionId) {
    throw new ApiError(400, 'merchantTransactionId is required');
  }

  logPaymentDiagnostic({
    provider: 'phonepe',
    scope: 'user-wallet',
    stage: 'verify-start',
    merchantTransactionId,
    request: buildPaymentRequestContext(req),
  });

  const { clientId, clientSecret, clientVersion, environment } = await resolvePhonePeCredentials();
  const payload = await phonePeRequest({
    method: 'GET',
    path: `/checkout/v2/order/${encodeURIComponent(merchantTransactionId)}/status?details=false`,
    clientId,
    clientSecret,
    clientVersion,
    environment,
  });

  const paymentDetails = Array.isArray(payload?.paymentDetails) ? payload.paymentDetails : [];
  const latestPayment = paymentDetails[0] || {};
  const paymentState = String(payload?.state || latestPayment?.state || '').trim().toUpperCase();
  const paymentId = toCleanString(latestPayment?.transactionId || latestPayment?.paymentTransactionId || merchantTransactionId);
  const amount = Math.round(Number(payload?.amount || latestPayment?.amount || 0)) / 100;
  const userId = req.auth?.sub;

  logPaymentDiagnostic({
    provider: 'phonepe',
    scope: 'user-wallet',
    stage: 'verify-response',
    merchantTransactionId,
    userId,
    paymentState,
    paymentId,
    amountRupees: amount,
    response: summarizePhonePePayload(payload || {}),
  });

  if (paymentState === 'COMPLETED') {
    await ensureUserWallet(userId);

    const alreadyCredited = await UserWallet.findOne({
      userId,
      $or: [
        { 'transactions.providerPaymentId': paymentId },
        { 'transactions.providerOrderId': merchantTransactionId },
      ],
    })
      .select('_id')
      .lean();

    if (!alreadyCredited) {
      const tx = {
        kind: 'credit',
        amount,
        title: 'Wallet Refilled',
        provider: 'phonepe',
        providerOrderId: merchantTransactionId,
        providerPaymentId: paymentId,
      };

      await UserWallet.updateOne(
        { userId },
        {
          $inc: { balance: amount },
          $push: { transactions: { $each: [tx], $slice: -50 } },
        },
      );
    }

    const wallet = await UserWallet.findOne({ userId })
      .select('balance refundWallet transactions')
      .slice('transactions', -10)
      .lean();

    logPaymentDiagnostic({
      provider: 'phonepe',
      scope: 'user-wallet',
      stage: 'verify-paid',
      merchantTransactionId,
      userId,
      paymentId,
      amountRupees: amount,
      alreadyCredited: Boolean(alreadyCredited),
      walletBalance: Number(wallet?.balance || 0),
    });

    res.json({
      success: true,
      data: {
        status: 'paid',
        gateway: 'phonepe',
        merchantTransactionId,
        transactionId: paymentId,
        wallet: buildUserWalletPayload(wallet),
      },
    });
    return;
  }

  if (paymentState === 'PENDING') {
    logPaymentDiagnostic({
      provider: 'phonepe',
      scope: 'user-wallet',
      stage: 'verify-pending',
      merchantTransactionId,
      userId,
      paymentId,
      amountRupees: amount,
    });
    res.json({
      success: true,
      data: {
        status: 'pending',
        gateway: 'phonepe',
        merchantTransactionId,
        transactionId: paymentId,
      },
      message: payload?.message || 'PhonePe payment is still pending',
    });
    return;
  }

  logPaymentDiagnostic({
    provider: 'phonepe',
    scope: 'user-wallet',
    stage: 'verify-failed',
    level: 'warn',
    merchantTransactionId,
    userId,
    paymentId,
    paymentState,
    amountRupees: amount,
    code: payload?.code || latestPayment?.responseCode || '',
    providerMessage:
      payload?.message ||
      latestPayment?.responseCodeDescription ||
      latestPayment?.detailedErrorCode ||
      '',
    response: summarizePhonePePayload(payload || {}),
  });
  const providerCode = payload?.code || latestPayment?.responseCode || '';
  const providerMessage =
    payload?.message ||
    latestPayment?.responseCodeDescription ||
    latestPayment?.detailedErrorCode ||
    'PhonePe payment was not completed';
  res.json({
    success: true,
    data: {
      status: 'failed',
      gateway: 'phonepe',
      merchantTransactionId,
      transactionId: paymentId,
      code: providerCode,
      state: paymentState,
      providerMessage,
    },
    message: providerMessage,
  });
};

export const verifyRentalAdvancePayment = async (req, res) => {
  const orderId = String(req.body?.razorpay_order_id || '').trim();
  const paymentId = String(req.body?.razorpay_payment_id || '').trim();
  const signature = String(req.body?.razorpay_signature || '').trim();

  if (!orderId || !paymentId || !signature) {
    throw new ApiError(400, 'Payment verification fields are required');
  }

  const { keyId, keySecret } = await resolveRazorpayCredentials();

  // Shared digest helper; the secret stays taxi's own admin-configured
  // gateway credential rather than the platform env key.
  const expectedSignature = computeExpectedSignature({
    orderId: orderId,
    paymentId: paymentId,
    secret: keySecret,
  });

  if (expectedSignature !== signature) {
    throw new ApiError(400, 'Invalid payment signature');
  }

  const order = await razorpayRequest({
    method: 'GET',
    path: `/orders/${encodeURIComponent(orderId)}`,
    keyId,
    keySecret,
  });

  const amountPaise = Number(order?.amount);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new ApiError(400, 'Invalid order amount');
  }

  res.status(201).json({
    success: true,
    data: {
      provider: 'razorpay',
      status: 'paid',
      amount: Math.round(amountPaise) / 100,
      currency: order.currency || 'INR',
      orderId,
      paymentId,
      signature,
      notes: order?.notes || {},
    },
    message: 'Rental advance payment verified successfully',
  });
};

export const verifyPhonePeRentalAdvancePayment = async (req, res) => {
  const merchantTransactionId = toCleanString(
    req.params?.merchantTransactionId || req.query?.merchantTransactionId || req.query?.transactionId,
  );

  if (!merchantTransactionId) {
    throw new ApiError(400, 'merchantTransactionId is required');
  }

  logPaymentDiagnostic({
    provider: 'phonepe',
    scope: 'user-rental',
    stage: 'verify-start',
    merchantTransactionId,
    request: buildPaymentRequestContext(req),
  });

  const { clientId, clientSecret, clientVersion, environment } = await resolvePhonePeCredentials();
  const payload = await phonePeRequest({
    method: 'GET',
    path: `/checkout/v2/order/${encodeURIComponent(merchantTransactionId)}/status?details=false`,
    clientId,
    clientSecret,
    clientVersion,
    environment,
  });

  const paymentDetails = Array.isArray(payload?.paymentDetails) ? payload.paymentDetails : [];
  const latestPayment = paymentDetails[0] || {};
  const paymentState = String(payload?.state || latestPayment?.state || '').trim().toUpperCase();
  const paymentId = toCleanString(latestPayment?.transactionId || latestPayment?.paymentTransactionId || merchantTransactionId);
  const amount = Math.round(Number(payload?.amount || latestPayment?.amount || 0)) / 100;
  const bookingReference = toCleanString(payload?.metaInfo?.udf3 || latestPayment?.metaInfo?.udf3);

  logPaymentDiagnostic({
    provider: 'phonepe',
    scope: 'user-rental',
    stage: 'verify-response',
    merchantTransactionId,
    bookingReference,
    paymentState,
    paymentId,
    amountRupees: amount,
    response: summarizePhonePePayload(payload || {}),
  });

  if (paymentState === 'COMPLETED') {
    logPaymentDiagnostic({
      provider: 'phonepe',
      scope: 'user-rental',
      stage: 'verify-paid',
      merchantTransactionId,
      bookingReference,
      paymentId,
      amountRupees: amount,
    });
    res.json({
      success: true,
      data: {
        provider: 'phonepe',
        gateway: 'phonepe',
        status: 'paid',
        amount,
        currency: payload?.currency || 'INR',
        merchantTransactionId,
        transactionId: paymentId,
        bookingReference,
      },
      message: 'Rental advance payment verified successfully',
    });
    return;
  }

  if (paymentState === 'PENDING') {
    logPaymentDiagnostic({
      provider: 'phonepe',
      scope: 'user-rental',
      stage: 'verify-pending',
      merchantTransactionId,
      bookingReference,
      paymentId,
      amountRupees: amount,
    });
    res.json({
      success: true,
      data: {
        provider: 'phonepe',
        gateway: 'phonepe',
        status: 'pending',
        merchantTransactionId,
        transactionId: paymentId,
        bookingReference,
      },
      message: payload?.message || 'PhonePe payment is still pending',
    });
    return;
  }

  logPaymentDiagnostic({
    provider: 'phonepe',
    scope: 'user-rental',
    stage: 'verify-failed',
    level: 'warn',
    merchantTransactionId,
    bookingReference,
    paymentId,
    paymentState,
    amountRupees: amount,
    code: payload?.code || latestPayment?.responseCode || '',
    providerMessage:
      payload?.message ||
      latestPayment?.responseCodeDescription ||
      latestPayment?.detailedErrorCode ||
      '',
    response: summarizePhonePePayload(payload || {}),
  });
  const rentalProviderCode = payload?.code || latestPayment?.responseCode || '';
  const rentalProviderMessage =
    payload?.message ||
    latestPayment?.responseCodeDescription ||
    latestPayment?.detailedErrorCode ||
    'PhonePe payment was not completed';
  res.json({
    success: true,
    data: {
      provider: 'phonepe',
      gateway: 'phonepe',
      status: 'failed',
      merchantTransactionId,
      transactionId: paymentId,
      bookingReference,
      code: rentalProviderCode,
      state: paymentState,
      providerMessage: rentalProviderMessage,
    },
    message: rentalProviderMessage,
  });
};

export const createRentalQuoteRequest = async (req, res) => {
  const payload = req.body || {};
  const vehicleTypeId = String(payload.vehicleTypeId || '').trim();
  const contactName = toCleanString(payload.contactName);
  const contactPhone = normalizePhone(payload.contactPhone);
  const contactEmail = normalizeEmail(payload.contactEmail);
  const specialRequirements = toCleanString(payload.specialRequirements);
  const pickupLocation = toCleanString(payload.pickupLocation);
  const dropLocation = toCleanString(payload.dropLocation);
  const requestedHours = Math.max(0, Number(payload.requestedHours || 0));
  const seatsNeeded = Math.max(1, Number(payload.seatsNeeded || 1));
  const luggageNeeded = Math.max(0, Number(payload.luggageNeeded || 0));

  if (!mongoose.Types.ObjectId.isValid(vehicleTypeId)) {
    throw new ApiError(400, 'Valid rental vehicle is required');
  }

  if (!contactName || contactName.length < 2) {
    throw new ApiError(400, 'Contact name is required');
  }

  validatePhone(contactPhone);
  validateEmail(contactEmail);

  const vehicle = await RentalVehicleType.findById(vehicleTypeId).lean();
  if (!vehicle || vehicle.active === false || vehicle.status !== 'active') {
    throw new ApiError(404, 'Rental vehicle not found');
  }

  const pickupDateTime = payload.pickupDateTime ? new Date(payload.pickupDateTime) : null;
  const returnDateTime = payload.returnDateTime ? new Date(payload.returnDateTime) : null;

  const request = await RentalQuoteRequest.create({
    userId: req.auth?.sub && mongoose.Types.ObjectId.isValid(req.auth.sub) ? req.auth.sub : null,
    vehicleTypeId,
    vehicleName: vehicle.name || '',
    vehicleCategory: vehicle.vehicleCategory || '',
    contactName,
    contactPhone,
    contactEmail,
    requestedHours,
    pickupDateTime: pickupDateTime && !Number.isNaN(pickupDateTime.getTime()) ? pickupDateTime : null,
    returnDateTime: returnDateTime && !Number.isNaN(returnDateTime.getTime()) ? returnDateTime : null,
    seatsNeeded,
    luggageNeeded,
    pickupLocation,
    dropLocation,
    specialRequirements,
    status: 'pending',
  });

  return res.status(201).json({
    success: true,
    data: serializeRentalQuoteRequest(request.toObject()),
    message: 'Rental quote request submitted successfully',
  });
};

export const createRentalBookingRequest = async (req, res) => {
  const payload = req.body || {};
  const vehicleTypeId = String(payload.vehicleTypeId || payload.vehicleId || '').trim();
  const bookingReference = toCleanString(payload.bookingReference) || `RNT-${Date.now().toString(36).slice(-6).toUpperCase()}`;
  const paymentStatus = toCleanString(payload.paymentStatus).toLowerCase() || 'pending';
  const paymentMethod = toCleanString(payload.paymentMethod).toLowerCase();
  const paymentMethodLabel = toCleanString(payload.paymentMethodLabel);
  const kycCompleted = Boolean(payload.kycCompleted);

  if (!mongoose.Types.ObjectId.isValid(vehicleTypeId)) {
    throw new ApiError(400, 'Valid rental vehicle is required');
  }

  if (!['pending', 'paid', 'not_required', 'failed'].includes(paymentStatus)) {
    throw new ApiError(400, 'Invalid rental payment status');
  }

  const pickupDateTime = payload.pickupDateTime ? new Date(payload.pickupDateTime) : null;
  const returnDateTime = payload.returnDateTime ? new Date(payload.returnDateTime) : null;

  if (!pickupDateTime || Number.isNaN(pickupDateTime.getTime())) {
    throw new ApiError(400, 'Valid pickup date and time is required');
  }

  if (!returnDateTime || Number.isNaN(returnDateTime.getTime())) {
    throw new ApiError(400, 'Valid return date and time is required');
  }

  if (returnDateTime <= pickupDateTime) {
    throw new ApiError(400, 'Return date and time must be after pickup');
  }

  const [vehicle, user] = await Promise.all([
    RentalVehicleType.findById(vehicleTypeId).lean(),
    User.findById(req.auth?.sub).lean(),
  ]);

  if (!vehicle || vehicle.active === false || vehicle.status !== 'active') {
    throw new ApiError(404, 'Rental vehicle not found');
  }

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const requestedHours = Math.max(
    0,
    Math.round((((returnDateTime.getTime() - pickupDateTime.getTime()) / 3600000) + Number.EPSILON) * 100) / 100,
  );

  const selectedPackage = payload.selectedPackage || {};
  const serviceLocation = payload.serviceLocation || {};
  const paymentPayload = payload.payment || {};
  const kycDocumentsPayload = payload.kycDocuments || {};
  const matchedPackage = Array.isArray(vehicle.pricing)
    ? vehicle.pricing.find(
        (item) => String(item?.id || item?.packageId || '').trim() ===
          String(selectedPackage.id || selectedPackage.packageId || '').trim(),
      ) || null
    : null;

  if (!matchedPackage) {
    throw new ApiError(400, 'Selected rental package is invalid');
  }

  const totalCost = Math.max(0, Number(matchedPackage.price || 0));
  const advancePaymentConfig = vehicle.advancePayment || {};
  const advancePaymentMode = String(advancePaymentConfig.paymentMode || '').trim().toLowerCase();
  const advancePaymentLabel =
    toCleanString(advancePaymentConfig.label) ||
    toCleanString(payload.advancePaymentLabel) ||
    'Advance booking payment';
  const advanceAmountRaw = advancePaymentConfig.enabled
    ? advancePaymentMode === 'full'
      ? totalCost
      : advancePaymentMode === 'percentage'
        ? (totalCost * Math.max(0, Number(advancePaymentConfig.amount || 0))) / 100
        : Math.max(0, Number(advancePaymentConfig.amount || 0))
    : 0;
  const payableNow = Math.min(
    totalCost,
    Math.round((Math.max(0, advanceAmountRaw) + Number.EPSILON) * 100) / 100,
  );
  const normalizedPaymentStatus = payableNow > 0
    ? paymentStatus === 'paid'
      ? 'paid'
      : paymentStatus === 'failed'
        ? 'failed'
        : 'pending'
    : 'not_required';

  const normalizedDrivingLicenseUrl = toCleanString(
    kycDocumentsPayload.drivingLicense?.imageUrl ||
      kycDocumentsPayload.drivingLicense?.secureUrl ||
      kycDocumentsPayload.drivingLicense?.url ||
      '',
  );
  const normalizedAadhaarUrl = toCleanString(
    kycDocumentsPayload.aadhaarCard?.imageUrl ||
      kycDocumentsPayload.aadhaarCard?.secureUrl ||
      kycDocumentsPayload.aadhaarCard?.url ||
      '',
  );
  const requestedLocationId = toCleanString(serviceLocation.id || serviceLocation._id || serviceLocation.locationId || '');
  const allowedServiceStoreIds = Array.isArray(vehicle.serviceStoreIds)
    ? vehicle.serviceStoreIds.filter((item) => mongoose.Types.ObjectId.isValid(item))
    : [];
  const matchingServiceCenters = allowedServiceStoreIds.length
    ? await ServiceStore.find({
        _id: { $in: allowedServiceStoreIds },
        ...(requestedLocationId ? { service_location_id: requestedLocationId } : {}),
      })
        .select('_id name owner_name rentalCommission')
        .sort({ name: 1, _id: 1 })
        .lean()
    : [];

  if (matchingServiceCenters.length === 0) {
    throw new ApiError(
      400,
      requestedLocationId
        ? 'No rental service store is configured for this vehicle in the selected service location'
        : 'No rental service store is configured for this vehicle',
    );
  }

  const primaryServiceCenter = matchingServiceCenters[0] || null;

  const update = {
    userId: user._id,
    bookingReference,
    vehicleTypeId,
    vehicleName: vehicle.name || '',
    vehicleCategory: vehicle.vehicleCategory || '',
    vehicleImage: vehicle.image || '',
    serviceCenterIds: matchingServiceCenters.map((item) => item._id),
    commissionSnapshot: {
      serviceStoreId: primaryServiceCenter?._id || null,
      serviceStoreName: toCleanString(primaryServiceCenter?.name),
      ownerName: toCleanString(primaryServiceCenter?.owner_name),
      serviceStoreCommissionType:
        primaryServiceCenter?.rentalCommission?.serviceStore?.type === 'fixed'
          ? 'fixed'
          : 'percentage',
      serviceStoreCommissionValue: Math.max(
        0,
        Number(primaryServiceCenter?.rentalCommission?.serviceStore?.value || 0),
      ),
      ownerCommissionType:
        primaryServiceCenter?.rentalCommission?.owner?.type === 'fixed'
          ? 'fixed'
          : 'percentage',
      ownerCommissionValue: Math.max(
        0,
        Number(primaryServiceCenter?.rentalCommission?.owner?.value || 0),
      ),
      serviceTaxPercentage: Math.max(
        0,
        Number(primaryServiceCenter?.rentalCommission?.serviceTaxPercentage || 0),
      ),
    },
    selectedPackage: {
      packageId: toCleanString(selectedPackage.id || selectedPackage.packageId || ''),
      label: toCleanString(matchedPackage.label || selectedPackage.label),
      durationHours: Math.max(0, Number(matchedPackage.durationHours || selectedPackage.durationHours || 0)),
      price: totalCost,
      extraHourPrice: Math.max(0, Number(matchedPackage.extraHourPrice || selectedPackage.extraHourPrice || 0)),
    },
    serviceLocation: {
      locationId: toCleanString(serviceLocation.id || serviceLocation._id || serviceLocation.locationId || ''),
      name: toCleanString(serviceLocation.name),
      address: toCleanString(serviceLocation.address),
      city: toCleanString(serviceLocation.city || serviceLocation.country),
      latitude: Number.isFinite(Number(serviceLocation.latitude)) ? Number(serviceLocation.latitude) : null,
      longitude: Number.isFinite(Number(serviceLocation.longitude)) ? Number(serviceLocation.longitude) : null,
      distanceKm: Number.isFinite(Number(serviceLocation.distanceKm)) ? Number(serviceLocation.distanceKm) : null,
    },
    pickupDateTime,
    returnDateTime,
    requestedHours,
    totalCost,
    payableNow,
    advancePaymentLabel,
    paymentStatus: normalizedPaymentStatus,
    paymentMethod,
    paymentMethodLabel,
    payment: {
      provider: toCleanString(paymentPayload.provider),
      status: toCleanString(paymentPayload.status) || normalizedPaymentStatus,
      amount: normalizedPaymentStatus === 'not_required'
        ? 0
        : Math.max(0, Number(paymentPayload.amount || payableNow || 0)),
      currency: toCleanString(paymentPayload.currency) || 'INR',
      orderId: toCleanString(paymentPayload.orderId || paymentPayload.razorpay_order_id),
      paymentId: toCleanString(paymentPayload.paymentId || paymentPayload.razorpay_payment_id),
      signature: toCleanString(paymentPayload.signature || paymentPayload.razorpay_signature),
    },
    contactName: toCleanString(user.name),
    contactPhone: toCleanString(user.phone),
    contactEmail: toCleanString(user.email),
    kycCompleted,
    kycDocuments: {
      drivingLicense: {
        imageUrl: normalizedDrivingLicenseUrl,
        fileName: toCleanString(
          kycDocumentsPayload.drivingLicense?.fileName || 'driving-license',
        ),
        uploadedAt:
          normalizedDrivingLicenseUrl &&
          kycDocumentsPayload.drivingLicense?.uploadedAt
            ? new Date(kycDocumentsPayload.drivingLicense.uploadedAt)
            : normalizedDrivingLicenseUrl
              ? new Date()
              : null,
      },
      aadhaarCard: {
        imageUrl: normalizedAadhaarUrl,
        fileName: toCleanString(
          kycDocumentsPayload.aadhaarCard?.fileName || 'aadhaar-card',
        ),
        uploadedAt:
          normalizedAadhaarUrl &&
          kycDocumentsPayload.aadhaarCard?.uploadedAt
            ? new Date(kycDocumentsPayload.aadhaarCard.uploadedAt)
            : normalizedAadhaarUrl
              ? new Date()
              : null,
      },
    },
  };

  const request = await RentalBookingRequest.findOneAndUpdate(
    { bookingReference, userId: user._id },
    {
      $set: update,
      $setOnInsert: {
        status: 'pending',
        adminNote: '',
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  return res.status(201).json({
    success: true,
    data: buildRentalBookingResponse(request),
    message: 'Rental booking request submitted successfully',
  });
};

export const getMyActiveRentalBooking = async (req, res) => {
  const userId = resolveAuthenticatedUserObjectId(req);

  if (!userId) {
    return res.status(200).json({
      success: true,
      data: null,
    });
  }

  const item = await RentalBookingRequest.findOne({
    userId,
    status: { $in: ['assigned', 'confirmed', 'end_requested'] },
  })
    .populate('vehicleTypeId', 'pricing')
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  if (!item) {
    return res.status(200).json({
      success: true,
      data: null,
    });
  }

  const metrics = computeRentalRideMetrics(item);
  const effectiveMetrics = ['end_requested', 'completed'].includes(String(item.status || ''))
    ? computeRentalRideMetrics(item, item.completionRequestedAt || item.completedAt || new Date())
    : metrics;

  return res.status(200).json({
    success: true,
    data: {
      ...buildRentalBookingResponse(item, item.completionRequestedAt || item.completedAt || null),
      rideMetrics: effectiveMetrics,
    },
  });
};

export const listMyRentalBookings = async (req, res) => {
  const page = toPositiveInteger(req.query?.page, 1);
  const limit = Math.min(20, toPositiveInteger(req.query?.limit, 10));
  const userId = resolveAuthenticatedUserObjectId(req);

  if (!userId) {
    return res.status(200).json({
      success: true,
      data: {
        results: [],
        pagination: buildPagination({ page, limit, total: 0 }),
      },
    });
  }

  const query = {
    userId,
  };

  const [items, total] = await Promise.all([
    RentalBookingRequest.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    RentalBookingRequest.countDocuments(query),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      results: items.map((item) => buildRentalBookingResponse(item)),
      pagination: buildPagination({ page, limit, total }),
    },
  });
};

export const endMyActiveRentalRide = async (req, res) => {
  const bookingId = String(req.params?.id || '').trim();
  const userId = resolveAuthenticatedUserObjectId(req);

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw new ApiError(400, 'Valid rental booking id is required');
  }

  if (!userId) {
    throw new ApiError(401, 'Authenticated user id is invalid');
  }

  const item = await RentalBookingRequest.findOne({
    _id: bookingId,
    userId,
  });

  if (!item) {
    throw new ApiError(404, 'Rental booking not found');
  }

  if (!['assigned', 'confirmed'].includes(String(item.status || ''))) {
    throw new ApiError(409, 'This rental ride cannot be ended right now');
  }

  const completionRequestedAt = new Date();
  const metrics = computeRentalRideMetrics(item, completionRequestedAt);

  const transportSettings = await getTransportRideSettings();
  const requireApproval = String(transportSettings.require_admin_approval_to_end_rental || '0') === '1';

  if (requireApproval) {
    item.status = 'end_requested';
    item.completionRequestedAt = completionRequestedAt;
    item.completedAt = null;
  } else {
    item.status = 'completed';
    item.completionRequestedAt = null;
    item.completedAt = completionRequestedAt;
  }

  item.finalCharge = metrics.currentCharge;
  item.finalElapsedMinutes = metrics.elapsedMinutes;

  await item.save();

  return res.status(200).json({
    success: true,
    data: {
      ...buildRentalBookingResponse(item.toObject(), requireApproval ? completionRequestedAt : null),
      rideMetrics: {
        ...metrics,
        currentCharge: item.finalCharge,
      },
    },
    message: requireApproval 
      ? 'Rental ride end request sent for admin review'
      : 'Rental ride ended successfully',
  });
};

export const updateMyActiveRentalLocation = async (req, res) => {
  const userId = resolveAuthenticatedUserObjectId(req);

  if (!userId) {
    throw new ApiError(401, 'Authenticated user id is invalid');
  }

  const payload = await updateUserRentalTracking({
    bookingId: String(req.params?.id || '').trim(),
    userId,
    status: req.body?.status,
    coordinates: req.body?.coordinates,
    heading: req.body?.heading,
    speed: req.body?.speed,
    accuracyMeters: req.body?.accuracyMeters,
    capturedAt: req.body?.capturedAt,
  });

  return res.status(200).json({
    success: true,
    data: payload,
    message: 'Rental tracking updated successfully',
  });
};

export const getSetPrices = asyncHandler(async (req, res) => {
  const data = await listSetPrices(req.query || {}, null);
  res.status(200).json({ success: true, ...data });
});

export const getZones = asyncHandler(async (req, res) => {
  const results = await listZones(null);
  res.status(200).json({ success: true, results });
});

