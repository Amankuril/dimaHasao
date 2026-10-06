import { useCallback, useState } from 'react';
import { openCamera, openGallery, prepareUploadFile } from '../../lib/images';
import { toast } from '../../lib/notify';
import { readFileAsDataUrl, uploadService } from '../services/driverUploadService';

/**
 * Port of Taxi/shared/hooks/useImageUpload.js. The web's <input type="file"> change event becomes
 * `pickImage(source)` ('camera' | 'gallery', expo-image-picker through lib/images.js); the rest is unchanged:
 * read as a data URL, show the preview, upload, then onSuccess(url).
 */
export const useDriverImageUpload = (options = {}) => {
  const { folder = 'general', onSuccess = () => {}, onError = () => {} } = options;

  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  const handleFile = useCallback(
    async (picked) => {
      if (!picked) return;
      try {
        setUploading(true);
        const file = await prepareUploadFile(picked, { preset: 'profile' });
        const base64 = await readFileAsDataUrl(file);

        if (!String(base64 || '').startsWith('data:image/')) {
          toast.error('Please select a valid image file');
          return;
        }

        setPreview(base64);

        const result = await uploadService.uploadImage(base64, folder);

        const url = result.secureUrl || result.url;
        setImageUrl(url);
        onSuccess(url);
        toast.success('Professional branding image uploaded');
      } catch (error) {
        console.error('Upload Hook Error:', error);
        toast.error('Failed to upload image. Please try again.');
        onError(error);
      } finally {
        setUploading(false);
      }
    },
    [folder, onSuccess, onError],
  );

  const pickImage = useCallback(
    (source = 'gallery') => {
      const open = source === 'camera' ? openCamera : openGallery;
      return open({ fileNamePrefix: 'driver-profile', onSelectFile: handleFile });
    },
    [handleFile],
  );

  const reset = useCallback(() => {
    setPreview(null);
    setImageUrl(null);
    setUploading(false);
  }, []);

  return { uploading, preview, imageUrl, pickImage, handleFile, reset, setPreview, setImageUrl };
};
