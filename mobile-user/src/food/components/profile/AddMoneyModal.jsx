import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { IndianRupee, X } from 'lucide-react-native';
import { Dialog } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { Spinner } from '../../../components/Loader';
import { userAPI } from '../../../api/food';
import { initRazorpayPayment } from '../../../lib/razorpay';
import { getCompanyNameAsync } from '../../utils/businessSettings';
import { toast } from '../../../lib/notify';
import { poppins, shadow, tw } from '../../../theme';

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
    <Dialog visible={open} onClose={handleClose} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.panel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <Press scale={0.9} onPress={handleClose} disabled={busy} accessibilityLabel="Close add money modal" style={[styles.close, busy ? { opacity: 0.5 } : null]}>
            <X size={20} color={tw.gray400} />
          </Press>
          <View style={{ paddingRight: 40, alignItems: 'center', gap: 6 }}>
            <Text style={styles.title}>Add Money to Wallet</Text>
            <Text style={styles.desc}>Enter the amount you want to add to your wallet</Text>
          </View>

          <View style={{ gap: 24, paddingTop: 20 }}>
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Enter Amount</Text>
              <View>
                <View style={styles.rupee}>
                  <IndianRupee size={20} color={tw.gray400} />
                </View>
                <TextInput
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder="Enter amount"
                  placeholderTextColor={tw.gray400}
                  keyboardType="decimal-pad"
                  editable={!busy}
                  style={styles.input}
                />
              </View>
              <Text style={styles.hint}>Minimum: {'₹'}1 | Maximum: {'₹'}50,000</Text>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Quick Select</Text>
              <View style={styles.grid}>
                {QUICK.map((q) => {
                  const on = amount === q.toString();
                  return (
                    <Press key={q} scale={0.97} disabled={busy} onPress={() => setAmount(q.toString())} accessibilityLabel={`${q} rupees`} style={[styles.quick, on ? styles.quickOn : null, busy ? { opacity: 0.5 } : null]}>
                      <Text style={[styles.quickText, on ? { color: '#fff' } : null]}>{'₹'}{q}</Text>
                    </Press>
                  );
                })}
              </View>
            </View>

            <Press scale={0.98} onPress={handleAddMoney} disabled={disabled} accessibilityLabel="Add money" style={[styles.cta, disabled ? { opacity: 0.5 } : null]}>
              {busy ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Spinner size={16} />
                  <Text style={styles.ctaText}>{loading ? 'Processing...' : 'Opening Payment Gateway...'}</Text>
                </View>
              ) : (
                <Text style={styles.ctaText}>{`Add ₹${amount || '0'}`}</Text>
              )}
            </Press>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 352, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: tw.gray200, overflow: 'hidden', ...shadow('lg') },
  body: { padding: 20 },
  close: { position: 'absolute', right: 16, top: 16, padding: 8, borderRadius: 999, zIndex: 2 },
  title: { fontSize: 20, lineHeight: 28, color: tw.gray900, textAlign: 'center', ...poppins(700) },
  desc: { fontSize: 14, lineHeight: 20, color: tw.gray600, textAlign: 'center', ...poppins(400) },
  label: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },
  rupee: { position: 'absolute', left: 12, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  input: { height: 48, paddingLeft: 40, paddingRight: 12, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, fontSize: 18, color: tw.gray900, ...poppins(400) },
  hint: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quick: { width: '31.5%', height: 40, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  quickOn: { backgroundColor: '#18181B', borderColor: '#18181B' },
  quickText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  cta: { height: 48, borderRadius: 8, backgroundColor: tw.green600, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(600) },
});
