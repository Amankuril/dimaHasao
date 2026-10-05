import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../components/Img';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { CategoryCard, PromoBanner, QuickLinksGrid, SearchBar, WhyVisitGrid } from '../../components/dh/home';
import { useBooking } from '../../context/BookingContext';
import { confirm } from '../../lib/notify';
import { webAsset } from '../../lib/webAsset';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { cinzel, dh, montserrat, playfair, poppins, shadow, tw } from '../../theme';

// Web: DimaHasao/pages/HomeScreen.jsx (/app). Signed-out visitors go to /app/login.

const HERO_SLIDES = [
  { id: 1, image: '/carousal-2.png', alt: 'Dima Hasao Landmark Gate' },
  { id: 2, image: '/carousal-3.png', alt: 'I Love Dima Hasao Mountain Viewpoint' },
];

const JUTHAI = [
  ['J', '#FF4D4D'], ['U', '#FFCC00'], ['T', '#33CC66'], ['H', '#3399FF'], ['A', '#9966FF'], ['I', '#CC66FF'], ['!', '#FF3399'],
];

function Hero() {
  const insets = useSafeAreaInsets();
  const { setIsNotificationsOpen } = useBooking();
  const [index, setIndex] = useState(0);
  const fade = useAnimatedValue(1);
  const pulse = useAnimatedValue(1);

  useEffect(() => {
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [index, fade]);

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

  return (
    <View style={[styles.hero, { height: 340 + insets.top }]}>
      <Animated.Image
        source={{ uri: webAsset(HERO_SLIDES[index].image) }}
        accessibilityLabel={HERO_SLIDES[index].alt}
        style={[StyleSheet.absoluteFill, { opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) }] }]}
        resizeMode="cover"
      />
      <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.3)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={styles.dots}>
        {HERO_SLIDES.map((slide, i) => (
          <Press key={slide.id} scale={1} onPress={() => setIndex(i)} accessibilityLabel={`Go to slide ${i + 1}`} hitSlop={8}>
            <View style={[styles.dot, i === index && styles.dotActive]} />
          </Press>
        ))}
      </View>

      <View style={[styles.brand, { top: 16 + insets.top }]}>
        <Press scale={0.97} onPress={() => router.navigate('/app/places')} accessibilityLabel="Dima Hasao Tourism">
          <Image source={require('../../../assets/images/user-logo.png')} style={styles.brandLogo} resizeMode="contain" />
        </Press>
        <View>
          <View style={{ flexDirection: 'row' }}>
            {JUTHAI.map(([ch, color]) => (
              <Text key={ch} style={[styles.juthai, { color }]}>{ch}</Text>
            ))}
          </View>
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeLine} />
            <Text style={styles.welcome}>WELCOME TO</Text>
            <View style={styles.welcomeLine} />
          </View>
          <Text style={styles.district}>DIMA HASAO</Text>
          <Text style={styles.tagline}>Explore • Experience • Discover</Text>
        </View>
      </View>

      <View style={[styles.topBar, { top: 14 + insets.top }]} pointerEvents="box-none">
        <Press scale={0.9} onPress={() => router.navigate('/app/more')} accessibilityLabel="Open Navigation Menu" style={styles.roundBtn}>
          <Fa name="fa-solid fa-bars" size={14} color="#fff" />
        </Press>
        <Press scale={0.9} onPress={() => setIsNotificationsOpen(true)} accessibilityLabel="View Notifications" style={styles.roundBtn}>
          <Fa name="fa-solid fa-bell" size={14} color="#fff" />
          <Animated.View style={[styles.bellDot, { opacity: pulse }]} />
        </Press>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useBooking();
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
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Hero />
      <SearchBar />

      <View style={{ gap: 16, paddingTop: 12 }}>
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <CategoryCard
              title="TOURIST PLACES"
              subtitle={'Scenic Spots &\nHidden Trails'}
              icon="fa-solid fa-location-dot"
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuDNCBOtk-v5CpAuzZ1kd7mndMkJZKKwMy00a2zicQ0HpEEfpw427eAibYCSi2nD2wHFUkrbD1pzwIzejGOFn5WqC6zu_oE1z2PO5Z2B1LMuzEvrGDcapXZ2xU8jST_VXGR9TxKd25HsrNfffLqEY_Xm1289lDT9d4F7I68sPPhKOmC33cLzcrcIo7RfCXTsf-KCLrE92u-ebldONSuUSfat64_5N4AFn8Z0bfjeYXSmC8Y2I5u8t3g1"
              buttonText="Explore Places"
              buttonBg="#044E29"
              gradient={['#10B981', '#059669', '#044E29']}
              overlay="#059669"
              onPress={() => router.navigate('/app/places')}
            />
            <CategoryCard
              title="TAXI / AUTO"
              subtitle={'Book Your Ride,\nTravel with Ease'}
              icon="fa-solid fa-car"
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuDCJDblprWgYBvh1_FLMSBqIvOXSdwgS_fPcH_MyWvag50_LwhLZums5qzaDWSIT0HbG0SJMToG7JpPvejlX3Qy5bLkCG38QZIqu5mBcSGP2wl3HGzM_X0PCK0xdHmNkET-dGu7TRc-monu00rabiXzQRo3EhbHNOkDMNkXrPK1awEDEd4ZGfwJUS4cVNDcKYVkqKl3pjgKMkPrLtYQA-IL07hjQc-c-KZlD6NT-lo8WH27nCiKI8JN"
              buttonText="Book Ride"
              buttonBg="#EA580C"
              gradient={['#F59E0B', '#EA580C', '#C2410C']}
              overlay="#EA580C"
              onPress={() => router.navigate('/taxi/user')}
            />
          </View>
          <View style={styles.gridRow}>
            <CategoryCard
              title="HOTELS & STAYS"
              subtitle={'Resorts, Cottages\n& Homestays'}
              icon="fa-solid fa-hotel"
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuDu5Pbf3ToUuNDG3Ykr_oqb6a2-hh7vSE60pCjbagFjqrigh7ETKBYtUYP7bOC8sCPqF0oHQXdi1TbZ6LCZblOychxaZYt5SDhg9YBw8bMVPI1wmeURSYs_MNOhhGyoCRPAC9-VGTQdSfd8KZYlU0HzlecyFoFwn74vcZ8e1vWAXxYQSCHsoElObyZAiJJcMFxfV2a_b6cT4dn9fzfOO2k4ySEorPC6hLD-PnNLxB8w9sDFxhc1j9FU"
              buttonText="Book Stays"
              buttonBg="#6D28D9"
              gradient={['#8B5CF6', '#6D28D9', '#4C1D95']}
              overlay="#6D28D9"
              onPress={() => router.navigate('/app/hotels')}
            />
            <CategoryCard
              title="FOOD & DINING"
              subtitle={'Authentic Dimasa\n& Local Eateries'}
              icon="fa-solid fa-utensils"
              image="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
              buttonText="Order Food"
              buttonBg="#BE123C"
              gradient={['#F43F5E', '#E11D48', '#9F1239']}
              overlay="#E11D48"
              onPress={() => router.navigate('/food/user')}
            />
          </View>
        </View>

        <QuickLinksGrid />

        <View style={{ paddingHorizontal: 12 }}>
          <Press scale={0.98} onPress={() => router.navigate('/app/festivals')} style={styles.festival} accessibilityLabel="Falcon Festival Umrangso 2026. Book Passes">
            <Image source={{ uri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80' }} style={styles.festivalImg} resizeMode="cover" />
            <LinearGradient colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.5)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={styles.festivalBody}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.gala}>OFFICIAL GALA</Text>
                <Text style={styles.festivalDates}>Nov 14 - 17, 2026</Text>
              </View>
              <View>
                <Text style={styles.festivalTitle}>Falcon Festival Umrangso 2026</Text>
                <Text style={styles.festivalDesc}>Live concerts, lake kayaking & Amur Falcon trails.</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                <Text style={styles.festivalPrice}>Passes from ₹250</Text>
                <Text style={styles.festivalBtn}>Book Passes →</Text>
              </View>
            </View>
          </Press>
        </View>

        <View style={{ paddingHorizontal: 12 }}>
          <Press scale={0.98} onPress={() => router.navigate('/app/packages')} style={styles.packages} accessibilityLabel="Guided Treks & Heritage Tours">
            <LinearGradient colors={['#06381E', '#0A4D2B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.packagesKicker}>CURATED EXPEDITIONS</Text>
              <Text style={styles.packagesTitle}>Guided Treks & Heritage Tours</Text>
              <Text style={styles.packagesDesc}>All-inclusive private packages from ₹3,600/person</Text>
            </View>
            <View style={styles.packagesArrow}>
              <Fa name="fa-solid fa-arrow-right" size={14} color="#06381E" />
            </View>
          </Press>
        </View>

        <PromoBanner />
        <WhyVisitGrid />
      </View>
    </ScrollView>
  );
}

