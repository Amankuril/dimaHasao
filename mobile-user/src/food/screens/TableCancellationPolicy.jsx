import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Info, ShieldCheck } from 'lucide-react-native';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { Button } from '../../components/ds';
import { color, space, type } from '../../theme';
import TablePolicyScreen, { PolicyBanner, PolicyHero, PolicyList } from '../components/dining/TablePolicyScreen';

const TERMS = [
  { title: 'Full Refund', desc: '100% refund if cancelled before the deadline.', icon: CheckCircle2, tone: 'success' },
  { title: 'Processing Time', desc: 'Refunds reach your original payment method in 5-7 days.', icon: CheckCircle2, tone: 'success' },
  { title: 'No Show Policy', desc: "Refuds are not applicable if you don't arrive within 15 mins of your slot.", icon: Info, tone: 'warning' },
  { title: 'Late Cancellation', desc: '50% charge applicable if cancelled after the deadline.', icon: Info, tone: 'warning' },
];

export default function TableCancellationPolicy() {
  const location = useLocation();
  const { restaurant, guests, date, timeSlot, discount, specialRequest, user } = location.state || {};

  const handleBack = () =>
    navigateTo('/food/user/dining/book-confirmation', { state: { restaurant, guests, date, timeSlot, discount, specialRequest, user }, replace: true });

  return (
    <TablePolicyScreen title="Cancellation" onBack={handleBack}>
      <PolicyHero icon={ShieldCheck} tone="danger" title="Cancellation Policy" subtitle="Standard dining terms apply to your booking" />
      <PolicyBanner
        tone="danger"
        icon={Info}
        label="Cancellation deadline"
        line={`Valid till ${timeSlot}, today`}
        note="You can cancel for free before this time."
      />
      <PolicyList heading="Detailed terms" items={TERMS} />
      <View>
        <Button title="I understand" size="lg" onPress={handleBack} />
        <Text style={styles.foot}>
          {'By using Dima Hasao Food Dining, you agree to our\n'}
          <Text style={styles.footLink}>Terms of Service</Text>
        </Text>
      </View>
    </TablePolicyScreen>
  );
}

const styles = StyleSheet.create({
  foot: { textAlign: 'center', ...type.caption, color: color.textMuted, marginTop: space.lg },
  footLink: { color: color.primary, textDecorationLine: 'underline' },
});
