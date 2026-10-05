import { useEffect } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { poppins, shadow, tw } from '../../../theme';
import { F } from '../shell';

function Radio({ label, checked, onPress }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked }} accessibilityLabel={label} style={styles.radioRow}>
      <View style={[styles.radio, checked ? { borderColor: tw.green600, backgroundColor: tw.green600 } : null]}>
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
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} onPress={onDismiss} accessibilityLabel="Close veg mode options" />
      <Animated.View style={[styles.popup, { top: position.top, left: position.left, width: popupWidth, opacity: fade, transform: [{ scale }] }]}>
        <View style={[styles.triangle, { left: position.triangleLeft - 6 }]} />
        <Text style={styles.popupTitle}>See veg dishes from</Text>
        <View style={{ gap: 8, marginBottom: 16 }}>
          <Radio label="All restaurants" checked={vegModeOption === 'all'} onPress={() => setVegModeOption('all')} />
          <Radio label="Pure Veg restaurants only" checked={vegModeOption === 'pure-veg'} onPress={() => setVegModeOption('pure-veg')} />
        </View>
        <Press scale={0.98} onPress={onApply} accessibilityLabel="Apply veg mode" style={styles.apply}>
          <Text style={styles.applyText}>Apply</Text>
        </Press>
      </Animated.View>
    </Modal>
  );
}

export function SwitchOffVegDialog({ visible, onKeep, onSwitchOff }) {
  return (
    <Dialog visible={visible} onClose={onKeep} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.switchOff}>
      <View style={styles.warn}>
        <AlertCircle size={64} color="#fff" strokeWidth={2.5} />
      </View>
      <Text style={styles.switchTitle}>Switch off Veg Mode?</Text>
      <Text style={styles.switchBody}>You&apos;ll see all restaurants, including those serving non-veg dishes</Text>
      <View style={{ gap: 12, alignSelf: 'stretch' }}>
        <Press scale={0.98} onPress={onSwitchOff} accessibilityLabel="Switch off veg mode" style={{ paddingVertical: 4 }}>
          <Text style={[styles.switchBtn, { color: tw.red600 }]}>Switch off</Text>
        </Press>
        <Press scale={0.98} onPress={onKeep} accessibilityLabel="Keep using veg mode" style={{ paddingVertical: 4 }}>
          <Text style={styles.switchBtn}>Keep using this mode</Text>
        </Press>
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
          <Text style={[styles.vegBadgeText, { marginTop: 2 }]}>VEG</Text>
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
        <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Spin size={64} duration={1500} style={{ borderTopColor: tw.pink500, borderRightColor: tw.pink500 }} />
          <Spin size={48} duration={1000} reverse style={{ borderRightColor: tw.pink500 }} />
        </View>
        <Text style={styles.switching}>Switching off</Text>
        <Text style={styles.switching}>Veg Mode for you</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  popup: { position: 'absolute', backgroundColor: '#fff', borderRadius: 16, padding: 16, ...shadow('2xl') },
  triangle: { position: 'absolute', top: -6, width: 12, height: 12, backgroundColor: '#fff', transform: [{ rotate: '45deg' }] },
  popupTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 12, ...poppins(700) },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderRadius: 8 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: tw.gray300, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  radioText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  apply: { backgroundColor: F.green, paddingVertical: 10, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  applyText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) },

  switchOff: { width: '85%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', ...shadow('2xl') },
  warn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(251,44,54,0.9)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  switchTitle: { fontSize: 24, lineHeight: 32, color: tw.gray900, textAlign: 'center', marginBottom: 8, ...poppins(700) },
  switchBody: { fontSize: 14, lineHeight: 20, color: tw.gray600, textAlign: 'center', marginBottom: 24, ...poppins(400) },
  switchBtn: { fontSize: 16, lineHeight: 24, color: tw.gray900, textAlign: 'center', ...poppins(400) },

  full: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 1, borderColor: tw.green300 },
  vegBadge: { width: 112, height: 112, borderRadius: 56, borderWidth: 2, borderColor: tw.green600, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  vegBadgeText: { fontSize: 30, lineHeight: 30, color: tw.green600, ...poppins(800) },
  fullText: { position: 'absolute', top: '50%', marginTop: 96, left: 16, right: 16, fontSize: 20, lineHeight: 28, color: tw.gray800, textAlign: 'center', ...poppins(400) },
  switching: { fontSize: 20, lineHeight: 28, color: tw.gray800, textAlign: 'center', ...poppins(400) },
});
