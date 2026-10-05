import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Info, ShieldCheck } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import TablePolicyScreen, { PolicyBanner, PolicyHero, PolicyList, policyStyles } from '../components/dining/TablePolicyScreen';

const TERMS = [
  { title: 'Full Refund', desc: '100% refund if cancelled before the deadline.', icon: <CheckCircle2 size={16} color={tw.green500} /> },
  { title: 'Processing Time', desc: 'Refunds reach your original payment method in 5-7 days.', icon: <CheckCircle2 size={16} color={tw.green500} /> },
  { title: 'No Show Policy', desc: "Refuds are not applicable if you don't arrive within 15 mins of your slot.", icon: <Info size={16} color={tw.amber500} /> },
  { title: 'Late Cancellation', desc: '50% charge applicable if cancelled after the deadline.', icon: <Info size={16} color={tw.amber500} /> },
];

export default function TableCancellationPolicy() {
  const location = useLocation();
  const { restaurant, guests, date, timeSlot, discount, specialRequest, user } = location.state || {};

  const handleBack = () =>
    navigateTo('/food/user/dining/book-confirmation', { state: { restaurant, guests, date, timeSlot, discount, specialRequest, user }, replace: true });

  return (
    <TablePolicyScreen title="Cancellation" onBack={handleBack}>
      <PolicyHero icon={<ShieldCheck size={40} color={tw.red500} />} bg={tw.red50} title="Cancellation Policy" subtitle="Standard dining terms apply to your booking" />
      <PolicyBanner
        bg={tw.red500}
        shadowColor="#FFC9C9"
        icon={<Info size={24} color="#fff" />}
        label="Cancellation Deadline"
        labelColor={tw.red100}
        line={`Valid till ${timeSlot}, today`}
        note="You can cancel for free before this time."
        noteColor="rgba(255,226,226,0.8)"
      />
      <PolicyList heading="Detailed Terms" items={TERMS} />
      <View style={{ paddingTop: 24 }}>
        <Press scale={0.95} onPress={handleBack} style={[policyStyles.primaryBtn, { backgroundColor: tw.slate900 }, shadow('0 20px 25px -5px #E2E8F0, 0 8px 10px -6px #E2E8F0')]}>
          <Text style={policyStyles.primaryText}>I UNDERSTAND</Text>
        </Press>
        <Text style={styles.foot}>
          {'BY USING DIMA HASAO FOOD DINING, YOU AGREE TO OUR \n'}
          <Text style={styles.footLink}>TERMS OF SERVICE</Text>
        </Text>
      </View>
    </TablePolicyScreen>
  );
}

const styles = StyleSheet.create({
  foot: { textAlign: 'center', fontSize: 10, lineHeight: 20, letterSpacing: 1, color: tw.slate400, marginTop: 24, ...poppins(700) },
  footLink: { color: tw.slate900, textDecorationLine: 'underline' },
});
