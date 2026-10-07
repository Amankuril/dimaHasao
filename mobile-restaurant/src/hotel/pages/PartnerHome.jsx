import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, ShieldCheck, Star } from 'lucide-react-native';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerHome.jsx
 * (the partner landing page) at the phone breakpoint. The web's GSAP hero /
 * scroll-reveal animations are desktop-only there (they are skipped under
 * 768px), so none are drawn; the mobile centre-zoom carousel (an
 * IntersectionObserver) is driven by the scroll position.
 */
const CARD_W = 260;
const CARD_GAP = 16;

const STEPS = [
  { title: 'Register', desc: 'Add details in 10 mins', step: '01', img: 'https://images.unsplash.com/photo-1517840901100-8179e982acb7?w=500&auto=format&fit=crop&q=60', tag: 'Fast' },
  { title: 'Verify', desc: 'Instant KYC approval', step: '02', img: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7c1f?w=500&auto=format&fit=crop&q=60', tag: 'Secure' },
  { title: 'List', desc: 'Go live to millions', step: '03', img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=500&auto=format&fit=crop&q=60', tag: 'Global' },
  { title: 'Earn', desc: 'Weekly payouts', step: '04', img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60', tag: 'Easy' },
];

const BENEFITS = [
  { icon: TrendingUp, title: 'Smart Pricing', text: 'AI-driven dynamic pricing to maximize revenue.' },
  { icon: ShieldCheck, title: 'Verified Guests', text: 'ID-verified guests for safety and trust.' },
  { icon: Star, title: 'Marketing Boost', text: 'Premium placement for top-rated properties.' },
];

const PartnerHome = () => {
  const navigate = useNavigate();
  const { width, height } = useWindowDimensions();
  const [active, setActive] = useState(0);

  // The card whose centre is nearest the screen centre is the "active" one (>=70% visible on the web).
  const onCarouselScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const centre = x + width / 2 - 24;
    const idx = Math.max(0, Math.min(STEPS.length - 1, Math.floor(centre / (CARD_W + CARD_GAP))));
    if (idx !== active) setActive(idx);
  };

  return (
    <ScrollView style={styles.page} showsVerticalScrollIndicator={false}>
      {/* 1. HERO SECTION */}
      <View style={[styles.hero, { minHeight: height * 0.6 }]}>
        {/* Abstract Background Elements WITH HD IMAGE */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Img
            source={{ uri: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop' }}
            accessibilityLabel="Hotel Background"
            style={[StyleSheet.absoluteFill, { opacity: 0.2 }]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)', '#ffffff']}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={{ maxWidth: 896, zIndex: 10 }}>
          <Text style={styles.heroTitle}>
            Grow Your Revenue {'\n'}with <Text style={{ color: HT.primary }}>Dima Hasao</Text>
          </Text>
          <Text style={styles.heroSub}>
            List your property. Reach verified guests. Earn up to 30% more. Seamless onboarding in under 10 minutes.
          </Text>
        </View>
      </View>

      {/* 2. HOW IT WORKS (Mobile: Scroll Snap Carousel) */}
      <View style={{ paddingVertical: 48 }}>
        <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
          <Text style={styles.eyebrow}>Process</Text>
          <Text style={styles.h2}>How Dima Hasao Partner Works</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W + CARD_GAP}
          decelerationRate="fast"
          onScroll={onCarouselScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: CARD_GAP, alignItems: 'center' }}
        >
          {STEPS.map((card, i) => {
            const on = i === active;
            return (
              <View key={i} style={[styles.stepCard, on ? styles.stepCardActive : styles.stepCardIdle]}>
                {/* Card Image (Top Half) */}
                <View style={{ height: 180, overflow: 'hidden' }}>
                  <Img source={{ uri: card.img }} accessibilityLabel={card.title} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  <LinearGradient
                    colors={['transparent', HT.primary]} /* from-[#005CA8]/60: the css repaints the gradient stop solid */
                    style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', padding: 20 }]}
                  >
                    <Text style={styles.stepNum}>{card.step}</Text>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{card.tag}</Text>
                    </View>
                  </LinearGradient>
                </View>

                {/* Card Content (Bottom Half) */}
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{card.title}</Text>
                  <Text style={styles.stepDesc}>{card.desc}</Text>
                  {/* Mobile Active Indicator */}
                  <View style={[styles.activeLine, { opacity: on ? 1 : 0 }]} />
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. BENEFITS GRID (Compact Mobile) */}
      <View style={styles.benefits}>
        <View style={{ paddingHorizontal: 24 }}>
          <View style={{ marginBottom: 40, gap: 16 }}>
            <View>
              <Text style={styles.eyebrow}>Why Us</Text>
              <Text style={[styles.h2, { maxWidth: 512 }]}>Everything you need to run your business.</Text>
            </View>
            <Text style={styles.benefitsLead}>
              We provide the tools, you provide the hospitality. Together we create unforgettable experiences.
            </Text>
          </View>

          <View style={{ gap: 16 }}>
            {BENEFITS.map((item, i) => (
              <View key={i} style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <item.icon size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{item.title}</Text>
                  <Text style={styles.benefitText}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 4. COMPARISON SECTION */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 48 }}>
        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>Ready to transform your business?</Text>
          <Text style={styles.ctaText}>Join hotel partners growing with Dima Hasao Partnerb today.</Text>
          <Press onPress={() => navigate('/hotel/partner/join')} style={styles.ctaBtn}>
            <Text style={styles.ctaBtnText}>List Your Property</Text>
          </Press>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: HT.bg },
  hero: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 48, overflow: 'hidden' },
  heroTitle: { fontSize: 36, lineHeight: 39.6, letterSpacing: -0.9, textAlign: 'center', color: HT.text, marginBottom: 16, ...poppins(900) },
  heroSub: { fontSize: 16, lineHeight: 24, textAlign: 'center', color: HT.text, maxWidth: 576, marginBottom: 32, paddingHorizontal: 8, ...poppins(500) },
  eyebrow: { fontSize: 12, lineHeight: 16, letterSpacing: 2.4, textTransform: 'uppercase', color: tw.gray400, marginBottom: 8, ...poppins(700) },
  h2: { fontSize: 30, lineHeight: 36, color: HT.text, ...poppins(700) },
  stepCard: { width: CARD_W, height: 360, backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: tw.gray100, ...shadow('lg') },
  stepCardIdle: { opacity: 0.7, transform: [{ scale: 0.9 }] },
  stepCardActive: { opacity: 1, borderColor: HT.primary, boxShadow: '0 20px 25px -5px rgba(10,77,43,0.15)' },
  stepNum: { fontSize: 48, lineHeight: 48, color: 'rgba(255,255,255,0.3)', ...poppins(900) },
  tag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginBottom: 4 },
  tagText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) },
  stepBody: { height: 180, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  stepTitle: { fontSize: 20, lineHeight: 28, color: HT.text, marginBottom: 8, ...poppins(700) },
  stepDesc: { fontSize: 14, lineHeight: 22.75, color: HT.text, marginBottom: 16, ...poppins(400) },
  activeLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: HT.primary },
  benefits: { paddingVertical: 48, backgroundColor: tw.gray50, borderTopWidth: 1, borderBottomWidth: 1, borderColor: tw.gray100 },
  benefitsLead: { fontSize: 14, lineHeight: 20, color: HT.text, maxWidth: 448, ...poppins(400) },
  benefitCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  benefitIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: HT.primary, alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { fontSize: 18, lineHeight: 28, color: HT.text, marginBottom: 4, ...poppins(700) },
  benefitText: { fontSize: 14, lineHeight: 22.75, color: HT.text, ...poppins(400) },
  cta: { backgroundColor: HT.primary, borderRadius: 24, padding: 32, alignItems: 'center', overflow: 'hidden', ...shadow('xl') },
  ctaTitle: { fontSize: 24, lineHeight: 32, color: '#fff', textAlign: 'center', marginBottom: 16, ...poppins(700) },
  ctaText: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 32, ...poppins(400) },
  ctaBtn: { backgroundColor: '#fff', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 999 },
  ctaBtnText: { fontSize: 14, lineHeight: 20, color: HT.primary, ...poppins(700) },
});

export default PartnerHome;
