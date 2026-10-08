/* Ported from Frontend/src/modules/Taxi/shared/hooks/useImageUpload.js (tools/port.js first pass). */
import { useState, useCallback } from 'react';
import { uploadService } from '../services/uploadService';
import { File } from 'expo-file-system';
import { toast } from '../../../lib/notify';
import { pickImage } from '../../../lib/files';

/**
 * Hook for managing image uploads with previews and optimization
 */
export const useImageUpload = (options = {}) => {
  const { folder = 'general', onSuccess = () => {}, onError = () => {} } = options;
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const handleFileChange = useCallback(
    async (e) => {
      // The web reads <input type="file">; here the handler opens the image picker
      // (or takes a picked file passed as e.target.files[0]).
      const file = e?.target?.files?.[0] || (await pickImage());
      if (!file) return;
      try {
        setUploading(true);
        let base64;
        try {
          const type = file.type || 'image/jpeg';
          base64 = `data:${type};base64,${await new File(file.uri).base64()}`;
        } catch {
          throw new Error('Unable to read selected image');
        }
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
  const reset = useCallback(() => {
    setPreview(null);
    setImageUrl(null);
    setUploading(false);
  }, []);
  return {
    uploading,
    preview,
    imageUrl,
    handleFileChange,
    reset,
    setPreview,
    setImageUrl,
  };
};
