import { forwardRef, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Spinner } from './Loader';
import { ff, gradients, radius, shadow, tw } from '../theme';
import { useAnimatedValue } from '../lib/useAnimatedValue';

/*
 * Primitives. Screens build their own markup on these, the way the web pages
 * write their own Tailwind on <button> / <input>.
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable with the web's `active:scale-*` feedback (default 0.95) that
 * ignores further taps while an async onPress is still running.
 */
export function Press({ onPress, scale = 0.95, disabled, style, children, accessibilityRole = 'button', ...rest }) {
  const anim = useAnimatedValue(1);
  const busy = useRef(false);
  const to = (v) => Animated.timing(anim, { toValue: v, duration: 120, useNativeDriver: true }).start();
  const handle = async (e) => {
    if (busy.current || !onPress) return;
    const r = onPress(e);
    if (r && typeof r.then === 'function') {
      busy.current = true;
      try {
        await r;
      } catch {
        // the handler reports its own errors
      } finally {
        busy.current = false;
      }
    }
  };
  return (
    <AnimatedPressable
      onPress={handle}
      onPressIn={() => scale !== 1 && to(scale)}
      onPressOut={() => scale !== 1 && to(1)}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: Boolean(disabled) }}
      // Keep any transform the caller set (e.g. the nav's active scale-110).
      style={[style, { transform: [...(StyleSheet.flatten(style)?.transform || []), { scale: anim }] }]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * The sign-in screens' gradient pill: `bg-gradient-to-r from-[#0A4D2B]
 * to-[#06381E] py-3.5 rounded-full text-base` with the blue drop shadow,
 * `disabled:opacity-50 disabled:shadow-none`, `active:scale-[0.98]`.
 */
export function GradientButton({ title, onPress, disabled, loading, loadingTitle, style, textStyle, weight = 500, children, accessibilityLabel }) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      scale={0.98}
      accessibilityLabel={accessibilityLabel || title}
      style={[styles.gradWrap, !(disabled || loading) && shadow('button'), (disabled || loading) && { opacity: 0.5 }, style]}
    >
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.grad}>
        {children ||
          (loading ? (
            <View style={styles.row}>
              <Spinner size={20} />
              {loadingTitle ? <Text style={[styles.gradText, ff(weight), textStyle]}>{loadingTitle}</Text> : null}
            </View>
          ) : (
            <Text style={[styles.gradText, ff(weight), textStyle]}>{title}</Text>
          ))}
      </LinearGradient>
    </Press>
  );
}

/**
 * <input> as deliveryTheme.css paints it: white background, `#E8DEE7` border
 * (the page's own width), focus border `#789D8A` plus a 4 px
 * rgba(21,73,139,.15) ring. The ring is an outer view with negative margin,
 * so the field keeps its size. `error` is accepted for call-site parity but,
 * as on the web, the theme's border wins over red error borders.
 */
export const ThemedInput = forwardRef(function ThemedInput(
  { style, containerStyle, borderWidth = 2, radius: r = radius.pill, error: _error, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ borderRadius: r + 4, padding: 4, margin: -4 }, containerStyle]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r + 4, backgroundColor: focused ? 'rgba(21,73,139,0.15)' : 'transparent' }]} />
      <TextInput
        ref={ref}
        // Tailwind v4 preflight: placeholder = currentColor at 50 %.
        placeholderTextColor="rgba(31,31,36,0.5)"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          { borderWidth, borderRadius: r, borderColor: focused ? '#789D8A' : '#E8DEE7' },
          style,
        ]}
        {...props}
      />
    </View>
  );
});

export function Card({ style, children }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export { default as Loader, Spinner } from './Loader';

const styles = StyleSheet.create({
  gradWrap: { borderRadius: radius.pill, width: '100%' },
  grad: { borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, minHeight: 52 },
  gradText: { color: '#fff', fontSize: 16, lineHeight: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // outline: the browser's own focus ring, only present in the Expo web preview.
  input: { backgroundColor: '#fff', color: '#1F1F24', fontSize: 16, outlineWidth: 0, ...ff(500) },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: '#E5DDC3', ...shadow('card') },
});
