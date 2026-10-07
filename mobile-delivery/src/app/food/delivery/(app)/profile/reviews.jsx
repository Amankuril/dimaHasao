import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../../../components/ds';
import Skeleton from '../../../../../components/Skeleton';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { color, space, type } from '../../../../../theme';

// Web: pages/profile/MyReviewsV2.jsx. Average rating on top, then one card per review.

// Star colour: the warning amber, which keeps contrast on white.
function Stars({ rating, size = 16 }) {
  const count = Math.round(rating || 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }} accessible accessibilityLabel={`${count} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} color={s <= count ? color.warning : color.borderStrong} fill={s <= count ? color.warning : 'none'} />
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
      <ScreenHeader title="My reviews" onBack={goBack} right={!loading ? <StatusBadge tone="neutral" label={`${total} total`} style={{ marginRight: space.sm }} /> : null} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}>
        {loading ? (
          <>
            <Card style={styles.summary}>
              <View style={{ gap: space.sm }}>
                <Skeleton style={styles.s1} />
                <Skeleton style={styles.s2} />
              </View>
              <Skeleton style={styles.s3} />
            </Card>
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} style={{ gap: space.md }}>
                <View style={styles.cardRow}>
                  <Skeleton style={{ width: 112, height: 16, borderRadius: 4 }} />
                  <Skeleton style={{ width: 80, height: 16, borderRadius: 4 }} />
                </View>
                <Skeleton style={{ width: '100%', height: 12, borderRadius: 4 }} />
                <Skeleton style={{ width: '66%', height: 12, borderRadius: 4 }} />
              </Card>
            ))}
          </>
        ) : reviews.length === 0 ? (
          <EmptyState icon={Star} title="No reviews yet" message="Once customers rate your deliveries, their reviews will appear here." />
        ) : (
          <>
            <Card style={styles.summary}>
              <View>
                <Text style={styles.avgLabel}>Average rating</Text>
                <View style={styles.avgRow}>
                  <Text style={styles.avg}>{averageRating || '—'}</Text>
                  <Star size={24} color={color.warning} fill={color.warning} />
                </View>
              </View>
              <Stars rating={averageRating} size={18} />
            </Card>
            {reviews.map((r, idx) => (
              <Card key={r.orderId || idx} style={{ gap: space.sm }}>
                <View style={styles.cardRow}>
                  <Text style={styles.customer} numberOfLines={1}>
                    {r.customer}
                  </Text>
                  <Stars rating={r.rating} />
                </View>
                {r.review ? <Text style={styles.review}>{r.review}</Text> : <Text style={[styles.review, { color: color.textMuted }]}>No written feedback</Text>}
                <View style={styles.foot}>
                  {r.orderId ? (
                    <Text style={styles.footText} numberOfLines={1}>
                      #{r.orderId}
                    </Text>
                  ) : (
                    <View />
                  )}
                  <Text style={styles.footText}>{formatDate(r.submittedAt || r.deliveredAt)}</Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  s1: { width: 96, height: 12, borderRadius: 4 },
  s2: { width: 64, height: 24, borderRadius: 4 },
  s3: { width: 112, height: 20, borderRadius: 4 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  avgLabel: { ...type.label, color: color.textMuted },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginTop: space.xs },
  avg: { ...type.display, color: color.text },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  customer: { ...type.subheading, color: color.text, flex: 1, minWidth: 0 },
  review: { ...type.body, color: color.textSecondary },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingTop: space.xs },
  footText: { ...type.caption, color: color.textMuted, flexShrink: 1 },
});
