import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { display, shadow, tw } from '../../theme';
import { useAnimatedValue } from '../../lib/useAnimatedValue';

/*
 * Port of components/ui/ActionSlider.jsx: "swipe to confirm".
 * Race-condition safe: isAcceptingRef prevents a double fire from rapid slides.
 *
 * `color` keeps the web's class name so call sites translate one to one;
 * the value is what deliveryTheme.css paints (bg-orange-500 really renders
 * the soft green through the [class*="bg-orange-50"] rule).
 */
const FILL = {
  'bg-green-600': tw.primary,
  'bg-blue-600': tw.primary,
  'bg-gray-900': tw.gray900,
  'bg-black': tw.black,
  'bg-orange-500': tw.primarySoft,
};

const HANDLE = 56; // w-14
const PAD = 6; // p-1.5

export function ActionSlider({ label = 'Slide to Confirm', onConfirm, disabled = false, color = 'bg-green-600', successLabel = 'Confirmed ✓' }) {
  const [width, setWidth] = useState(300);
  const [progress, setProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const isAcceptingRef = useRef(false);
  const x = useAnimatedValue(0);
  const fill = useAnimatedValue(0);
  const successAnim = useAnimatedValue(0);
  const state = useRef({ width, progress, isSuccess, disabled, onConfirm });
  state.current = { width, progress, isSuccess, disabled, onConfirm };

  const springFill = (to) =>
    Animated.spring(fill, { toValue: to, stiffness: 300, damping: 30, mass: 1, useNativeDriver: false }).start();
  const resetHandle = () => Animated.spring(x, { toValue: 0, stiffness: 300, damping: 30, useNativeDriver: false }).start();

  // Reset when disabled (e.g. the order was claimed by another rider).
  useEffect(() => {
    if (disabled) {
      setProgress(0);
      setIsSuccess(false);
      isAcceptingRef.current = false;
      x.setValue(0);
      springFill(0);
    }
  }, [disabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Animated.spring(successAnim, { toValue: isSuccess ? 1 : 0, stiffness: 300, damping: 25, useNativeDriver: true }).start();
  }, [isSuccess, successAnim]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !state.current.disabled && !state.current.isSuccess && !isAcceptingRef.current,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 4 && !state.current.disabled && !state.current.isSuccess && !isAcceptingRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (evt, g) => {
        const { width: w, disabled: d, isSuccess: s } = state.current;
        if (d || s || isAcceptingRef.current) return;
        const max = w - 68; // dragConstraints.right
        let dx = g.dx;
        if (dx < 0) dx *= 0.1; // dragElastic 0.1
        if (dx > max) dx = max + (dx - max) * 0.1;
        x.setValue(dx);
        // Web: (pointer x - container left) / (width - handle - padding)
        const totalPath = w - HANDLE - 12;
        const pointer = PAD + HANDLE / 2 + g.dx;
        const p = Math.min(1, Math.max(0, pointer / totalPath));
        setProgress(p);
        fill.setValue(p);
      },
      onPanResponderRelease: async (_, g) => {
        const { disabled: d, isSuccess: s, progress: p, onConfirm: confirm } = state.current;
        if (d || s || isAcceptingRef.current) return;
        if (p > 0.8 || g.dx > 150) {
          isAcceptingRef.current = true;
          setIsSuccess(true);
          setProgress(1);
          springFill(1);
          Animated.spring(x, { toValue: state.current.width - 68, stiffness: 300, damping: 30, useNativeDriver: false }).start();
          if (confirm) {
            try {
              await confirm();
            } catch {
              // On failure, reset so the rider can retry.
              isAcceptingRef.current = false;
              setIsSuccess(false);
              setProgress(0);
              springFill(0);
              resetHandle();
            }
          }
        } else {
          setProgress(0);
          springFill(0);
          resetHandle();
        }
      },
      onPanResponderTerminate: () => {
        if (isAcceptingRef.current) return;
        setProgress(0);
        springFill(0);
        resetHandle();
      },
    }),
  ).current;

  const labelOpacity = isSuccess ? 0 : disabled ? 0.5 : Math.max(0, 1 - progress * 2.2);
  const fillColor = FILL[color] || color;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, shadow('lg')]}
      accessibilityRole="adjustable"
      accessibilityLabel={disabled ? 'Action Locked' : label}
      accessibilityActions={[{ name: 'activate', label }]}
      onAccessibilityAction={async () => {
        if (disabled || isSuccess || isAcceptingRef.current) return;
        isAcceptingRef.current = true;
        setIsSuccess(true);
        springFill(1);
        try {
          await onConfirm?.();
        } catch {
          isAcceptingRef.current = false;
          setIsSuccess(false);
          springFill(0);
        }
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            backgroundColor: fillColor,
            opacity: disabled ? 0 : 1,
            width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
      <View pointerEvents="none" style={styles.labelWrap}>
        <Text numberOfLines={1} style={[styles.label, { opacity: labelOpacity }]}>
          {disabled ? 'Action Locked' : label}
        </Text>
      </View>
      {isSuccess ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.labelWrap, { opacity: successAnim, transform: [{ scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}
        >
          <Text numberOfLines={1} style={[styles.label, styles.successLabel]}>
            {successLabel}
          </Text>
        </Animated.View>
      ) : null}
      <Animated.View
        {...responder.panHandlers}
        style={[
          styles.handle,
          shadow('xl'),
          { backgroundColor: disabled ? tw.gray200 : tw.white, transform: [{ translateX: x }] },
        ]}
      >
        <ChevronRight
          size={32}
          color={disabled ? tw.gray400 : isSuccess ? tw.primary : tw.gray950}
          style={isSuccess ? { transform: [{ scale: 1.1 }] } : undefined}
        />
      </Animated.View>
    </View>
  );
}

export default ActionSlider;

const styles = StyleSheet.create({
  track: { width: '100%', height: 68, borderRadius: 999, padding: PAD, overflow: 'hidden', backgroundColor: tw.gray950 },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 999 },
  labelWrap: { ...StyleSheet.absoluteFill, paddingHorizontal: 64, alignItems: 'center', justifyContent: 'center' },
  // font-extrabold: Sora, and the theme's .01em letter-spacing beats tracking-[0.16em].
  label: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 12,
    textTransform: 'uppercase',
    textAlign: 'center',
    ...display(800, 12),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  successLabel: { fontSize: 14, lineHeight: 14, ...display(800, 14), textShadowColor: 'rgba(0,0,0,0.25)' },
  handle: { width: HANDLE, height: HANDLE, borderRadius: 28, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
});