const textShadow = { textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 };

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: dh.bg },
  hero: { width: '100%', overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, backgroundColor: dh.nav },
  dots: { position: 'absolute', bottom: 24, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotActive: { width: 24, backgroundColor: tw.amber400 },
  topBar: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(6,56,30,0.9)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', ...shadow('lg') },
  bellDot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: tw.red500, borderWidth: 2, borderColor: '#fff' },
  brand: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  brandLogo: { width: 100, height: 100 },
  juthai: { fontSize: 24, lineHeight: 24, letterSpacing: 0.6, ...poppins(900), ...textShadow },
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
  welcomeLine: { height: 1.5, width: 20, backgroundColor: tw.amber400 },
  welcome: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, color: tw.amber200, ...cinzel(), ...textShadow },
  district: { fontSize: 24, lineHeight: 24, letterSpacing: -0.6, color: '#fff', ...montserrat(900), ...textShadow },
  tagline: { fontSize: 11, lineHeight: 16.5, marginTop: 2, color: tw.amber100, ...playfair(600, true), ...textShadow },
  grid: { paddingHorizontal: 12, gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
  festival: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(202,168,62,0.5)', backgroundColor: '#000', ...shadow('md') },
  festivalImg: { width: '100%', height: 144, opacity: 0.8 },
  festivalBody: { ...StyleSheet.absoluteFillObject, padding: 14, justifyContent: 'space-between' },
  gala: { backgroundColor: tw.red600, color: '#fff', fontSize: 9.5, lineHeight: 14, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, letterSpacing: 0.5, overflow: 'hidden', ...poppins(700) },
  festivalDates: { fontSize: 10, lineHeight: 15, color: tw.amber300, ...poppins(700) },
  festivalTitle: { fontSize: 14, lineHeight: 20, color: '#fff', ...montserrat(700) },
  festivalDesc: { fontSize: 10.5, lineHeight: 15.75, color: tw.gray200, ...poppins(400) },
  festivalPrice: { fontSize: 11, lineHeight: 16.5, color: tw.amber400, ...poppins(700) },
  festivalBtn: { backgroundColor: tw.amber400, color: tw.emerald950, fontSize: 10, lineHeight: 15, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', ...poppins(900) },
  packages: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: dh.border, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  packagesKicker: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: tw.amber300, ...poppins(700) },
  packagesTitle: { fontSize: 14, lineHeight: 20, color: '#fff', ...montserrat(700) },
  packagesDesc: { fontSize: 11, lineHeight: 16.5, color: tw.emerald100, ...poppins(400) },
  packagesArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.amber400, alignItems: 'center', justifyContent: 'center', ...shadow('md') },
});
