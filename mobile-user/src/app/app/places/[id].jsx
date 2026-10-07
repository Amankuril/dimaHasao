import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import { Button, fa } from '../../../components/ds';
import { Pulse, StateBlock } from '../../../components/dh/ui';
import { Header, PatternDivider } from '../../../components/dh/Header';
import { GalleryViewer, TransportSelector } from '../../../components/dh/places';
import { fetchDestinationById } from '../../../api/dh/toursApi';
import { color, elevation, radii, space, type } from '../../../theme';

// Web: DimaHasao/pages/TouristPlaceDetail.jsx (/app/places/:id)

function Meta({ icon, label, value }) {
  return (
    <View style={styles.meta}>
      <View style={styles.metaIcon}>
        <Fa name={icon} size={16} color={color.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function TouristPlaceDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDestinationById(id)
      .then((found) => {
        if (!cancelled) setPlace(found);
      })
      .catch(() => {
        if (!cancelled) setPlace(null);
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
      <View style={styles.page}>
        <Header title="TOURIST PLACES" subtitle="Loading destination" showBack rightAction="none" />
        <PatternDivider variant="native" />
        <View style={styles.loading} accessibilityLabel="Loading destination">
          <Pulse style={{ height: 220, borderRadius: radii.lg }} />
          {[0, 1].map((n) => (
            <View key={n} style={styles.skeletonCard}>
              <Pulse style={{ height: 16, width: '50%' }} />
              <Pulse tone={100} style={{ height: 13 }} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // An admin can unpublish a destination, so this has to say so.
  if (!place) {
    return (
      <View style={styles.page}>
        <Header title="TOURIST PLACES" showBack rightAction="none" />
        <PatternDivider variant="native" />
        <StateBlock card={false} icon="fa-solid fa-mountain" title="This destination is not available" actionLabel="See all places" onAction={() => router.replace('/app/places')} />
      </View>
    );
  }

  // Take the visitor into the real ride flow with this place as the drop.
  const handleBookDirect = () => {
    router.push({
      pathname: '/taxi/user/ride/select-location',
      params: { flow: 'ride', activeInput: 'drop', drop: place.fullAddress || place.location || place.name || '' },
    });
  };

  return (
    <View style={styles.page}>
      <Header title="TOURIST PLACES" subtitle="Explore the Beauty of Dima Hasao" showBack rightAction="favorite" placeId={place.id} />
      <PatternDivider variant="native" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <GalleryViewer place={place} />

        <View style={styles.body}>
          <View style={[styles.section, { gap: space.lg }]}>
            <View style={{ gap: space.sm }}>
              <Text style={styles.h2} accessibilityRole="header">
                About {place.name}
              </Text>
              {place.aboutDetails?.length ? (
                place.aboutDetails.map((para, idx) => (
                  <Text key={idx} style={styles.para}>
                    {para}
                  </Text>
                ))
              ) : (
                <Text style={styles.para}>{place.description}</Text>
              )}
            </View>

            <View style={styles.metaBox}>
              <Meta icon="fa-solid fa-location-dot" label="Location" value={place.fullAddress} />
              <Meta icon="fa-solid fa-cloud-sun" label="Best time to visit" value={place.bestTime} />
              <Meta icon="fa-solid fa-camera-retro" label="Ideal for" value={place.idealFor} />
            </View>
          </View>

          <TransportSelector place={place} />

          {place.packages?.length > 0 ? (
            <View style={[styles.section, { gap: space.md }]}>
              <View style={styles.rowGap}>
                <Fa name="fa-solid fa-suitcase-rolling" size={16} color={color.primary} />
                <Text style={styles.h3} accessibilityRole="header">
                  Guided tours that visit here
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingBottom: space.xs }}>
                {place.packages.map((pkg) => (
                  <Press key={pkg.id} scale={0.98} onPress={() => router.push(`/app/packages/${pkg.id}`)} style={styles.pkg} accessibilityLabel={`${pkg.title}, ${pkg.duration}, ₹${pkg.pricePerPerson.toLocaleString('en-IN')} per person`}>
                    <Image source={{ uri: pkg.heroImage }} style={styles.pkgImg} resizeMode="cover" />
                    <View style={{ padding: space.md, gap: space.xs }}>
                      <Text style={styles.pkgTitle} numberOfLines={2}>
                        {pkg.title}
                      </Text>
                      <Text style={styles.pkgDuration}>{pkg.duration}</Text>
                      <Text style={styles.pkgPrice}>
                        ₹{pkg.pricePerPerson.toLocaleString('en-IN')}
                        <Text style={styles.pkgPer}> /person</Text>
                      </Text>
                    </View>
                  </Press>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={[styles.rowGap, { marginBottom: space.md }]}>
              <Fa name="fa-solid fa-leaf" size={16} color={color.gold} />
              <Text style={styles.h3} accessibilityRole="header">
                Local guide recommendations
              </Text>
            </View>
            <View style={{ gap: space.md, marginBottom: space.lg }}>
              {place.guideTips?.map((tip, idx) => (
                <View key={idx} style={styles.tip}>
                  <Fa name="fa-solid fa-circle-check" size={16} color={color.primary} style={{ marginTop: 2 }} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
            <View style={styles.sunset}>
              <Image source={{ uri: place.guideSunsetImage || place.mainImage }} style={styles.sunsetImg} resizeMode="cover" accessibilityLabel="Sunset View" />
              <Text style={styles.sunsetText}>Enjoy the view, respect the nature</Text>
              <Text style={styles.sunsetStrong}>Love Dima Hasao!</Text>
            </View>
          </View>

          <View style={styles.cta}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.ctaKicker} numberOfLines={2}>
                Ready to visit {place.name}?
              </Text>
              <Text style={styles.ctaTitle}>Book an auto or cab to get here</Text>
            </View>
            <Button title="Book ride" variant="gold" fullWidth={false} iconRight={fa('fa-solid fa-arrow-right')} onPress={handleBookDirect} />
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
          <Text style={styles.footerText}>Plan your trip, stay safe and enjoy the beauty of Dima Hasao!</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  loading: { flex: 1, padding: space.lg, gap: space.md },
  skeletonCard: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.lg, borderWidth: 1, borderColor: color.border, gap: space.sm },
  body: { padding: space.lg, paddingTop: space.xl, gap: space.xxl, flexGrow: 1 },
  section: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.lg, borderWidth: 1, borderColor: color.border, ...elevation.card },
  h2: { ...type.heading, color: color.primary },
  h3: { ...type.subheading, color: color.text, flexShrink: 1 },
  para: { ...type.body, color: color.textSecondary },
  metaBox: { gap: space.md, backgroundColor: color.surfaceMuted, padding: space.md, borderRadius: radii.md },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  metaIcon: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  metaLabel: { ...type.label, color: color.text },
  metaValue: { ...type.small, color: color.textSecondary },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pkg: { width: 196, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden' },
  pkgImg: { aspectRatio: 16 / 9, width: '100%', backgroundColor: color.surfaceMuted },
  pkgTitle: { ...type.bodyStrong, color: color.text },
  pkgDuration: { ...type.caption, color: color.textMuted },
  pkgPrice: { ...type.price, fontSize: 16, color: color.primary },
  pkgPer: { ...type.caption, color: color.textMuted },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  tipText: { flex: 1, ...type.body, color: color.textSecondary },
  sunset: { paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, alignItems: 'center' },
  sunsetImg: { width: '100%', aspectRatio: 16 / 9, borderRadius: radii.md, marginBottom: space.sm, backgroundColor: color.surfaceMuted },
  sunsetText: { ...type.small, color: color.textSecondary, textAlign: 'center' },
  sunsetStrong: { ...type.bodyStrong, color: color.primary, textAlign: 'center' },
  cta: { borderRadius: radii.lg, backgroundColor: color.primaryDeep, padding: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, ...elevation.card },
  ctaKicker: { ...type.small, color: color.goldOnDark },
  ctaTitle: { ...type.bodyStrong, color: color.textInverse },
  footer: { backgroundColor: color.primaryDeep, paddingTop: space.lg, paddingHorizontal: space.xl, alignItems: 'center', marginTop: space.xxl },
  footerText: { ...type.tagline, color: color.textOnDarkMuted, textAlign: 'center' },
});
