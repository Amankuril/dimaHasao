import { getApps, initializeApp } from 'firebase/app';
import { getDatabase, ref, update } from 'firebase/database';

/*
 * writeOrderTracking from Frontend/src/modules/Food/realtimeTracking.js: the
 * rider publishes position, route and ETA to active_orders/{orderId}, which
 * the customer's tracking map reads. The Firebase JS SDK's Realtime Database
 * runs unchanged in React Native.
 */

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || '',
};

let db = null;
function getDb() {
  if (db) return db;
  if (!firebaseConfig.databaseURL) return null;
  const app = getApps()[0] || initializeApp(firebaseConfig);
  db = getDatabase(app);
  return db;
}

const sanitizeRealtimeKey = (value) => String(value || '').trim().replace(/[.#$/[\]]/g, '_');
const toFiniteNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export async function writeOrderTracking(orderId, payload = {}) {
  if (!orderId) return false;
  const database = getDb();
  if (!database) return false;
  const toWrite = {
    ...payload,
    lat: toFiniteNumber(payload.lat),
    lng: toFiniteNumber(payload.lng),
    heading: toFiniteNumber(payload.heading ?? payload.bearing) || 0,
    last_updated: Date.now(),
  };
  if (payload.timestamp != null) toWrite.timestamp = toFiniteNumber(payload.timestamp) || Date.now();
  // RTDB rejects undefined values; the web SDK path tolerated none either.
  Object.keys(toWrite).forEach((k) => toWrite[k] === undefined && delete toWrite[k]);
  await update(ref(database, `active_orders/${sanitizeRealtimeKey(orderId)}`), toWrite);
  return true;
}
