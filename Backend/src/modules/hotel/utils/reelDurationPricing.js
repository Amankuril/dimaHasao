/**
 * Role-aware Reel duration pricing helpers (config-driven).
 * User and Vendor/Partner rules are independent. No hardcoded business prices in callers.
 */

export const UPLOADER_TYPES = ['user', 'vendor'];

const VENDOR_ROLES = new Set(['partner', 'broker', 'agent', 'seller']);

export function resolveUploaderType(user) {
  if (!user) return 'user';
  const role = String(user.role || '').toLowerCase();
  if (VENDOR_ROLES.has(role) || role === 'admin' || role === 'superadmin') return 'vendor';
  return 'user';
}

function hasNestedRoleConfig(roleCfg) {
  return roleCfg && Number.isFinite(Number(roleCfg.freeDurationSec));
}

/**
 * Flatten role config into the shape resolveReelDurationCharge expects.
 */
export function getRolePricingConfig(settings, uploaderType = 'user') {
  const role = uploaderType === 'vendor' ? 'vendor' : 'user';
  const nested = settings?.reelPricing?.[role];

  if (hasNestedRoleConfig(nested)) {
    return {
      uploaderType: role,
      active: nested.active !== false,
      reelFreeDurationSec: Number(nested.freeDurationSec),
      reelMaxDurationSec: Number(nested.maxDurationSec),
      reelPaidDurationEnabled: nested.paidDurationEnabled === true,
      reelDurationTiers: Array.isArray(nested.durationTiers) ? nested.durationTiers : [],
    };
  }

  // Legacy single global config fallback (pre role-split)
  return {
    uploaderType: role,
    active: true,
    reelFreeDurationSec: Number(settings?.reelFreeDurationSec),
    reelMaxDurationSec: Number(settings?.reelMaxDurationSec),
    reelPaidDurationEnabled: settings?.reelPaidDurationEnabled === true,
    reelDurationTiers: Array.isArray(settings?.reelDurationTiers) ? settings.reelDurationTiers : [],
  };
}

/**
 * Validate admin duration tiers for one role.
 */
export function validateReelDurationTiers(tiers = [], freeDuration, maxDuration) {
  if (!Array.isArray(tiers)) {
    return { valid: false, message: 'Duration tiers must be an array' };
  }

  const free = Number(freeDuration);
  const max = Number(maxDuration);

  if (!Number.isFinite(free) || free < 1) {
    return { valid: false, message: 'Free duration must be a positive number of seconds' };
  }
  if (!Number.isFinite(max) || max < 1) {
    return { valid: false, message: 'Maximum duration must be a positive number of seconds' };
  }
  if (max < free) {
    return { valid: false, message: 'Maximum duration must be greater than or equal to free duration' };
  }

  const normalized = [];

  for (let i = 0; i < tiers.length; i += 1) {
    const t = tiers[i] || {};
    const minDuration = Number(t.minDuration);
    const maxDurationTier = Number(t.maxDuration);
    const price = Number(t.price);
    const enabled = t.enabled !== false;
    const order = Number.isFinite(Number(t.order)) ? Number(t.order) : i;

    if (!Number.isFinite(minDuration) || minDuration < 0) {
      return { valid: false, message: `Tier ${i + 1}: minimum duration cannot be negative` };
    }
    if (!Number.isFinite(maxDurationTier) || maxDurationTier <= 0) {
      return { valid: false, message: `Tier ${i + 1}: maximum duration must be greater than 0` };
    }
    if (minDuration >= maxDurationTier) {
      return { valid: false, message: `Tier ${i + 1}: minimum duration must be less than maximum duration` };
    }
    if (!Number.isFinite(price) || price < 0) {
      return { valid: false, message: `Tier ${i + 1}: price cannot be negative` };
    }
    if (maxDurationTier > max) {
      return {
        valid: false,
        message: `Tier ${i + 1}: tier max (${maxDurationTier}s) exceeds platform max duration (${max}s)`,
      };
    }

    normalized.push({
      minDuration,
      maxDuration: maxDurationTier,
      price,
      enabled,
      order,
    });
  }

  const enabled = [...normalized]
    .filter((t) => t.enabled)
    .sort((a, b) => a.minDuration - b.minDuration || a.maxDuration - b.maxDuration);

  for (let i = 0; i < enabled.length; i += 1) {
    for (let j = i + 1; j < enabled.length; j += 1) {
      const a = enabled[i];
      const b = enabled[j];
      const overlaps = a.minDuration < b.maxDuration && b.minDuration < a.maxDuration;
      if (overlaps) {
        const touchesOnly =
          a.maxDuration === b.minDuration || b.maxDuration === a.minDuration;
        if (!touchesOnly) {
          return {
            valid: false,
            message: `Overlapping tiers: ${a.minDuration}-${a.maxDuration}s and ${b.minDuration}-${b.maxDuration}s`,
          };
        }
      }
    }
  }

  normalized.sort((a, b) => a.order - b.order || a.minDuration - b.minDuration);
  return { valid: true, tiers: normalized };
}

