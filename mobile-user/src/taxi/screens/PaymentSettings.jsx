import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banknote, Check, CreditCard, Plus, Smartphone, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { Button, Card, IconButton, ListRow, SectionHeader, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, tone, type } from '../../theme';
import { Field, PageTitle, useNavPad } from '../account/ui';

const PAYMENT_OPTIONS = [
  { id: 'upi', label: 'UPI', Icon: Smartphone, tone: 'gold' },
  { id: 'card', label: 'Credit / Debit Card', Icon: CreditCard, tone: 'info' },
];

/**
 * Port of Taxi/modules/user/pages/profile/PaymentSettings.jsx. As on the web,
 * added methods live only in this screen's state: nothing is sent to the
 * server, and the card fields are never stored.
 */
export default function PaymentSettings() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const bottomPad = useNavPad(space.xxl);
  const { height: winH } = useWindowDimensions();
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [added, setAdded] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const nameRef = useRef(null);
  const expiryRef = useRef(null);

  const canSubmit = selected === 'upi' ? upiId.trim() : cardNumber && cardName && cardExpiry;
  const reset = () => {
    setShowModal(false);
    setSelected(null);
    setUpiId('');
    setCardNumber('');
    setCardName('');
    setCardExpiry('');
    setIsSuccess(false);
  };
  const handleAdd = () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      const label = selected === 'upi' ? upiId : `•••• ${cardNumber.slice(-4)}`;
      const type = selected;
      setTimeout(() => {
        setAdded((prev) => [...prev, { id: Date.now(), type, label }]);
        reset();
      }, 1800);
    }, 1500);
  };
  const off = isSubmitting || !canSubmit;

  return (
    <View style={styles.flex}>
      <PageTitle title="Payments" subtitle="Your payment methods" onBack={() => navigate('/taxi/user/profile')} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}>
        <SectionHeader title="Payment methods" />
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <ListRow icon={Banknote} iconTone="success" title="Cash" subtitle="Pay the driver at the end of the ride" right={<StatusBadge label="Default" tone="success" icon={Check} />} divider={added.length > 0} />
          {added.map((item, i) => {
            const upi = item.type === 'upi';
            return (
              <ListRow
                key={item.id}
                icon={upi ? Smartphone : CreditCard}
                iconTone={upi ? 'gold' : 'info'}
                title={item.label}
                subtitle={upi ? 'UPI' : 'Card'}
                divider={i < added.length - 1}
                right={
                  <IconButton icon={X} label={`Remove ${item.label}`} variant="danger" iconSize={18} onPress={() => setAdded((prev) => prev.filter((a) => a.id !== item.id))} />
                }
              />
            );
          })}
        </Card>

        <Button title="Add new payment method" icon={Plus} variant="outline" onPress={() => setShowModal(true)} />
      </ScrollView>

      <BottomSheet visible={showModal} onClose={reset} backdrop={color.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" style={[styles.sheet, { maxHeight: winH * 0.9 }]} contentContainerStyle={[styles.sheetBody, { paddingBottom: space.xxl + insets.bottom }]}>
            <View style={styles.sheetHead}>
              <View style={styles.grow}>
                <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">Add payment method</Text>
                <Text style={[type.small, { color: color.textMuted }]}>Choose a method to add</Text>
              </View>
              <IconButton icon={X} label="Close" variant="soft" onPress={reset} />
            </View>

            {isSuccess ? (
              <View style={styles.success} accessibilityLiveRegion="polite">
                <View style={styles.successIcon}>
                  <Check size={36} color={color.success} strokeWidth={3} />
                </View>
                <Text style={[type.heading, { color: color.text }]}>Payment method added!</Text>
              </View>
            ) : (
              <>
                <View style={styles.methods} accessibilityRole="radiogroup">
                  {PAYMENT_OPTIONS.map(({ id, label, Icon, tone: tn }) => {
                    const on = selected === id;
                    const t = tone[tn];
                    return (
                      <Press key={id} scale={0.97} onPress={() => setSelected(id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label} style={[styles.method, on && styles.methodOn]}>
                        <View style={[styles.icon, { backgroundColor: t.bg }]}>
                          <Icon size={22} color={t.fg} />
                        </View>
                        <Text style={[type.label, { color: on ? color.primary : color.text, textAlign: 'center' }]}>{label}</Text>
                      </Press>
                    );
                  })}
                </View>

                {selected === 'upi' ? (
                  <Field label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="name@upi" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" returnKeyType="done" onSubmitEditing={handleAdd} />
                ) : null}

                {selected === 'card' ? (
                  <View style={{ gap: space.md }}>
                    <Field label="Card number" value={cardNumber} onChangeText={(text) => setCardNumber(text.replace(/\D/g, '').slice(0, 16))} placeholder="16-digit card number" keyboardType="number-pad" returnKeyType="next" onSubmitEditing={() => nameRef.current?.focus()} />
                    <Field ref={nameRef} label="Name on card" value={cardName} onChangeText={setCardName} placeholder="As printed on the card" autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => expiryRef.current?.focus()} />
                    <Field ref={expiryRef} label="Card expiry" value={cardExpiry} onChangeText={setCardExpiry} placeholder="MM / YY" keyboardType="numbers-and-punctuation" returnKeyType="done" onSubmitEditing={handleAdd} />
                  </View>
                ) : null}

                {selected ? (
                  <Button title={isSubmitting ? 'Adding...' : 'Add method'} icon={isSubmitting ? undefined : Plus} size="lg" loading={isSubmitting} disabled={off} onPress={handleAdd} />
                ) : null}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.md },
  icon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, ...elevation.sheet },
  sheetBody: { padding: space.xxl, gap: space.xl },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  success: { alignItems: 'center', paddingVertical: space.xxl, gap: space.lg },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center' },
  methods: { flexDirection: 'row', gap: space.md },
  method: { flex: 1, padding: space.lg, borderRadius: radii.lg, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface, alignItems: 'center', gap: space.sm },
  methodOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
});
