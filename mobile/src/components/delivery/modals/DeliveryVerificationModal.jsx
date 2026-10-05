import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, DollarSign, Package, QrCode, RefreshCw, ShieldCheck, X } from 'lucide-react-native';
import { ActionSlider } from '../ActionSlider';
import TripSheet from './TripSheet';
import { deliveryApi as deliveryAPI } from '../../../api/delivery';
import { showUserFacingApiError } from '../../../lib/apiError';
import { toast } from '../../../lib/notify';
import { Spinner } from '../../Loader';
import { Press } from '../../ui';
import { display, gradients, poppins, shadow, tw } from '../../../theme';

/*
 * Port of components/modals/DeliveryVerificationModal.jsx: OTP -> payment
 * (COD) or OTP -> complete (prepaid). Poppins base; h2/h3 and font-black are
 * Sora. The OTP boxes are <input>s, which the theme paints white with the
 * rounded-2xl rule's #E5DDC3 border whether or not they are verified.
 */

function Handle() {
  return <View style={styles.handle} />;
}

function SheetHeader({ icon, iconBg, iconColor, title, step, stepColor, onClose }) {
  const Icon = icon;
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={[styles.headerIcon, shadow('card'), { backgroundColor: iconBg }]}>
          <Icon size={28} color={iconColor} />
        </View>
        <View>
          <Text style={styles.h2}>{title}</Text>
          <Text style={[styles.step, stepColor && { color: stepColor }]}>{step}</Text>
        </View>
      </View>
      {onClose ? (
        <Press onPress={onClose} accessibilityLabel="Close" style={styles.close}>
          <X size={20} color={tw.gray400} />
        </Press>
      ) : null}
    </View>
  );
}

function DeliveryInstructionsPanel({ note }) {
  const text = String(note || '').trim();
  if (!text) return null;
  return (
    <View style={[styles.instructions, shadow('card')]}>
      {/* from-orange-500 to-amber-500, repainted by the theme */}
      <LinearGradient colors={gradients.brandRemapped} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.instructionsHead}>
        <View style={[styles.instructionsIcon, shadow('card')]}>
          <Package size={20} color="#fff" />
        </View>
        <View>
          <Text style={styles.instructionsKicker}>Delivery instruction</Text>
          <Text style={styles.instructionsSub}>Read before handover</Text>
        </View>
      </LinearGradient>
      <View style={styles.instructionsBody}>
        <Text style={styles.instructionsText}>“{text}”</Text>
      </View>
    </View>
  );
}

function OtpStep({ order, onVerified, onClose }) {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [focused, setFocused] = useState(-1);
  const inputRefs = useRef([]);

  useEffect(() => {
    const savedCode = order?.deliveryVerification?.dropOtp?.code;
    if (savedCode && String(savedCode).length === 4) setOtp(String(savedCode).split(''));
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 500);
    return () => clearTimeout(timer);
  }, [order?.deliveryVerification?.dropOtp?.code]);

  const orderId = order.orderId || order._id || 'ORD';

  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;
    const next = [...otp];
    next[index] = value.substring(value.length - 1);
    setOtp(next);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const verifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length < 4) return;
    setIsVerifyingOtp(true);
    try {
      const res = await deliveryAPI.verifyDropOtp(orderId, otpString);
      if (res?.data?.success) {
        setIsOtpVerified(true);
        setTimeout(() => onVerified(otpString), 600);
      }
    } catch (err) {
      showUserFacingApiError(err, 'Invalid OTP entered');
      throw err;
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const isAlreadyVerified = order?.deliveryVerification?.dropOtp?.verified;

  return (
    <TripSheet onBackdropPress={onClose}>
      <Handle />
      <SheetHeader
        icon={ShieldCheck}
        iconBg={isOtpVerified ? '#DCFCE7' : tw.gray100}
        iconColor={isOtpVerified ? tw.primary : tw.gray500}
        title="Handover Code"
        step="Step 1 of Verification"
        onClose={onClose}
      />
      <DeliveryInstructionsPanel note={order?.note} />
      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            value={digit}
            editable={!isOtpVerified}
            keyboardType="number-pad"
            onChangeText={(v) => handleOtpChange(i, v)}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
            }}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused(-1)}
            accessibilityLabel={`Handover digit ${i + 1}`}
            style={[styles.otpBox, shadow('card'), focused === i && styles.otpFocused]}
          />
        ))}
      </View>
      <ActionSlider
        key="action-otp"
        label={isVerifyingOtp ? 'Verifying...' : isAlreadyVerified ? 'Code already verified ✓' : 'Slide to Verify OTP'}
        successLabel="Verified!"
        disabled={otp.some((d) => !d) || isVerifyingOtp || isOtpVerified || isAlreadyVerified}
        onConfirm={verifyOtp}
        color="bg-gray-900"
      />
    </TripSheet>
  );
}

