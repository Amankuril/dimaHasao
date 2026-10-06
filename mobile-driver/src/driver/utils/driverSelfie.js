import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import api from '../api/client';

/*
 * DriverHome's daily check-in selfie. Web: getUserMedia live preview (or <input capture="user"> fallback) ->
 * canvas compression (max side 1280, JPEG 0.82, down to 0.45 until under 8.5M characters) -> uploadService.uploadImage
 * (POST /common/upload/image { image: dataUrl, folder }). Native: the front camera app -> the same compression.
 */
const MAX_SIDE = 1280;
const MAX_DATA_URL_LENGTH = 8_500_000;

/** Opens the front camera; resolves to the picked asset, or null if the driver backed out. */
export const takeSelfie = async () => {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Could not access the camera.');
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    cameraType: ImagePicker.CameraType.front,
    quality: 0.9,
    allowsEditing: false,
    exif: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
};

export const compressSelfieForUpload = async (asset) => {
  const width = Number(asset.width) || 0;
  const height = Number(asset.height) || 0;
  const largestSide = Math.max(width, height, 1);
  const scale = largestSide > MAX_SIDE ? MAX_SIDE / largestSide : 1;

  const context = ImageManipulator.manipulate(asset.uri);
  if (scale < 1 && width && height) {
    context.resize({ width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) });
  }
  const rendered = await context.renderAsync();

  let quality = 0.82;
  let output = await rendered.saveAsync({ compress: quality, format: SaveFormat.JPEG, base64: true });
  let dataUrl = `data:image/jpeg;base64,${output.base64}`;

  while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.45) {
    quality -= 0.1;
    output = await rendered.saveAsync({ compress: quality, format: SaveFormat.JPEG, base64: true });
    dataUrl = `data:image/jpeg;base64,${output.base64}`;
  }

  return dataUrl;
};

/** Web uploadService.uploadImage(base64Image, folder) */
export const uploadImage = async (base64Image, folder = 'general') => {
  const response = await api.post('/common/upload/image', { image: base64Image, folder });
  return response?.data || response;
};
