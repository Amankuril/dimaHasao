import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { subscribeConfirm } from '../lib/notify';
import { display, ff, radius, shadow, tw } from '../theme';
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
              style={({ pressed }) => [styles.btn, { backgroundColor: req?.destructive ? tw.red600 : tw.primary }, pressed && styles.pressed]}
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
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  card: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: radius.xl, padding: 24, ...shadow('2xl') },
  title: { fontSize: 20, lineHeight: 28, color: tw.gray900, textAlign: 'center', ...display(700, 20) },
  message: { marginTop: 8, fontSize: 14, lineHeight: 22, color: tw.gray500, textAlign: 'center', ...ff(500) },
  row: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  cancel: { borderWidth: 2, borderColor: tw.gray200 },
  cancelText: { fontSize: 15, color: tw.gray700, ...ff(700) },
  okText: { fontSize: 15, color: '#fff', ...ff(700) },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
