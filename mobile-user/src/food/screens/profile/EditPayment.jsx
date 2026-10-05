import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useParams, navigateTo } from '../../../lib/webRouter';
import { useProfile } from '../../context/ProfileContext';
import PaymentForm from '../../components/profile/PaymentForm';
import { Button, Card, CardContent, UI } from '../../components/cart/ui';
import { poppins } from '../../../theme';

/** Port of pages/user/profile/EditPayment.jsx. */
export default function EditPayment() {
  const { id } = useParams();
  const { getPaymentMethodById, updatePaymentMethod } = useProfile();
  const payment = getPaymentMethodById(id);

  if (!payment) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#faf6ed' }} contentContainerStyle={{ padding: 16 }}>
        <Card>
          <CardContent style={{ paddingVertical: 8, alignItems: 'center' }}>
            <Text style={styles.text}>Payment method not found</Text>
            <View style={{ marginTop: 16 }}>
              <Button onPress={() => navigateTo('/user/profile/payments')}>Back to Payment Methods</Button>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
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

const styles = StyleSheet.create({
  text: { color: UI.mutedForeground, fontSize: 16, lineHeight: 24, ...poppins(400) },
});
