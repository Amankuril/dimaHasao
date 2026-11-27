import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../components/Img';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchFestivals } from '../../api/dh/festivalApi';
import useNotificationInbox from '../../food/hooks/useNotificationInbox';
import { fetchPackages } from '../../api/dh/toursApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { CategoryCard, PromoBanner, QuickLinksGrid, SearchBar, WhyVisitGrid } from '../../components/dh/home';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { SectionHeader, StatusBadge, fa } from '../../components/ds';
import { useBooking } from '../../context/BookingContext';
import { confirm } from '../../lib/notify';
import { webAsset } from '../../lib/webAsset';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { cinzel, color, elevation, playfair, poppins, radii, space, type } from '../../theme';

// Web: DimaHasao/pages/HomeScreen.jsx (/app). Signed-out visitors go to /app/login.

const HERO_SLIDES = [
  // WebP is ~200 KB against 2.4 MB for the PNG, which left the hero blank for
  // 10+ s on mobile data. The PNG stays as the fallback (a server that has not
  // got the .webp yet).
  { id: 1, image: '/carousal-2.webp', fallback: '/carousal-2.png', alt: 'Dima Hasao Landmark Gate' },
  { id: 2, image: '/carousal-3.webp', fallback: '/carousal-3.png', alt: 'I Love Dima Hasao Mountain Viewpoint' },
];

const JUTHAI = [
  ['J', '#FF4D4D'], ['U', '#FFCC00'], ['T', '#33CC66'], ['H', '#3399FF'], ['A', '#9966FF'], ['I', '#CC66FF'], ['!', '#FF3399'],
];

