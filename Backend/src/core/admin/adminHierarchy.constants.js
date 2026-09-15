export const ADMIN_LEVELS = {
  PLATFORM_SUPERADMIN: 'platform_superadmin',
  FOOD_SUPERADMIN: 'food_superadmin',
  TAXI_SUPERADMIN: 'taxi_superadmin',
  TOURS_SUPERADMIN: 'tours_superadmin',
  HOTEL_SUPERADMIN: 'hotel_superadmin',
  SUBADMIN: 'subadmin',
};

export const ADMIN_MODULES = {
  FOOD: 'food',
  TAXI: 'taxi',
  QUICK_COMMERCE: 'quickCommerce',
  TOURS: 'tours',
  HOTEL: 'hotel',
};

export const ALL_ADMIN_MODULES = Object.values(ADMIN_MODULES);

export const MODULE_SUPERADMIN_LEVELS = {
  [ADMIN_MODULES.FOOD]: ADMIN_LEVELS.FOOD_SUPERADMIN,
  [ADMIN_MODULES.TAXI]: ADMIN_LEVELS.TAXI_SUPERADMIN,
  [ADMIN_MODULES.TOURS]: ADMIN_LEVELS.TOURS_SUPERADMIN,
  [ADMIN_MODULES.HOTEL]: ADMIN_LEVELS.HOTEL_SUPERADMIN,
};

export const SUPERADMIN_PERMISSION = '*';
