import { useState, useEffect } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, MessageCircle, ThumbsUp, CornerDownRight, CheckCircle2 } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { Button, Card, EmptyState, SectionHeader, StatusBadge } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { reviewService } from '../services/apiService';
import { getPartnerUser } from '../utils/partnerAuth';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerReviews.jsx
 * (/hotel/partner/reviews). The GSAP stagger-in of the cards is an Animated
 * fade/slide; the yellow-500 star colour is Tailwind's #f0b100.
 */

const StarRow = ({ rating, size }) => (
  <View style={{ flexDirection: 'row', gap: 2 }} accessibilityLabel={`${rating || 0} out of 5 stars`}>
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        size={size}
        color={i < rating ? color.gold : color.borderStrong}
        fill={i < rating ? color.gold : 'none'}
      />
    ))}
  </View>
);

// gsap.fromTo({ y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.5 })
const Reveal = ({ index, children }) => {
  const v = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 500, delay: index * 100, useNativeDriver: true }).start();
  }, [v, index]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
      {children}
    </Animated.View>
  );
};

const ReviewCard = ({ review, onReplySubmit, currentUser }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if showing a placeholder or real reply
  const hasReply = !!review.reply;

  // Helpful State
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulVotes?.length || 0);
  const [isHelpful, setIsHelpful] = useState(review.helpfulVotes?.includes(currentUser?._id) || false);

  const handleHelpful = async () => {
    // Optimistic Update
    const newStatus = !isHelpful;
    setIsHelpful(newStatus);
    setHelpfulCount((prev) => (newStatus ? prev + 1 : prev - 1));

    try {
      await reviewService.toggleHelpful(review._id);
    } catch (error) {
      // Revert on error
      setIsHelpful(!newStatus);
      setHelpfulCount((prev) => (!newStatus ? prev + 1 : prev - 1));
      toast.error('Failed to update helpful status');
    }
  };

  const handleSubmit = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await onReplySubmit(review._id, replyText);
      setReplyText('');
      setIsReplying(false);
      toast.success('Reply posted successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const helpfulColor = isHelpful ? color.primary : color.textSecondary;

  return (
    <Card style={styles.card}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <View style={styles.avatar}>
          <Text style={[type.subheading, { color: color.primary }]}>{review.userId?.name?.[0] || 'G'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.subheading, { color: color.text }]} numberOfLines={1}>
            {review.userId?.name || 'Guest User'}
          </Text>
          <Text style={styles.stayed} numberOfLines={1}>
            Stayed at {review.propertyId?.propertyName || 'Property'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs }}>
            <StarRow rating={review.rating} size={14} />
            <Text style={[type.caption, { color: color.textMuted }]}>{new Date(review.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.comment}>{review.comment}</Text>

      {/* Existing Reply if any */}
      {hasReply && (
        <View style={styles.replyBox}>
          <Text style={[type.label, { color: color.primary }]}>Your reply</Text>
          <Text style={[type.body, { color: color.text }]}>{review.reply}</Text>
          <Text style={[type.caption, { color: color.textMuted, textAlign: 'right' }]}>{new Date(review.replyAt).toLocaleDateString()}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Press scale={1} onPress={handleHelpful} accessibilityState={{ selected: isHelpful }} accessibilityLabel={`Helpful${helpfulCount > 0 ? `, ${helpfulCount}` : ''}`} style={styles.action}>
          <ThumbsUp size={16} color={helpfulColor} fill={isHelpful ? helpfulColor : 'none'} />
          <Text style={[styles.actionText, { color: helpfulColor }]}>
            Helpful{helpfulCount > 0 ? ` (${helpfulCount})` : ''}
          </Text>
        </Press>

        {!hasReply && (
          <Press scale={1} onPress={() => setIsReplying(!isReplying)} accessibilityState={{ expanded: isReplying }} style={styles.action}>
            <MessageCircle size={16} color={isReplying ? color.primary : color.textSecondary} />
            <Text style={[styles.actionText, { color: isReplying ? color.primary : color.textSecondary }]}>Reply</Text>
          </Press>
        )}
        {hasReply && <StatusBadge label="Replied" tone="success" icon={CheckCircle2} />}
      </View>

      {/* Reply Box */}
      {isReplying && !hasReply && (
        <View style={styles.box}>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
            <CornerDownRight size={16} color={color.textMuted} style={{ marginTop: space.md }} />
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Write your reply to the guest..."
              placeholderTextColor={color.textDisabled}
              multiline
              autoFocus
              accessibilityLabel="Reply to the guest"
              style={styles.textarea}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm }}>
            <Button title="Cancel" variant="ghost" size="sm" fullWidth={false} onPress={() => setIsReplying(false)} style={{ minHeight: 44 }} />
            <Button
              title={submitting ? 'Posting...' : 'Post reply'}
              size="sm"
              fullWidth={false}
              onPress={handleSubmit}
              disabled={submitting || !replyText.trim()}
              style={{ minHeight: 44 }}
            />
          </View>
        </View>
      )}
    </Card>
  );
};

