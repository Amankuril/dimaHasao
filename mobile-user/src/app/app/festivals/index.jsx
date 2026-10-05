import { useEffect } from 'react';
import { Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import Image from '../../../components/Img';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import { Header, PatternDivider } from '../../../components/dh/Header';
import { Pulse, StateBlock, dhs } from '../../../components/dh/ui';
import { fetchFestivals } from '../../../api/dh/festivalApi';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { dh, montserrat, poppins, shadow, tw } from '../../../theme';

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
  const { data: festivals = [], isPending: loading, error, refetch, isRefetching } = useQuery({ queryKey: ['festivals'], queryFn: () => fetchFestivals() });
  const loadError = error ? error?.response?.data?.message || 'We could not load festivals just now.' : '';

  // The banner spotlights the festival an admin marked "Featured"; optional.
  const featured = festivals.find((f) => f.isFeatured) || null;

  if (loading) {
    return (
      <View style={dhs.page}>
        <Header title="FESTIVALS & EVENTS" subtitle="Loading what's on" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <View style={{ padding: 14, gap: 16 }}>
          <Pulse style={{ height: 192, borderRadius: 24 }} />
          {[0, 1].map((n) => (
            <View key={n} style={[dhs.panel, { padding: 14, flexDirection: 'row', gap: 14 }]}>
              <Pulse style={{ width: 96, height: 96, borderRadius: 12 }} />
              <View style={{ flex: 1, gap: 8, paddingVertical: 4 }}>
                <Pulse tone={100} style={{ height: 12, width: '50%' }} />
                <Pulse style={{ height: 14, width: '75%' }} />
                <Pulse tone={100} style={{ height: 12, width: '33%' }} />
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
          actionLabel={loadError ? 'Try Again' : undefined}
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const header = (
    <View style={{ gap: 16, marginBottom: 12 }}>
      {featured ? (
        <Press scale={0.99} onPress={() => router.push(`/app/festivals/${featured.id}`)} style={styles.featured} accessibilityLabel={`${featured.name}. Book now`}>
          <Image source={{ uri: featured.heroImage }} style={styles.featuredImg} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFill} />
          <View style={{ position: 'absolute', top: 12, left: 12 }}>
            <PulseBadge>
              <Fa name="fa-solid fa-fire-flame-curved" size={10} color="#fff" />
              <Text style={styles.megaText}>Official Tourism Mega Event</Text>
            </PulseBadge>
          </View>
          <View style={styles.featuredBody}>
            <View style={[dhs.row, { gap: 6 }]}>
              <Fa name="fa-regular fa-calendar" size={12} color={tw.amber300} />
              <Text style={styles.featuredDates}>{featured.dates}</Text>
            </View>
            <Text style={styles.featuredName}>{featured.name}</Text>
            <Text style={styles.featuredVenue} numberOfLines={1}>{featured.venue}</Text>
            <View style={[dhs.row, { justifyContent: 'space-between', paddingTop: 8 }]}>
              <Text style={styles.featuredPrice}>From ₹{cheapestPrice(featured).toLocaleString('en-IN')}</Text>
              <Text style={styles.bookNow}>Book Now →</Text>
            </View>
          </View>
        </Press>
      ) : null}
      <Text style={[dhs.h3, { paddingHorizontal: 4 }]}>Official Dima Hasao Festivals</Text>
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
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ padding: 14, paddingBottom: 112 }}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item: fest }) => (
          <Press scale={0.99} onPress={() => router.push(`/app/festivals/${fest.id}`)} style={styles.row} accessibilityLabel={`${fest.name}, ${fest.dates}. Book passes`}>
            <Image source={{ uri: fest.heroImage }} style={styles.rowImg} resizeMode="cover" />
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'space-between' }}>
              <View>
                <View style={[dhs.row, { gap: 6 }]}>
                  <Fa name="fa-regular fa-calendar" size={10} color={tw.amber700} />
                  <Text style={styles.rowDates} numberOfLines={1}>{fest.dates}</Text>
                </View>
                <Text style={styles.rowName} numberOfLines={1}>{fest.name}</Text>
                <View style={[dhs.row, { gap: 4, marginTop: 2 }]}>
                  <Fa name="fa-solid fa-location-dot" size={11} color={tw.emerald700} />
                  <Text style={styles.rowVenue} numberOfLines={1}>{(fest.venue || '').split(',')[0]}</Text>
                </View>
              </View>
              <View style={styles.rowFoot}>
                <Text style={styles.rowPrice}>From ₹{cheapestPrice(fest).toLocaleString('en-IN')}</Text>
                <View style={styles.rowBtn}>
                  <Text style={styles.rowBtnText}>Book Passes</Text>
                </View>
              </View>
            </View>
          </Press>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  featured: { borderRadius: 24, overflow: 'hidden', backgroundColor: '#000', ...shadow('md') },
  featuredImg: { width: '100%', height: 192, opacity: 0.8 },
  mega: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tw.red600, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  megaText: { fontSize: 10, lineHeight: 15, color: '#fff', ...poppins(700) },
  featuredBody: { position: 'absolute', bottom: 12, left: 14, right: 14, gap: 4 },
  featuredDates: { fontSize: 11, lineHeight: 16.5, color: tw.amber300, ...poppins(700) },
  featuredName: { fontSize: 16, lineHeight: 20, color: '#fff', ...montserrat(700) },
  featuredVenue: { fontSize: 12, lineHeight: 16, color: tw.gray200, ...poppins(400) },
  featuredPrice: { fontSize: 12, lineHeight: 16, color: tw.amber400, ...poppins(700) },
  bookNow: { backgroundColor: tw.amber400, color: tw.emerald950, fontSize: 12, lineHeight: 16, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', ...poppins(900) },
  row: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: dh.border, flexDirection: 'row', gap: 14, ...shadow('xs') },
  rowImg: { width: 96, height: 96, borderRadius: 12, backgroundColor: tw.gray200 },
  rowDates: { flex: 1, fontSize: 10, lineHeight: 15, color: tw.amber700, ...poppins(700) },
  rowName: { fontSize: 12, lineHeight: 16, color: tw.gray900, marginTop: 2, ...montserrat(700) },
  rowVenue: { flex: 1, fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(400) },
  rowFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: tw.gray100 },
  rowPrice: { fontSize: 12, lineHeight: 16, color: tw.emerald950, ...montserrat(700) },
  rowBtn: { backgroundColor: dh.nav, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rowBtnText: { fontSize: 11, lineHeight: 16.5, color: tw.amber300, ...poppins(700) },
});
