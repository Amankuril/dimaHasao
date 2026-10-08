/*
 * The web reads a picked image with FileReader.readAsDataURL and posts the
 * resulting data URL as JSON. The pickers in lib/files hand back
 * { uri, name, type }, so read the bytes off disk and build the same data URL.
 * (Local helper: lib/files has no data-URL reader.)
 */
import { File } from 'expo-file-system';

export default async function fileToDataUrl(file) {
  if (!file) return '';
  if (typeof file === 'string') return file;
  const base64 = await Promise.resolve(new File(file.uri).base64());
  return `data:${file.type || 'image/jpeg'};base64,${base64}`;
}
