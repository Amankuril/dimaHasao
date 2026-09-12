/**
 * Hotel Firebase — delegates to the single app initialised in
 * src/config/firebase.js.
 *
 * This module used to run its own `admin.initializeApp()` from a
 * `serviceAccountKey.json` file beside it, while core initialises from the
 * FIREBASE_SERVICE_ACCOUNT env var. firebase-admin apps are process-global, so
 * two initialisers meant whichever ran first silently decided the credentials
 * and config for everything — and core is the only one that sets `databaseURL`,
 * so losing that race broke Realtime Database.
 *
 * Worse in practice: that key file does not exist in this deployment, and the
 * old code threw on the missing file *before* checking whether an app was
 * already initialised — so hotel push failed even when core had started up
 * perfectly. Delegating removes both problems.
 */
import admin from 'firebase-admin';
import { initializeFirebaseRealtime } from '../../../config/firebase.js';

/**
 * Ensure the shared Firebase app exists.
 * @returns {import('firebase-admin').app.App|null} null when unconfigured.
 */
export const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Idempotent and non-throwing; returns null when credentials are missing.
  initializeFirebaseRealtime();

  return admin.apps.length > 0 ? admin.app() : null;
};

/** The shared Firebase Admin app, or null when Firebase is not configured. */
export const getFirebaseAdmin = () => initializeFirebase();

export { admin };
