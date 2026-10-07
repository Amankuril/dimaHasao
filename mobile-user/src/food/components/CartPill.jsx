import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ShoppingBag } from 'lucide-react-native';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import { useCart } from '../context/CartContext';
import { useProfile } from '../context/ProfileContext';
import { navigateTo } from '../../lib/webRouter';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../theme';

const DISH_FALLBACK = require('../../../assets/food/dish_fallback.webp');

function Thumb({ item, index }) {
  const [failed, setFailed] = useState(false);
  const uri = item?.image || item?.product?.imageUrl || item?.imageUrl;
  return (
    <View style={[styles.thumb, index > 0 ? { marginLeft: -12 } : null]}>
      <Image source={uri && !failed ? { uri } : DISH_FALLBACK} onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

/**
 * Port of components/user/AddToCartAnimation.jsx: the floating "View cart"
 * pill. It springs in with the first item and pulses when the cart changes.
 * (The web also flies the dish thumbnail from the tapped button to the pill
 * using page coordinates; that part has no layout to read here.)
 */
export default function CartPill({ bottomOffset = NAV_CLEARANCE, linkTo = '/food/user/cart' }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { items, itemCount, total } = useCart();
  const { orderType } = useProfile();
  const isTakeaway = orderType === 'takeaway';
  const visible = itemCount > 0;
  const [mounted, setMounted] = useState(visible);
  const enter = useAnimatedValue(visible ? 1 : 0);
  const pulse = useAnimatedValue(1);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(enter, { toValue: 1, stiffness: 400, damping: 30, mass: 0.8, useNativeDriver: true }).start();
    } else {
      Animated.timing(enter, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => finished && setMounted(false));
    }
  }, [visible, enter]);

  useEffect(() => {
    if (!visible) return;
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 150, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1.04, duration: 100, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [itemCount, total, visible, pulse]);

  if (!mounted) return null;
  const thumbs = (Array.isArray(items) ? items : []).slice(-3).reverse().filter((item) => item && typeof item === 'object');

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: bottomOffset + insets.bottom, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }, { scale: Animated.multiply(enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }), pulse) }] },
      ]}
    >
      <Press
        scale={0.97}
        onPress={() => navigateTo(isTakeaway ? '/food/user/cart' : linkTo, { state: { from: pathname } })}
        accessibilityRole="button"
        accessibilityLabel={`${isTakeaway ? 'Takeaway cart' : 'View cart'}, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
        style={styles.pill}
      >
        {thumbs.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {thumbs.map((item, idx) => (
              <Thumb key={item?.product?.id || item?.id || `thumb-${idx}`} item={item} index={idx} />
            ))}
          </View>
        ) : (
          <ShoppingBag size={20} color={color.goldOnDark} />
        )}
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{isTakeaway ? 'Takeaway cart' : 'View cart'}</Text>
          <Text style={styles.count} numberOfLines={1}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <View style={styles.arrow}>
          <ChevronRight size={16} color={color.onGold} strokeWidth={2.5} />
        </View>
      </Press>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.sm, zIndex: 50 },
  pill: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.md, paddingRight: space.sm, paddingVertical: space.sm,
    borderRadius: radii.pill, backgroundColor: color.primary, borderWidth: 1, borderColor: color.primaryPressed, ...elevation.float,
  },
  thumb: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: color.surface, overflow: 'hidden', backgroundColor: color.surface },
  title: { ...type.label, color: color.onPrimary },
  count: { ...type.caption, color: color.textOnDarkMuted },
  arrow: { width: 32, height: 32, borderRadius: 16, marginLeft: space.xs, backgroundColor: color.goldBright, alignItems: 'center', justifyContent: 'center' },
});
