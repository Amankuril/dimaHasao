import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Banknote, Check, CreditCard, Plus, Smartphone, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';

const PURPLE = { 50: '#FAF5FF', 100: '#F3E8FF', 400: '#C27AFF', 600: '#9810FA' };
const BLUE = { 50: '#EFF6FF', 100: '#DBEAFE', 400: '#51A2FF', 600: '#155DFC' };
const PAYMENT_OPTIONS = [
  { id: 'upi', label: 'UPI', Icon: Smartphone, tone: PURPLE },
  { id: 'card', label: 'Credit / Debit Card', Icon: CreditCard, tone: BLUE },
];

/**
 * Port of Taxi/modules/user/pages/profile/PaymentSettings.jsx. As on the web,
 * added methods live only in this screen's state: nothing is sent to the
 * server, and the card fields are never stored.
 */
export default function PaymentSettings() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
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
    <View style={{ flex: 1, backgroundColor: '#FDFDFD' }}>
      <View style={[styles.header, { paddingTop: 20 + insets.top }]}>
        <Press scale={0.95} onPress={() => navigate('/taxi/user/profile')} accessibilityLabel="Go back" style={{ padding: 8 }} hitSlop={6}>
          <ArrowLeft size={24} color={tw.gray900} />
        </Press>
        <Text style={styles.title} accessibilityRole="header">Payments</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 + insets.bottom }}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.icon, { backgroundColor: tw.green50 }]}>
              <Banknote size={24} color={tw.green600} />
            </View>
            <View>
              <Text style={styles.rowTitle}>Cash</Text>
              <Text style={styles.rowSub}>Default</Text>
            </View>
          </View>
          <View style={styles.defaultMark}>
            <Check size={14} color="#fff" strokeWidth={3} />
          </View>
        </View>

        {added.map((item) => {
          const upi = item.type === 'upi';
          return (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.icon, { backgroundColor: upi ? PURPLE[50] : BLUE[50] }]}>{upi ? <Smartphone size={20} color={PURPLE[600]} /> : <CreditCard size={20} color={BLUE[600]} />}</View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.label}</Text>
                  <Text style={styles.rowSub}>{upi ? 'UPI' : 'Card'}</Text>
                </View>
              </View>
              <Press scale={0.9} onPress={() => setAdded((prev) => prev.filter((a) => a.id !== item.id))} accessibilityLabel={`Remove ${item.label}`} style={styles.remove} hitSlop={10}>
                <X size={14} color={tw.red400} strokeWidth={3} />
              </Press>
            </View>
          );
        })}

        <Press scale={0.97} onPress={() => setShowModal(true)} accessibilityLabel="Add new payment method" style={styles.addNew}>
          <Plus size={18} color={tw.gray400} />
          <Text style={styles.addNewText}>Add New Payment Method</Text>
        </Press>
      </ScrollView>

      <BottomSheet visible={showModal} onClose={reset} backdrop="rgba(0,0,0,0.6)" panelStyle={[styles.modal, { marginBottom: 16 + insets.bottom }]}>
        <Press scale={0.9} onPress={reset} accessibilityLabel="Close" style={styles.close}>
          <X size={18} color={tw.gray400} />
        </Press>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={styles.modalTitle}>ADD PAYMENT METHOD</Text>
          <Text style={styles.modalSub}>CHOOSE A METHOD TO ADD</Text>
        </View>

        {isSuccess ? (
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 16 }} accessibilityLiveRegion="polite">
            <View style={styles.successIcon}>
              <Check size={40} color={tw.green500} strokeWidth={3} />
            </View>
            <Text style={styles.successText}>Payment Method Added!</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {PAYMENT_OPTIONS.map(({ id, label, Icon, tone }) => {
                const on = selected === id;
                return (
                  <Press key={id} scale={0.95} onPress={() => setSelected(id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label} style={[styles.method, on ? { borderColor: tone[400], backgroundColor: tone[50] } : null]}>
                    <View style={[styles.icon, { backgroundColor: tone[100] }]}>
                      <Icon size={22} color={tone[600]} strokeWidth={2} />
                    </View>
                    <Text style={styles.methodLabel}>{label}</Text>
                  </Press>
                );
              })}
            </View>

            {selected === 'upi' ? (
              <TextInput value={upiId} onChangeText={setUpiId} placeholder="Enter UPI ID (e.g. name@upi)" placeholderTextColor={tw.gray300} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" returnKeyType="done" onSubmitEditing={handleAdd} accessibilityLabel="UPI ID" style={styles.input} />
            ) : null}

            {selected === 'card' ? (
              <View style={{ gap: 12 }}>
                <TextInput value={cardNumber} onChangeText={(text) => setCardNumber(text.replace(/\D/g, '').slice(0, 16))} placeholder="Card number" placeholderTextColor={tw.gray300} keyboardType="number-pad" returnKeyType="next" onSubmitEditing={() => nameRef.current?.focus()} accessibilityLabel="Card number" style={styles.input} />
                <TextInput ref={nameRef} value={cardName} onChangeText={setCardName} placeholder="Name on card" placeholderTextColor={tw.gray300} autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => expiryRef.current?.focus()} accessibilityLabel="Name on card" style={styles.input} />
                <TextInput ref={expiryRef} value={cardExpiry} onChangeText={setCardExpiry} placeholder="MM / YY" placeholderTextColor={tw.gray300} keyboardType="numbers-and-punctuation" returnKeyType="done" onSubmitEditing={handleAdd} accessibilityLabel="Card expiry" style={styles.input} />
              </View>
            ) : null}

            {selected ? (
              <Press scale={0.97} disabled={off} onPress={handleAdd} accessibilityLabel="Add method" accessibilityState={{ disabled: off, busy: isSubmitting }} style={[styles.submit, off ? { backgroundColor: tw.gray100, elevation: 0, shadowOpacity: 0 } : null]}>
                {isSubmitting ? null : <Plus size={18} color={off ? tw.gray300 : '#fff'} strokeWidth={3} />}
                <Text style={[styles.submitText, off ? { color: tw.gray300 } : null]}>{isSubmitting ? 'ADDING...' : 'ADD METHOD'}</Text>
              </Press>
            ) : null}
          </>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray50 },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...fo(900) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#fff', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: tw.gray50, ...shadow('sm') },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...fo(900) },
  rowSub: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...fo(400) },
  defaultMark: { width: 24, height: 24, borderRadius: 12, backgroundColor: tw.green500, alignItems: 'center', justifyContent: 'center' },
  remove: { width: 28, height: 28, borderRadius: 14, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center' },
  addNew: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray200, borderRadius: 32 },
  addNewText: { fontSize: 16, lineHeight: 24, color: tw.gray400, ...fo(700) },
  modal: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 32, padding: 32, paddingBottom: 40, gap: 24, ...shadow('2xl') },
  close: { position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  modalTitle: { fontSize: 20, lineHeight: 28, letterSpacing: -0.5, color: tw.gray900, textAlign: 'center', ...fo(900) },
  modalSub: { fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: tw.gray400, textAlign: 'center', ...fo(700) },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: tw.green50, alignItems: 'center', justifyContent: 'center' },
  successText: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...fo(900) },
  method: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 2, borderColor: tw.gray100, backgroundColor: '#fff', alignItems: 'center', gap: 12 },
  methodLabel: { fontSize: 12, lineHeight: 15, color: tw.gray700, textAlign: 'center', ...fo(900) },
  input: { height: 56, backgroundColor: tw.gray50, borderWidth: 2, borderColor: tw.gray100, borderRadius: 18, paddingHorizontal: 20, fontSize: 14, color: tw.gray900, ...fo(700) },
  submit: { height: 56, borderRadius: 22, backgroundColor: tw.gray900, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow('xl') },
  submitText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: '#fff', ...fo(900) },
});
