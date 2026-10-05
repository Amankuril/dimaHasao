import { useEffect, useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../../../components/Fa';
import { Press } from '../../../../components/ui';
import { Header, PatternDivider } from '../../../../components/dh/Header';
import { GreenButton, Panel, Pulse, SegTabs, StateBlock, dhs } from '../../../../components/dh/ui';
import { fetchPackageById } from '../../../../api/dh/toursApi';
import { dh, montserrat, poppins, shadow, tw } from '../../../../theme';

// Web: DimaHasao/pages/TourPackageDetailScreen.jsx (/app/packages/:id)
// + components/tour/{ItineraryTimeline,InclusionsGrid}.jsx

const TABS = [
  { id: 'itinerary', label: 'Itinerary', icon: 'fa-solid fa-route' },
  { id: 'includes', label: 'Inclusions', icon: 'fa-solid fa-list-check' },
  { id: 'destinations', label: 'Destinations', icon: 'fa-solid fa-map-pin' },
];

function ItineraryTimeline({ itinerary = [] }) {
  const [expandedDays, setExpandedDays] = useState([1]); // Day 1 open by default
  const toggleDay = (dayNum) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(250, 'easeInEaseOut', 'opacity'));
    setExpandedDays((prev) => (prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum]));
  };
  return (
    <View style={{ gap: 12 }}>
      {itinerary.map((dayItem) => {
        const isOpen = expandedDays.includes(dayItem.day);
        return (
          <View key={dayItem.day} style={[dhs.panel, { overflow: 'hidden' }]}>
            <Press scale={1} onPress={() => toggleDay(dayItem.day)} style={styles.dayHead} accessibilityState={{ expanded: isOpen }} accessibilityLabel={`Day ${dayItem.day}: ${dayItem.title}`}>
              <View style={[dhs.row, { gap: 12, flex: 1, minWidth: 0 }]}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>D{dayItem.day}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={[dhs.row, { gap: 8 }]}>
                    <Text style={styles.dayLabel}>DAY {dayItem.day}</Text>
                    {dayItem.mealPlan ? <Text style={styles.meal}>{dayItem.mealPlan}</Text> : null}
                  </View>
                  <Text style={styles.dayTitle} numberOfLines={1}>{dayItem.title}</Text>
                </View>
              </View>
              <Fa name="fa-solid fa-chevron-down" size={12} color={isOpen ? tw.emerald800 : tw.gray400} style={isOpen ? { transform: [{ rotate: '180deg' }] } : null} />
            </Press>
            {isOpen ? (
              <View style={styles.dayBody}>
                {dayItem.activities.map((act, idx) => (
                  <View key={idx} style={styles.activity}>
                    <View style={styles.activityDot} />
                    <Text style={styles.activityText}>{act}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function InclusionsGrid({ includes = [], exclusions = [] }) {
  return (
    <View style={{ gap: 16 }}>
      <Panel style={{ gap: 10 }}>
        <View style={[dhs.row, { gap: 8 }]}>
          <Fa name="fa-solid fa-circle-check" size={14} color={tw.emerald600} />
          <Text style={dhs.h3}>What&apos;s Included in Package</Text>
        </View>
        <View style={{ gap: 8 }}>
          {includes.map((inc) => (
            <View key={inc.id} style={styles.include}>
              <Fa name="fa-solid fa-check" size={12} color={tw.emerald700} style={{ marginTop: 3 }} />
              <Text style={styles.includeText}>{inc.label}</Text>
            </View>
          ))}
        </View>
      </Panel>
      {exclusions.length > 0 ? (
        <Panel style={{ gap: 10 }}>
          <View style={[dhs.row, { gap: 8 }]}>
            <Fa name="fa-solid fa-circle-xmark" size={14} color={tw.red500} />
            <Text style={dhs.h3}>Exclusions</Text>
          </View>
          <View style={{ gap: 6 }}>
            {exclusions.map((exc, idx) => (
              <View key={idx} style={[styles.activity, { gap: 8 }]}>
                <Fa name="fa-solid fa-xmark" size={12} color={tw.red400} style={{ marginTop: 3 }} />
                <Text style={[styles.activityText, { color: tw.gray600 }]}>{exc}</Text>
              </View>
            ))}
          </View>
        </Panel>
      ) : null}
    </View>
  );
}

export default function TourPackageDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('itinerary');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPackageById(id)
      .then((found) => {
        if (!cancelled) setPkg(found);
      })
      .catch(() => {
        if (!cancelled) setPkg(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={dhs.page}>
        <Header title="Loading package" subtitle="Fetching the latest details" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <Pulse style={{ height: 208, borderRadius: 0 }} />
        <View style={{ padding: 14, gap: 12 }}>
          {[0, 1, 2].map((n) => (
            <Panel key={n} style={{ gap: 8 }}>
              <Pulse style={{ height: 14, width: '50%' }} />
              <Pulse tone={100} style={{ height: 12 }} />
              <Pulse tone={100} style={{ height: 12, width: '80%' }} />
            </Panel>
          ))}
        </View>
      </View>
    );
  }

  // A package pulled from sale stops resolving here, so the screen says so.
  if (!pkg) {
    return (
      <View style={dhs.page}>
        <Header title="Package unavailable" showBack rightAction="none" />
        <PatternDivider variant="green-gold" />
        <StateBlock
          card={false}
          icon="fa-solid fa-suitcase-rolling"
          title="This tour is no longer available"
          text="It may have been taken off sale. Browse the other expeditions on offer."
          actionLabel="See All Packages"
          onAction={() => router.replace('/app/packages')}
        />
      </View>
    );
  }

  return (
    <View style={dhs.page}>
      <Header title={pkg.title} subtitle={`${pkg.duration} • ${pkg.type}`} showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <View style={styles.hero}>
          <Image source={{ uri: pkg.heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
          <View style={styles.heroBody}>
            <View style={[dhs.row, { gap: 8, flexWrap: 'wrap' }]}>
              <Text style={[styles.badge, { backgroundColor: tw.amber500, color: '#fff' }]}>{pkg.duration}</Text>
              <Text style={[styles.badge, { backgroundColor: 'rgba(6,56,30,0.9)', color: tw.amber300, borderWidth: 1, borderColor: 'rgba(255,185,0,0.4)' }]}>{pkg.type}</Text>
              <Text style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', ...poppins(600) }]}>{pkg.groupSize}</Text>
            </View>
            <Text style={styles.heroTitle}>{pkg.title}</Text>
            <Text style={styles.heroDest} numberOfLines={1}>{pkg.destinations.join(' • ')}</Text>
          </View>
        </View>

        <View style={{ padding: 14, gap: 16 }}>
          <Panel style={{ gap: 12 }}>
            <View style={[dhs.row, { gap: 8 }]}>
              <Fa name="fa-solid fa-wand-magic-sparkles" size={14} color={tw.amber500} />
              <Text style={dhs.h3}>Package Highlights</Text>
            </View>
            <View style={{ gap: 8 }}>
              {pkg.highlights.map((hl, idx) => (
                <View key={idx} style={styles.activity}>
                  <Fa name="fa-solid fa-circle-check" size={12} color={tw.emerald600} style={{ marginTop: 3 }} />
                  <Text style={styles.activityText}>{hl}</Text>
                </View>
              ))}
            </View>
          </Panel>

          <SegTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'itinerary' ? (
            <View style={{ gap: 12 }}>
              <View style={[dhs.row, { justifyContent: 'space-between', paddingHorizontal: 4 }]}>
                <Text style={dhs.h3}>Complete Day-by-Day Plan</Text>
                <Text style={styles.days}>{pkg.itinerary.length} Days</Text>
              </View>
              <ItineraryTimeline itinerary={pkg.itinerary} />
            </View>
          ) : null}

          {activeTab === 'includes' ? <InclusionsGrid includes={pkg.includes} exclusions={pkg.exclusions} /> : null}

          {activeTab === 'destinations' ? (
            <View style={{ gap: 12 }}>
              <Panel style={{ gap: 10 }}>
                <Text style={dhs.h3}>Key Destinations in this Tour</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                  {pkg.destinations.map((dest, idx) => (
                    <View key={idx} style={styles.destChip}>
                      <Fa name="fa-solid fa-location-dot" size={10} color={tw.emerald700} />
                      <Text style={styles.destChipText}>{dest}</Text>
                    </View>
                  ))}
                </View>
              </Panel>
              <View style={styles.gallery}>
                {pkg.gallery.map((img, idx) => (
                  <View key={idx} style={styles.galleryCell}>
                    <Image source={{ uri: img }} style={styles.galleryImg} resizeMode="cover" accessibilityLabel={`Destination ${idx + 1}`} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {pkg.reviews.length > 0 ? (
            <Panel style={{ gap: 12 }}>
              <View style={[dhs.row, { justifyContent: 'space-between' }]}>
                <View style={[dhs.row, { gap: 8 }]}>
                  <Fa name="fa-solid fa-star" size={14} color={tw.amber500} />
                  <Text style={dhs.h3}>Traveller Reviews</Text>
                </View>
                <Text style={styles.reviewSummary}>
                  {pkg.rating.toFixed(1)} · {pkg.reviewCount} review{pkg.reviewCount === 1 ? '' : 's'}
                </Text>
              </View>
              <View>
                {pkg.reviews.slice(0, 5).map((review, i, arr) => (
                  <View key={review.id} style={[styles.review, i < arr.length - 1 && styles.reviewDivider]}>
                    <View style={[dhs.row, { justifyContent: 'space-between' }]}>
                      <Text style={styles.reviewAuthor}>{review.author}</Text>
                      <Text style={styles.reviewDate}>{review.date}</Text>
                    </View>
                    <View style={[dhs.row, { gap: 2 }]}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Fa key={star} name="fa-solid fa-star" size={9} color={star <= review.rating ? tw.amber400 : tw.gray200} />
                      ))}
                    </View>
                    {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                    {review.reply ? (
                      <Text style={styles.reply}>
                        <Text style={poppins(700)}>Operator replied: </Text>
                        {review.reply}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </Panel>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.barLabel}>ALL-INCLUSIVE TOUR</Text>
          <View style={[dhs.row, { alignItems: 'baseline', gap: 4 }]}>
            <Text style={styles.barPrice}>₹{pkg.pricePerPerson.toLocaleString('en-IN')}</Text>
            <Text style={styles.barPer}>/ person</Text>
          </View>
          {/* Said up front rather than at the payment step. */}
          {pkg.advancePercent < 100 ? <Text style={styles.advance}>Pay {pkg.advancePercent}% now, rest to the operator</Text> : null}
        </View>
        <GreenButton title="Book Package" iconRight="fa-solid fa-arrow-right" onPress={() => router.push(`/app/packages/${pkg.id}/book`)} style={{ paddingHorizontal: 20, ...shadow('md') }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 208, backgroundColor: tw.gray200 },
  heroBody: { position: 'absolute', bottom: 12, left: 14, right: 14, gap: 4 },
  badge: { fontSize: 10, lineHeight: 15, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', ...poppins(700) },
  heroTitle: { fontSize: 18, lineHeight: 22.5, color: '#fff', ...montserrat(700) },
  heroDest: { fontSize: 12, lineHeight: 16, color: tw.gray200, ...poppins(400) },
  days: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  dayHead: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dayBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: dh.nav, alignItems: 'center', justifyContent: 'center' },
  dayBadgeText: { fontSize: 12, lineHeight: 16, color: tw.amber300, ...montserrat(800) },
  dayLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(700) },
  meal: { fontSize: 9.5, lineHeight: 14, color: tw.amber900, backgroundColor: tw.amber100, paddingHorizontal: 8, borderRadius: 4, borderWidth: 1, borderColor: tw.amber300, overflow: 'hidden', ...poppins(600) },
  dayTitle: { fontSize: 12, lineHeight: 16, color: tw.gray900, marginTop: 2, ...montserrat(700) },
  dayBody: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.gray100, backgroundColor: 'rgba(250,246,237,0.4)', gap: 8 },
  activity: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  activityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: tw.emerald700, marginTop: 7 },
  activityText: { flex: 1, fontSize: 12, lineHeight: 19.5, color: tw.gray700, ...poppins(400) },
  include: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 8, backgroundColor: dh.cream, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(229,221,195,0.6)' },
  includeText: { flex: 1, fontSize: 12, lineHeight: 19.5, color: tw.gray800, ...poppins(500) },
  destChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: dh.cream, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: dh.border },
  destChipText: { fontSize: 12, lineHeight: 16, color: tw.emerald900, ...poppins(700) },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  galleryCell: { width: '50%', padding: 4 },
  galleryImg: { height: 128, borderRadius: 16, backgroundColor: tw.gray200 },
  reviewSummary: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(700) },
  review: { gap: 4, paddingBottom: 12 },
  reviewDivider: { borderBottomWidth: 1, borderBottomColor: tw.gray100, marginBottom: 12 },
  reviewAuthor: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  reviewDate: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(400) },
  reviewComment: { fontSize: 12, lineHeight: 19.5, color: tw.gray600, ...poppins(400) },
  reply: { fontSize: 11, lineHeight: 16.5, color: tw.emerald900, backgroundColor: dh.cream, borderWidth: 1, borderColor: dh.border, borderRadius: 8, padding: 8, marginTop: 4, ...poppins(400) },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: dh.border, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, ...shadow('lg') },
  barLabel: { fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(600) },
  barPrice: { fontSize: 18, lineHeight: 28, color: tw.emerald950, ...montserrat(800) },
  barPer: { fontSize: 10, color: tw.gray400, ...poppins(400) },
  advance: { fontSize: 10, lineHeight: 15, color: tw.emerald800, ...poppins(600) },
});
