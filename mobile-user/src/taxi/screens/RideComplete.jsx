import { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, ChevronRight, MessageSquare, Receipt, Share2, Star } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';
import { useRideComplete } from '../hooks/useRideComplete';
import { clearCurrentRide } from '../services/currentRideService';
import { toSrc } from '../components/live/parts';
import { fallbackCar } from '../components/home/homeShared';

const EMERALD = '#00BC7D';
const ORANGE = '#FF6900';

function Photo({ src, style, resizeMode = 'cover', onError }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={(!failed && toSrc(src)) || fallbackCar}
      style={style}
      resizeMode={resizeMode}
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );
}

/** Port of Taxi/modules/user/pages/ride/RideComplete.jsx (logic: useRideComplete). */
export default function RideComplete() {
  const insets = useSafeAreaInsets();
  const {
    navigate, routeHome, shareToast, showSubmittedOverlay, isRideFinalized, serviceType, rideDate, rideTime, handleShare, driver, driverImage, getInitials,
    vehicleLabel, vehicleVisual, hasVehiclePhoto, setVehicleImageBroken, pickup, drop, fare, selectedTip, setSelectedTip, totalBill, isSubmitted, rating,
    setRating, tipsEnabled, minimumTipAmount, availableTipOptions, setError, comment, setComment, error, submitFeedback, isSubmitting,
  } = useRideComplete();

  const parcel = serviceType === 'parcel';
  const submitDisabled = isSubmitting || isSubmitted || !isRideFinalized;
  const submitLabel = isSubmitting ? 'Saving your feedback...' : isSubmitted ? 'Feedback already saved' : !isRideFinalized ? 'Waiting for driver to finalize trip' : 'Submit rating';

  return (
    <LinearGradient colors={['#f8fafc', '#eef2f7']} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 40 + insets.top, paddingBottom: 32 + insets.bottom, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.doneIcon}>
            <CheckCircle2 size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>{isRideFinalized ? (parcel ? 'DELIVERY COMPLETED' : 'RIDE COMPLETED') : 'REACHED DESTINATION'}</Text>
            <Text style={styles.title} accessibilityRole="header">
              {isRideFinalized ? (parcel ? 'Package delivered' : 'You have arrived') : parcel ? 'Package reached destination' : 'Driver reached destination'}
            </Text>
          </View>
        </View>

        {!isRideFinalized ? (
          <View style={styles.finalizing}>
            <Text style={styles.finalizingKicker}>FINALIZING TRIP</Text>
            <Text style={styles.finalizingBody}>The driver has marked destination arrival. This page will unlock rating and payment as soon as the trip is finalized.</Text>
          </View>
        ) : null}

        <View style={styles.receipt}>
          <View style={styles.receiptHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.receiptIcon}>
                <Receipt size={14} color="#FFB86A" />
              </View>
              <View>
                <Text style={styles.receiptTitle}>Trip Receipt</Text>
                <Text style={styles.receiptDate}>
                  {rideDate} · {rideTime}
                </Text>
              </View>
            </View>
            <Press scale={0.96} onPress={handleShare} accessibilityLabel="Share receipt" style={styles.shareBtn} hitSlop={8}>
              <Share2 size={12} color="#fff" />
              <Text style={styles.shareText}>Share</Text>
            </Press>
          </View>

          <View style={{ padding: 16, gap: 16 }}>
            <View style={styles.driverRow}>
              <View style={styles.driverPhoto}>
                {driverImage ? <Photo src={driverImage} style={{ width: '100%', height: '100%' }} /> : <Text style={styles.initials}>{getInitials(driver.name)}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.driverName} numberOfLines={1}>{driver.name}</Text>
                <Text style={styles.driverSub} numberOfLines={1}>
                  {driver.vehicleNumber || driver.plate || 'Assigned'} · {vehicleLabel}
                </Text>
                <View style={styles.ratingPill}>
                  <Star size={10} color="#F0B100" fill="#F0B100" />
                  <Text style={styles.ratingText}>{driver.rating || '4.9'}</Text>
                </View>
              </View>
              <View style={styles.vehiclePhoto}>
                <Photo src={vehicleVisual} style={{ width: '100%', height: '100%' }} resizeMode={hasVehiclePhoto ? 'contain' : 'cover'} onError={() => setVehicleImageBroken(true)} />
              </View>
            </View>

            <View style={[styles.box, { flexDirection: 'row', gap: 12 }]}>
              <View style={{ alignItems: 'center', paddingTop: 4 }}>
                <View style={[styles.dot, { backgroundColor: EMERALD }]} />
                <View style={styles.dash} />
                <View style={[styles.dot, { backgroundColor: ORANGE }]} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
                <View>
                  <Text style={styles.place} numberOfLines={1}>{pickup}</Text>
                  <Text style={styles.placeLabel}>PICKUP</Text>
                </View>
                <View>
                  <Text style={styles.place} numberOfLines={1}>{drop}</Text>
                  <Text style={styles.placeLabel}>DROP</Text>
                </View>
              </View>
            </View>

            <View style={styles.box}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Base fare</Text>
                <Text style={styles.billValue}>Rs {fare.toFixed(2)}</Text>
              </View>
              <View style={[styles.billRow, { marginTop: 8 }]}>
                <Text style={styles.billLabel}>Tip</Text>
                <Text style={styles.billValue}>Rs {Number(selectedTip || 0).toFixed(2)}</Text>
              </View>
              <View style={[styles.billRow, styles.billTotalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>Rs {totalBill.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          {isSubmitted ? (
            <>
              <Text style={[styles.cardKicker, { color: EMERALD }]}>FEEDBACK SUBMITTED</Text>
              <Text style={styles.cardNote}>
                Rating: {rating || 0}/5 {selectedTip > 0 ? `| Tip added: Rs ${Number(selectedTip || 0).toFixed(2)}` : '| No tip added'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.cardKicker}>{tipsEnabled ? 'TIP YOUR DRIVER' : 'DRIVER TIPS DISABLED'}</Text>
              {tipsEnabled && minimumTipAmount > 0 ? <Text style={styles.cardNote}>Minimum tip amount: Rs {minimumTipAmount}</Text> : null}
              <View style={styles.tips}>
                {availableTipOptions.map((amount) => {
                  const on = selectedTip === amount;
                  const off = !tipsEnabled && amount > 0;
                  return (
                    <Press
                      key={amount}
                      scale={0.96}
                      disabled={off}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on, disabled: off }}
                      accessibilityLabel={amount === 0 ? 'No tip' : `Tip ${amount} rupees`}
                      onPress={() => {
                        setSelectedTip(amount);
                        setError('');
                      }}
                      style={[styles.tip, on ? styles.tipOn : null, off ? { opacity: 0.5 } : null]}
                    >
                      <Text style={[styles.tipText, on ? { color: '#fff' } : null]}>{amount === 0 ? 'No tip' : `Rs ${amount}`}</Text>
                    </Press>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <View style={[styles.card, { alignItems: 'center' }]}>
          <Text style={styles.question}>How was your trip with {driver.name?.split(' ')[0] || 'your driver'}?</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            {[1, 2, 3, 4, 5].map((value) => {
              const on = rating >= value;
              return (
                <Press
                  key={value}
                  scale={0.92}
                  disabled={isSubmitted}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: rating === value }}
                  accessibilityLabel={`${value} star${value > 1 ? 's' : ''}`}
                  onPress={() => {
                    setRating(value);
                    setError('');
                  }}
                  style={[styles.star, on ? styles.starOn : null]}
                >
                  <Star size={19} color={on ? '#fff' : tw.slate300} fill={on ? '#fff' : 'none'} />
                </Press>
              );
            })}
          </View>

          <View style={styles.noteBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <MessageSquare size={14} color={tw.slate400} />
              <Text style={styles.noteLabel}>ADD A NOTE</Text>
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
              editable={!isSubmitted}
              placeholder="Tell us about the trip"
              placeholderTextColor={tw.slate300}
              textAlignVertical="top"
              accessibilityLabel="Note about the trip"
              style={styles.noteInput}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Press scale={0.98} disabled={submitDisabled} onPress={submitFeedback} accessibilityLabel={submitLabel} accessibilityState={{ disabled: submitDisabled, busy: isSubmitting }} style={[styles.submit, submitDisabled ? { opacity: 0.6 } : null]}>
            <Text style={styles.submitText}>{submitLabel}</Text>
            <ChevronRight size={16} color="#fff" />
          </Press>
          <Press
            scale={0.97}
            hitSlop={10}
            accessibilityLabel="Skip and go home"
            onPress={() => {
              clearCurrentRide();
              navigate(routeHome, { replace: true });
            }}
            style={{ marginTop: 12 }}
          >
            <Text style={styles.skip}>Skip and go home</Text>
          </Press>
        </View>
      </ScrollView>

      {shareToast ? (
        <View style={[styles.toast, { top: 16 + insets.top }]} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>Receipt copied</Text>
        </View>
      ) : null}

      <Modal visible={!!showSubmittedOverlay} transparent statusBarTranslucent animationType="fade" onRequestClose={() => navigate(routeHome, { replace: true })}>
        <View style={styles.overlay}>
          <View style={styles.overlayIcon}>
            <CheckCircle2 size={30} color="#fff" />
          </View>
          <Text style={styles.overlayTitle}>Thanks for rating your driver</Text>
          <Text style={styles.overlayBody}>Your feedback has been saved successfully.</Text>
          <Press scale={0.97} onPress={() => navigate(routeHome, { replace: true })} accessibilityLabel="Continue" style={styles.overlayBtn}>
            <Text style={styles.overlayBtnText}>Continue</Text>
          </Press>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  doneIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: EMERALD, alignItems: 'center', justifyContent: 'center', ...shadow('0 8px 20px rgba(16,185,129,0.28)') },
  kicker: { fontSize: 10, lineHeight: 15, letterSpacing: 2.2, color: tw.slate400, ...fo(900) },
  title: { fontSize: 22, lineHeight: 30, color: tw.slate900, ...fo(900) },
  finalizing: { borderRadius: 18, borderWidth: 1, borderColor: '#FEF3C6', backgroundColor: 'rgba(255,251,235,0.9)', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  finalizingKicker: { fontSize: 10, lineHeight: 15, letterSpacing: 1.8, color: '#BB4D00', ...fo(900) },
  finalizingBody: { marginTop: 4, fontSize: 12, lineHeight: 17, color: '#7B3306', textAlign: 'center', ...fo(700) },

  receipt: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.95)', overflow: 'hidden', ...shadow('0 12px 30px rgba(15,23,42,0.08)') },
  receiptHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: tw.slate900, paddingHorizontal: 16, paddingVertical: 12 },
  receiptIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  receiptTitle: { fontSize: 13, lineHeight: 18, color: '#fff', ...fo(900) },
  receiptDate: { fontSize: 10, lineHeight: 15, color: tw.slate400, ...fo(700) },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6 },
  shareText: { fontSize: 10, lineHeight: 15, color: '#fff', ...fo(900) },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, borderColor: tw.slate100, backgroundColor: 'rgba(248,250,252,0.8)', padding: 12 },
  driverPhoto: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', backgroundColor: tw.slate900, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 18, color: '#fff', ...fo(900) },
  driverName: { fontSize: 16, lineHeight: 22, color: tw.slate900, ...fo(900) },
  driverSub: { fontSize: 11, lineHeight: 16, color: tw.slate500, ...fo(700) },
  ratingPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, borderRadius: 999, backgroundColor: '#FEFCE8', paddingHorizontal: 8, paddingVertical: 2 },
  ratingText: { fontSize: 10, lineHeight: 15, color: tw.slate800, ...fo(900) },
  vehiclePhoto: { width: 64, height: 56, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff' },
  box: { borderRadius: 18, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', padding: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dash: { height: 40, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: tw.slate200 },
  place: { fontSize: 13, lineHeight: 18, color: tw.slate900, ...fo(900) },
  placeLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1.4, color: tw.slate400, ...fo(700) },
  billRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  billLabel: { fontSize: 12, lineHeight: 16, color: tw.slate500, ...fo(700) },
  billValue: { fontSize: 13, lineHeight: 18, color: tw.slate900, ...fo(900) },
  billTotalRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.slate100 },
  totalLabel: { fontSize: 15, lineHeight: 20, color: tw.slate900, ...fo(900) },
  totalValue: { fontSize: 18, lineHeight: 26, color: tw.slate900, ...fo(900) },

  card: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.95)', padding: 16, ...shadow('0 10px 24px rgba(15,23,42,0.06)') },
  cardKicker: { fontSize: 10, lineHeight: 15, letterSpacing: 2.2, color: tw.slate400, textAlign: 'center', ...fo(900) },
  cardNote: { marginTop: 8, fontSize: 12, lineHeight: 16, color: tw.slate500, textAlign: 'center', ...fo(700) },
  tips: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  tip: { borderRadius: 999, borderWidth: 1, borderColor: tw.slate100, backgroundColor: tw.slate50, paddingHorizontal: 16, paddingVertical: 10 },
  tipOn: { borderColor: ORANGE, backgroundColor: ORANGE, ...shadow('0 8px 18px rgba(249,115,22,0.24)') },
  tipText: { fontSize: 11, lineHeight: 16, color: tw.slate600, ...fo(900) },
  question: { fontSize: 16, lineHeight: 22, color: tw.slate900, textAlign: 'center', ...fo(900) },
  star: { width: 44, height: 44, borderRadius: 12, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  starOn: { backgroundColor: ORANGE, ...shadow('0 10px 20px rgba(249,115,22,0.24)') },
  noteBox: { alignSelf: 'stretch', marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, backgroundColor: 'rgba(248,250,252,0.8)', padding: 12 },
  noteLabel: { fontSize: 11, lineHeight: 16, letterSpacing: 1.5, color: tw.slate400, ...fo(900) },
  noteInput: { minHeight: 72, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: tw.slate900, ...fo(700) },
  error: { marginTop: 12, fontSize: 12, lineHeight: 16, color: tw.red500, textAlign: 'center', ...fo(900) },
  submit: { alignSelf: 'stretch', marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, backgroundColor: tw.slate900, paddingVertical: 14, paddingHorizontal: 12, ...shadow('0 12px 24px rgba(15,23,42,0.18)') },
  submitText: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: '#fff', textAlign: 'center', ...fo(900) },
  skip: { fontSize: 12, lineHeight: 16, color: tw.slate500, ...fo(900) },

  toast: { position: 'absolute', alignSelf: 'center', borderRadius: 14, backgroundColor: tw.slate900, paddingHorizontal: 20, paddingVertical: 12, ...shadow('xl') },
  toastText: { fontSize: 12, lineHeight: 16, color: '#fff', ...fo(900) },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.97)', paddingHorizontal: 24 },
  overlayIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: EMERALD, alignItems: 'center', justifyContent: 'center', ...shadow('0 10px 25px rgba(16,185,129,0.28)') },
  overlayTitle: { fontSize: 20, lineHeight: 28, color: tw.slate900, textAlign: 'center', ...fo(900) },
  overlayBody: { fontSize: 13, lineHeight: 18, color: tw.slate500, textAlign: 'center', ...fo(700) },
  overlayBtn: { marginTop: 8, borderRadius: 16, backgroundColor: tw.slate900, paddingHorizontal: 24, paddingVertical: 12, ...shadow('0 12px 24px rgba(15,23,42,0.18)') },
  overlayBtnText: { fontSize: 13, lineHeight: 18, color: '#fff', ...fo(900) },
});
