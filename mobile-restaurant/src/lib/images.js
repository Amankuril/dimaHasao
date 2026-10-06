import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { toast } from './notify';

/*
 * Image picking and compression, from the web's
 * Food/utils/imageUploadUtils.js (openCamera / openGallery) and
 * shared/utils/imageCompressor.js (prepareUploadFile).
 *
 * A "file" here is what React Native's FormData uploads:
 * { uri, name, type, size, width, height }.
 */

const DEFAULT_MAX = { maxWidth: 2048, maxHeight: 2048, quality: 0.88, maxBytes: 4.5 * 1024 * 1024 };
export const PROFILE_PRESET = { maxWidth: 1024, maxHeight: 1024, maxBytes: 2 * 1024 * 1024, quality: 0.88 };

function fileSize(uri) {
  try {
    return new File(uri).size ?? null;
  } catch {
    return null;
  }
}

function mimeFromUri(uri, fallback = 'image/jpeg') {
  const ext = String(uri).split('?')[0].split('.').pop()?.toLowerCase();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' }[ext] || fallback;
}

function toFile(asset, prefix) {
  const type = asset.mimeType || mimeFromUri(asset.uri);
  const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  return {
    uri: asset.uri,
    name: asset.fileName || `${prefix}-${Date.now()}.${ext}`,
    type,
    size: asset.fileSize ?? fileSize(asset.uri),
    width: asset.width,
    height: asset.height,
  };
}

async function pick(source, { fileNamePrefix = 'photo', quality = 0.8 } = {}) {
  try {
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && Platform.OS !== 'web') {
      toast.error(source === 'camera' ? 'Camera permission is required' : 'Photo library permission is required');
      return null;
    }
    const opts = { mediaTypes: ['images'], quality, allowsEditing: false, exif: false };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]) return null;
    return toFile(res.assets[0], fileNamePrefix);
  } catch {
    toast.error('Could not open camera or gallery');
    return null;
  }
}

/** openCamera({ onSelectFile, fileNamePrefix }) */
export async function openCamera({ onSelectFile, onCancel, ...opts } = {}) {
  const file = await pick('camera', opts);
  if (file) onSelectFile?.(file);
  else onCancel?.();
  return file;
}

/** openGallery({ onSelectFile, fileNamePrefix }) */
export async function openGallery({ onSelectFile, onCancel, ...opts } = {}) {
  const file = await pick('gallery', opts);
  if (file) onSelectFile?.(file);
  else onCancel?.();
  return file;
}

function scale(width, height, maxWidth, maxHeight) {
  if (!width || !height || (width <= maxWidth && height <= maxHeight)) return null;
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

/**
 * compressImageForUpload: resize to the box, then WebP and JPEG at falling
 * quality until the file fits maxBytes, as the web's canvas loop does.
 * Small WebP/JPEG files under 900 KB pass through untouched.
 */
export async function compressImageForUpload(file, options = {}) {
  if (!file?.uri || !String(file.type || '').startsWith('image/') || file.type === 'image/gif') return file;
  const { maxWidth, maxHeight, maxBytes, quality } = { ...DEFAULT_MAX, ...options };
  if (file.size && file.size <= maxBytes && ['image/webp', 'image/jpeg'].includes(file.type) && file.size <= 900 * 1024) {
    return file;
  }
  try {
    const ctx = ImageManipulator.manipulate(file.uri);
    const dims = scale(file.width, file.height, maxWidth, maxHeight);
    if (dims) ctx.resize(dims);
    const ref = await ctx.renderAsync();
    const attempts = [
      { format: SaveFormat.WEBP, type: 'image/webp', ext: 'webp' },
      { format: SaveFormat.JPEG, type: 'image/jpeg', ext: 'jpg' },
    ];
    for (const a of attempts) {
      let q = quality;
      while (q >= 0.55) {
        const out = await ref.saveAsync({ compress: q, format: a.format });
        const size = fileSize(out.uri);
        if (size == null || size <= maxBytes || q <= 0.58) {
          const base = String(file.name || 'upload').replace(/\.[^/.]+$/, '').replace(/[^\w.-]+/g, '-').slice(0, 80);
          return { uri: out.uri, name: `${base || 'upload'}-${Date.now()}.${a.ext}`, type: a.type, size, width: out.width, height: out.height };
        }
        q -= 0.08;
      }
    }
  } catch {
    // fall through to the original
  }
  return file;
}

export function prepareUploadFile(file, options = {}) {
  if (!file) return Promise.resolve(file);
  const preset = options.preset === 'profile' ? PROFILE_PRESET : {};
  return compressImageForUpload(file, { ...preset, ...options });
}

/**
 * Signup document prep (deliveryOnboardingStorage.prepareSignupDocumentFile):
 * keep files <= 400 KB, else 1600 px max, JPEG 0.82, only if smaller.
 */
export async function prepareSignupDocumentFile(file) {
  if (!file?.uri || !String(file.type || '').startsWith('image/')) throw new Error('Invalid image file');
  if (file.size != null && file.size <= 400 * 1024) return file;
  try {
    const ctx = ImageManipulator.manipulate(file.uri);
    const dims = scale(file.width, file.height, 1600, 1600);
    if (dims) ctx.resize(dims);
    const ref = await ctx.renderAsync();
    const out = await ref.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
    const size = fileSize(out.uri);
    if (!size || (file.size && size >= file.size) || size > 1.5 * 1024 * 1024) return file;
    const base = String(file.name || 'document').replace(/\.[^.]+$/, '');
    return { uri: out.uri, name: `${base}.jpg`, type: 'image/jpeg', size, width: out.width, height: out.height };
  } catch {
    return file;
  }
}
