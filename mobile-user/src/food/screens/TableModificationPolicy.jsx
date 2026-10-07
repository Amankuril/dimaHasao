import { View } from 'react-native';
import { CheckCircle2, Clock, Edit2, Info } from 'lucide-react-native';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { Button } from '../../components/ds';
import { space } from '../../theme';
import TablePolicyScreen, { PolicyBanner, PolicyHero, PolicyList } from '../components/dining/TablePolicyScreen';

const RULES = [
  { title: 'Number of Guests', desc: 'Decrease or increase guests (subject to table availability).', icon: CheckCircle2, tone: 'success' },
  { title: 'Date & Time Slot', desc: 'Reschedule to any available slot on the same or future dates.', icon: CheckCircle2, tone: 'success' },
  { title: 'Special Requests', desc: 'Update your food preferences or celebration notes anytime.', icon: CheckCircle2, tone: 'success' },
  { title: 'One-time Free Change', desc: 'Your first modification is always free before the deadline.', icon: Info, tone: 'warning' },
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
      <PolicyHero icon={Clock} tone="primary" title="Can I make changes?" subtitle="Flexible modifications for your comfort" />
      <PolicyBanner
        tone="primary"
        icon={Edit2}
        label="Modification status"
        line={`Free till ${timeSlot}, today`}
        note="You can change guests or time for free."
      />
      <PolicyList heading="What you can change" items={RULES} />
      <View style={{ gap: space.md }}>
        <Button title="Modify details now" size="lg" onPress={modify} />
        <Button title="Back to confirmation" variant="outline" size="lg" onPress={handleBack} />
      </View>
    </TablePolicyScreen>
  );
}
