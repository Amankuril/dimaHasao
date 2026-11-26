import { useEffect, useState } from 'react';
import { ImageSourcePicker } from '../restaurant/components/ImageSourcePicker';

/*
 * One "Use camera / Upload from device" sheet for the whole app — the food
 * module's ImageSourcePicker — callable from anywhere as a promise:
 *
 *   const source = await chooseImageSource();   // 'camera' | 'gallery' | null
 *
 * The hotel screens used native Alert dialogs (and one its own sheet), so the
 * same action looked different in each half of the app. Mounted once in
 * app/_layout.jsx.
 */

let showSheet = null;

export function chooseImageSource({ title = 'Add photo', description = 'Choose how you want to upload your photo.' } = {}) {
  if (!showSheet) return Promise.resolve('gallery');
  return new Promise((resolve) => showSheet({ title, description, resolve }));
}

export default function ImageSourceHost() {
  const [request, setRequest] = useState(null);

  useEffect(() => {
    showSheet = (next) => {
      setRequest((current) => {
        current?.resolve(null); // a second call cancels the first
        return next;
      });
    };
    return () => {
      showSheet = null;
    };
  }, []);

  const finish = (value) => {
    request?.resolve(value);
    setRequest(null);
  };

  return (
    <ImageSourcePicker
      isOpen={Boolean(request)}
      title={request?.title}
      description={request?.description}
      onClose={() => finish(null)}
      onSource={(source) => finish(source)}
    />
  );
}
