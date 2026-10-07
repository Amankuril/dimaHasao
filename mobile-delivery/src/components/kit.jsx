import { useEffect, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Check, ChevronDown, RefreshCw } from 'lucide-react-native';
import { Spinner } from './Loader';
import { Press } from './ui';
import { errorText } from '../lib/apiError';
import { color, ff, radii, space, tw, type } from '../theme';
import { useAnimatedValue } from '../lib/useAnimatedValue';

/** `bg-gradient-to-r ... bg-clip-text text-transparent` */
export function GradientText({ colors, style, children, start = { x: 0, y: 0 }, end = { x: 1, y: 0 } }) {
  // masked-view has no web build; the Expo web preview uses CSS text clipping.
  if (Platform.OS === 'web') {
    const angle = Math.round((Math.atan2(end.x - start.x, -(end.y - start.y)) * 180) / Math.PI);
    return (
      <Text
        style={[
          style,
          {
            backgroundImage: `linear-gradient(${angle}deg, ${colors.join(', ')})`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          },
        ]}
      >
        {children}
      </Text>
    );
  }
  return (
    <MaskedView maskElement={<Text style={style}>{children}</Text>}>
      <LinearGradient colors={colors} start={start} end={end}>
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

/**
 * Bottom sheet: Modal + backdrop + panel that springs up from the bottom,
 * the framer-motion `initial={{ y: '100%' }} animate={{ y: 0 }}` sheets.
 * `spring` takes framer's stiffness/damping.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  backdrop = 'rgba(0,0,0,0.4)',
  spring = { stiffness: 300, damping: 30 },
  panelStyle,
  closeOnBackdrop = true,
  blur = 0,
}) {
  const { height } = useWindowDimensions();
  const y = useAnimatedValue(height);
  const fade = useAnimatedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.setValue(height);
      Animated.parallel([
        Animated.spring(y, { toValue: 0, stiffness: spring.stiffness, damping: spring.damping, mass: 1, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(y, { toValue: height, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.sheetWrap}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          {blur ? <BlurView intensity={blur * 4} tint="dark" style={StyleSheet.absoluteFill} experimentalBlurMethod="dimezisBlurView" /> : null}
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: backdrop }]} onPress={closeOnBackdrop ? onClose : undefined} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[{ transform: [{ translateY: y }] }, panelStyle]}>{children}</Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Centered dialog: Modal + backdrop + scale/fade panel (framer `scale: 0.9 -> 1`).
 * `blur` is the backdrop-blur radius in CSS px (backdrop-blur-sm = 8).
 */
export function Dialog({ visible, onClose, children, backdrop = 'rgba(0,0,0,0.6)', blur = 0, panelStyle, closeOnBackdrop = true }) {
  const anim = useAnimatedValue(0);
  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, stiffness: 300, damping: 25, useNativeDriver: true }).start();
    }
  }, [visible, anim]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.dialogWrap}>
        {blur ? <BlurView intensity={blur * 4} tint="dark" style={StyleSheet.absoluteFill} experimentalBlurMethod="dimezisBlurView" /> : null}
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: backdrop }]} onPress={closeOnBackdrop ? onClose : undefined} accessibilityLabel="Close" />
        <Animated.View
          style={[
            panelStyle,
            {
              opacity: anim,
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Native <select>: a field drawn like the page's select that opens the
 * option list in a bottom sheet (permitted difference 2: the OS-style list
 * replaces the browser's own picker).
 */
export function SelectField({ value, options, onChange, style, textStyle, accessibilityLabel, chevronColor = tw.gray700 }) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="combobox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
        style={[{ flexDirection: 'row', alignItems: 'center' }, style]}
      >
        <Text style={[{ flex: 1 }, textStyle]} numberOfLines={1}>
          {current?.label ?? ''}
        </Text>
        <ChevronDown size={16} color={chevronColor} />
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View style={[styles.selectSheet, { paddingBottom: 12 + insets.bottom }]}>
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                onPress={() => {
                  setOpen(false);
                  onChange?.(o.value);
                }}
                style={({ pressed }) => [styles.selectRow, pressed && { backgroundColor: tw.gray50 }]}
              >
                <Text style={[styles.selectText, selected && { color: tw.primary, ...ff(700) }]}>{o.label}</Text>
                {selected ? <Check size={18} color={tw.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

/** Kit default for a request that failed (the web designs none; permitted difference 7). */
export function ErrorView({ error, onRetry, compact }) {
  return (
    <View style={[styles.errorWrap, compact && { paddingVertical: 24 }]}>
      <View style={styles.errorIcon}>
        <AlertTriangle size={24} color={color.danger} />
      </View>
      <Text style={styles.errorText}>{errorText(error)}</Text>
      {onRetry ? (
        <Press onPress={onRetry} style={styles.retry} accessibilityLabel="Try again">
          <RefreshCw size={16} color={color.onPrimary} />
          <Text style={styles.retryText}>Try again</Text>
        </Press>
      ) : null}
    </View>
  );
}

/** Loading / error / empty / content switch for a useAsync() result. */
export function AsyncView({ state, loading, empty, children, onRetry }) {
  if (state.loading && state.data === undefined) {
    return loading || (
      <View style={styles.loading}>
        <Spinner size={32} color={color.primary} />
      </View>
    );
  }
  if (state.error && state.data === undefined) {
    return <ErrorView error={state.error} onRetry={onRetry || (() => state.reload())} />;
  }
  if (empty?.when?.(state.data)) return empty.view;
  return children(state.data);
}

/** Inline safe-area spacer for fixed top bars. */
export function useTopInset(extra = 0) {
  return useSafeAreaInsets().top + extra;
}

const styles = StyleSheet.create({
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  dialogWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  errorWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  errorIcon: { width: 64, height: 64, borderRadius: radii.lg, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  errorText: { ...type.body, color: color.textSecondary, textAlign: 'center' },
  retry: { marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.primary, paddingHorizontal: space.xl, height: 48, borderRadius: radii.md },
  retryText: { ...type.button, color: color.onPrimary },
  loading: { paddingVertical: 80, alignItems: 'center' },
  rupee: { fontFamily: 'NunitoSans_800ExtraBold', letterSpacing: 0 },
  selectSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 8 },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 52 },
  selectText: { fontSize: 16, color: tw.gray900, ...ff(500) },
});

/**
 * A lucide icon sitting in a flex row without `shrink-0`, as the web often
 * places them: the browser shrinks the 20 px box along with the text and the
 * glyph scales to the narrower width. Yoga shrinks by the same basis-scaled
 * rule, so the box is shrinkable here and the glyph follows its width.
 */
export function ShrinkIcon({ Icon, size = 20, color, strokeWidth, style }) {
  const [w, setW] = useState(size);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ width: size, height: size, flexShrink: 1, justifyContent: 'center', alignItems: 'center' }, style]}>
      <Icon size={Math.min(w, size)} color={color} strokeWidth={strokeWidth} />
    </View>
  );
}

/**
 * Text in Sora (font-black / font-extrabold / headings) that contains "₹".
 * Sora has no rupee glyph, so the browser takes it from the next family in
 * the theme's stack, Nunito Sans at its heaviest loaded weight; React Native
 * would fall back to the system font instead. This draws "₹" in Nunito.
 */
export function SoraMoney({ style, children, numberOfLines }) {
  const parts = String(children ?? '').split('₹');
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) => (
        <Text key={i}>
          {i > 0 ? <Text style={styles.rupee}>₹</Text> : null}
          {part}
        </Text>
      ))}
    </Text>
  );
}
