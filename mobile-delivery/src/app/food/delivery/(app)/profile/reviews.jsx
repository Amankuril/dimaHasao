import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Star } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import Skeleton from '../../../../../components/Skeleton';
import { Press } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { display, ff, shadow, tw } from '../../../../../theme';

// Web: pages/profile/MyReviewsV2.jsx. `font-poppins` -> Nunito; rounded-2xl -> #E5DDC3 + card shadow.

function Stars({ rating }) {
  const count = Math.round(rating || 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={16} color={s <= count ? tw.amber400 : tw.gray300} fill={s <= count ? tw.amber400 : 'none'} />
      ))}
    </View>
  );
}

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export default function MyReviewsV2() {
  const goBack = useDeliveryBackNavigation();
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await deliveryAPI.getMyReviews({ limit: 200 });
        if (response?.data?.success) {
          const data = response.data.data || {};
          setReviews(data.reviews || []);
          setAverageRating(data.averageRating || 0);
          setTotal(data.total || 0);
        }
      } catch {
        toast.error('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.page}>
      <View style={[styles.header, shadow('sm'), { paddingTop: 20 + insets.top }]}>
        <Press onPress={goBack} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={24} color={tw.gray950} />
        </Press>
        <Star size={20} color={tw.primary} />
        <Text style={styles.title}>My Reviews</Text>
        {!loading ? <Text style={styles.total}>{total}</Text> : null}
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingTop: 96 + insets.top }]}>
        {loading ? (
          <>
            <View style={[styles.skelSummary, shadow('card')]}>
              <View style={{ gap: 8 }}>
                <Skeleton style={styles.s1} />
                <Skeleton style={styles.s2} />
              </View>
              <Skeleton style={styles.s3} />
            </View>
            {Array.from({ length: 4 }).map((_, idx) => (
              <View key={idx} style={[styles.card, shadow('card'), { gap: 12 }]}>
                <View style={styles.cardRow}>
                  <Skeleton style={{ width: 112, height: 16, borderRadius: 4, backgroundColor: tw.slate200 }} />
                  <Skeleton style={{ width: 80, height: 16, borderRadius: 4, backgroundColor: tw.slate200 }} />
                </View>
                <Skeleton style={{ width: '100%', height: 12, borderRadius: 4, backgroundColor: tw.slate200 }} />
                <Skeleton style={{ width: '66%', height: 12, borderRadius: 4, backgroundColor: tw.slate200 }} />
              </View>
            ))}
          </>
        ) : reviews.length === 0 ? (
          <View style={styles.empty}>
            <Star size={40} color={tw.gray200} />
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptyText}>Once customers rate your deliveries, their reviews will appear here.</Text>
          </View>
        ) : (
          <>
            <View style={[styles.summary, shadow('card')]}>
              <View>
                <Text style={styles.avgLabel}>Average Rating</Text>
                <View style={styles.avgRow}>
                  <Text style={styles.avg}>{averageRating || '—'}</Text>
                  <Star size={24} color={tw.amber400} fill={tw.amber400} />
                </View>
              </View>
              <Stars rating={averageRating} />
            </View>
            {reviews.map((r, idx) => (
              <View key={r.orderId || idx} style={[styles.card, shadow('card'), { gap: 8 }]}>
                <View style={styles.cardRow}>
                  <Text style={styles.customer}>{r.customer}</Text>
                  <Stars rating={r.rating} />
                </View>
                {/* `italic` renders upright on the web (no italic face loaded) */}
                {r.review ? <Text style={styles.review}>{r.review}</Text> : <Text style={[styles.review, { color: tw.gray400 }]}>No written feedback</Text>}
                <View style={styles.foot}>
                  {r.orderId ? <Text style={styles.footText}>#{r.orderId}</Text> : <View />}
                  <Text style={styles.footText}>{formatDate(r.submittedAt || r.deliveredAt)}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: tw.gray50 },
  back: { padding: 4, borderRadius: 999 },
  title: { fontSize: 20, lineHeight: 28, color: tw.gray950, ...display(900, 20) },
  total: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', fontSize: 14, lineHeight: 20, backgroundColor: tw.slate100, color: tw.slate700, ...ff(600) },
  body: { paddingHorizontal: 16, paddingBottom: 80, gap: 16 },
  skelSummary: { backgroundColor: tw.slate50, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  s1: { width: 96, height: 12, borderRadius: 4, backgroundColor: tw.slate200 },
  s2: { width: 64, height: 24, borderRadius: 4, backgroundColor: tw.slate200 },
  s3: { width: 112, height: 20, borderRadius: 4, backgroundColor: tw.slate200 },
  empty: { paddingVertical: 80, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 14, lineHeight: 20, color: tw.gray400, ...ff(700) },
  emptyText: { fontSize: 12, lineHeight: 16, color: tw.gray400, textAlign: 'center', paddingHorizontal: 32, ...ff(500) },
  summary: { backgroundColor: tw.amber50, borderWidth: 1, borderColor: '#E5DDC3', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avgLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase', color: tw.amber600, ...ff(600) },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  avg: { fontSize: 30, lineHeight: 36, color: tw.amber700, ...display(900, 30) },
  card: { borderWidth: 1, borderColor: '#E5DDC3', borderRadius: 16, padding: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customer: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...ff(700) },
  review: { fontSize: 14, lineHeight: 22.75, color: tw.gray600, ...ff(500) },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  footText: { fontSize: 11, lineHeight: 16.5, color: tw.gray400, ...ff(500) },
});
