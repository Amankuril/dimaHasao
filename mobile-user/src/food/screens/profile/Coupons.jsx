import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { ArrowLeft, Copy, MapPin, TicketPercent } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { toast } from '../../../lib/notify';
import { navigateTo } from '../../../lib/webRouter';
import { restaurantAPI } from '../../../api/food';
import { poppins, shadow, tw } from '../../../theme';

const ROADS = [
  ['M 20 100 Q 50 80, 80 100 T 140 100', '#a1a1aa', 4],
  ['M 100 20 Q 100 50, 100 80 T 100 140', '#a1a1aa', 4],
  ['M 40 40 Q 60 60, 80 80 T 120 120', '#b4b4b8', 3],
  ['M 160 40 Q 140 60, 120 80 T 80 120', '#b4b4b8', 3],
  ['M 30 170 Q 50 150, 70 130 T 110 90', '#b4b4b8', 3],
  ['M 170 170 Q 150 150, 130 130 T 90 90', '#b4b4b8', 3],
  ['M 50 50 L 70 70', '#c4c4c7', 2],
  ['M 150 50 L 130 70', '#c4c4c7', 2],
  ['M 50 150 L 70 130', '#c4c4c7', 2],
  ['M 150 150 L 130 130', '#c4c4c7', 2],
];

function Coin({ style }) {
  return (
    <LinearGradient colors={[tw.yellow400, tw.yellow500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.coin, shadow('lg'), style]} />
  );
}

function EmptyIllustration() {
  const size = 256;
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg style={[StyleSheet.absoluteFill, { opacity: 0.7 }]} width={size} height={size} viewBox="0 0 200 200" fill="none">
        {ROADS.map(([d, stroke, w]) => (
          <Path key={d} d={d} stroke={stroke} strokeWidth={w} fill="none" strokeLinecap="round" />
        ))}
      </Svg>
      <View style={[styles.pin, { left: 48, top: 64 }]}>
        <MapPin size={28} color={tw.red500} fill={tw.red500} />
      </View>
      <View style={[styles.pin, { right: 48, top: 80 }]}>
        <MapPin size={28} color={tw.red500} fill={tw.red500} />
      </View>

      <View style={{ width: 96, height: 96, zIndex: 10 }}>
        <View style={{ position: 'absolute', left: -40, top: 8, gap: 2 }}>
          <Coin />
          <Coin style={{ marginLeft: -4 }} />
          <Coin style={{ marginLeft: -8 }} />
        </View>
        <View style={{ marginTop: 16 }}>
          <LinearGradient colors={[tw.amber800, tw.amber900]} style={[styles.chest, shadow('xl')]}>
            <LinearGradient colors={[tw.amber900, tw.amber950]} style={[styles.lid, shadow('md')]} />
            <View style={[styles.strap, { top: 12 }]} />
            <View style={[styles.strap, { bottom: 12 }]} />
            <View style={styles.chestLine} />
            <LinearGradient colors={[tw.yellow400, tw.yellow600]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.lock, shadow('lg')]}>
              <View style={styles.lockDot} />
            </LinearGradient>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

