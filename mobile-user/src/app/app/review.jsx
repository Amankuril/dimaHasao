import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { SelectField } from '../../components/kit';
import { Header, PatternDivider } from '../../components/dh/Header';
import { Field, FormScroll, GreenButton, Panel, dhs } from '../../components/dh/ui';
import { useBooking } from '../../context/BookingContext';
import { dh, poppins, shadow, tw } from '../../theme';

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

      <FormScroll contentContainerStyle={{ padding: 14 }} bottomSpace={40}>
        <Panel style={{ gap: 16 }}>
          <View>
            <Text style={dhs.label}>Select Experience to Rate</Text>
            <SelectField value={serviceType} options={SERVICES} onChange={setServiceType} accessibilityLabel="Experience to rate" style={[dhs.input, { gap: 8 }]} textStyle={styles.selectText} />
          </View>

          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
            <Text style={styles.tap}>TAP TO RATE</Text>
            <View style={[dhs.row, { gap: 8 }]} accessibilityRole="adjustable" accessibilityLabel={`Rating ${rating} of 5`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Press key={star} scale={0.9} onPress={() => setRating(star)} accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`} hitSlop={4}>
                  <Fa name={star <= rating ? 'fa-solid fa-star' : 'fa-regular fa-star'} size={30} color={star <= rating ? tw.amber400 : tw.gray300} />
                </Press>
              ))}
            </View>
            <Text style={styles.verdict}>{verdict}</Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={[dhs.label, { marginBottom: 0 }]}>What did you like most?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Press key={tag} scale={0.96} onPress={() => toggleTag(tag)} accessibilityState={{ selected: isSelected }} style={[styles.tag, isSelected && styles.tagSelected]}>
                    <Text style={[styles.tagText, isSelected && { color: tw.amber300 }]}>{tag}</Text>
                  </Press>
                );
              })}
            </View>
          </View>

          <Field
            label="Write a Review (Optional)"
            multiline
            numberOfLines={3}
            placeholder="Tell fellow tourists what made your experience memorable..."
            value={reviewText}
            onChangeText={setReviewText}
            inputStyle={{ padding: 12, paddingTop: 12, ...poppins(400) }}
          />

          <GreenButton title="Submit Verified Review" onPress={handleSubmit} style={{ paddingVertical: 12, ...shadow('md') }} />
        </Panel>
      </FormScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  selectText: { fontSize: 12, color: tw.gray900, ...poppins(600) },
  tap: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray600, ...poppins(700) },
  verdict: { fontSize: 12, lineHeight: 16, color: tw.emerald900, ...poppins(700) },
  tag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: dh.border, backgroundColor: dh.cream },
  tagSelected: { backgroundColor: dh.nav, borderColor: tw.emerald800 },
  tagText: { fontSize: 11, lineHeight: 16.5, color: tw.gray700, ...poppins(600) },
});
