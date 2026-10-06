import { openCamera, openGallery } from '../../lib/images';

/*
 * Stand-in for Food/utils/imageUploadUtils.js. On the web this chose between
 * the old wrapper's native picker bridge and a browser <input type="file">.
 * The app always has a native picker (lib/images, expo-image-picker), so it
 * answers the way the wrapper did: pages show their camera / gallery sheet
 * and call openCamera / openGallery with onSelectFile(file), where `file` is
 * a `{ uri, name, type, size }` object the API layer can upload.
 */

/** True on the web only inside the wrapper; the app is always in that position. */
export const isFlutterBridgeAvailable = () => true;

export const handleImageUpload = ({ source = 'gallery', ...options } = {}) => (source === 'camera' ? openCamera(options) : openGallery(options));

export { openCamera, openGallery };