function PaymentStep({ order, otpString, onComplete, onClose }) {
  const [showQrModal, setShowQrModal] = useState(false);
  const [collectQrLink, setCollectQrLink] = useState(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const isInitialPaid = ['paid', 'captured', 'authorized'].includes(String(order.payment?.status || '').toLowerCase());
  const [paymentStatus, setPaymentStatus] = useState(isInitialPaid ? 'paid' : 'idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCashPayment, setIsCashPayment] = useState(false);
  const pollingRef = useRef(null);

  const orderId = order.orderId || order._id || 'ORD';
  const amountToCollect = order.pricing?.total || order.amountToCollect || 0;

  const checkPaymentSync = useCallback(async () => {
    try {
      const res = await deliveryAPI.getPaymentStatus(orderId);
      const data = res?.data?.data || res?.data || {};
      if (['paid', 'captured', 'authorized'].includes(String(data?.payment?.status || '').toLowerCase())) {
        setPaymentStatus('paid');
        if (pollingRef.current) clearInterval(pollingRef.current);
        setShowQrModal(false);
      }
    } catch {
      /* keep polling */
    }
  }, [orderId]);

  const handleManualCheck = async () => {
    setIsSyncing(true);
    await checkPaymentSync();
    setTimeout(() => setIsSyncing(false), 800);
  };

  useEffect(() => {
    if (paymentStatus === 'pending' || (amountToCollect > 0 && paymentStatus !== 'paid')) {
      pollingRef.current = setInterval(checkPaymentSync, 5000);
    }
    return () => clearInterval(pollingRef.current);
  }, [paymentStatus, amountToCollect, checkPaymentSync]);

  const generateQr = async () => {
    setIsGeneratingQr(true);
    try {
      const res = await deliveryAPI.createCollectQr(orderId, { name: order.userName || 'Customer', phone: order.userPhone || '' });
      const data = res?.data?.data || res?.data || {};
      const link = data.imageUrl || data.shortUrl || data.image || null;
      if (link) {
        setCollectQrLink(link);
        setPaymentStatus('pending');
        setShowQrModal(true);
      } else {
        toast.error('Could not generate QR code');
      }
    } catch (e) {
      showUserFacingApiError(e, 'QR Generation failed');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const isPaid = paymentStatus === 'paid';
  const qrActive = paymentStatus === 'pending' && !isCashPayment;
  const directImage = collectQrLink?.startsWith('http') || collectQrLink?.startsWith('data:');

  return (
    <>
      <TripSheet onBackdropPress={onClose}>
        <Handle />
        <SheetHeader
          icon={DollarSign}
          iconBg={isPaid ? '#DCFCE7' : tw.amber100}
          iconColor={isPaid ? tw.primary : tw.amber600}
          title="Collect Payment"
          step="Step 2 of Verification"
          onClose={onClose}
        />
        <DeliveryInstructionsPanel note={order?.note} />
        <View style={[styles.amountBox, shadow('card')]}>
          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>{isPaid ? 'Amount Paid Online' : 'Cash to Collect'}</Text>
              <Text style={styles.amount}>₹{amountToCollect.toFixed(2)}</Text>
            </View>
            {/* bg-green-500 -> #E8F2EC via the substring rule */}
            {isPaid ? <Text style={styles.paid}>PAID ✓</Text> : null}
          </View>
          {!isPaid ? (
            <View style={{ gap: 12 }}>
              <Press
                onPress={() => {
                  setIsCashPayment(false);
                  generateQr();
                }}
                disabled={isGeneratingQr}
                scale={1}
                accessibilityLabel="Show Payment QR"
                style={[styles.payBtn, shadow('card'), { backgroundColor: qrActive ? tw.amber100 : '#fff' }]}
              >
                {isGeneratingQr ? <Spinner size={16} color={qrActive ? '#7B3306' : tw.amber800} /> : <QrCode size={20} color={qrActive ? '#7B3306' : tw.amber800} />}
                <Text style={[styles.payText, { color: qrActive ? '#7B3306' : tw.amber800 }]}>{qrActive ? 'QR Active - Waiting...' : 'Show Payment QR'}</Text>
              </Press>
              <Press
                onPress={() => setIsCashPayment(true)}
                scale={1}
                accessibilityLabel="Cash Payment"
                style={[styles.payBtn, shadow('card'), { backgroundColor: isCashPayment ? '#0A4D2B' : '#fff' }]}
              >
                <DollarSign size={20} color={isCashPayment ? '#fff' : tw.amber800} />
                <Text style={[styles.payText, { color: isCashPayment ? '#fff' : tw.amber800 }]}>Cash Payment</Text>
              </Press>
            </View>
          ) : null}
        </View>
        <ActionSlider
          key="action-payment"
          label={isCashPayment ? 'Slide to Confirm Cash' : 'Slide to Complete Order'}
          successLabel="Delivered! ✓"
          disabled={!isPaid && !isCashPayment}
          onConfirm={() => onComplete(otpString, isCashPayment ? 'cash' : 'qr')}
          color="bg-green-600"
        />
      </TripSheet>

      <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)} statusBarTranslucent>
        <Pressable style={styles.qrWrap} onPress={() => setShowQrModal(false)}>
          <Pressable style={[styles.qrCard, shadow('card')]} onPress={() => {}}>
            <Text style={styles.qrTitle}>Scan to Pay</Text>
            <Text style={styles.qrSub}>Order Total: ₹{amountToCollect.toFixed(2)}</Text>
            <View style={[styles.qrPanel, shadow('card')]}>
              <View style={[styles.qrFrame, shadow('card')]}>
                <Image
                  source={{ uri: directImage ? collectQrLink : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(collectQrLink || '')}` }}
                  accessibilityLabel="Razorpay QR"
                  // Razorpay's QR image carries a frame; the web crops it with scale(1.6).
                  style={directImage ? styles.qrCropped : styles.qrPlain}
                  resizeMode={directImage ? 'cover' : 'contain'}
                />
              </View>
              <Press onPress={handleManualCheck} disabled={isSyncing} accessibilityLabel="Check Payment Status" style={[styles.checkBtn, shadow('card'), isSyncing && { opacity: 0.6 }]}>
                {isSyncing ? <Spinner size={16} color="#fff" /> : <RefreshCw size={16} color="#fff" />}
                <Text style={styles.checkText}>Check Payment Status</Text>
              </Press>
            </View>
            <Press onPress={() => setShowQrModal(false)} accessibilityLabel="Close QR" style={[styles.closeQr, shadow('card')]}>
              <Text style={styles.closeQrText}>Close QR</Text>
            </Press>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function DeliveryVerificationModal({ order, onComplete, onClose }) {
  const alreadyVerified = !!order?.deliveryVerification?.dropOtp?.verified;
  const paymentMethod = (order?.paymentMethod || order?.payment?.method || order?.transaction?.payment?.method || order?.transaction?.paymentMethod || 'cod').toLowerCase();
  const isCod = ['cash', 'cod', 'cash_on_delivery', 'razorpay_qr'].includes(paymentMethod);
  const [step, setStep] = useState(() => (alreadyVerified ? (isCod ? 'payment' : 'complete') : 'otp'));
  const [verifiedOtp, setVerifiedOtp] = useState(alreadyVerified ? order.deliveryVerification.dropOtp.code || '' : '');
  const close = onClose || (() => {});

  // Prepaid order whose OTP was already verified: complete on open.
  useEffect(() => {
    if (step === 'complete' && !isCod) onComplete(verifiedOtp);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!order) return null;

  if (step === 'otp') {
    return (
      <OtpStep
        order={order}
        onVerified={(otpValue) => {
          setVerifiedOtp(otpValue);
          setStep(isCod ? 'payment' : 'complete');
        }}
        onClose={close}
      />
    );
  }
  if (step === 'payment') return <PaymentStep order={order} otpString={verifiedOtp} onComplete={onComplete} onClose={close} />;
  return (
    <TripSheet onBackdropPress={close}>
      <Handle />
      <View style={[styles.headerLeft, { marginBottom: 32 }]}>
        <View style={[styles.headerIcon, shadow('card'), { backgroundColor: '#DCFCE7' }]}>
          <CheckCircle2 size={28} color={tw.primary} />
        </View>
        <View>
          <Text style={styles.h2}>OTP Verified</Text>
          <Text style={[styles.step, { color: tw.primary }]}>Payment Received Online</Text>
        </View>
      </View>
      <ActionSlider key="action-complete" label="Slide to Complete Delivery" successLabel="Delivered! ✓" onConfirm={() => onComplete(verifiedOtp)} color="bg-green-600" />
    </TripSheet>
  );
}

export default DeliveryVerificationModal;

const styles = StyleSheet.create({
  handle: { width: 48, height: 6, backgroundColor: tw.gray200, borderRadius: 999, alignSelf: 'center', marginBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  h2: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...display(700, 20) },
  step: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  close: { padding: 8, backgroundColor: tw.gray50, borderRadius: 999 },
  instructions: { width: '100%', borderRadius: 24, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: tw.primaryBorder },
  instructionsHead: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  instructionsIcon: { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  instructionsKicker: { fontSize: 10, lineHeight: 15, color: '#fff', textTransform: 'uppercase', ...display(900, 10) },
  instructionsSub: { fontSize: 11, lineHeight: 16.5, color: 'rgba(255,255,255,0.9)', ...poppins(600) },
  instructionsBody: { backgroundColor: tw.primarySoft, paddingHorizontal: 20, paddingVertical: 16 },
  instructionsText: { fontSize: 14, lineHeight: 22.75, color: tw.gray950, ...poppins(700) },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 },
  otpBox: { width: 48, height: 64, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E5DDC3', borderRadius: 16, textAlign: 'center', fontSize: 24, color: '#1F1F24', padding: 0, ...poppins(700) },
  otpFocused: { borderColor: '#789D8A', boxShadow: '0 0 0 4px rgba(21,73,139,0.15)' },
  amountBox: { backgroundColor: tw.amber50, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#E5DDC3', marginBottom: 24 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  amountLabel: { color: tw.amber700, fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, ...poppins(700) },
  amount: { color: '#461901', fontSize: 30, lineHeight: 36, ...poppins(700) },
  paid: { backgroundColor: tw.primarySoft, color: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, overflow: 'hidden', fontSize: 10, lineHeight: 15, ...poppins(700) },
  payBtn: { width: '100%', paddingVertical: 14, borderWidth: 2, borderColor: '#E5DDC3', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  payText: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.1, textTransform: 'uppercase', ...poppins(700) },
  qrWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  qrCard: { backgroundColor: '#fff', width: '100%', maxWidth: 384, borderRadius: 24, padding: 20, alignItems: 'center' },
  qrTitle: { color: tw.gray950, fontSize: 20, lineHeight: 28, marginBottom: 8, ...display(700, 20) },
  qrSub: { color: tw.gray500, fontSize: 14, lineHeight: 20, marginBottom: 32, ...poppins(500) },
  qrPanel: { alignItems: 'center', gap: 16, backgroundColor: tw.gray50, borderRadius: 24, borderWidth: 2, borderColor: '#E5DDC3', padding: 12, marginBottom: 16, width: '100%' },
  qrFrame: { width: 256, height: 256, borderRadius: 16, borderWidth: 2, borderColor: '#E5DDC3', backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 6 },
  qrCropped: { width: '100%', height: '100%', transform: [{ scale: 1.6 }, { translateY: -9.5 }, { translateX: 1.3 }] },
  qrPlain: { width: '100%', height: '100%', padding: 8 },
  checkBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#0A4D2B', paddingHorizontal: 17.6, paddingVertical: 12, borderRadius: 16 },
  checkText: { color: '#fff', fontSize: 12, lineHeight: 16, textTransform: 'uppercase', ...display(900, 12) },
  closeQr: { width: '100%', paddingVertical: 14, backgroundColor: tw.gray900, borderRadius: 16, alignItems: 'center' },
  closeQrText: { color: '#fff', fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', ...poppins(700) },
});
