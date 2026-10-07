import { useEffect } from 'react';
import { Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import Image from '../../../components/Img';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import { SectionHeader } from '../../../components/ds';
import { Header, PatternDivider } from '../../../components/dh/Header';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { Pulse, StateBlock, dhs } from '../../../components/dh/ui';
import { fetchFestivals } from '../../../api/dh/festivalApi';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { color, elevation, radii, space, type } from '../../../theme';

// Web: DimaHasao/pages/FestivalListScreen.jsx (/app/festivals)

/** Cheapest live pass, so "From ₹x" cannot quote a sold-out tier. */
const cheapestPrice = (fest) => {
  const live = fest.ticketCategories.filter((c) => !c.isSoldOut);
  const pool = live.length ? live : fest.ticketCategories;
  return pool.length ? Math.min(...pool.map((c) => c.price)) : 0;
};

function PulseBadge({ children }) {
  const pulse = useAnimatedValue(1);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[styles.mega, { opacity: pulse }]}>{children}</Animated.View>;
}

export default function FestivalListScreen() {
  const insets = useSafeAreaInsets();
  const { data: festivals = [], isPending: loading, error, refetch, isRefetching } = useQuery({ queryKey: ['festivals'], queryFn: () => fetchFestivals() });
  const loadError = error ? error?.response?.data?.message || 'We could not load festivals just now.' : '';

  // The banner spotlights the festival an admin marked "Featured"; optional.
  const featured = festivals.find((f) => f.isFeatured) || null;

  if (loading) {
    return (
      <View style={dhs.page}>
        <Header title="FESTIVALS & EVENTS" subtitle="Loading what's on" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <View style={{ padding: space.lg, gap: space.lg }} accessibilityLabel="Loading festivals">
          <Pulse style={{ height: 220, borderRadius: radii.xl }} />
          {[0, 1].map((n) => (
            <View key={n} style={[dhs.panel, { padding: space.md, flexDirection: 'row', gap: space.md }]}>
              <Pulse style={{ width: 96, height: 96, borderRadius: radii.md }} />
              <View style={{ flex: 1, gap: space.sm, paddingVertical: space.xs }}>
                <Pulse tone={100} style={{ height: 13, width: '50%' }} />
                <Pulse style={{ height: 16, width: '75%' }} />
                <Pulse tone={100} style={{ height: 13, width: '33%' }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (loadError || !festivals.length) {
    return (
      <View style={dhs.page}>
        <Header title="FESTIVALS & EVENTS" subtitle="Government tourism galas & music fests" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <StateBlock
          card={false}
          icon="fa-solid fa-ticket"
          title={loadError ? "Couldn't load festivals" : 'No festivals on sale right now'}
          text={loadError || 'Check back when the next one is announced.'}
          actionLabel={loadError ? 'Try again' : undefined}
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const header = (
    <View style={{ gap: space.xl, marginBottom: space.md }}>
      {featured ? (
        <Press scale={0.99} onPress={() => router.push(`/app/festivals/${featured.id}`)} style={styles.featured} accessibilityLabel={`${featured.name}, ${featured.dates}. From ₹${cheapestPrice(featured).toLocaleString('en-IN')}. Book now`}>
          <Image source={{ uri: featured.heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(6,28,14,0.5)', 'rgba(6,28,14,0.95)']} style={StyleSheet.absoluteFill} />
          <View style={styles.featuredTop}>
            <PulseBadge>
              <Fa name="fa-solid fa-fire-flame-curved" size={12} color={color.onGold} />
              <Text style={styles.megaText}>Official tourism mega event</Text>
            </PulseBadge>
          </View>
          <View style={styles.featuredBody}>
            <View style={[dhs.row, { gap: space.xs + 2 }]}>
              <Fa name="fa-regular fa-calendar" size={14} color={color.goldOnDark} />
              <Text style={styles.featuredDates}>{featured.dates}</Text>
            </View>
            <Text style={styles.featuredName} numberOfLines={2}>
              {featured.name}
            </Text>
            <Text style={styles.featuredVenue} numberOfLines={1}>
              {featured.venue}
            </Text>
            <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm, paddingTop: space.sm }]}>
              <Text style={styles.featuredPrice}>From ₹{cheapestPrice(featured).toLocaleString('en-IN')}</Text>
              <View style={styles.bookNow}>
                <Text style={styles.bookNowText}>Book now</Text>
                <Fa name="fa-solid fa-arrow-right" size={12} color={color.onGold} />
              </View>
            </View>
          </View>
        </Press>
      ) : null}
      <SectionHeader title="Official festivals" style={{ marginBottom: 0 }} />
    </View>
  );

  return (
    <View style={dhs.page}>
      <Header title="FESTIVALS & EVENTS" subtitle="Government tourism galas, harvest carnivals & music fests" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />
      <FlatList
        data={festivals}
        keyExtractor={(fest) => fest.id}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ padding: space.lg, paddingBottom: NAV_CLEARANCE + insets.bottom + space.lg }}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item: fest }) => (
          <Press scale={0.99} onPress={() => router.push(`/app/festivals/${fest.id}`)} style={styles.row} accessibilityLabel={`${fest.name}, ${fest.dates}. From ₹${cheapestPrice(fest).toLocaleString('en-IN')}. Book passes`}>
            <Image source={{ uri: fest.heroImage }} style={styles.rowImg} resizeMode="cover" />
            <View style={{ flex: 1, minWidth: 0, gap: space.sm }}>
              <View style={{ gap: 2 }}>
                <View style={[dhs.row, { gap: space.xs + 2 }]}>
                  <Fa name="fa-regular fa-calendar" size={12} color={color.goldText} />
                  <Text style={styles.rowDates} numberOfLines={1}>
                    {fest.dates}
                  </Text>
                </View>
                <Text style={styles.rowName} numberOfLines={2}>
                  {fest.name}
                </Text>
                <View style={[dhs.row, { gap: space.xs + 2 }]}>
                  <Fa name="fa-solid fa-location-dot" size={12} color={color.primary} />
                  <Text style={styles.rowVenue} numberOfLines={1}>
                    {(fest.venue || '').split(',')[0]}
                  </Text>
                </View>
              </View>
              <View style={styles.rowFoot}>
                <Text style={styles.rowPrice}>From ₹{cheapestPrice(fest).toLocaleString('en-IN')}</Text>
                <View style={styles.rowBtn}>
                  <Text style={styles.rowBtnText}>Book passes</Text>
                </View>
              </View>
            </View>
          </Press>
        )}
      />
    </View>
  );
}

const Separator = () => <View style={{ height: space.md }} />;

const styles = StyleSheet.create({
  featured: { aspectRatio: 4 / 3, maxHeight: 300, borderRadius: radii.xl, overflow: 'hidden', backgroundColor: color.primaryDeep, ...elevation.card },
  featuredTop: { position: 'absolute', top: space.md, left: space.md },
  mega: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, backgroundColor: color.goldBright, paddingHorizontal: space.sm + 2, height: 28, borderRadius: radii.pill },
  megaText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.onGold },
  featuredBody: { position: 'absolute', bottom: space.lg, left: space.lg, right: space.lg, gap: space.xs },
  featuredDates: { ...type.label, color: color.goldOnDark },
  featuredName: { ...type.heading, color: color.textInverse },
  featuredVenue: { ...type.small, color: 'rgba(255,255,255,0.85)' },
  featuredPrice: { ...type.bodyStrong, color: color.goldOnDark, flexShrink: 1 },
  bookNow: { height: 40, paddingHorizontal: space.lg, borderRadius: radii.md, backgroundColor: color.goldBright, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  bookNowText: { ...type.buttonSm, color: color.onGold },
  row: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.md, borderWidth: 1, borderColor: color.border, flexDirection: 'row', gap: space.md, ...elevation.card },
  rowImg: { width: 96, height: 112, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  rowDates: { flex: 1, ...type.caption, color: color.goldText },
  rowName: { ...type.subheading, color: color.text },
  rowVenue: { flex: 1, ...type.caption, color: color.textMuted },
  rowFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  rowPrice: { ...type.bodyStrong, color: color.text, flexShrink: 1 },
  rowBtn: { backgroundColor: color.primarySoft, paddingHorizontal: space.md, height: 32, justifyContent: 'center', borderRadius: radii.sm },
  rowBtnText: { ...type.buttonSm, color: color.primary },
});
