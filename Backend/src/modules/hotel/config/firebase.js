import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseAdmin = null;

export const initializeFirebase = () => {
  try {
    // Path to service account key - assuming it's in the root backend folder
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

    // Check if service account file exists
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`serviceAccountKey.json file not found at ${serviceAccountPath}`);
    }

    // Read service account key
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('✓ Firebase Admin initialized successfully');
    } else {
      firebaseAdmin = admin.app();
    }

    return firebaseAdmin;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
    // Don't throw error, allow server to continue without Firebase
    return null;
  }
};

// Get Firebase Admin instance
export const getFirebaseAdmin = () => {
  if (!firebaseAdmin) {
    initializeFirebase();
  }
  return firebaseAdmin;
};

export { admin };
