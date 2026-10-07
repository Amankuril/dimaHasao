import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Banknote, CheckCircle2, DollarSign, MessageSquareText, QrCode, RefreshCw, ShieldCheck, X } from 'lucide-react-native';
import { ActionSlider } from '../ActionSlider';
import TripSheet from './TripSheet';
import { deliveryApi as deliveryAPI } from '../../../api/delivery';
import { showUserFacingApiError } from '../../../lib/apiError';
import { toast } from '../../../lib/notify';
import { Spinner } from '../../Loader';
import { Press } from '../../ui';
import { Button, IconButton, StatusBadge } from '../../ds';
import { color, radii, space, type } from '../../../theme';

/*
 * Handover at the door: OTP -> payment (COD) or OTP -> complete (prepaid).
 * Each step: header with step number, the customer's instruction if any,
 * the step's input, then one slider.
 */

function Handle() {
  return <View style={styles.handle} />;
}

function SheetHeader({ icon, iconBg, iconColor, title, step, stepColor, onClose }) {
  const Icon = icon;
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={[styles.headerIcon, { backgroundColor: iconBg }]}>
          <Icon size={24} color={iconColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.h2}>{title}</Text>
          <Text style={[styles.step, stepColor && { color: stepColor }]}>{step}</Text>
        </View>
      </View>
      {onClose ? (
        <IconButton icon={X} label="Close" variant="soft" size={40} iconSize={20} onPress={onClose} />
      ) : null}
    </View>
  );
}

