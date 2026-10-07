import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { subscribeConfirm } from '../lib/notify';
import { color, elevation, radii, space, type } from '../theme';
import { useAnimatedValue } from '../lib/useAnimatedValue';

/*
 * Generic confirm dialog for lib/notify confirm(). Styled as the delivery
 * module's own popups (rounded-3xl white card, black/60 backdrop).
 */
export function ConfirmModalContainer() {
  const [req, setReq] = useState(null);
  const anim = useAnimatedValue(0);

  useEffect(() => subscribeConfirm((r) => setReq(r)), []);
  useEffect(() => {
    if (req) Animated.spring(anim, { toValue: 1, damping: 25, stiffness: 300, useNativeDriver: true }).start();
    else anim.setValue(0);
  }, [req, anim]);

  const finish = (value) => {
    req?.resolve(value);
    setReq(null);
  };

  return (
    <Modal visible={Boolean(req)} transparent animationType="fade" onRequestClose={() => finish(false)} statusBarTranslucent>
      <View style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={() => finish(false)} accessibilityLabel="Dismiss" />
        <Animated.View
          style={[
            styles.card,
            {
              opacity: anim,
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
            },
          ]}
        >
          <Text style={styles.title}>{req?.title}</Text>
          {req?.message ? <Text style={styles.message}>{req.message}</Text> : null}
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => finish(false)}
              style={({ pressed }) => [styles.btn, styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>{req?.cancelText}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => finish(true)}
              style={({ pressed }) => [styles.btn, { backgroundColor: req?.destructive ? color.danger : color.primary }, pressed && styles.pressed]}
            >
              <Text style={styles.okText}>{req?.confirmText}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: color.overlay },
  card: { width: '100%', maxWidth: 384, backgroundColor: color.bg, borderRadius: radii.xl, borderWidth: 1, borderColor: color.border, padding: space.xxl, ...elevation.float },
  title: { ...type.titleSerif, fontSize: 18, color: color.primary, textAlign: 'center' },
  message: { ...type.body, marginTop: space.sm, color: color.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', gap: space.md, marginTop: space.xxl },
  btn: { flex: 1, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  cancel: { borderWidth: 1.5, borderColor: color.borderStrong, backgroundColor: color.surface },
  cancelText: { ...type.button, color: color.text },
  okText: { ...type.button, color: color.onPrimary },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