function Hero() {
  const insets = useSafeAreaInsets();
  const { setIsNotificationsOpen } = useBooking();
  const { unreadCount: unread } = useNotificationInbox('user', { pollMs: 60000 });
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState({});
  const fade = useAnimatedValue(1);

  useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [index, fade]);

  return (
    <View style={[styles.hero, { height: 340 + insets.top }]}>
      <Animated.Image
        source={{ uri: webAsset(failed[index] ? HERO_SLIDES[index].fallback : HERO_SLIDES[index].image) }}
        onError={() => setFailed((prev) => (prev[index] ? prev : { ...prev, [index]: true }))}
        accessibilityLabel={HERO_SLIDES[index].alt}
        style={[StyleSheet.absoluteFill, { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1] }) }] }]}
        resizeMode="cover"
      />
      <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.3)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.dots}>
        {HERO_SLIDES.map((slide, i) => (
          <Press key={slide.id} scale={1} onPress={() => setIndex(i)} accessibilityLabel={`Go to slide ${i + 1}`} accessibilityState={{ selected: i === index }} hitSlop={{ top: 18, bottom: 18, left: 6, right: 6 }}>
            <View style={[styles.dot, i === index && styles.dotActive]} />
          </Press>
        ))}
      </View>

      <View style={[styles.brand, { top: 66 + insets.top }]}>
        <Press scale={0.97} onPress={() => router.navigate('/app/places')} accessibilityLabel="Dima Hasao Tourism">
          <Image source={require('../../../assets/images/user-logo.webp')} style={styles.brandLogo} resizeMode="contain" />
        </Press>
        {/* Takes the rest of the row: shrink-wrapped, Android under-measured the
            italic tagline and letter-spaced "Welcome to" and clipped their last word. */}
        <View style={styles.brandText}>
          <View style={{ flexDirection: 'row' }}>
            {JUTHAI.map(([ch, hue]) => (
              <Text key={ch} style={[styles.juthai, { color: hue }]}>{ch}</Text>
            ))}
          </View>
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeLine} />
            {/* Android's default line breaking under-measures letter-spaced Cinzel and cut "to". */}
            <Text style={styles.welcome} textBreakStrategy="simple" numberOfLines={1}>
              Welcome to
            </Text>
            <View style={styles.welcomeLine} />
          </View>
          <Text style={styles.district}>DIMA HASAO</Text>
          <Text style={styles.tagline}>Explore • Experience • Discover</Text>
        </View>
      </View>

      <View style={[styles.topBar, { top: 14 + insets.top }]} pointerEvents="box-none">
        <Press scale={0.9} onPress={() => router.navigate('/app/more')} accessibilityLabel="Open Navigation Menu" style={styles.roundBtn}>
          <Fa name="fa-solid fa-bars" size={18} color={color.textInverse} />
        </Press>
        <Press scale={0.9} onPress={() => setIsNotificationsOpen(true)} accessibilityLabel="View Notifications" style={styles.roundBtn}>
          <Fa name="fa-solid fa-bell" size={18} color={color.textInverse} />
          {/* Was always on; now only when the inbox has something unread. */}
          {unread > 0 ? <View style={styles.bellDot} /> : null}
        </Press>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useBooking();
  const insets = useSafeAreaInsets();
  const lastBack = useRef(0);

  // Root screen: the wrapper asked before leaving the app.
  useFocusEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Date.now() - lastBack.current < 400) return true;
      lastBack.current = Date.now();
      confirm('Exit App', 'Are you sure you want to exit?', { confirmText: 'Exit', cancelText: 'Cancel' }).then((ok) => ok && BackHandler.exitApp());
      return true;
    });
    return () => sub.remove();
  });

  if (!user.isLoggedIn) return <Redirect href="/app/login" />;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + insets.bottom + space.lg }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Hero />
      <SearchBar />

      <View style={styles.sections}>
        <View style={styles.grid}>
          <SectionHeader plain title="Explore Dima Hasao" style={{ marginBottom: 0 }} />
          <View style={styles.gridRow}>
            <CategoryCard
              title="Tourist places"
              subtitle="Scenic spots & hidden trails"
              icon="fa-solid fa-location-dot"
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuDNCBOtk-v5CpAuzZ1kd7mndMkJZKKwMy00a2zicQ0HpEEfpw427eAibYCSi2nD2wHFUkrbD1pzwIzejGOFn5WqC6zu_oE1z2PO5Z2B1LMuzEvrGDcapXZ2xU8jST_VXGR9TxKd25HsrNfffLqEY_Xm1289lDT9d4F7I68sPPhKOmC33cLzcrcIo7RfCXTsf-KCLrE92u-ebldONSuUSfat64_5N4AFn8Z0bfjeYXSmC8Y2I5u8t3g1"
              buttonText="Explore places"
              onPress={() => router.navigate('/app/places')}
            />
            <CategoryCard
              title="Taxi / Auto"
              subtitle="Book your ride, travel with ease"
              icon="fa-solid fa-car"
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuDCJDblprWgYBvh1_FLMSBqIvOXSdwgS_fPcH_MyWvag50_LwhLZums5qzaDWSIT0HbG0SJMToG7JpPvejlX3Qy5bLkCG38QZIqu5mBcSGP2wl3HGzM_X0PCK0xdHmNkET-dGu7TRc-monu00rabiXzQRo3EhbHNOkDMNkXrPK1awEDEd4ZGfwJUS4cVNDcKYVkqKl3pjgKMkPrLtYQA-IL07hjQc-c-KZlD6NT-lo8WH27nCiKI8JN"
              buttonText="Book a ride"
              onPress={() => router.navigate('/taxi/user')}
            />
          </View>
          <View style={styles.gridRow}>
            <CategoryCard
              title="Hotels & stays"
              subtitle="Resorts, cottages & homestays"
              icon="fa-solid fa-hotel"
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuDu5Pbf3ToUuNDG3Ykr_oqb6a2-hh7vSE60pCjbagFjqrigh7ETKBYtUYP7bOC8sCPqF0oHQXdi1TbZ6LCZblOychxaZYt5SDhg9YBw8bMVPI1wmeURSYs_MNOhhGyoCRPAC9-VGTQdSfd8KZYlU0HzlecyFoFwn74vcZ8e1vWAXxYQSCHsoElObyZAiJJcMFxfV2a_b6cT4dn9fzfOO2k4ySEorPC6hLD-PnNLxB8w9sDFxhc1j9FU"
              buttonText="Book stays"
              onPress={() => router.navigate('/app/hotels')}
            />
            <CategoryCard
              title="Food & dining"
              subtitle="Authentic Dimasa & local eateries"
              icon="fa-solid fa-utensils"
              image="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
              buttonText="Order food"
              onPress={() => router.navigate('/food/user')}
            />
          </View>
        </View>

        <QuickLinksGrid />

        <HappeningSoon />
        <PackagesTeaser />

        <PromoBanner />
        <WhyVisitGrid />
      </View>
    </ScrollView>
  );
}

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/*
 * The next festival from the API. This card used to be hardcoded (Falcon
 * Festival, Nov 14-17, passes from ₹250), so it kept advertising an event
 * after it ended. It hides itself when nothing is coming up.
 */
