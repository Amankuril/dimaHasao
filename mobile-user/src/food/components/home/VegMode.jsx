import { useEffect } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { Button } from '../../../components/ds';
import { color, elevation, radii, space, type } from '../../../theme';

function Radio({ label, checked, onPress }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked }} accessibilityLabel={label} style={styles.radioRow}>
      <View style={[styles.radio, checked ? { borderColor: color.primary } : null]}>
        {checked ? <View style={styles.radioDot} /> : null}
      </View>
      <Text style={styles.radioText}>{label}</Text>
    </Press>
  );
}

/** "See veg dishes from" popover anchored under the Veg Mode switch. */
export function VegModePopup({ visible, position, vegModeOption, setVegModeOption, onDismiss, onApply }) {
  const { width } = useWindowDimensions();
  const scale = useAnimatedValue(0.8);
  const fade = useAnimatedValue(0);
  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.8);
    fade.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, damping: 22, stiffness: 380, mass: 0.7, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, fade]);
  const popupWidth = Math.min(width - 32, 320);

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={onDismiss}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: color.overlay }]} onPress={onDismiss} accessibilityLabel="Close veg mode options" />
      <Animated.View style={[styles.popup, { top: position.top, left: position.left, width: popupWidth, opacity: fade, transform: [{ scale }] }]}>
        <View style={[styles.triangle, { left: position.triangleLeft - 6 }]} />
        <Text style={styles.popupTitle} accessibilityRole="header">See veg dishes from</Text>
        <View style={{ gap: space.xs, marginBottom: space.lg }}>
          <Radio label="All restaurants" checked={vegModeOption === 'all'} onPress={() => setVegModeOption('all')} />
          <Radio label="Pure Veg restaurants only" checked={vegModeOption === 'pure-veg'} onPress={() => setVegModeOption('pure-veg')} />
        </View>
        <Button title="Apply" accessibilityLabel="Apply veg mode" onPress={onApply} />
      </Animated.View>
    </Modal>
  );
}

export function SwitchOffVegDialog({ visible, onKeep, onSwitchOff }) {
  return (
    <Dialog visible={visible} onClose={onKeep} backdrop={color.overlay} panelStyle={styles.switchOff}>
      <View style={styles.warn}>
        <AlertCircle size={32} color={color.warning} strokeWidth={2.25} />
      </View>
      <Text style={styles.switchTitle} accessibilityRole="header">Switch off veg mode?</Text>
      <Text style={styles.switchBody}>You&apos;ll see all restaurants, including those serving non-veg dishes</Text>
      <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
        <Button title="Switch off" variant="outline" accessibilityLabel="Switch off veg mode" onPress={onSwitchOff} />
        <Button title="Keep using this mode" variant="primary" accessibilityLabel="Keep using veg mode" onPress={onKeep} />
      </View>
    </Dialog>
  );
}

function Ripple({ delay }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 2500, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        styles.ripple,
        { opacity: v.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0, 0.4, 0.2, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 600 / 112] }) }] },
      ]}
    />
  );
}

/** Full-screen "100% VEG" interstitial shown for two seconds after Apply. */
export function ApplyingVegOverlay({ visible }) {
  const badge = useAnimatedValue(0);
  useEffect(() => {
    if (!visible) return;
    badge.setValue(0);
    Animated.spring(badge, { toValue: 1, stiffness: 200, damping: 15, mass: 1, delay: 100, useNativeDriver: true }).start();
  }, [visible, badge]);
  return (
    <Modal visible={visible} transparent={false} statusBarTranslucent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.full} accessibilityRole="progressbar" accessibilityLabel="Switching on veg mode">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Ripple key={i} delay={i * 150} />
        ))}
        <Animated.View style={[styles.vegBadge, { opacity: badge, transform: [{ scale: badge }] }]}>
          <Text style={styles.vegBadgeText}>100%</Text>
          <Text style={[styles.vegBadgeText, { fontSize: 20, lineHeight: 24 }]}>Veg</Text>
        </Animated.View>
        <Text style={styles.fullText}>Explore veg dishes from all restaurants</Text>
      </View>
    </Modal>
  );
}

function Spin({ size, duration, reverse, style }) {
  const v = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: 'transparent' },
        style,
        { transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', reverse ? '-360deg' : '360deg'] }) }] },
      ]}
    />
  );
}

export function SwitchingOffVegOverlay({ visible }) {
  return (
    <Modal visible={visible} transparent={false} statusBarTranslucent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.full} accessibilityRole="progressbar" accessibilityLabel="Switching off veg mode">
        <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: space.xxl }}>
          <Spin size={64} duration={1500} style={{ borderTopColor: color.primary, borderRightColor: color.primary }} />
          <Spin size={48} duration={1000} reverse style={{ borderRightColor: color.gold }} />
        </View>
        <Text style={styles.switching}>Switching off</Text>
        <Text style={styles.switching}>veg mode for you</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  popup: { position: 'absolute', backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, padding: space.lg, ...elevation.float },
  triangle: { position: 'absolute', top: -6, width: 12, height: 12, backgroundColor: color.surface, transform: [{ rotate: '45deg' }] },
  popupTitle: { ...type.subheading, color: color.text, marginBottom: space.sm },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44, paddingHorizontal: space.xs, borderRadius: radii.sm },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: color.borderStrong, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  radioText: { ...type.body, color: color.text, flexShrink: 1 },

  switchOff: { width: '88%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.lg, padding: space.xxl, alignItems: 'center', ...elevation.sheet },
  warn: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.warningSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  switchTitle: { ...type.heading, color: color.text, textAlign: 'center', marginBottom: space.sm },
  switchBody: { ...type.body, color: color.textSecondary, textAlign: 'center', marginBottom: space.xxl },

  full: { flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' },
  // The veg green here is the FSSAI veg meaning ("100% veg").
  ripple: { position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 1, borderColor: color.veg },
  vegBadge: { width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: color.veg, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', ...elevation.card },
  vegBadgeText: { ...type.priceLg, fontSize: 28, lineHeight: 32, color: color.veg },
  fullText: { position: 'absolute', top: '50%', marginTop: 96, left: space.lg, right: space.lg, ...type.heading, fontFamily: 'Poppins_400Regular', color: color.text, textAlign: 'center' },
  switching: { ...type.heading, fontFamily: 'Poppins_400Regular', color: color.text, textAlign: 'center' },
});
