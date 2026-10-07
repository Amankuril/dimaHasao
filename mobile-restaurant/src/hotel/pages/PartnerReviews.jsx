import { useState, useEffect } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Star, MessageCircle, ThumbsUp, CornerDownRight, CheckCircle2 } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { poppins, shadow, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { reviewService } from '../services/apiService';
import { getPartnerUser } from '../utils/partnerAuth';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerReviews.jsx
 * (/hotel/partner/reviews). The GSAP stagger-in of the cards is an Animated
 * fade/slide; the yellow-500 star colour is Tailwind's #f0b100.
 */

const StarRow = ({ rating, size }) => (
  <View style={{ flexDirection: 'row' }}>
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        size={size}
        color={i < rating ? tw.yellow500 : tw.gray300}
        fill={i < rating ? tw.yellow500 : 'none'}
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

  const helpfulColor = isHelpful ? HT.primary : tw.gray400;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 12, color: tw.gray400, ...poppins(700) }}>{review.userId?.name?.[0] || 'G'}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(700) }}>{review.userId?.name || 'Guest User'}</Text>
            <Text style={styles.stayed} numberOfLines={1}>
              STAYED AT: {review.propertyId?.propertyName || 'Property'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <StarRow rating={review.rating} size={10} />
              <Text style={{ fontSize: 10, color: tw.gray400, ...poppins(500) }}>• {new Date(review.createdAt).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.comment}>{review.comment}</Text>

      {/* Existing Reply if any */}
      {hasReply && (
        <View style={styles.replyWrap}>
          <View style={styles.replyBox}>
            <Text style={{ fontSize: 12, lineHeight: 16, color: HT.primary, marginBottom: 4, ...poppins(700) }}>Your Reply</Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) }}>{review.reply}</Text>
            <Text style={{ fontSize: 10, color: tw.gray400, marginTop: 8, textAlign: 'right', ...poppins(400) }}>
              {new Date(review.replyAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Press scale={1} onPress={handleHelpful} style={styles.action}>
          <ThumbsUp size={14} color={helpfulColor} fill={isHelpful ? helpfulColor : 'none'} />
          <Text style={[styles.actionText, { color: helpfulColor }]}>
            Helpful {helpfulCount > 0 && <Text style={{ marginLeft: 2 }}>({helpfulCount})</Text>}
          </Text>
        </Press>

        {!hasReply && (
          <Press scale={1} onPress={() => setIsReplying(!isReplying)} style={styles.action}>
            <MessageCircle size={14} color={isReplying ? HT.primary : tw.gray400} />
            <Text style={[styles.actionText, { color: isReplying ? HT.primary : tw.gray400 }]}>Reply</Text>
          </Press>
        )}
        {hasReply && (
          <View style={styles.action}>
            <CheckCircle2 size={14} color={tw.green600} />
            <Text style={[styles.actionText, { color: tw.green600 }]}>Replied</Text>
          </View>
        )}
      </View>

      {/* Reply Box */}
      {isReplying && !hasReply && (
        <View style={styles.boxWrap}>
          <View style={styles.box}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
              <CornerDownRight size={14} color={tw.gray400} style={{ marginTop: 4 }} />
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Write your reply to the guest..."
                placeholderTextColor={tw.gray400}
                multiline
                autoFocus
                style={styles.textarea}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <Press scale={1} onPress={() => setIsReplying(false)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: tw.gray500, ...poppins(700) }}>Cancel</Text>
              </Press>
              <Press
                onPress={handleSubmit}
                disabled={submitting || !replyText.trim()}
                style={[styles.postBtn, (submitting || !replyText.trim()) && { opacity: 0.5 }]}
              >
                <Text style={{ fontSize: 12, color: '#fff', ...poppins(700) }}>{submitting ? 'Posting...' : 'Post Reply'}</Text>
              </Press>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const PartnerReviews = () => {
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

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Scorecard */}
        <View style={styles.score}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.avg}>{stats.avgRating || '0.0'}</Text>
              <View style={{ marginTop: 4 }}>
                <StarRow rating={Math.round(stats.avgRating)} size={12} />
              </View>
              <Text style={styles.total}>{stats.totalReviews} Reviews</Text>
            </View>

            {/* Bars */}
            <View style={{ flex: 1, gap: 6 }}>
              {[0, 1, 2, 3, 4].map((index) => {
                const starLabel = 5 - index; // 5,4,3,2,1
                const percentage = stats.breakdown[index];
                return (
                  <View key={starLabel} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.barLabel}>{starLabel}</Text>
                    <View style={styles.track}>
                      <View style={{ height: '100%', backgroundColor: HT.primary, borderRadius: 999, width: `${percentage}%` }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Reviews List */}
        <View style={{ paddingHorizontal: 16 }}>
          {loading ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <ActivityIndicator size="small" color={HT.primary} />
            </View>
          ) : reviews.length === 0 ? (
            <Text style={{ textAlign: 'center', paddingVertical: 40, color: tw.gray400, fontSize: 14, ...poppins(400) }}>
              No reviews yet.
            </Text>
          ) : (
            reviews.map((review, i) => (
              <Reveal key={review._id} index={i}>
                <ReviewCard review={review} onReplySubmit={handleReplySubmit} currentUser={user} />
              </Reveal>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: HT.bg },
  score: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: tw.gray100, marginBottom: 24, ...shadow('sm') },
  avg: { fontSize: 48, lineHeight: 48, letterSpacing: -2.4, color: tw.slate900, ...poppins(900) },
  total: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', color: tw.gray400, marginTop: 4, ...poppins(700) },
  barLabel: { width: 8, fontSize: 10, color: tw.gray400, ...poppins(700) },
  track: { flex: 1, height: 6, backgroundColor: tw.gray100, borderRadius: 999, overflow: 'hidden' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: tw.gray100, marginBottom: 16, ...shadow('sm') },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stayed: { fontSize: 10, lineHeight: 15, color: tw.gray500, marginTop: -2, maxWidth: 150, ...poppins(500) },
  comment: { fontSize: 14, lineHeight: 22.75, color: tw.gray600, marginBottom: 16, ...poppins(400) },
  replyWrap: { marginTop: 12, marginBottom: 16, paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: HT.primary },
  replyBox: { backgroundColor: HT.primaryTint, borderRadius: 12, padding: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: tw.gray100, borderStyle: 'dashed', paddingTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 12, lineHeight: 16, ...poppins(700) },
  boxWrap: { marginTop: 16, paddingLeft: 16, borderLeftWidth: 2, borderLeftColor: tw.gray100 },
  box: { backgroundColor: tw.gray50, borderRadius: 12, padding: 12 },
  textarea: { flex: 1, height: 80, fontSize: 14, color: tw.gray900, padding: 0, textAlignVertical: 'top', ...poppins(400) },
  postBtn: { backgroundColor: HT.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, ...shadow('md') },
});

export default PartnerReviews;
