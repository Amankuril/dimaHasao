import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { navigateTo } from '../../../lib/webRouter';
import { FormField } from './ProfileChrome';
import { color, space, type } from '../../../theme';

/*
 * The form AddPayment.jsx and EditPayment.jsx share (their markup is identical).
 * Single column; labels above 48 px inputs.
 */
export const EMPTY_PAYMENT = { cardNumber: '', cardHolder: '', expiryMonth: '', expiryYear: '', cvv: '', type: 'visa' };

export default function PaymentForm({ title, submitLabel, initial = EMPTY_PAYMENT, onSubmit }) {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({ ...EMPTY_PAYMENT, ...initial });

  const handleChange = (name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Auto-detect card type based on first digit
      if (name === 'cardNumber' && value.length > 0) {
        const first = value[0];
        if (first === '4') next.type = 'visa';
        else if (first === '5' || first === '2') next.type = 'mastercard';
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (!formData.cardNumber || !formData.cardHolder || !formData.expiryMonth || !formData.expiryYear || !formData.cvv) {
      Alert.alert('Please fill in all required fields');
      return;
    }
    if (formData.cardNumber.length !== 4 || !/^\d+$/.test(formData.cardNumber)) {
      Alert.alert('Please enter the last 4 digits of your card');
      return;
    }
    if (formData.cvv.length < 3 || !/^\d+$/.test(formData.cvv)) {
      Alert.alert('Please enter a valid CVV');
      return;
    }
    onSubmit(formData);
    navigateTo('/user/profile/payments');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: space.lg }}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <FormField label="Last 4 digits of card number *" placeholder="1234" value={formData.cardNumber} onChangeText={(v) => handleChange('cardNumber', v)} maxLength={4} keyboardType="number-pad" />
          <FormField label="Cardholder name *" placeholder="John Doe" value={formData.cardHolder} onChangeText={(v) => handleChange('cardHolder', v)} autoComplete="name" />
          <View style={styles.pair}>
            <FormField label="Expiry month *" placeholder="12" value={formData.expiryMonth} onChangeText={(v) => handleChange('expiryMonth', v)} maxLength={2} keyboardType="number-pad" style={{ flex: 1 }} />
            <FormField label="Expiry year *" placeholder="2025" value={formData.expiryYear} onChangeText={(v) => handleChange('expiryYear', v)} maxLength={4} keyboardType="number-pad" style={{ flex: 1 }} />
          </View>
          <FormField label="CVV *" placeholder="123" value={formData.cvv} onChangeText={(v) => handleChange('cvv', v)} maxLength={4} secureTextEntry keyboardType="number-pad" />
          <View style={styles.actions}>
            <Button title="Cancel" variant="outline" fullWidth={false} onPress={() => navigateTo('/user/profile/payments')} />
            <Button title={submitLabel} onPress={handleSubmit} style={{ flex: 1 }} />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg },
  title: { ...type.heading, color: color.text },
  pair: { flexDirection: 'row', gap: space.md },
  actions: { flexDirection: 'row', gap: space.sm, paddingTop: space.sm },
});
