import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { hotelService } from '../../../services/apiService';

/*
 * The wizard's file picking and upload, in place of the web's hidden <input type="file">
 * and Flutter camera bridge. A "file" is what React Native's FormData uploads:
 * { uri, name, type, size }.
 */

const MAX_BYTES = 10 * 1024 * 1024;

function mimeFromUri(uri, fallback = 'image/jpeg') {
  const ext = String(uri).split('?')[0].split('.').pop()?.toLowerCase();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf' }[ext] || fallback;
}

function assetToFile(asset) {
  const type = asset.mimeType || mimeFromUri(asset.uri);
  const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  return { uri: asset.uri, name: asset.fileName || asset.name || `upload-${Date.now()}.${ext}`, type, size: asset.fileSize ?? asset.size ?? null };
}

/** Camera or library, as the sheet the other pickers show. Resolves 'camera' | 'gallery' | null. */
export function askImageSource() {
  return new Promise((resolve) => {
    Alert.alert(
      'Add photo',
      'Choose how you want to upload your photo.',
      [
        { text: 'Use Camera', onPress: () => resolve('camera') },
        { text: 'Upload from Device', onPress: () => resolve('gallery') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/** Picks images from the camera (one) or the library (several when `multiple`). Resolves [] when cancelled. */
export async function pickImages({ source, multiple = false }) {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted && Platform.OS !== 'web') {
    throw new Error(source === 'camera' ? 'Camera permission is required' : 'Photo library permission is required');
  }
  const opts = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false, exif: false, allowsMultipleSelection: multiple && source !== 'camera' };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.length) return [];
  return res.assets.map(assetToFile);
}

/** Picks one document (the web's plain file input accepts any file). Resolves null when cancelled. */
export async function pickDocument() {
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return null;
  return assetToFile(res.assets[0]);
}

/** Port of the wizard's uploadImages: validates, posts one multipart request, returns the URLs. */
export async function uploadFiles(files) {
  const fd = new FormData();
  for (const file of files) {
    if (!String(file.type || '').startsWith('image/')) {
      throw new Error(`File ${file.name} is not an image`);
    }
    if (file.size && file.size > MAX_BYTES) {
      throw new Error(`Image ${file.name} is too large. Maximum 10MB allowed.`);
    }
    fd.append('images', { uri: file.uri, name: file.name, type: file.type });
  }
  const res = await hotelService.uploadImages(fd);
  return Array.isArray(res?.urls) ? res.urls : [];
}

/** The wizard's upload error wording. */
export function uploadErrorMessage(err) {
  let msg = 'Upload failed';
  if (typeof err === 'string') msg = err;
  else if (err?.response?.data?.message) msg = err.response.data.message;
  else if (err?.message) msg = err.message;
  if (msg === 'Network Error' || (err?.response && err.response.status === 413)) {
    msg = 'Upload failed: File size may be too large (Max 10MB).';
  }
  return msg;
}