export function validateRolePricingPayload(roleLabel, cfg = {}) {
  const prefix = roleLabel === 'vendor' ? 'Vendor/Partner' : 'User';
  const free = Number(cfg.freeDurationSec);
  const max = Number(cfg.maxDurationSec);
  const validation = validateReelDurationTiers(cfg.durationTiers || [], free, max);
  if (!validation.valid) {
    return { valid: false, message: `${prefix}: ${validation.message}` };
  }
  return {
    valid: true,
    config: {
      active: cfg.active !== false,
      freeDurationSec: free,
      maxDurationSec: max,
      paidDurationEnabled: cfg.paidDurationEnabled === true,
      durationTiers: validation.tiers,
    },
  };
}

/**
 * Resolve charge for a video duration using the uploader's role config.
 * durationSec should be the authoritative length (usually Math.ceil of actual).
 */
export function resolveReelDurationCharge(durationSec, settings, uploaderType = 'user') {
  const roleCfg = getRolePricingConfig(settings, uploaderType);
  const duration = Math.ceil(Number(durationSec) || 0);
  const freeDuration = Number(roleCfg.reelFreeDurationSec);
  const maxDuration = Number(roleCfg.reelMaxDurationSec);
  const paidEnabled = roleCfg.reelPaidDurationEnabled === true && roleCfg.active !== false;
  const tiers = Array.isArray(roleCfg.reelDurationTiers) ? roleCfg.reelDurationTiers : [];

  const base = {
    duration,
    freeDuration,
    maxDuration,
    uploaderType: roleCfg.uploaderType,
    charge: 0,
    isFree: false,
    requiresPayment: false,
    appliedTier: null,
  };

  if (!Number.isFinite(duration) || duration <= 0) {
    return { ...base, duration: 0, ok: false, code: 'INVALID_DURATION', message: 'Invalid video duration' };
  }

  if (!Number.isFinite(freeDuration) || !Number.isFinite(maxDuration)) {
    return {
      ...base,
      ok: false,
      code: 'SETTINGS_MISSING',
      message: 'Reel duration settings are not configured',
    };
  }

  if (roleCfg.active === false) {
    return {
      ...base,
      ok: false,
      code: 'ROLE_INACTIVE',
      message: 'Reel uploads are currently disabled for your account type.',
    };
  }

  if (duration > maxDuration) {
    return {
      ...base,
      ok: false,
      code: 'OVER_MAX',
      message: `Maximum allowed Reel duration is ${maxDuration} seconds. Please select a shorter video.`,
    };
  }

  if (duration <= freeDuration) {
    return {
      ...base,
      ok: true,
      code: 'FREE',
      message: 'Within free duration',
      isFree: true,
    };
  }

  if (!paidEnabled) {
    return {
      ...base,
      ok: false,
      code: 'PAID_DISABLED',
      message: `Video exceeds free duration of ${freeDuration} seconds. Paid duration is currently disabled.`,
    };
  }

  const enabledTiers = tiers
    .filter((t) => t && t.enabled !== false)
    .sort((a, b) => Number(a.minDuration) - Number(b.minDuration));

  let matched = enabledTiers.find((t) => {
    const min = Number(t.minDuration);
    const max = Number(t.maxDuration);
    return duration > min && duration <= max;
  });

  if (!matched) {
    matched = enabledTiers.find((t) => {
      const min = Number(t.minDuration);
      const max = Number(t.maxDuration);
      return duration >= min && duration <= max && duration > freeDuration;
    });
  }

  if (!matched) {
    return {
      ...base,
      ok: false,
      code: 'NO_TIER',
      message: `No pricing range found for a ${duration}-second reel. Please select a shorter video or contact support.`,
    };
  }

  const price = Number(matched.price) || 0;
  const appliedTier = {
    minDuration: Number(matched.minDuration),
    maxDuration: Number(matched.maxDuration),
    price,
  };

  if (price <= 0) {
    return {
      ...base,
      ok: true,
      code: 'FREE_TIER',
      message: 'Matched tier is free',
      isFree: true,
      appliedTier: { ...appliedTier, price: 0 },
    };
  }

  return {
    ...base,
    ok: true,
    code: 'PAID',
    message: 'Payment required for additional duration',
    charge: price,
    requiresPayment: true,
    appliedTier,
  };
}

export function publicReelDurationSettings(settings, uploaderType = 'user') {
  const roleCfg = getRolePricingConfig(settings, uploaderType);
  const tiers = (roleCfg.reelDurationTiers || [])
    .filter((t) => t && t.enabled !== false)
    .map((t) => ({
      minDuration: Number(t.minDuration),
      maxDuration: Number(t.maxDuration),
      price: Number(t.price),
      enabled: true,
      order: Number(t.order) || 0,
    }))
    .sort((a, b) => a.order - b.order || a.minDuration - b.minDuration);

  return {
    uploaderType: roleCfg.uploaderType,
    active: roleCfg.active !== false,
    freeDuration: Number(roleCfg.reelFreeDurationSec),
    maxDuration: Number(roleCfg.reelMaxDurationSec),
    paidDurationEnabled: roleCfg.reelPaidDurationEnabled === true && roleCfg.active !== false,
    durationTiers: tiers,
  };
}

export function publicAllReelDurationSettings(settings) {
  return {
    user: publicReelDurationSettings(settings, 'user'),
    vendor: publicReelDurationSettings(settings, 'vendor'),
  };
}
