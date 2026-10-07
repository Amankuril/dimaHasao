import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronRight, Star, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { Button, Card, IconButton, SectionHeader } from '../../components/ds';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { color, radii, space, type } from '../../theme';
import { PageHeader } from '../components/ui';
import { useRatingsReviews } from '../hooks/pages/useRatingsReviews';

/** The web's delivery BottomPopup: a sheet with a close button and a padded body. */
function Popup({ visible, onClose, children }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onClose={onClose} backdrop={color.overlay}>
      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <View style={styles.sheetHead}>
          <View style={styles.grip} />
          <IconButton icon={ChevronDown} label="Close" onPress={onClose} iconColor={color.textSecondary} style={styles.sheetClose} />
        </View>
        <View style={{ padding: space.lg }}>{children}</View>
      </View>
    </BottomSheet>
  );
}

/** Port of Food/pages/restaurant/RatingsReviews.jsx (/food/restaurant/ratings-reviews). */
export default function RatingsReviews() {
  const insets = useSafeAreaInsets();
  const {
    navigate, goBack, expandedItems, showThankYouPopup, showNotHelpfulPopup, setShowNotHelpfulPopup, feedbackSubmitted, toggleAccordion, handleThankYou, handleNotHelpful,
    handleThankYouPopupClose, handleNotHelpfulPopupClose, restaurantReviewBanner, accordionItems,
  } = useRatingsReviews();

  return (
    <View style={styles.page}>
      <PageHeader title="Ratings, reviews" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.xxxl + insets.bottom }]}>
        <Image source={{ uri: restaurantReviewBanner }} style={styles.banner} resizeMode="cover" accessibilityLabel="Ratings and reviews banner" />

        <Card style={{ gap: space.sm }}>
          <View style={styles.ratingRow}>
            <Text style={[type.subheading, { color: color.text, flex: 1, minWidth: 0 }]}>Your restaurant&apos;s rating</Text>
            {/* The web shows a fixed 4.0 here. */}
            <View style={styles.rating} accessibilityLabel="Rating 4.0 out of 5">
              <Text style={styles.ratingText}>4.0</Text>
              <Star size={16} color={color.goldText} fill={color.gold} />
            </View>
          </View>
          <Button title="View order ratings" variant="ghost" iconRight={ChevronRight} fullWidth={false} onPress={() => navigate('/food/restaurant/feedback?tab=reviews')} style={styles.link} />
        </Card>

        <View>
          <SectionHeader title="Select your concern" />
          <Card padded={false}>
            {accordionItems.map((item, index) => {
              const isExpanded = expandedItems.has(item.id);
              return (
                <View key={item.id} style={index < accordionItems.length - 1 ? styles.divider : null}>
                  <Press scale={1} onPress={() => toggleAccordion(item.id)} accessibilityRole="button" accessibilityLabel={item.question} accessibilityState={{ expanded: isExpanded }} style={styles.question}>
                    <Text style={[styles.questionText, isExpanded ? { color: color.primary } : null]}>{item.question}</Text>
                    <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
                      <ChevronDown size={20} color={isExpanded ? color.primary : color.textMuted} />
                    </View>
                  </Press>
                  {isExpanded ? <Text style={styles.answer}>{item.answer}</Text> : null}
                </View>
              );
            })}
          </Card>
        </View>

        {!feedbackSubmitted ? (
          <View style={{ gap: space.md, paddingTop: space.sm }}>
            <Text style={[type.bodyStrong, { color: color.text, textAlign: 'center' }]}>Was this helpful in resolving your query?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
              <Button title="Yes, thank you" variant="secondary" icon={ThumbsUp} onPress={handleThankYou} style={styles.vote} />
              <Button title="Not helpful" variant="outline" icon={ThumbsDown} onPress={handleNotHelpful} style={styles.vote} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Popup visible={showThankYouPopup} onClose={handleThankYouPopupClose}>
        <View style={styles.popup}>
          <View style={[styles.popupIcon, { backgroundColor: color.successSoft }]}>
            <ThumbsUp size={30} color={color.success} />
          </View>
          <Text style={styles.popupTitle}>Thank you!</Text>
          <Text style={styles.popupBody}>We&apos;re glad we could help resolve your query.</Text>
        </View>
      </Popup>

      <Popup visible={showNotHelpfulPopup} onClose={handleNotHelpfulPopupClose}>
        <View style={styles.popup}>
          <View style={[styles.popupIcon, { backgroundColor: color.surfaceMuted }]}>
            <ThumbsDown size={30} color={color.textSecondary} />
          </View>
          <Text style={styles.popupTitle}>We&apos;re sorry</Text>
          <Text style={[styles.popupBody, { marginBottom: space.lg }]}>We&apos;re sorry this wasn&apos;t helpful. Please contact our support team for further assistance.</Text>
          {/* As on the web, this only closes the popup. */}
          <Button title="Contact support" size="lg" onPress={() => setShowNotHelpfulPopup(false)} />
        </View>
      </Popup>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  scroll: { padding: space.lg, gap: space.xxl },
  banner: { width: '100%', aspectRatio: 3, borderRadius: radii.lg, backgroundColor: color.surfaceMuted },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, height: 32, borderRadius: radii.pill, backgroundColor: color.goldSoft },
  ratingText: { ...type.bodyStrong, color: color.goldText },
  link: { height: 44, paddingHorizontal: 0 },
  vote: { flexGrow: 1, flexBasis: 200 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  question: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingHorizontal: space.lg, paddingVertical: space.md },
  questionText: { flex: 1, ...type.body, color: color.text },
  answer: { paddingHorizontal: space.lg, paddingBottom: space.lg, ...type.small, color: color.textSecondary },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden' },
  sheetHead: { height: 52, alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  grip: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.border },
  sheetClose: { position: 'absolute', right: space.sm, top: space.xs },
  popup: { alignItems: 'stretch', paddingBottom: space.sm },
  popupIcon: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  popupTitle: { ...type.heading, color: color.text, textAlign: 'center', marginBottom: space.xs },
  popupBody: { ...type.body, color: color.textSecondary, textAlign: 'center' },
});
