import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, UI } from '../cart/ui';
import { navigateTo } from '../../../lib/webRouter';
import { poppins } from '../../../theme';

/*
 * The form AddPayment.jsx and EditPayment.jsx share (their markup is identical).
 * Single-column at phone width (grid-cols-1 below sm).
 */
export const EMPTY_PAYMENT = { cardNumber: '', cardHolder: '', expiryMonth: '', expiryYear: '', cvv: '', type: 'visa' };

export default function PaymentForm({ title, submitLabel, initial = EMPTY_PAYMENT, onSubmit }) {
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#faf6ed' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CardHeader>
            <CardTitle style={styles.title}>{title}</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 16 }}>
            <View style={{ gap: 16 }}>
              <View style={styles.field}>
                <Label>Last 4 Digits of Card Number *</Label>
                <Input placeholder="1234" value={formData.cardNumber} onChangeText={(v) => handleChange('cardNumber', v)} maxLength={4} />
              </View>
              <View style={styles.field}>
                <Label>Cardholder Name *</Label>
                <Input placeholder="John Doe" value={formData.cardHolder} onChangeText={(v) => handleChange('cardHolder', v)} />
              </View>
              <View style={styles.field}>
                <Label>Expiry Month *</Label>
                <Input placeholder="12" value={formData.expiryMonth} onChangeText={(v) => handleChange('expiryMonth', v)} maxLength={2} />
              </View>
              <View style={styles.field}>
                <Label>Expiry Year *</Label>
                <Input placeholder="2025" value={formData.expiryYear} onChangeText={(v) => handleChange('expiryYear', v)} maxLength={4} />
              </View>
              <View style={styles.field}>
                <Label>CVV *</Label>
                <Input placeholder="123" value={formData.cvv} onChangeText={(v) => handleChange('cvv', v)} maxLength={4} secureTextEntry />
              </View>
              <View style={styles.actions}>
                <Button variant="outline" onPress={() => navigateTo('/user/profile/payments')}>Cancel</Button>
                <Button onPress={handleSubmit} style={{ flex: 1 }}>{submitLabel}</Button>
              </View>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 20, lineHeight: 20, color: UI.foreground, ...poppins(600) },
  field: { gap: 8 },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 16 },
});
