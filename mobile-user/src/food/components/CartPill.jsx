import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import Image from '../../components/Img';
import { Press } from '../../components/ui';
import { useCart } from '../context/CartContext';
import { useProfile } from '../context/ProfileContext';
import { navigateTo } from '../../lib/webRouter';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { poppins, shadow } from '../../theme';

const DISH_FALLBACK = require('../../../assets/food/dish_fallback.webp');

function Thumb({ item, index }) {
  const [failed, setFailed] = useState(false);
  const uri = item?.image || item?.product?.imageUrl || item?.imageUrl;
  return (
    <View style={[styles.thumb, index > 0 ? { marginLeft: -16 } : null]}>
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
export default function CartPill({ bottomOffset = 96, linkTo = '/food/user/cart' }) {
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
      <Press scale={0.97} onPress={() => navigateTo(isTakeaway ? '/food/user/cart' : linkTo, { state: { from: pathname } })} accessibilityLabel={`${isTakeaway ? 'Takeaway cart' : 'View cart'}, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`} style={styles.pillShadow}>
        <LinearGradient colors={['#06381e', '#0a4d2b', '#06381e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pill}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {thumbs.map((item, idx) => (
              <Thumb key={item?.product?.id || item?.id || `thumb-${idx}`} item={item} index={idx} />
            ))}
          </View>
          <View>
            <Text style={styles.title}>{isTakeaway ? 'Takeaway Cart' : 'View cart'}</Text>
            <Text style={styles.count}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
          <View style={styles.arrow}>
            <ChevronRight size={14} color="#fff" strokeWidth={2.5} />
          </View>
        </LinearGradient>
      </Press>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, zIndex: 50 },
  pillShadow: { borderRadius: 999, ...shadow('0 10px 25px rgba(10,77,43,0.3)') },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(10,77,43,0.3)' },
  thumb: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', overflow: 'hidden', backgroundColor: '#fff' },
  title: { fontSize: 12, lineHeight: 15, color: '#fff', ...poppins(700) },
  count: { fontSize: 10, lineHeight: 12.5, color: 'rgba(255,255,255,0.95)', ...poppins(500) },
  arrow: { marginLeft: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, padding: 4 },
});