const PartnerReviews = () => {
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, breakdown: [0, 0, 0, 0, 0] });
  const [user, setUser] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await reviewService.getAllPartnerReviews();
      setReviews(data);

      // Calculate pseudo stats locally for the UI since backend aggregate endpoint handles pending count but maybe not full breakdown
      if (data.length > 0) {
        const total = data.length;
        const sum = data.reduce((acc, r) => acc + r.rating, 0);
        const avg = (sum / total).toFixed(1);

        // Count starts 5 to 1
        const breakdown = [5, 4, 3, 2, 1].map((star) => {
          const count = data.filter((r) => Math.round(r.rating) === star).length;
          return (count / total) * 100;
        });

        setStats({ avgRating: avg, totalReviews: total, breakdown });
      }
    } catch (error) {
      console.error('Failed to fetch reviews', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = getPartnerUser();
    setUser(u);
    fetchReviews();
  }, []);

  const handleReplySubmit = async (reviewId, replyText) => {
    // Call API
    await reviewService.reply(reviewId, replyText);

    // Optimistic update or refresh
    setReviews((prev) => prev.map((r) => {
      if (r._id === reviewId) {
        return {
          ...r,
          reply: replyText,
          replyAt: new Date().toISOString(),
        };
      }
      return r;
    }));
  };

  return (
    <View style={styles.page}>
      <PartnerHeader title="Reviews" subtitle="What guests are saying" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxxl + insets.bottom }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Scorecard */}
          <Card style={styles.score}>
            <View style={{ alignItems: 'center', minWidth: 96 }}>
              <Text style={styles.avg}>{stats.avgRating || '0.0'}</Text>
              <StarRow rating={Math.round(stats.avgRating)} size={14} />
              <Text style={styles.total}>{stats.totalReviews} reviews</Text>
            </View>

            {/* Bars */}
            <View style={{ flex: 1, gap: space.xs + 2 }}>
              {[0, 1, 2, 3, 4].map((index) => {
                const starLabel = 5 - index; // 5,4,3,2,1
                const percentage = stats.breakdown[index];
                return (
                  <View key={starLabel} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }} accessibilityLabel={`${starLabel} stars: ${Math.round(percentage)}%`}>
                    <Text style={styles.barLabel}>{starLabel}</Text>
                    <Star size={12} color={color.gold} fill={color.gold} />
                    <View style={styles.track}>
                      <View style={{ height: '100%', backgroundColor: color.primary, borderRadius: radii.pill, width: `${percentage}%` }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>

          <SectionHeader title="Guest reviews" style={{ marginTop: space.md, marginBottom: 0 }} />

          {/* Reviews List */}
          {loading ? (
            <View style={{ alignItems: 'center', paddingTop: space.xxxl }}>
              <ActivityIndicator size="large" color={color.primary} />
            </View>
          ) : reviews.length === 0 ? (
            <EmptyState icon={Star} title="No reviews yet." message="Guest reviews will appear here after their stay." />
          ) : (
            reviews.map((review, i) => (
              <Reveal key={review._id} index={i}>
                <ReviewCard review={review} onReplySubmit={handleReplySubmit} currentUser={user} />
              </Reveal>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  score: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  avg: { ...type.priceLg, fontSize: 40, lineHeight: 48, color: color.text },
  total: { ...type.caption, color: color.textMuted, marginTop: space.xs },
  barLabel: { width: 10, ...type.caption, color: color.textSecondary, textAlign: 'right' },
  track: { flex: 1, height: 8, backgroundColor: color.surfaceMuted, borderRadius: radii.pill, overflow: 'hidden' },
  card: { gap: space.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stayed: { ...type.small, color: color.textMuted },
  comment: { ...type.body, color: color.textSecondary },
  replyBox: { backgroundColor: color.primarySoft, borderRadius: radii.md, padding: space.md, gap: space.xs, borderLeftWidth: 3, borderLeftColor: color.primary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingTop: space.xs },
  action: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, minHeight: 44 },
  actionText: { ...type.label },
  box: { backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: space.md, gap: space.sm },
  textarea: { flex: 1, minHeight: 96, ...type.body, color: color.text, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, padding: space.md, textAlignVertical: 'top' },
});

export default PartnerReviews;
