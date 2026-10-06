import { Linking } from 'react-native';
import { toast } from './notify';

/** External links: http(s), tel and mailto only, as the web's <a href>. */
export async function openExternal(url) {
  if (!url || !/^(https?:|tel:|mailto:)/i.test(url)) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    toast.error('Could not open link');
    return false;
  }
}
