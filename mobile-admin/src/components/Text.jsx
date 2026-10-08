import { createContext, forwardRef, useContext } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

/*
 * Text and TextInput in the admin web's fonts, with CSS text inheritance.
 *
 * Fonts: on Android every weight of a custom font is its own family, and
 * `fontWeight` on a custom family is ignored. These wrappers read the CSS
 * weight a style asks for (`font-semibold` -> '600') and swap in the bundled
 * family for it, so ported screens can keep writing `font-semibold`.
 * The family comes from the nearest <FontFamily> (the web sets it per panel:
 * Poppins in Food/Hotel/Tours/Global from shared/styles/global.css, Inter in
 * the Taxi admin from `.redigo-admin-root *` in Taxi/index.css), or from an
 * explicit `fontFamily: 'Inter'` / 'Poppins' / 'Outfit' in the style.
 *
 * Inheritance: in CSS, colour, font and alignment flow from a <div> down to
 * the text inside it. components/web.jsx's containers put their text styles
 * in InheritedText; Text merges them under its own style. The root value is
 * the web's body: --foreground (oklch(0.2 0.05 50)) at 16px / 1.5.
 *
 * Use these instead of react-native's Text / TextInput everywhere.
 */

const FAMILIES = {
  Poppins: { 300: 'Poppins_300Light', 400: 'Poppins_400Regular', 500: 'Poppins_500Medium', 600: 'Poppins_600SemiBold', 700: 'Poppins_700Bold', 800: 'Poppins_800ExtraBold', 900: 'Poppins_800ExtraBold' },
  Inter: { 300: 'Inter_400Regular', 400: 'Inter_400Regular', 500: 'Inter_500Medium', 600: 'Inter_600SemiBold', 700: 'Inter_700Bold', 800: 'Inter_800ExtraBold', 900: 'Inter_900Black' },
  Outfit: { 300: 'Outfit_400Regular', 400: 'Outfit_400Regular', 500: 'Outfit_500Medium', 600: 'Outfit_600SemiBold', 700: 'Outfit_700Bold', 800: 'Outfit_800ExtraBold', 900: 'Outfit_900Black' },
  Montserrat: { 300: 'Montserrat_400Regular', 400: 'Montserrat_400Regular', 500: 'Montserrat_500Medium', 600: 'Montserrat_600SemiBold', 700: 'Montserrat_700Bold', 800: 'Montserrat_800ExtraBold', 900: 'Montserrat_900Black' },
  Cinzel: { 300: 'Cinzel_700Bold', 400: 'Cinzel_700Bold', 500: 'Cinzel_700Bold', 600: 'Cinzel_700Bold', 700: 'Cinzel_700Bold', 800: 'Cinzel_700Bold', 900: 'Cinzel_700Bold' },
  Playfair: { 300: 'PlayfairDisplay_400Regular', 400: 'PlayfairDisplay_400Regular', 500: 'PlayfairDisplay_600SemiBold', 600: 'PlayfairDisplay_600SemiBold', 700: 'PlayfairDisplay_700Bold', 800: 'PlayfairDisplay_700Bold', 900: 'PlayfairDisplay_700Bold' },
};

const WEIGHT = { normal: 400, bold: 700, thin: 300, light: 300, medium: 500 };

export const BODY_TEXT = { color: '#270E01', fontSize: 16, lineHeight: 24 };

const FontContext = createContext('Poppins');
export const InheritedText = createContext(BODY_TEXT);

/** The CSS properties that inherit, as React Native style keys. */
export const TEXT_KEYS = ['color', 'fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign', 'textTransform', 'textDecorationLine', 'textDecorationColor'];

/** Split a flat style into [layout style, text style]. */
export function splitTextStyle(flat) {
  const view = {};
  const text = {};
  Object.entries(flat || {}).forEach(([k, v]) => {
    if (TEXT_KEYS.includes(k)) text[k] = v;
    else view[k] = v;
  });
  return [view, text];
}

/**
 * Merge a container's own text styles into what it inherited. A font size
 * without a line height keeps the web's 1.5 ratio only if the class gave none
 * (Tailwind's text-* classes always give one).
 */
export function inheritText(parent, own) {
  if (!own || !Object.keys(own).length) return parent;
  const next = { ...parent, ...own };
  if (own.fontSize && !own.lineHeight && parent.lineHeight && parent.fontSize) next.lineHeight = Math.round(own.fontSize * (parent.lineHeight / parent.fontSize));
  return next;
}

/** Sets the default family for every Text below it. */
export function FontFamily({ family = 'Poppins', children }) {
  return <FontContext.Provider value={family}>{children}</FontContext.Provider>;
}

export function useFontFamily() {
  return useContext(FontContext);
}

/** The text style a component at this point would inherit (colour for icons, etc.). */
export function useInheritedText() {
  return useContext(InheritedText);
}

function familyKey(name, fallback) {
  if (!name) return fallback;
  const n = String(name);
  if (/poppins/i.test(n)) return 'Poppins';
  if (/inter/i.test(n)) return 'Inter';
  if (/outfit|jakarta/i.test(n)) return 'Outfit';
  if (/montserrat/i.test(n)) return 'Montserrat';
  if (/cinzel/i.test(n)) return 'Cinzel';
  if (/playfair/i.test(n)) return 'Playfair';
  return null; // a family we don't map (monospace, an exact loaded name): leave it alone
}

/** The style with fontWeight replaced by the matching font file. */
export function resolveFont(style, fallback = 'Poppins') {
  const flat = StyleSheet.flatten(style) || {};
  const key = familyKey(flat.fontFamily, fallback);
  if (!key) return flat;
  const raw = flat.fontWeight;
  const w = typeof raw === 'number' ? raw : WEIGHT[raw] || Number(raw) || 400;
  const snapped = Math.min(900, Math.max(300, Math.round(w / 100) * 100));
  const { fontWeight, ...rest } = flat; // eslint-disable-line no-unused-vars
  return { ...rest, fontFamily: FAMILIES[key][snapped] };
}

export const Text = forwardRef(function Text({ style, children, ...rest }, ref) {
  const family = useContext(FontContext);
  const inherited = useContext(InheritedText);
  const own = StyleSheet.flatten(style) || {};
  // What nested text inherits: only the text properties, never padding or borders.
  const passed = inheritText(inherited, splitTextStyle(own)[1]);
  const node = (
    <RNText ref={ref} allowFontScaling={false} style={resolveFont({ ...own, ...passed }, family)} {...rest}>
      {children}
    </RNText>
  );
  if (typeof children === 'string' || typeof children === 'number' || passed === inherited) return node;
  return <InheritedText.Provider value={passed}>{node}</InheritedText.Provider>;
});

export const TextInput = forwardRef(function TextInput({ style, ...rest }, ref) {
  const family = useContext(FontContext);
  return <RNTextInput ref={ref} allowFontScaling={false} placeholderTextColor="#90A1B9" style={resolveFont([{ color: BODY_TEXT.color }, style], family)} {...rest} />;
});

/** Font files to load at boot (keys for useFonts). */
export const FONT_FILES = [...new Set(Object.values(FAMILIES).flatMap((f) => Object.values(f)))];

export default Text;
