import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { IndianRupee, X } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { Button, IconButton } from '../../../components/ds';
import { userAPI } from '../../../api/food';
import { initRazorpayPayment } from '../../../lib/razorpay';
import { getCompanyNameAsync } from '../../utils/businessSettings';
import { toast } from '../../../lib/notify';
import { color, elevation, radii, space, type } from '../../../theme';

const QUICK = [100, 250, 500, 1000, 2000, 5000];

/** Port of components/user/AddMoneyModal.jsx (Razorpay checkout runs in the payment WebView). */
export default function AddMoneyModal({ open, onOpenChange, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const busy = loading || processing;

  const handleAmountChange = (text) => {
    const value = text.replace(/[^0-9.]/g, '');
    if (value === '' || (parseFloat(value) >= 1 && parseFloat(value) <= 50000)) setAmount(value);
  };

  const handleAddMoney = async () => {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum < 1) {
      toast.error('Please enter a valid amount (minimum ₹1)');
      return;
    }
    if (amountNum > 50000) {
      toast.error('Maximum amount is ₹50,000');
      return;
    }
    try {
      setLoading(true);
      const orderResponse = await userAPI.createWalletTopupOrder(amountNum);
      const { razorpay } = orderResponse.data.data;
      if (!razorpay || !razorpay.orderId || !razorpay.key) throw new Error('Failed to initialize payment gateway');

      setLoading(false);
      onOpenChange(false);
      await new Promise((resolve) => setTimeout(resolve, 100));
      setProcessing(true);

      let userInfo = {};
      try {
        const userResponse = await userAPI.getProfile();
        userInfo = userResponse?.data?.data?.user || userResponse?.data?.user || {};
      } catch {
        // prefill is optional
      }
      const formattedPhone = (userInfo.phone || '').replace(/\D/g, '').slice(-10);
      const companyName = await getCompanyNameAsync();

      await initRazorpayPayment({
        key: razorpay.key,
        amount: razorpay.amount,
        currency: razorpay.currency || 'INR',
        order_id: razorpay.orderId,
        name: companyName,
        description: `Wallet Top-up - ₹${amountNum.toFixed(2)}`,
        prefill: { name: userInfo.name || '', email: userInfo.email || '', contact: formattedPhone },
        notes: { type: 'wallet_topup', amount: amountNum.toString() },
        handler: async (response) => {
          try {
            await userAPI.verifyWalletTopupPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              amount: amountNum,
            });
            toast.success(`₹${amountNum} added to wallet successfully!`);
            setAmount('');
            setProcessing(false);
            onOpenChange(false);
            onSuccess?.();
          } catch (error) {
            toast.error(error?.response?.data?.message || 'Payment verification failed. Please contact support.');
            setProcessing(false);
          }
        },
        onError: (error) => {
          toast.error(error?.description || 'Payment failed. Please try again.');
          setProcessing(false);
        },
        onClose: () => setProcessing(false),
      });
    } catch (error) {
      let message = 'Failed to initialize payment. Please try again.';
      if (error?.response?.data) {
        const d = error.response.data;
        if (d.message) message = d.message;
        else if (d.error) message = d.error;
        else if (typeof d === 'string') message = d;
      } else if (error?.message) message = error.message;
      toast.error(message);
      setLoading(false);
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!busy) {
      setAmount('');
      onOpenChange(false);
    }
  };

  const disabled = !amount || busy || parseFloat(amount) < 1;

  return (
    <Dialog visible={open} onClose={handleClose} backdrop={color.overlay} panelStyle={styles.panel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <View style={styles.head}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">
                Add money to wallet
              </Text>
              <Text style={[type.small, { color: color.textMuted }]}>Enter the amount you want to add to your wallet</Text>
            </View>
            <IconButton icon={X} label="Close add money modal" variant="soft" disabled={busy} onPress={handleClose} style={{ marginTop: -space.xs }} />
          </View>

          <View style={{ gap: space.xl, paddingTop: space.lg }}>
            <View style={{ gap: space.sm }}>
              <Text style={[type.label, { color: color.text }]}>Enter amount</Text>
              <View>
                <View style={styles.rupee}>
                  <IndianRupee size={20} color={color.textMuted} />
                </View>
                <TextInput
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder="Enter amount"
                  placeholderTextColor={color.textDisabled}
                  keyboardType="decimal-pad"
                  editable={!busy}
                  accessibilityLabel="Amount in rupees"
                  style={styles.input}
                />
              </View>
              <Text style={[type.caption, { color: color.textMuted }]}>Minimum: {'₹'}1 | Maximum: {'₹'}50,000</Text>
            </View>

            <View style={{ gap: space.sm }}>
              <Text style={[type.label, { color: color.text }]}>Quick select</Text>
              <View style={styles.grid} accessibilityRole="radiogroup">
                {QUICK.map((q) => {
                  const on = amount === q.toString();
                  return (
                    <Press
                      key={q}
                      scale={0.97}
                      disabled={busy}
                      onPress={() => setAmount(q.toString())}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on, disabled: busy }}
                      accessibilityLabel={`${q} rupees`}
                      style={[styles.quick, on ? styles.quickOn : null, busy ? { opacity: 0.5 } : null]}
                    >
                      <Text style={[type.bodyStrong, { color: on ? color.onPrimary : color.text }]}>
                        {'₹'}
                        {q.toLocaleString('en-IN')}
                      </Text>
                    </Press>
                  );
                })}
              </View>
            </View>

            <Button
              title={busy ? (loading ? 'Processing...' : 'Opening payment gateway...') : `Add ₹${amount || '0'}`}
              size="lg"
              loading={busy}
              disabled={disabled}
              onPress={handleAddMoney}
              accessibilityLabel="Add money"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 380, backgroundColor: color.surface, borderRadius: radii.xl, overflow: 'hidden', ...elevation.sheet },
  body: { padding: space.xl },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  rupee: { position: 'absolute', left: space.md, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  input: { height: 52, paddingLeft: 40, paddingRight: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, ...type.price, lineHeight: undefined, color: color.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  quick: { width: '31%', flexGrow: 1, height: 44, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  quickOn: { backgroundColor: color.primary, borderColor: color.primary },
});
