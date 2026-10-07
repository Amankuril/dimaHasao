import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, X } from 'lucide-react-native';
import { Button, Card, IconButton } from '../../components/ds';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { color, radii, space, type } from '../../theme';
import { useShareFeedback } from '../hooks/pages/useShareFeedback';
import { dialogPanel } from './finance/financeUi';
import { PinnedBar, ScreenHeader } from './inventory/partnerKit';

/* Decorative bar art (heights from the web); token tints instead of the web's pastel hexes. */
const BARS = [
  { height: 64, color: color.primarySoft },
  { height: 104, color: color.goldSoft },
  { height: 80, color: color.primaryBorder },
  { height: 92, color: color.gold },
  { height: 72, color: color.primarySoft },
];

/** Port of Food/pages/restaurant/ShareFeedback.jsx (/food/restaurant/share-feedback). */
export default function ShareFeedback() {
  const { companyName, goBack, rating, setRating, showThanks, setShowThanks, numbers, handleClose, handleContinue } = useShareFeedback();
  const done = () => {
    setShowThanks(false);
    goBack();
  };
  // Two rows (0-5, 6-10) so every number keeps a 44 px target on a 360 px phone.
  const rows = [numbers.slice(0, 6), numbers.slice(6)];
  return (
    <View style={styles.page}>
      <ScreenHeader title="Share your feedback" right={<IconButton icon={X} label="Close" variant="inverse" onPress={handleClose} />} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <Text style={[type.body, { color: color.textSecondary }]}>Tell us about your</Text>
          <Text style={[type.heading, { color: color.text }]}>Overall experience with {companyName.toLowerCase()}</Text>
        </View>

        <Card style={{ gap: space.md }}>
          <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
            {rows.map((row, r) => (
              <View key={r} style={styles.scaleRow}>
                {row.map((num) => {
                  const on = rating === num;
                  return (
                    <Press
                      key={num}
                      scale={0.94}
                      onPress={() => setRating(num)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${num} out of 10`}
                      style={[styles.num, on ? styles.numOn : null]}
                    >
                      <Text style={[type.bodyStrong, { color: on ? color.onPrimary : color.text }]}>{num}</Text>
                    </Press>
                  );
                })}
                {row.length < 6 ? <View style={{ flex: 6 - row.length }} /> : null}
              </View>
            ))}
          </View>
          <View style={styles.ends}>
            <Text style={[type.caption, { color: color.danger }]}>Very bad</Text>
            <Text style={[type.caption, { color: color.success }]}>Very good</Text>
          </View>
          {rating !== null ? (
            <Text style={[type.small, { color: color.textSecondary }]}>
              You rated your experience <Text style={{ color: color.text, fontFamily: 'Poppins_600SemiBold' }}>{rating}/10</Text>.
            </Text>
          ) : null}
        </Card>

        <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {BARS.map((bar, i) => (
            <View key={i} style={{ width: 36, height: bar.height, borderRadius: 18, backgroundColor: bar.color }} />
          ))}
        </View>
      </ScrollView>

      <PinnedBar>
        <Button title="Continue" size="lg" disabled={rating === null} onPress={handleContinue} />
      </PinnedBar>

      <Dialog visible={showThanks} onClose={done} backdrop={color.overlay} panelStyle={[dialogPanel, styles.thanks]}>
        <View style={styles.thanksIcon}>
          <CheckCircle2 size={28} color={color.success} />
        </View>
        <Text style={[type.heading, { color: color.text, textAlign: 'center' }]}>Thanks for your feedback</Text>
        <Text style={[type.small, { color: color.textSecondary, textAlign: 'center', marginTop: space.xs, marginBottom: space.lg }]}>It helps us improve your experience with {companyName.toLowerCase()}.</Text>
        <Button title="Done" onPress={done} />
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  scroll: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  scaleRow: { flexDirection: 'row', gap: space.sm },
  num: { flex: 1, height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  numOn: { backgroundColor: color.primary, borderColor: color.primary },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  art: { alignSelf: 'center', width: '100%', maxWidth: 320, height: 160, borderRadius: radii.xl, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: space.xxl, paddingBottom: space.xl, backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border },
  thanks: { padding: space.xxl },
  thanksIcon: { alignSelf: 'center', marginBottom: space.md, width: 56, height: 56, borderRadius: 28, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center' },
});
