import { useCallback, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { X } from 'lucide-react-native';
import { subscribeToasts } from '../lib/notify';

import { useAnimatedValue } from '../lib/useAnimatedValue';
import { radii, type } from '../theme';

/*
 * The web mounts sonner as <Toaster position="top-center" richColors
 * offset="80px" closeButton />. At <=600 px sonner ignores `offset` and uses
 * its 16 px mobile offset, full width minus 16 px each side. These are
 * sonner's richColors values, its own filled icons, and its toast box:
 * 16 padding, 8 radius, 13 px / 500 text in the system font stack (the
 * toaster sits outside the delivery theme), close button on the top-left.
 */
const ICON_PATHS = {
  success: { vb: '0 0 20 20', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z' },
  error: { vb: '0 0 20 20', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z' },
  info: { vb: '0 0 20 20', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z' },
  warning: { vb: '0 0 24 24', d: 'M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z' },
};
function SonnerIcon({ type, color }) {
  const icon = ICON_PATHS[type];
  if (!icon) return null;
  return (
    <Svg width={16} height={16} viewBox={icon.vb}>
      <Path d={icon.d} fill={color} fillRule="evenodd" clipRule="evenodd" />
    </Svg>
  );
}
const RICH = {
  default: { bg: '#FFFFFF', border: '#EDEDED', text: '#171717' },
  success: { bg: '#ECFDF3', border: '#BFFCD9', text: '#008A2E' },
  error: { bg: '#FFF0F0', border: '#FFE0E1', text: '#E60000' },
  info: { bg: '#F0F8FF', border: '#D3E0FD', text: '#0973DC' },
  warning: { bg: '#FFFCF0', border: '#FDF5D3', text: '#DC7609' },
};
const MAX_VISIBLE = 3;

function ToastItem({ item, index, onClose }) {
  const anim = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    const t = setTimeout(() => onClose(item.id), item.duration);
    return () => clearTimeout(t);
  }, [anim, item.id, item.duration, item.message, onClose]);

  const c = RICH[item.type] || RICH.default;
  if (item.type === 'custom') {
    return (
      <Animated.View
        accessibilityRole="alert"
        style={[
          { zIndex: 10 - index, alignSelf: 'center' },
          index > 0 && { position: 'absolute', top: index * 14 },
          { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }, { scale }] },
        ]}
      >
        {item.render(() => onClose(item.id))}
      </Animated.View>
    );
  }
  // Sonner stacks older toasts behind the newest, scaled and offset.
  const scale = 1 - index * 0.05;
  return (
    <Animated.View
      accessibilityRole="alert"
      style={[
        styles.toast,
        { backgroundColor: c.bg, borderColor: c.border, zIndex: 10 - index },
        index > 0 && { position: 'absolute', top: index * 14 },
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }, { scale }],
        },
      ]}
    >
      <SonnerIcon type={item.type} color={c.text} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: c.text }]}>{item.message}</Text>
        {item.description ? <Text style={[styles.desc, { color: c.text }]}>{item.description}</Text> : null}
      </View>
      {item.action ? (
        // sonner's action button: text colour as background, 24 px tall, 12 px / 500.
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            item.action.onClick?.();
            onClose(item.id);
          }}
          style={[styles.action, { backgroundColor: c.text }]}
        >
          <Text style={[styles.actionText, { color: c.bg }]}>{item.action.label}</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => onClose(item.id)}
        accessibilityRole="button"
        accessibilityLabel="Close toast"
        hitSlop={14}
        style={[styles.close, { borderColor: c.border, backgroundColor: c.bg }]}
      >
        <X size={10} color={c.text} strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);

  useEffect(
    () =>
      subscribeToasts((evt) => {
        if (evt.kind === 'dismiss') {
          setItems((list) => (evt.id == null ? [] : list.filter((t) => t.id !== evt.id)));
          return;
        }
        // Reusing an id replaces that toast, as sonner does.
        setItems((list) => [evt.toast, ...list.filter((t) => t.id !== evt.toast.id)].slice(0, MAX_VISIBLE));
      }),
    [],
  );

  const close = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), []);
  if (!items.length) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 16 }]}>
      {items.map((t, i) => (
        <ToastItem key={t.id} item={t} index={i} onClose={close} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 9999 },
  toast: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: '0 8px 24px -6px rgba(16,24,40,0.22)',
  },
  body: { flex: 1, gap: 1 },
  action: { height: 24, paddingHorizontal: 8, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  actionText: { ...type.label },
  // App text family, 15 px: toasts carry errors a rider must read on the move.
  title: { ...type.bodyStrong },
  desc: { ...type.small, opacity: 0.9 },
  close: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
