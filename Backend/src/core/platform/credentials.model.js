import mongoose from 'mongoose';

/**
 * Third-party credentials the admin can change without a redeploy or an app
 * release: the server Google Maps key and the Razorpay pair.
 *
 * A singleton, like platform settings. Every value in `values` is stored
 * encrypted (see credentials.service.js) — a database dump alone does not
 * reveal a key, because the encryption key lives only in the server env.
 */
const credentialsSchema = new mongoose.Schema(
    {
        key: { type: String, default: 'credentials', unique: true, immutable: true },
        /** name → "v1:iv:tag:ciphertext" */
        values: { type: Map, of: String, default: {} },
        updatedBy: { type: mongoose.Schema.Types.ObjectId },
    },
    { timestamps: true, collection: 'platform_credentials' },
);

const PlatformCredentials = mongoose.model('PlatformCredentials', credentialsSchema, 'platform_credentials');
export default PlatformCredentials;
