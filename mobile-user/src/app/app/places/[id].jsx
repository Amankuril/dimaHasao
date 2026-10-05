import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../../components/Img';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import Skeleton from '../../../components/Skeleton';
import { Header, PatternDivider } from '../../../components/dh/Header';
import { GalleryViewer, TransportSelector } from '../../../components/dh/places';
import { fetchDestinationById } from '../../../api/dh/toursApi';
import { poppins, shadow, tw } from '../../../theme';

// Web: DimaHasao/pages/TouristPlaceDetail.jsx (/app/places/:id)

function Meta({ icon, color, label, value }) {
  return (
    <View style={styles.meta}>
      <Fa name={icon} size={14} color={color} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function TouristPlaceDetail() {
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

  // Take the visitor into the real ride flow with this place as the drop.
  const handleBookDirect = () => {
    router.push({
      pathname: '/taxi/user/ride/select-location',
      params: { flow: 'ride', activeInput: 'drop', drop: place.fullAddress || place.location || place.name || '' },
    });
  };

  if (loading) {
    return (
      <View style={styles.page}>
        <Header title="TOURIST PLACES" subtitle="Loading destination" showBack rightAction="none" />
        <PatternDivider variant="native" />
        <View style={[styles.main, { padding: 16, gap: 12, flex: 1 }]}>
          <Skeleton style={{ height: 208, borderRadius: 16, backgroundColor: tw.gray200 }} />
          {[0, 1].map((n) => (
            <View key={n} style={styles.skeletonCard}>
              <Skeleton style={{ height: 14, width: '50%', borderRadius: 4, backgroundColor: tw.gray200 }} />
              <Skeleton style={{ height: 12, borderRadius: 4, backgroundColor: tw.gray100 }} />
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
        <View style={[styles.main, { flex: 1, padding: 24, alignItems: 'center', gap: 12 }]}>
          <Fa name="fa-solid fa-mountain" size={36} color={tw.gray300} style={{ marginTop: 40 }} />
          <Text style={styles.gone}>This destination is not available</Text>
          <Press onPress={() => router.replace('/app/places')} style={styles.goneBtn}>
            <Text style={styles.goneBtnText}>See All Places</Text>
          </Press>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Header title="TOURIST PLACES" subtitle="Explore the Beauty of Dima Hasao" showBack rightAction="favorite" placeId={place.id} />
      <PatternDivider variant="native" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.main}>
          <GalleryViewer place={place} />

          <View style={{ paddingHorizontal: 16, paddingVertical: 20, gap: 20 }}>
            <View style={[styles.section, { gap: 16 }]}>
              <View>
                <Text style={styles.h2}>About {place.name}</Text>
                {place.aboutDetails?.length ? (
                  place.aboutDetails.map((para, idx) => (
                    <Text key={idx} style={[styles.para, idx < place.aboutDetails.length - 1 && { marginBottom: 8 }]}>
                      {para}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.para}>{place.description}</Text>
                )}
              </View>

              <View style={styles.metaBox}>
                <Meta icon="fa-solid fa-location-dot" color={tw.red600} label="LOCATION" value={place.fullAddress} />
                <Meta icon="fa-solid fa-cloud-sun" color={tw.emerald700} label="BEST TIME TO VISIT" value={place.bestTime} />
                <Meta icon="fa-solid fa-camera-retro" color={tw.teal700} label="IDEAL FOR" value={place.idealFor} />
              </View>
            </View>

            <TransportSelector place={place} />

            {place.packages?.length > 0 ? (
              <View style={[styles.section, { gap: 12 }]}>
                <View style={styles.rowGap}>
                  <Fa name="fa-solid fa-suitcase-rolling" size={14} color={tw.emerald700} />
                  <Text style={styles.h3}>Guided tours that visit here</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
                  {place.packages.map((pkg) => (
                    <Press key={pkg.id} scale={0.98} onPress={() => router.push(`/app/packages/${pkg.id}`)} style={styles.pkg}>
                      <Image source={{ uri: pkg.heroImage }} style={styles.pkgImg} resizeMode="cover" />
                      <View style={{ padding: 10, gap: 4 }}>
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
              <View style={[styles.rowGap, { marginBottom: 12 }]}>
                <Fa name="fa-solid fa-leaf" size={16} color={tw.emerald700} />
                <Text style={[styles.h2, { marginBottom: 0 }]}>Local Guide Recommendations</Text>
              </View>
              <View style={{ gap: 10, marginBottom: 16 }}>
                {place.guideTips?.map((tip, idx) => (
                  <View key={idx} style={styles.tip}>
                    <Fa name="fa-solid fa-circle-check" size={14} color={tw.emerald600} style={{ marginTop: 2 }} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.sunset}>
                <Image source={{ uri: place.guideSunsetImage || place.mainImage }} style={styles.sunsetImg} resizeMode="cover" accessibilityLabel="Sunset View" />
                <Text style={styles.sunsetText}>
                  Enjoy the view, Respect the nature{'\n'}
                  <Text style={styles.sunsetStrong}>Love Dima Hasao!</Text>
                </Text>
              </View>
            </View>

            <View style={styles.cta}>
              <LinearGradient colors={['#0A3A22', tw.emerald900]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaKicker}>Ready to visit {place.name}?</Text>
                <Text style={styles.ctaTitle}>Book an auto or cab to get here</Text>
              </View>
              <Press scale={0.92} onPress={handleBookDirect} style={styles.ctaBtn}>
                <Text style={styles.ctaBtnText}>Book Ride →</Text>
              </Press>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Plan your trip, stay safe and{'\n'}enjoy the beauty of Dima Hasao!</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0B2E13' },
  main: { backgroundColor: '#FDFBF7' },
  skeletonCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.gray100, gap: 8 },
  gone: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(700) },
  goneBtn: { backgroundColor: '#0A3A2A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  goneBtnText: { fontSize: 12, lineHeight: 16, color: tw.amber200, ...poppins(700) },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  h2: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 8, flexShrink: 1, ...poppins(700) },
  h3: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  para: { fontSize: 12, lineHeight: 19.5, color: tw.gray700, ...poppins(400) },
  metaBox: { gap: 10, backgroundColor: 'rgba(255,247,237,0.6)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: tw.orange100 },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  metaLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 0.25, color: tw.gray900, ...poppins(700) },
  metaValue: { fontSize: 12, lineHeight: 16.5, color: tw.gray600, ...poppins(400) },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pkg: { width: 176, backgroundColor: '#FDF5E6', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,214,167,0.7)', overflow: 'hidden' },
  pkgImg: { height: 96, width: '100%', backgroundColor: tw.gray200 },
  pkgTitle: { fontSize: 12, lineHeight: 16.5, color: tw.gray900, ...poppins(700) },
  pkgDuration: { fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(400) },
  pkgPrice: { fontSize: 14, lineHeight: 20, color: tw.emerald900, ...poppins(900) },
  pkgPer: { fontSize: 10, color: tw.gray400, ...poppins(500) },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 16.5, color: tw.gray700, ...poppins(400) },
  sunset: { paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.gray100 },
  sunsetImg: { height: 144, borderRadius: 12, marginBottom: 8, backgroundColor: tw.gray200 },
  sunsetText: { textAlign: 'center', fontSize: 12, lineHeight: 18, color: tw.gray600, ...poppins(500) },
  sunsetStrong: { fontSize: 14, color: tw.gray900, ...poppins(700) },
  cta: { borderRadius: 16, overflow: 'hidden', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, ...shadow('lg') },
  ctaKicker: { fontSize: 12, lineHeight: 16, color: tw.amber300, ...poppins(500) },
  ctaTitle: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
  ctaBtn: { backgroundColor: tw.amber400, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, ...shadow('sm') },
  ctaBtnText: { fontSize: 12, lineHeight: 16, color: '#000', ...poppins(700) },
  footer: { backgroundColor: '#0B2E13', paddingVertical: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: tw.emerald900 },
  footerText: { fontSize: 12, lineHeight: 16, color: tw.amber300, textAlign: 'center', fontStyle: 'italic', fontFamily: 'serif' },
});