function DeliveryInstructionsPanel({ note }) {
  const text = String(note || '').trim();
  if (!text) return null;
  return (
    <View style={styles.instructions} accessibilityRole="alert">
      <MessageSquareText size={20} color={color.info} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.instructionsKicker}>Delivery instruction · read before handover</Text>
        <Text style={styles.instructionsText}>{text}</Text>
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
        iconBg={isOtpVerified ? color.successSoft : color.surfaceMuted}
        iconColor={isOtpVerified ? color.success : color.textSecondary}
        title="Handover code"
        step="Step 1 of 2 · ask the customer for the 4-digit code"
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
            style={[styles.otpBox, focused === i && styles.otpFocused, isOtpVerified && styles.otpVerified]}
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
          iconBg={isPaid ? color.successSoft : color.warningSoft}
          iconColor={isPaid ? color.success : color.warning}
          title="Collect payment"
          step="Step 2 of 2"
          onClose={onClose}
        />
        <DeliveryInstructionsPanel note={order?.note} />
        <View style={[styles.amountBox, { backgroundColor: isPaid ? color.successSoft : color.warningSoft }]}>
          <View style={styles.amountRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.amountLabel, { color: isPaid ? color.success : color.warning }]}>{isPaid ? 'Amount paid online' : 'Cash to collect'}</Text>
              <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
                ₹{amountToCollect.toFixed(2)}
              </Text>
            </View>
            {isPaid ? <StatusBadge label="Paid" tone="success" icon={CheckCircle2} style={{ backgroundColor: color.surface }} /> : null}
          </View>
          {!isPaid ? (
            <View style={{ gap: space.sm }}>
              <Press
                onPress={() => {
                  setIsCashPayment(false);
                  generateQr();
                }}
                disabled={isGeneratingQr}
                scale={1}
                accessibilityLabel="Show Payment QR"
                accessibilityState={{ selected: qrActive, busy: isGeneratingQr }}
                style={[styles.payBtn, qrActive && styles.payBtnOn]}
              >
                {isGeneratingQr ? <Spinner size={18} color={qrActive ? color.onPrimary : color.text} /> : <QrCode size={20} color={qrActive ? color.onPrimary : color.text} />}
                <Text style={[styles.payText, { color: qrActive ? color.onPrimary : color.text }]}>{qrActive ? 'QR active · waiting for payment' : 'Show payment QR'}</Text>
              </Press>
              <Press
                onPress={() => setIsCashPayment(true)}
                scale={1}
                accessibilityLabel="Cash Payment"
                accessibilityState={{ selected: isCashPayment }}
                style={[styles.payBtn, isCashPayment && styles.payBtnOn]}
              >
                <Banknote size={20} color={isCashPayment ? color.onPrimary : color.text} />
                <Text style={[styles.payText, { color: isCashPayment ? color.onPrimary : color.text }]}>{isCashPayment ? 'Cash received' : 'Customer paid in cash'}</Text>
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
          <Pressable style={styles.qrCard} onPress={() => {}}>
            <Text style={styles.qrTitle}>Scan to pay</Text>
            <Text style={styles.qrSub}>Order total ₹{amountToCollect.toFixed(2)}</Text>
            <View style={styles.qrPanel}>
              <View style={styles.qrFrame}>
                <Image
                  source={{ uri: directImage ? collectQrLink : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(collectQrLink || '')}` }}
                  accessibilityLabel="Razorpay QR"
                  // Razorpay's QR image carries a frame; the web crops it with scale(1.6).
                  style={directImage ? styles.qrCropped : styles.qrPlain}
                  resizeMode={directImage ? 'cover' : 'contain'}
                />
              </View>
              <Button title="Check payment status" icon={RefreshCw} loading={isSyncing} disabled={isSyncing} onPress={handleManualCheck} accessibilityLabel="Check Payment Status" />
            </View>
            <Button title="Close QR" variant="outline" onPress={() => setShowQrModal(false)} accessibilityLabel="Close QR" />
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
      <View style={[styles.headerLeft, { marginBottom: space.xxl }]}>
        <View style={[styles.headerIcon, { backgroundColor: color.successSoft }]}>
          <CheckCircle2 size={24} color={color.success} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.h2}>Code verified</Text>
          <Text style={[styles.step, { color: color.success }]}>Payment received online</Text>
        </View>
      </View>
      <ActionSlider key="action-complete" label="Slide to Complete Delivery" successLabel="Delivered! ✓" onConfirm={() => onComplete(verifiedOtp)} color="bg-green-600" />
    </TripSheet>
  );
}

export default DeliveryVerificationModal;

const styles = StyleSheet.create({
  handle: { width: 40, height: 4, backgroundColor: color.borderStrong, borderRadius: 2, alignSelf: 'center', marginTop: space.xs, marginBottom: space.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm, marginBottom: space.lg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1, minWidth: 0 },
  headerIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  h2: { ...type.heading, color: color.text },
  step: { ...type.small, color: color.textMuted, marginTop: 2 },
  instructions: { flexDirection: 'row', gap: space.sm, backgroundColor: color.infoSoft, borderRadius: radii.md, padding: space.md, marginBottom: space.lg },
  instructionsKicker: { ...type.label, color: color.info },
  instructionsText: { ...type.bodyStrong, color: color.text, marginTop: 2 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: space.md, marginBottom: space.xxl },
  otpBox: { width: 56, height: 64, backgroundColor: color.surface, borderWidth: 2, borderColor: color.borderStrong, borderRadius: radii.md, textAlign: 'center', fontSize: 26, color: color.text, padding: 0, fontFamily: 'Sora_700Bold', outlineWidth: 0 },
  otpFocused: { borderColor: color.primary, boxShadow: '0 0 0 4px rgba(10,77,43,0.14)' },
  otpVerified: { borderColor: color.success, backgroundColor: color.successSoft },
  amountBox: { borderRadius: radii.lg, padding: space.lg, marginBottom: space.xl, gap: space.lg },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  amountLabel: { ...type.label },
  amount: { ...type.display, color: color.text, marginTop: 2 },
  payBtn: { minHeight: 52, paddingHorizontal: space.lg, borderWidth: 1.5, borderColor: color.borderStrong, backgroundColor: color.surface, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  payBtnOn: { backgroundColor: color.primary, borderColor: color.primary },
  payText: { ...type.bodyStrong },
  qrWrap: { flex: 1, backgroundColor: 'rgba(15,23,42,0.75)', alignItems: 'center', justifyContent: 'center', padding: space.lg },
  qrCard: { backgroundColor: color.surface, width: '100%', maxWidth: 384, borderRadius: radii.xl, padding: space.xl, gap: space.md, alignItems: 'stretch' },
  qrTitle: { ...type.heading, color: color.text, textAlign: 'center' },
  qrSub: { ...type.body, color: color.textSecondary, textAlign: 'center', marginTop: -space.sm },
  qrPanel: { alignItems: 'center', gap: space.lg, backgroundColor: color.surfaceMuted, borderRadius: radii.lg, padding: space.md },
  qrFrame: { width: 256, height: 256, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 6 },
  qrCropped: { width: '100%', height: '100%', transform: [{ scale: 1.6 }, { translateY: -9.5 }, { translateX: 1.3 }] },
  qrPlain: { width: '100%', height: '100%', padding: 8 },
});