/** Port of pages/user/profile/Coupons.jsx. */
export default function Coupons() {
  const { height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await restaurantAPI.getPublicOffers();
        const list = res?.data?.data?.allOffers || res?.data?.allOffers || [];
        if (!cancelled) setOffers(Array.isArray(list) ? list.filter((o) => o?.showInCart !== false) : []);
      } catch {
        if (!cancelled) setOffers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedOffers = useMemo(() => [...offers].sort((a, b) => String(a?.couponCode || '').localeCompare(String(b?.couponCode || ''))), [offers]);

  const handleCopy = async (code) => {
    const value = String(code || '').trim();
    if (!value) return;
    try {
      await Clipboard.setStringAsync(value);
      toast.success('Coupon copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const minH = { minHeight: height * 0.6 };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#faf6ed' }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Press onPress={() => navigateTo('/user/profile')} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={20} color="#000" />
        </Press>
        <Text style={styles.h1}>Your coupons</Text>
      </View>

      {loading ? (
        <View style={[{ alignItems: 'center', justifyContent: 'center' }, minH]}>
          <Text style={styles.loading}>Loading coupons...</Text>
        </View>
      ) : sortedOffers.length > 0 ? (
        <View style={{ gap: 12, paddingBottom: 24 }}>
          {sortedOffers.map((offer) => {
            const code = offer?.couponCode || '';
            const title = offer?.title || '';
            const restaurantName = offer?.restaurantName || 'All Restaurants';
            const endDate = offer?.endDate ? new Date(offer.endDate) : null;
            const expiryText = endDate && !Number.isNaN(endDate.getTime()) ? `Valid till ${endDate.toLocaleDateString()}` : 'No expiry';
            return (
              <View key={offer?.id || offer?.offerId || code} style={styles.offer}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                    <View style={styles.offerIcon}>
                      <TicketPercent size={20} color={tw.orange700} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={styles.code}>{code}</Text>
                        {title ? <Text style={[styles.chip, { backgroundColor: tw.gray100, color: tw.gray700, fontSize: 12, lineHeight: 16 }]}>{title}</Text> : null}
                        {offer.couponType === 'delivery' ? <Text style={[styles.chip, { backgroundColor: tw.emerald100, color: tw.emerald700 }]}>Delivery Only</Text> : null}
                        {offer.couponType === 'takeaway' ? <Text style={[styles.chip, { backgroundColor: tw.orange100, color: tw.orange700 }]}>Takeaway Only</Text> : null}
                      </View>
                      <Text style={styles.rest} numberOfLines={1}>{restaurantName}</Text>
                      <Text style={styles.expiry}>{expiryText}</Text>
                    </View>
                  </View>
                  <Press scale={0.98} onPress={() => handleCopy(code)} accessibilityLabel="Copy" style={styles.copyBtn}>
                    <Copy size={16} color="#2B1B10" style={{ marginRight: 8 }} />
                    <Text style={styles.copyText}>Copy</Text>
                  </Press>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }, minH]}>
          <View style={{ marginBottom: 32 }}>
            <EmptyIllustration />
          </View>
          <View style={{ alignItems: 'center', gap: 12, maxWidth: 384 }}>
            <Text style={styles.emptyTitle}>No coupons found</Text>
            <Text style={styles.emptySub}>Discover hidden coupons on your map screen after placing an order</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  back: { height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  h1: { fontSize: 20, lineHeight: 28, color: '#000', ...poppins(700) },
  loading: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  offer: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.gray200, padding: 16 },
  offerIcon: { height: 40, width: 40, borderRadius: 12, backgroundColor: tw.orange100, alignItems: 'center', justifyContent: 'center' },
  code: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  chip: { fontSize: 10, lineHeight: 15, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', ...poppins(500) },
  rest: { marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  expiry: { marginTop: 4, fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(400) },
  copyBtn: { height: 36, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F3F2EC', backgroundColor: '#fff', ...shadow('xs') },
  copyText: { fontSize: 14, lineHeight: 20, color: '#2B1B10', ...poppins(500) },
  circle: { backgroundColor: tw.gray200, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', alignSelf: 'center' },
  pin: { position: 'absolute', zIndex: 20 },
  coin: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: tw.yellow600 },
  chest: { width: 96, height: 80, borderRadius: 8 },
  lid: { position: 'absolute', top: -12, left: 0, right: 0, height: 20, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  strap: { position: 'absolute', left: 12, width: 64, height: 6, borderRadius: 999, backgroundColor: tw.amber950 },
  chestLine: { position: 'absolute', top: 4, left: 16, width: 64, height: 2, backgroundColor: tw.amber700 },
  lock: { position: 'absolute', top: 20, left: 28, width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: tw.yellow700, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  lockDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: tw.yellow700 },
  emptyTitle: { fontSize: 20, lineHeight: 28, color: '#000', ...poppins(700) },
  emptySub: { fontSize: 14, lineHeight: 22.75, color: tw.gray600, textAlign: 'center', ...poppins(400) },
});
