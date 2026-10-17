/**
 * Ported from Frontend/src/modules/Taxi/modules/shared/utils/referralTranslationFields.js,
 * trimmed to the user-side fields this app needs (driver referral copy
 * belongs to the future driver app). getStoredReferralLanguageCode becomes
 * async (AsyncStorage) and drops the browser-language fallback RN has no
 * equivalent for, defaulting to 'en' same as the web version's own default.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const USER_REFERRAL_TRANSLATION_FIELDS = [
  {key: 'instant_referrer_user', label: 'instant referrer user'},
  {key: 'instant_referrer_user_and_new_user', label: 'instant referrer user and new user'},
  {key: 'conditional_referrer_user_ride_count', label: 'conditional for referrer user ride count'},
  {key: 'conditional_referrer_user_earnings', label: 'conditional for referrer user earnings'},
  {key: 'dual_conditional_referrer_user_and_new_user_ride_count', label: 'dual conditional for referrer user and new user ride count'},
  {key: 'dual_conditional_referrer_user_and_new_user_earnings', label: 'dual conditional for referrer user and new user earnings'},
  {key: 'banner_text', label: 'user banner text', plainText: true},
];

export const DEFAULT_USER_REFERRAL_COPY = {
  instant_referrer_user: 'Invite a friend and get {amount} in your wallet as soon as they sign up.',
  instant_referrer_user_and_new_user: 'You both win — you get {amount} and your friend gets {new_user_amount} on sign-up.',
  conditional_referrer_user_ride_count: 'Earn {amount} once your friend completes {ride_count} rides.',
  conditional_referrer_user_earnings: 'Earn {amount} once your friend has spent {user_spent_amount} on rides.',
  dual_conditional_referrer_user_and_new_user_ride_count: 'You get {amount} and your friend gets {new_user_amount} after they finish {ride_count} rides.',
  dual_conditional_referrer_user_and_new_user_earnings: 'You get {amount} and your friend gets {new_user_amount} once they have spent {user_spent_amount}.',
  banner_text: 'Invite friends, earn {amount}',
};

const stripHtml = (value = '') =>
  String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatReferralAmount = value => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? `₹${amount}` : '₹0';
};

export const applyReferralSettingPlaceholders = (section = {}, settings = {}) => {
  const amount = formatReferralAmount(settings.amount || 0);
  const rideCount = String(settings.ride_count || 0);
  const replacements = {
    amount,
    referral_amount: amount,
    referred_user_amount: amount,
    new_user_amount: amount,
    user_spent_amount: amount,
    ride_count: rideCount,
    user_ride_count: rideCount,
  };

  return Object.entries(section || {}).reduce((accumulator, [key, value]) => {
    let nextValue = String(value || '');
    Object.entries(replacements).forEach(([placeholder, replacement]) => {
      nextValue = nextValue.replaceAll(`{${placeholder}}`, replacement);
    });
    accumulator[key] = nextValue;
    return accumulator;
  }, {});
};

export const buildReferralPreviewBlocks = (section = {}, fields = []) =>
  fields
    .filter(field => field.key !== 'banner_text')
    .map(field => ({key: field.key, label: field.label, html: String(section?.[field.key] || ''), text: stripHtml(section?.[field.key] || '')}))
    .filter(item => item.html || item.text);

const mapAliasToCode = value => {
  switch (value) {
    case 'english':
      return 'en';
    case 'hindi':
      return 'hi';
    case 'arabic':
      return 'ar';
    case 'spanish':
      return 'es';
    case 'french':
      return 'fr';
    case 'tamil':
      return 'ta';
    case 'kannada':
      return 'kn';
    case 'marathi':
      return 'mr';
    case 'gujarati':
      return 'gu';
    default:
      return value || 'en';
  }
};

export const getStoredReferralLanguageCode = async (audience = 'user') => {
  const explicitLanguage = String((await AsyncStorage.getItem(`${audience}_lang`)) || (await AsyncStorage.getItem('app_lang')) || '')
    .trim()
    .toLowerCase();
  return mapAliasToCode(explicitLanguage || 'en');
};
