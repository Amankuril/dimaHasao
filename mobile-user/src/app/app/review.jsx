import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { SelectField } from '../../components/kit';
import { Chip } from '../../components/ds';
import { Header, PatternDivider } from '../../components/dh/Header';
import { Field, FormScroll, GreenButton, Panel, dhs } from '../../components/dh/ui';
import { useBooking } from '../../context/BookingContext';
import { color, radii, space, type } from '../../theme';

// Web: DimaHasao/pages/RatingReviewScreen.jsx (/app/review).
// As on the web, this form thanks the visitor and returns to My Bookings; it
// does not call an API.

const SERVICES = [
  { value: 'Taxi Ride', label: 'Taxi Ride (Auto / Cab)' },
  { value: 'Hotel Stay', label: 'Hotel & Resort Stay' },
  { value: 'Food Order', label: 'Food & Dining Experience' },
  { value: 'Tour Package', label: 'Tour Package & Guided Trek' },
];

const TAGS = ['On-Time Pickup', 'Friendly Driver', 'Clean Vehicle', 'Great View', 'Delicious Food', 'Humble Guide', 'Safe Driving', 'Worth the Price'];

export default function RatingReviewScreen() {
  const { showToast } = useBooking();
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState(['Friendly Driver', 'Clean Vehicle']);
  const [reviewText, setReviewText] = useState('');
  const [serviceType, setServiceType] = useState('Taxi Ride');

  const toggleTag = (tag) => setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const handleSubmit = () => {
    showToast('Thank you for rating your Dima Hasao experience! ⭐');
    router.replace('/app/bookings');
  };

  const verdict = rating === 5 ? '⭐ Outstanding Experience' : rating === 4 ? '👍 Very Good' : rating === 3 ? '👌 Average' : '👎 Needs Improvement';

  return (
    <View style={dhs.page}>
      <Header title="RATE & REVIEW" subtitle="Share your honest feedback" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <FormScroll contentContainerStyle={{ padding: space.lg }} bottomSpace={space.xxl}>
        <Panel style={{ gap: space.xl }}>
          <View>
            <Text style={dhs.label}>Select experience to rate</Text>
            <SelectField value={serviceType} options={SERVICES} onChange={setServiceType} accessibilityLabel="Experience to rate" style={[dhs.input, { gap: space.sm }]} textStyle={styles.selectText} chevronColor={color.text} />
          </View>

          <View style={styles.rateBox}>
            <Text style={styles.tap}>Tap to rate</Text>
            <View style={[dhs.row, { gap: space.xs }]} accessibilityRole="adjustable" accessibilityLabel={`Rating ${rating} of 5`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Press key={star} scale={0.9} onPress={() => setRating(star)} accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`} accessibilityState={{ selected: star <= rating }} style={styles.star}>
                  <Fa name={star <= rating ? 'fa-solid fa-star' : 'fa-regular fa-star'} size={32} color={star <= rating ? color.goldBright : color.borderStrong} />
                </Press>
              ))}
            </View>
            <Text style={styles.verdict}>{verdict}</Text>
          </View>

          <View style={{ gap: space.sm }}>
            <Text style={[dhs.label, { marginBottom: 0 }]}>What did you like most?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {TAGS.map((tag) => (
                <Chip key={tag} label={tag} selected={selectedTags.includes(tag)} onPress={() => toggleTag(tag)} />
              ))}
            </View>
          </View>

          <Field label="Write a review (optional)" multiline numberOfLines={3} placeholder="Tell fellow tourists what made your experience memorable..." value={reviewText} onChangeText={setReviewText} />

          <GreenButton title="Submit verified review" size="lg" onPress={handleSubmit} />
        </Panel>
      </FormScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  selectText: { flex: 1, ...type.bodyStrong, color: color.text },
  rateBox: { alignItems: 'center', gap: space.sm, paddingVertical: space.md, backgroundColor: color.surfaceMuted, borderRadius: radii.md },
  tap: { ...type.overline, color: color.textSecondary },
  star: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  verdict: { ...type.bodyStrong, color: color.primary },
});
