import { Text, View } from 'react-native';
import { CheckCircle2, Clock, Edit2, Info } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { shadow, tw } from '../../theme';
import { F } from '../components/shell';
import TablePolicyScreen, { PolicyBanner, PolicyHero, PolicyList, policyStyles } from '../components/dining/TablePolicyScreen';

const RULES = [
  { title: 'Number of Guests', desc: 'Decrease or increase guests (subject to table availability).', icon: <CheckCircle2 size={16} color={tw.green500} /> },
  { title: 'Date & Time Slot', desc: 'Reschedule to any available slot on the same or future dates.', icon: <CheckCircle2 size={16} color={tw.green500} /> },
  { title: 'Special Requests', desc: 'Update your food preferences or celebration notes anytime.', icon: <CheckCircle2 size={16} color={tw.green500} /> },
  { title: 'One-time Free Change', desc: 'Your first modification is always free before the deadline.', icon: <Info size={16} color={tw.amber500} /> },
];

export default function TableModificationPolicy() {
  const location = useLocation();
  const { restaurant, guests, date, timeSlot, discount, specialRequest, user } = location.state || {};

  const handleBack = () =>
    navigateTo('/food/user/dining/book-confirmation', { state: { restaurant, guests, date, timeSlot, discount, specialRequest, user }, replace: true });

  const modify = () => {
    const targetSlug = restaurant?.slug || restaurant?._id || restaurant?.id || 'restaurant';
    navigateTo(`/food/user/dining/book/${targetSlug}`, { state: { restaurant, guests, date, timeSlot, discount, isModifying: true } });
  };

  return (
    <TablePolicyScreen title="Modification" onBack={handleBack}>
      <PolicyHero icon={<Clock size={40} color={F.green} />} bg="rgba(10,77,43,0.1)" title="Can I make changes?" subtitle="Flexible modifications for your comfort" />
      <PolicyBanner
        bg={F.green}
        shadowColor="rgba(10,77,43,0.2)"
        icon={<Edit2 size={24} color="#fff" />}
        label="Modification Status"
        labelColor="rgba(255,255,255,0.7)"
        line={`Free till ${timeSlot}, today`}
        note="You can change guests or time for free."
        noteColor="rgba(255,255,255,0.8)"
      />
      <PolicyList heading="What you can change" items={RULES} />
      <View style={{ paddingTop: 24, gap: 16 }}>
        <Press scale={0.95} onPress={modify} style={[policyStyles.primaryBtn, { backgroundColor: F.green }, shadow('0 20px 25px -5px rgba(10,77,43,0.2), 0 8px 10px -6px rgba(10,77,43,0.2)')]}>
          <Text style={policyStyles.primaryText}>MODIFY DETAILS NOW</Text>
        </Press>
        <Press scale={0.95} onPress={handleBack} style={[policyStyles.primaryBtn, { backgroundColor: tw.slate100 }]}>
          <Text style={[policyStyles.primaryText, { color: tw.slate600 }]}>BACK TO CONFIRMATION</Text>
        </Press>
      </View>
    </TablePolicyScreen>
  );
}
