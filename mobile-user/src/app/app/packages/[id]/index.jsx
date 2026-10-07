import { useEffect, useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../../../components/Fa';
import { Press } from '../../../../components/ui';
import { StatusBadge, fa } from '../../../../components/ds';
import { Header, PatternDivider } from '../../../../components/dh/Header';
import { GreenButton, Panel, PanelTitle, Pulse, SegTabs, Stars, StateBlock, dhs } from '../../../../components/dh/ui';
import { fetchPackageById } from '../../../../api/dh/toursApi';
import { color, elevation, radii, space, type } from '../../../../theme';

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
    <View style={{ gap: space.md }}>
      {itinerary.map((dayItem) => {
        const isOpen = expandedDays.includes(dayItem.day);
        return (
          <View key={dayItem.day} style={[dhs.panel, { overflow: 'hidden' }]}>
            <Press scale={1} onPress={() => toggleDay(dayItem.day)} style={styles.dayHead} accessibilityState={{ expanded: isOpen }} accessibilityLabel={`Day ${dayItem.day}: ${dayItem.title}`}>
              <View style={[dhs.row, { gap: space.md, flex: 1, minWidth: 0 }]}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>D{dayItem.day}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={[dhs.row, { gap: space.sm, flexWrap: 'wrap' }]}>
                    <Text style={styles.dayLabel}>Day {dayItem.day}</Text>
                    {dayItem.mealPlan ? <StatusBadge label={dayItem.mealPlan} tone="gold" icon={fa('fa-solid fa-utensils')} /> : null}
                  </View>
                  <Text style={styles.dayTitle} numberOfLines={2}>
                    {dayItem.title}
                  </Text>
                </View>
              </View>
              <Fa name="fa-solid fa-chevron-down" size={16} color={isOpen ? color.primary : color.textMuted} style={isOpen ? { transform: [{ rotate: '180deg' }] } : null} />
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
    <View style={{ gap: space.lg }}>
      <Panel style={{ gap: space.md }}>
        <View style={[dhs.row, { gap: space.sm }]}>
          <Fa name="fa-solid fa-circle-check" size={16} color={color.success} />
          <Text style={dhs.h3}>What&apos;s included in the package</Text>
        </View>
        <View style={{ gap: space.sm }}>
          {includes.map((inc) => (
            <View key={inc.id} style={styles.include}>
              <Fa name="fa-solid fa-check" size={14} color={color.success} style={{ marginTop: 3 }} />
              <Text style={styles.includeText}>{inc.label}</Text>
            </View>
          ))}
        </View>
      </Panel>
      {exclusions.length > 0 ? (
        <Panel style={{ gap: space.md }}>
          <View style={[dhs.row, { gap: space.sm }]}>
            <Fa name="fa-solid fa-circle-xmark" size={16} color={color.danger} />
            <Text style={dhs.h3}>Exclusions</Text>
          </View>
          <View style={{ gap: space.sm }}>
            {exclusions.map((exc, idx) => (
              <View key={idx} style={styles.activity}>
                <Fa name="fa-solid fa-xmark" size={14} color={color.danger} style={{ marginTop: 3 }} />
                <Text style={[styles.activityText, { color: color.textSecondary }]}>{exc}</Text>
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
        <Pulse style={{ height: 220, borderRadius: 0 }} />
        <View style={{ padding: space.lg, gap: space.md }} accessibilityLabel="Loading package">
          {[0, 1, 2].map((n) => (
            <Panel key={n} style={{ gap: space.sm }}>
              <Pulse style={{ height: 16, width: '50%' }} />
              <Pulse tone={100} style={{ height: 13 }} />
              <Pulse tone={100} style={{ height: 13, width: '80%' }} />
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
          actionLabel="See all packages"
          onAction={() => router.replace('/app/packages')}
        />
      </View>
    );
  }

  return (
    <View style={dhs.page}>
      <Header title={pkg.title} subtitle={`${pkg.duration} • ${pkg.type}`} showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.xxl }}>
        <View style={styles.hero}>
          <Image source={{ uri: pkg.heroImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(6,28,14,0.35)', 'rgba(6,28,14,0.9)']} style={StyleSheet.absoluteFill} />
          <View style={styles.heroBody}>
            <View style={[dhs.row, { gap: space.sm, flexWrap: 'wrap' }]}>
              <StatusBadge label={pkg.duration} tone="gold" icon={fa('fa-regular fa-clock')} />
              <StatusBadge label={pkg.type} tone="primary" style={{ backgroundColor: color.surface }} />
              {pkg.groupSize ? <StatusBadge label={pkg.groupSize} tone="neutral" icon={fa('fa-solid fa-user-group')} /> : null}
            </View>
            <Text style={styles.heroTitle} accessibilityRole="header">
              {pkg.title}
            </Text>
            <Text style={styles.heroDest} numberOfLines={2}>
              {pkg.destinations.join(' • ')}
            </Text>
          </View>
        </View>

        <View style={{ padding: space.lg, gap: space.lg }}>
          <Panel style={{ gap: space.md }}>
            <PanelTitle icon="fa-solid fa-wand-magic-sparkles">Package highlights</PanelTitle>
            <View style={{ gap: space.sm }}>
              {pkg.highlights.map((hl, idx) => (
                <View key={idx} style={styles.activity}>
                  <Fa name="fa-solid fa-circle-check" size={14} color={color.primary} style={{ marginTop: 3 }} />
                  <Text style={styles.activityText}>{hl}</Text>
                </View>
              ))}
            </View>
          </Panel>

          <SegTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {activeTab === 'itinerary' ? (
            <View style={{ gap: space.md }}>
              <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }]}>
                <Text style={dhs.h3}>Complete day-by-day plan</Text>
                <Text style={styles.days}>{pkg.itinerary.length} days</Text>
              </View>
              <ItineraryTimeline itinerary={pkg.itinerary} />
            </View>
          ) : null}

          {activeTab === 'includes' ? <InclusionsGrid includes={pkg.includes} exclusions={pkg.exclusions} /> : null}

          {activeTab === 'destinations' ? (
            <View style={{ gap: space.md }}>
              <Panel style={{ gap: space.md }}>
                <Text style={dhs.h3}>Key destinations in this tour</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                  {pkg.destinations.map((dest, idx) => (
                    <View key={idx} style={styles.destChip}>
                      <Fa name="fa-solid fa-location-dot" size={14} color={color.primary} />
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
            <Panel style={{ gap: space.md }}>
              <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' }]}>
                <PanelTitle icon="fa-solid fa-star">Traveller reviews</PanelTitle>
                <Text style={styles.reviewSummary}>
                  {pkg.rating.toFixed(1)} · {pkg.reviewCount} review{pkg.reviewCount === 1 ? '' : 's'}
                </Text>
              </View>
              <View>
                {pkg.reviews.slice(0, 5).map((review, i, arr) => (
                  <View key={review.id} style={[styles.review, i < arr.length - 1 && styles.reviewDivider]}>
                    <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }]}>
                      <Text style={styles.reviewAuthor} numberOfLines={1}>
                        {review.author}
                      </Text>
                      <Text style={styles.reviewDate}>{review.date}</Text>
                    </View>
                    <Stars rating={review.rating} size={12} />
                    {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                    {review.reply ? (
                      <Text style={styles.reply}>
                        <Text style={{ ...type.label, color: color.primary }}>Operator replied: </Text>
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

      <View style={[styles.bar, { paddingBottom: space.md + insets.bottom }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.barLabel}>All-inclusive tour</Text>
          <View style={[dhs.row, { alignItems: 'baseline', gap: space.xs }]}>
            <Text style={styles.barPrice}>₹{pkg.pricePerPerson.toLocaleString('en-IN')}</Text>
            <Text style={styles.barPer}>/ person</Text>
          </View>
          {/* Said up front rather than at the payment step. */}
          {pkg.advancePercent < 100 ? <Text style={styles.advance}>Pay {pkg.advancePercent}% now, rest to the operator</Text> : null}
        </View>
        <GreenButton title="Book package" size="lg" fullWidth={false} iconRight="fa-solid fa-arrow-right" onPress={() => router.push(`/app/packages/${pkg.id}/book`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { aspectRatio: 4 / 3, maxHeight: 300, backgroundColor: color.primaryDeep },
  heroBody: { position: 'absolute', bottom: space.lg, left: space.lg, right: space.lg, gap: space.xs + 2 },
  heroTitle: { ...type.heading, fontSize: 20, lineHeight: 28, color: color.textInverse },
  heroDest: { ...type.small, color: 'rgba(255,255,255,0.85)' },
  days: { ...type.caption, color: color.textMuted },
  dayHead: { minHeight: 64, padding: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  dayBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primaryDeep, borderWidth: 1.5, borderColor: color.gold, alignItems: 'center', justifyContent: 'center' },
  dayBadgeText: { ...type.label, color: color.goldOnDark },
  dayLabel: { ...type.overline, color: color.textMuted },
  dayTitle: { ...type.bodyStrong, color: color.text, marginTop: 2 },
  dayBody: { paddingHorizontal: space.lg, paddingBottom: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.surfaceMuted, gap: space.sm },
  activity: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm + 2 },
  activityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.primary, marginTop: 8 },
  activityText: { flex: 1, ...type.body, color: color.textSecondary },
  include: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm + 2, padding: space.md, backgroundColor: color.surfaceMuted, borderRadius: radii.md },
  includeText: { flex: 1, ...type.small, color: color.text },
  destChip: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, backgroundColor: color.primarySoft, paddingHorizontal: space.md, height: 36, borderRadius: radii.pill },
  destChipText: { ...type.label, color: color.primary },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', margin: -space.xs },
  galleryCell: { width: '50%', padding: space.xs },
  galleryImg: { aspectRatio: 4 / 3, borderRadius: radii.lg, backgroundColor: color.surfaceMuted },
  reviewSummary: { ...type.label, color: color.text },
  review: { gap: space.xs, paddingBottom: space.md },
  reviewDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, marginBottom: space.md },
  reviewAuthor: { ...type.bodyStrong, color: color.text, flexShrink: 1 },
  reviewDate: { ...type.caption, color: color.textMuted },
  reviewComment: { ...type.small, color: color.textSecondary },
  reply: { ...type.small, color: color.text, backgroundColor: color.surfaceMuted, borderRadius: radii.sm, padding: space.sm + 2, marginTop: space.xs },
  bar: { backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, ...elevation.sheet },
  barLabel: { ...type.caption, color: color.textMuted },
  barPrice: { ...type.price, color: color.text },
  barPer: { ...type.caption, color: color.textMuted },
  advance: { ...type.caption, color: color.primary },
});
