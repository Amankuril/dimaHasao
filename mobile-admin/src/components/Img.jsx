import { Image as RNImage } from 'react-native';
import { webAsset } from '../lib/webAsset';

/*
 * <img src> as the browser resolves it: a path such as `/uploads/x.webp`
 * (what the API stores for uploaded photos) loads from the site's origin.
 * An empty src renders nothing instead of warning.
 */
export default function Image({ source, ...rest }) {
  let src = source;
  if (source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source) {
    const uri = typeof source.uri === 'string' ? source.uri.trim() : '';
    if (!uri) src = undefined;
    else if (!/^(https?:|data:|file:|content:)/i.test(uri)) src = { ...source, uri: webAsset(uri) };
  }
  return <RNImage source={src} {...rest} />;
}
