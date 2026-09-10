/**
 * Flutter WebView Bridge - Camera Handler
 * Detects if running in Flutter app and provides camera access
 */

// Check if running in Flutter InAppWebView
export const isFlutterApp = () => {
  return window.flutter_inappwebview !== undefined ||
    window.flutter !== undefined ||
    navigator.userAgent.includes('FlutterWebView');
};

/**
 * Open Flutter native camera and get base64 image
 * @returns {Promise<Object>} {success, base64, mimeType, fileName}
 */
export const openFlutterCamera = async () => {
  return new Promise((resolve, reject) => {
    try {
      if (!window.flutter_inappwebview) {
        reject(new Error('Flutter bridge not available'));
        return;
      }

      window.flutter_inappwebview
        .callHandler('openCamera')
        .then((result) => {
          if (result && result.success) {
            // Handle both multiple image results and single image results
            if (result.images && Array.isArray(result.images)) {
              resolve({
                success: true,
                images: result.images
              });
            } else {
              resolve({
                success: true,
                base64: result.base64,
                mimeType: result.mimeType || 'image/jpeg',
                fileName: result.fileName || `image-${Date.now()}.jpg`
              });
            }
          } else {
            reject(new Error(result?.message || 'Camera capture failed'));
          }
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Upload one or more base64 images to backend
 * @param {Array|string} images - Single base64 or array of {base64, mimeType, fileName}
 * @returns {Promise<Object>} Upload result
 */
export const uploadBase64Image = async (images, mimeType = 'image/jpeg', fileName = 'image.jpg') => {
  try {
    let payloadImages = [];

    if (Array.isArray(images)) {
      payloadImages = images.map(img => ({
        base64: img.base64,
        mimeType: img.mimeType || 'image/jpeg',
        fileName: img.fileName || `img-${Date.now()}.jpg`
      }));
    } else {
      payloadImages = [{ base64: images, mimeType, fileName }];
    }

    const response = await fetch('/api/auth/partner/upload-docs-base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: payloadImages })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upload failed (${response.status}): ${text.substring(0, 50)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Upload Base64] Error:', error);
    throw error;
  }
};

/**
 * Universal image picker - handles single and multiple selection via Flutter
 */
export const pickImage = async (onSuccess, onError) => {
  try {
    if (isFlutterApp() && window.flutter_inappwebview) {
      const result = await openFlutterCamera();

      if (result.success) {
        let uploadResult;

        // Handle multiple images from Flutter
        if (result.images && result.images.length > 0) {
          uploadResult = await uploadBase64Image(result.images);
        }
        // Handle single image from Flutter
        else if (result.base64) {
          uploadResult = await uploadBase64Image(
            result.base64,
            result.mimeType,
            result.fileName
          );
        }

        if (uploadResult?.success && uploadResult.files && uploadResult.files.length > 0) {
          // If multiple files uploaded, return array of file info, otherwise return first (backwards compat)
          if (uploadResult.files.length > 1) {
            onSuccess && onSuccess(uploadResult.files);
          } else {
            const file = uploadResult.files[0];
            onSuccess && onSuccess(file.url, file.publicId);
          }
        } else {
          throw new Error('Upload failed or no files returned');
        }
      }
    } else {
      onError && onError(new Error('Use web file input'));
    }
  } catch (error) {
    console.error('[Image Picker] Error:', error);
    onError && onError(error);
  }
};

/**
 * Open Flutter native camera for video and get base64/file info
 * @returns {Promise<Object>} {success, base64, mimeType, fileName}
 */
export const openFlutterVideoCamera = async () => {
  return new Promise((resolve, reject) => {
    try {
      if (!window.flutter_inappwebview) {
        reject(new Error('Flutter bridge not available'));
        return;
      }

      window.flutter_inappwebview
        .callHandler('pickVideo') // Most Flutter bridges use one handler for gallery/camera video
        .then((result) => {
          if (result && result.success) {
            resolve(result);
          } else {
            reject(new Error('Video capture failed'));
          }
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Universal video picker - uses Flutter video picker in app, file input in browser
 * @param {Function} onSuccess - Success callback (file)
 * @param {Function} onError - Error callback
 */
export const pickVideo = async (onSuccess, onError) => {
  try {
    if (isFlutterApp() && window.flutter_inappwebview) {
      const result = await openFlutterVideoCamera();
      if (result.success) {
        // If Flutter returns base64, we convert to Blob/File for compatibility with existing upload logic
        if (result.base64) {
          const byteCharacters = atob(result.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: result.mimeType || 'video/mp4' });
          const file = new File([blob], result.fileName || 'video.mp4', { type: result.mimeType || 'video/mp4' });
          onSuccess && onSuccess(file);
        }
      }
    } else {
      // Browser handles this via clicking the hidden input
      onError && onError(new Error('Use web file input'));
    }
  } catch (error) {
    console.error('[Video Picker] Error:', error);
    onError && onError(error);
  }
};

export default {
  isFlutterApp,
  openFlutterCamera,
  openFlutterVideoCamera,
  uploadBase64Image,
  pickImage,
  pickVideo
};
