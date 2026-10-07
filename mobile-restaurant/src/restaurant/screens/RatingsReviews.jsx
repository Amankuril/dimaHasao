import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronRight, Star, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, tw } from '../../theme';
import { PageHeader, PrimaryButton } from '../components/ui';
import { useRatingsReviews } from '../hooks/pages/useRatingsReviews';
import { RT } from '../theme';

/** The web's delivery BottomPopup (handle, close chevron header, padded body), bg-black/50 backdrop. */
function Popup({ visible, onClose, children }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onClose={onClose} backdrop="rgba(0,0,0,0.5)">
      <View style={[styles.popupSheet, { paddingBottom: insets.bottom }]}>
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
          <ChevronDown size={24} color={tw.gray400} style={{ marginBottom: 4 }} />
          <View style={{ width: 48, height: 6, borderRadius: 3, backgroundColor: tw.gray300 }} />
        </View>
        <View style={styles.popupHeader}>
          <Press onPress={onClose} accessibilityLabel="Close" hitSlop={8} style={{ padding: 8, marginLeft: 'auto' }}>
            <ChevronDown size={24} color={tw.gray600} />
          </Press>
        </View>
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>{children}</View>
      </View>
    </BottomSheet>
  );
}

/** Port of Food/pages/restaurant/RatingsReviews.jsx (/food/restaurant/ratings-reviews). */
export default function RatingsReviews() {
  const {
    navigate, goBack, expandedItems, showThankYouPopup, showNotHelpfulPopup, setShowNotHelpfulPopup, feedbackSubmitted, toggleAccordion, handleThankYou, handleNotHelpful,
    handleThankYouPopupClose, handleNotHelpfulPopupClose, restaurantReviewBanner, accordionItems,
  } = useRatingsReviews();

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageHeader title="Ratings, reviews" onBack={goBack} />
      <ScrollView>
        <Image source={{ uri: restaurantReviewBanner }} style={{ width: '100%', aspectRatio: 3 }} resizeMode="cover" accessibilityLabel="Ratings and reviews banner" />

        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) }}>Your restaurant&apos;s rating</Text>
            {/* The web shows a fixed 4.0 here. */}
            <View style={styles.rating}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) }}>4.0</Text>
              <Star size={16} color="#fff" fill="#fff" />
            </View>
          </View>
          <Press scale={1} onPress={() => navigate('/food/restaurant/feedback?tab=reviews')} hitSlop={8} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: RT.primary, ...poppins(400) }}>View order ratings</Text>
            <ChevronRight size={16} color={RT.primary} />
          </Press>
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <View style={styles.concern}>
            <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 16, ...poppins(700) }}>Select your concern</Text>
            {accordionItems.map((item, index) => {
              const isExpanded = expandedItems.has(item.id);
              return (
                <View key={item.id}>
                  <Press scale={1} onPress={() => toggleAccordion(item.id)} accessibilityState={{ expanded: isExpanded }} style={styles.question}>
                    <Text style={styles.questionText}>{item.question}</Text>
                    <View style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}>
                      <ChevronDown size={20} color={tw.gray900} />
                    </View>
                  </Press>
                  {index < accordionItems.length - 1 ? <View style={{ borderBottomWidth: 1, borderBottomColor: tw.gray300 }} /> : null}
                  {isExpanded ? <Text style={styles.answer}>{item.answer}</Text> : null}
                </View>
              );
            })}
          </View>
        </View>

        {!feedbackSubmitted ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 32 }}>
            <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, textAlign: 'center', marginBottom: 16, ...poppins(600) }}>Was this helpful in resolving your query?</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Press scale={0.98} onPress={handleThankYou} style={[styles.vote, { borderColor: RT.primary }]}>
                <ThumbsUp size={20} color={RT.primary} />
                <Text style={[styles.voteText, { color: RT.primary }]}>Yes, thank you</Text>
              </Press>
              <Press scale={0.98} onPress={handleNotHelpful} style={[styles.vote, { borderColor: tw.gray400 }]}>
                <ThumbsDown size={20} color={tw.gray600} />
                <Text style={[styles.voteText, { color: tw.gray600 }]}>Not helpful</Text>
              </Press>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Popup visible={showThankYouPopup} onClose={handleThankYouPopupClose}>
        <View style={styles.popup}>
          <View style={[styles.popupIcon, { backgroundColor: tw.green100 }]}>
            <ThumbsUp size={32} color={tw.green600} />
          </View>
          <Text style={styles.popupTitle}>Thank you!</Text>
          <Text style={styles.popupBody}>We&apos;re glad we could help resolve your query.</Text>
        </View>
      </Popup>

      <Popup visible={showNotHelpfulPopup} onClose={handleNotHelpfulPopupClose}>
        <View style={styles.popup}>
          <View style={[styles.popupIcon, { backgroundColor: tw.gray100 }]}>
            <ThumbsDown size={32} color={tw.gray600} />
          </View>
          <Text style={styles.popupTitle}>We&apos;re sorry</Text>
          <Text style={[styles.popupBody, { marginBottom: 16 }]}>We&apos;re sorry this wasn&apos;t helpful. Please contact our support team for further assistance.</Text>
          {/* As on the web, this only closes the popup. */}
          <PrimaryButton title="Contact Support" onPress={() => setShowNotHelpfulPopup(false)} style={{ alignSelf: 'stretch' }} textStyle={{ fontSize: 16, lineHeight: 24 }} />
        </View>
      </Popup>
    </View>
  );
}

const styles = StyleSheet.create({
  rating: { backgroundColor: tw.green600, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  concern: { borderWidth: 1, borderColor: tw.gray100, borderRadius: 8, padding: 16 },
  question: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  questionText: { flex: 1, paddingRight: 16, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) },
  answer: { paddingBottom: 12, paddingTop: 4, fontSize: 14, lineHeight: 23, color: tw.gray700, ...poppins(400) },
  vote: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, backgroundColor: '#fff', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
  voteText: { fontSize: 14, lineHeight: 20, ...poppins(600) },
  popup: { alignItems: 'center', paddingVertical: 24 },
  popupSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  popupHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  popupIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  popupTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  popupBody: { fontSize: 14, lineHeight: 20, color: tw.gray600, textAlign: 'center', ...poppins(400) },
});