function HappeningSoon() {
  const { data: festivals = [] } = useQuery({
    queryKey: ['festivals', 'upcoming'],
    queryFn: () => fetchFestivals({ upcoming: 'true' }),
    staleTime: 5 * 60 * 1000,
  });
  const fest = festivals.find((f) => f.isFeatured) || festivals[0];
  if (!fest) return null;
  const prices = fest.ticketCategories.map((c) => c.price).filter((p) => p >= 0);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const label = [fest.name, fest.dates, minPrice != null ? `Passes from ${inr(minPrice)}` : '', fest.bookingOpen ? 'Book passes' : 'View details'].filter(Boolean).join('. ');

  return (
    <View style={styles.gutter}>
      <SectionHeader plain title="Happening soon" />
      <Press scale={0.98} onPress={() => router.navigate(`/app/festivals/${fest.id}`)} style={styles.festival} accessibilityRole="button" accessibilityLabel={label}>
        <Image source={{ uri: fest.heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient colors={['rgba(6,28,14,0.95)', 'rgba(6,28,14,0.7)', 'rgba(6,28,14,0.2)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={styles.festivalBody}>
          <View style={styles.festivalMeta}>
            {fest.isFeatured ? <StatusBadge label="Featured" tone="gold" icon={fa('fa-solid fa-star')} /> : null}
            {fest.dates ? <Text style={styles.festivalDates}>{fest.dates}</Text> : null}
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.festivalTitle} numberOfLines={2}>{fest.name}</Text>
            {fest.tagline ? <Text style={styles.festivalDesc} numberOfLines={2}>{fest.tagline}</Text> : null}
          </View>
          <View style={styles.festivalFoot}>
            <Text style={styles.festivalPrice}>{minPrice != null ? (minPrice === 0 ? 'Free entry' : `Passes from ${inr(minPrice)}`) : ''}</Text>
            <View style={styles.festivalBtn}>
              <Text style={styles.festivalBtnText}>{fest.bookingOpen ? 'Book passes' : 'View details'}</Text>
              <Fa name="fa-solid fa-arrow-right" size={12} color={color.onGold} />
            </View>
          </View>
        </View>
      </Press>
    </View>
  );
}

/** Packages teaser; the "from" price is the cheapest live package, not a fixed ₹3,600. */
function PackagesTeaser() {
  const { data: packages = [] } = useQuery({
    queryKey: ['packages', 'teaser'],
    queryFn: () => fetchPackages(),
    staleTime: 5 * 60 * 1000,
  });
  const prices = packages.map((p) => p.pricePerPerson).filter((p) => p > 0);
  const from = prices.length ? Math.min(...prices) : null;
  const desc = from != null ? `All-inclusive private packages from ${inr(from)}/person` : 'All-inclusive private packages';

  return (
    <View style={styles.gutter}>
      <Press scale={0.98} onPress={() => router.navigate('/app/packages')} style={styles.packages} accessibilityRole="button" accessibilityLabel={`Guided treks and heritage tours. ${desc}`}>
        <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
          <Text style={styles.packagesKicker}>Curated expeditions</Text>
          <Text style={styles.packagesTitle}>Guided treks & heritage tours</Text>
          <Text style={styles.packagesDesc}>{desc}</Text>
        </View>
        <View style={styles.packagesArrow}>
          <Fa name="fa-solid fa-arrow-right" size={18} color={color.onGold} />
        </View>
      </Press>
    </View>
  );
}

// One soft shadow so photo-backed text stays readable; no glow.
const textShadow = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 };

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  hero: { width: '100%', overflow: 'hidden', borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl, backgroundColor: color.primaryDeep },
  dots: { position: 'absolute', bottom: 44, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.sm },
  dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { width: 20, backgroundColor: color.goldBright },
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(6,44,22,0.7)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(202,168,62,0.4)' },
  bellDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: color.danger, borderWidth: 1.5, borderColor: color.primaryDeep },
  brand: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  brandLogo: { width: 84, height: 84 },
  brandText: { flex: 1, minWidth: 0 },
  // The JUTHAI wordmark is a display moment, so it names its weight directly (poppins() clamps at 600).
  juthai: { fontSize: 24, lineHeight: 28, letterSpacing: 0.8, fontFamily: 'Poppins_800ExtraBold', ...textShadow },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  welcomeLine: { height: 1, width: 16, flexShrink: 0, backgroundColor: color.goldBright },
  welcome: { ...cinzel(), fontSize: 12, lineHeight: 16, letterSpacing: 1, paddingRight: 2, flexShrink: 0, color: color.goldOnDark, ...textShadow },
  district: { ...type.heroSerif, fontSize: 26, lineHeight: 32, color: color.textInverse, marginTop: space.xxs, ...textShadow },
  tagline: { ...playfair(400, true), fontSize: 13, lineHeight: 18, marginTop: space.xs, color: color.textOnDarkMuted, ...textShadow },
  sections: { gap: space.xxxl, paddingTop: space.xxl },
  gutter: { paddingHorizontal: space.lg },
  grid: { paddingHorizontal: space.lg, gap: space.md },
  gridRow: { flexDirection: 'row', gap: space.md },
  festival: { height: 176, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.primaryDeep, ...elevation.card },
  festivalBody: { ...StyleSheet.absoluteFill, padding: space.lg, justifyContent: 'space-between' },
  festivalMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  festivalDates: { ...poppins(500), fontSize: 13, lineHeight: 18, color: color.goldOnDark },
  festivalTitle: { ...poppins(600), fontSize: 17, lineHeight: 24, color: color.textInverse },
  festivalDesc: { ...type.small, color: 'rgba(255,255,255,0.85)' },
  festivalFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  festivalPrice: { ...poppins(500), fontSize: 14, lineHeight: 20, color: color.goldOnDark, flexShrink: 1 },
  festivalBtn: { height: 36, paddingHorizontal: space.md, borderRadius: radii.sm, backgroundColor: color.goldBright, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  festivalBtnText: { ...poppins(600), fontSize: 13, lineHeight: 18, color: color.onGold },
  packages: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.primaryDeep, padding: space.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, ...elevation.card },
  packagesKicker: { ...poppins(500), fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase', color: color.goldOnDark },
  packagesTitle: { ...poppins(600), fontSize: 17, lineHeight: 24, color: color.textInverse },
  packagesDesc: { ...type.small, color: 'rgba(255,255,255,0.82)' },
  packagesArrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.goldBright, alignItems: 'center', justifyContent: 'center' },
});
