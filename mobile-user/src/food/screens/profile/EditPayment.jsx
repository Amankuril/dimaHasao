import { View } from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { useParams, navigateTo } from '../../../lib/webRouter';
import { useProfile } from '../../context/ProfileContext';
import PaymentForm from '../../components/profile/PaymentForm';
import { EmptyState } from '../../../components/ds';
import { color } from '../../../theme';

/** Port of pages/user/profile/EditPayment.jsx. */
export default function EditPayment() {
  const { id } = useParams();
  const { getPaymentMethodById, updatePaymentMethod } = useProfile();
  const payment = getPaymentMethodById(id);

  if (!payment) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg, justifyContent: 'center' }}>
        <EmptyState icon={CreditCard} title="Payment method not found" actionLabel="Back to Payment Methods" onAction={() => navigateTo('/user/profile/payments')} />
      </View>
    );
  }

  return (
    <PaymentForm
      key={payment.id}
      title="Edit Payment Method"
      submitLabel="Update Payment Method"
      initial={{
        cardNumber: payment.cardNumber || '',
        cardHolder: payment.cardHolder || '',
        expiryMonth: payment.expiryMonth || '',
        expiryYear: payment.expiryYear || '',
        cvv: payment.cvv || '',
        type: payment.type || 'visa',
      }}
      onSubmit={(data) => updatePaymentMethod(id, data)}
    />
  );
}
