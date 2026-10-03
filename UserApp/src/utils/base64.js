/**
 * Minimal base64 decoder — RN/Hermes has no built-in `atob`, and the only
 * thing we need to decode is a JWT payload (ASCII JSON), so a tiny
 * from-scratch table beats pulling in a polyfill package.
 */
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64Decode(input) {
  const str = String(input).replace(/=+$/, '');
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < str.length; i++) {
    const value = CHARS.indexOf(str[i]);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}
