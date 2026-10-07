import { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, ChevronRight, Clock3, Receipt, Share2, Star } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Button, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { useRideComplete } from '../hooks/useRideComplete';
import { clearCurrentRide } from '../services/currentRideService';
import { toSrc } from '../components/live/parts';
import { fallbackCar } from '../components/home/homeShared';

/** Pickup = brand green, drop = red, everywhere in the ride flow. */
const PICKUP = color.primary;
const DROP = color.danger;

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
    <View style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingTop: space.xl + insets.top, paddingBottom: space.xxxl + insets.bottom }]}>
        <View style={styles.hero}>
          <View style={[styles.doneIcon, !isRideFinalized && { backgroundColor: color.warningSoft }]}>
            {isRideFinalized ? <CheckCircle2 size={26} color={color.onPrimary} /> : <Clock3 size={26} color={color.warning} />}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
            <StatusBadge
              label={isRideFinalized ? (parcel ? 'Delivery completed' : 'Ride completed') : 'Reached destination'}
              tone={isRideFinalized ? 'success' : 'warning'}
            />
            <Text style={styles.title} accessibilityRole="header">
              {isRideFinalized ? (parcel ? 'Package delivered' : 'You have arrived') : parcel ? 'Package reached destination' : 'Driver reached destination'}
            </Text>
          </View>
        </View>

        {!isRideFinalized ? (
          <View style={styles.finalizing} accessibilityLiveRegion="polite">
            <Text style={styles.finalizingKicker}>Finalizing trip</Text>
            <Text style={styles.finalizingBody}>The driver has marked destination arrival. This page will unlock rating and payment as soon as the trip is finalized.</Text>
          </View>
        ) : null}

        <View style={styles.receipt}>
          <View style={styles.receiptHead}>
            <View style={styles.receiptHeadLeft}>
              <View style={styles.receiptIcon}>
                <Receipt size={18} color={color.goldOnDark} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.receiptTitle}>Trip receipt</Text>
                <Text style={styles.receiptDate} numberOfLines={1}>
                  {rideDate} · {rideTime}
                </Text>
              </View>
            </View>
            <Press scale={0.96} onPress={handleShare} accessibilityLabel="Share receipt" style={styles.shareBtn} hitSlop={4}>
              <Share2 size={16} color={color.textInverse} />
              <Text style={styles.shareText}>Share</Text>
            </Press>
          </View>

          <View style={{ padding: space.lg, gap: space.md }}>
            <View style={styles.driverRow}>
              <View style={styles.driverPhoto}>
                {driverImage ? <Photo src={driverImage} style={{ width: '100%', height: '100%' }} /> : <Text style={styles.initials}>{getInitials(driver.name)}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={styles.driverName} numberOfLines={1}>{driver.name}</Text>
                <Text style={styles.driverPlate} numberOfLines={1}>{driver.vehicleNumber || driver.plate || 'Assigned'}</Text>
                <Text style={styles.driverSub} numberOfLines={1}>{vehicleLabel}</Text>
                <View style={styles.ratingPill}>
                  <Star size={12} color={color.gold} fill={color.gold} />
                  <Text style={styles.ratingText}>{driver.rating || '4.9'}</Text>
                </View>
              </View>
              <View style={styles.vehiclePhoto}>
                <Photo src={vehicleVisual} style={{ width: '100%', height: '100%' }} resizeMode={hasVehiclePhoto ? 'contain' : 'cover'} onError={() => setVehicleImageBroken(true)} />
              </View>
            </View>

            <View style={[styles.box, { flexDirection: 'row', gap: space.md }]}>
              <View style={{ alignItems: 'center', paddingTop: space.xs }}>
                <View style={styles.pickupDot} />
                <View style={styles.dash} />
                <View style={styles.dropSquare} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: space.md }}>
                <View>
                  <Text style={[styles.placeLabel, { color: PICKUP }]}>Pickup</Text>
                  <Text style={styles.place} numberOfLines={2}>{pickup}</Text>
                </View>
                <View>
                  <Text style={[styles.placeLabel, { color: DROP }]}>Drop</Text>
                  <Text style={styles.place} numberOfLines={2}>{drop}</Text>
                </View>
              </View>
            </View>

            <View style={styles.box}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Base fare</Text>
                <Text style={styles.billValue}>₹{fare.toFixed(2)}</Text>
              </View>
              <View style={[styles.billRow, { marginTop: space.sm }]}>
                <Text style={styles.billLabel}>Tip</Text>
                <Text style={styles.billValue}>₹{Number(selectedTip || 0).toFixed(2)}</Text>
              </View>
              <View style={[styles.billRow, styles.billTotalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{totalBill.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          {isSubmitted ? (
            <>
              <StatusBadge label="Feedback submitted" tone="success" style={{ alignSelf: 'center' }} />
              <Text style={styles.cardNote}>
                Rating: {rating || 0}/5 {selectedTip > 0 ? `| Tip added: ₹${Number(selectedTip || 0).toFixed(2)}` : '| No tip added'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>{tipsEnabled ? 'Tip your driver' : 'Driver tips disabled'}</Text>
              {tipsEnabled && minimumTipAmount > 0 ? <Text style={styles.cardNote}>Minimum tip amount: ₹{minimumTipAmount}</Text> : null}
              <View style={styles.tips} accessibilityRole="radiogroup">
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
                      style={[styles.tip, on ? styles.tipOn : null, off ? { opacity: 0.45 } : null]}
                    >
                      <Text style={[styles.tipText, on ? { color: color.onPrimary } : null]}>{amount === 0 ? 'No tip' : `₹${amount}`}</Text>
                    </Press>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <View style={[styles.card, { alignItems: 'center' }]}>
          <Text style={styles.question}>How was your trip with {driver.name?.split(' ')[0] || 'your driver'}?</Text>
          <View style={styles.stars} accessibilityRole="radiogroup">
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
                  <Star size={22} color={on ? color.onGold : color.textDisabled} fill={on ? color.onGold : 'none'} />
                </Press>
              );
            })}
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Add a note</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
              editable={!isSubmitted}
              placeholder="Tell us about the trip"
              placeholderTextColor={color.textDisabled}
              textAlignVertical="top"
              accessibilityLabel="Note about the trip"
              style={styles.noteInput}
            />
          </View>

          {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}

          <Button
            title={submitLabel}
            iconRight={ChevronRight}
            size="lg"
            loading={isSubmitting}
            disabled={submitDisabled}
            onPress={submitFeedback}
            style={{ marginTop: space.lg }}
          />
          <Button
            title="Skip and go home"
            variant="ghost"
            accessibilityLabel="Skip and go home"
            onPress={() => {
              clearCurrentRide();
              navigate(routeHome, { replace: true });
            }}
            style={{ marginTop: space.xs }}
          />
        </View>
      </ScrollView>

      {shareToast ? (
        <View style={[styles.toast, { top: space.lg + insets.top }]} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>Receipt copied</Text>
        </View>
      ) : null}

      <Modal visible={!!showSubmittedOverlay} transparent statusBarTranslucent animationType="fade" onRequestClose={() => navigate(routeHome, { replace: true })}>
        <View style={styles.overlay}>
          <View style={styles.overlayIcon}>
            <CheckCircle2 size={32} color={color.onPrimary} />
          </View>
          <Text style={styles.overlayTitle} accessibilityRole="header">Thanks for rating your driver</Text>
          <Text style={styles.overlayBody}>Your feedback has been saved successfully.</Text>
          <Button title="Continue" fullWidth={false} onPress={() => navigate(routeHome, { replace: true })} style={{ marginTop: space.sm, minWidth: 200 }} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, gap: space.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  doneIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.success, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.heading, fontSize: 22, lineHeight: 28, color: color.text },
  finalizing: { borderRadius: radii.lg, backgroundColor: color.warningSoft, paddingHorizontal: space.lg, paddingVertical: space.md },
  finalizingKicker: { ...type.label, color: color.warning },
  finalizingBody: { ...type.small, marginTop: space.xs, color: color.text },

  receipt: { borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, overflow: 'hidden', ...elevation.card },
  receiptHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, backgroundColor: color.primaryDeep, paddingHorizontal: space.lg, paddingVertical: space.md },
  receiptHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1, minWidth: 0 },
  receiptIcon: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  receiptTitle: { ...type.bodyStrong, color: color.goldOnDark },
  receiptDate: { ...type.caption, color: color.textOnDarkMuted },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, minHeight: 40, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: space.md },
  shareText: { ...type.label, color: color.textInverse },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radii.md, backgroundColor: color.bg, borderWidth: 1, borderColor: color.border, padding: space.md },
  driverPhoto: { width: 56, height: 56, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.primaryDeep, alignItems: 'center', justifyContent: 'center' },
  initials: { ...type.heading, color: color.goldOnDark },
  driverName: { ...type.subheading, color: color.text },
  driverPlate: { ...type.bodyStrong, color: color.text },
  driverSub: { ...type.caption, color: color.textSecondary },
  ratingPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xxs, borderRadius: radii.pill, backgroundColor: color.goldSoft, paddingHorizontal: space.sm, height: 22 },
  ratingText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },
  vehiclePhoto: { width: 64, height: 56, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  box: { borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: space.md },
  pickupDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: PICKUP },
  dropSquare: { width: 12, height: 12, borderRadius: 2, backgroundColor: DROP },
  dash: { flex: 1, minHeight: 32, borderLeftWidth: 2, borderStyle: 'dotted', borderColor: color.borderStrong, marginVertical: space.xs },
  placeLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold' },
  place: { ...type.small, color: color.text },
  billRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  billLabel: { ...type.small, color: color.textSecondary },
  billValue: { ...type.bodyStrong, color: color.text },
  billTotalRow: { marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: color.border },
  totalLabel: { ...type.subheading, color: color.text },
  totalValue: { ...type.priceLg, color: color.text },

  card: { borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: space.lg, ...elevation.card },
  cardTitle: { ...type.subheading, color: color.text, textAlign: 'center' },
  cardNote: { ...type.small, marginTop: space.sm, color: color.textSecondary, textAlign: 'center' },
  tips: { marginTop: space.md, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm },
  tip: { minHeight: 44, minWidth: 72, justifyContent: 'center', alignItems: 'center', borderRadius: radii.pill, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.lg },
  tipOn: { borderColor: color.primary, backgroundColor: color.primary },
  tipText: { ...type.label, color: color.text },
  question: { ...type.subheading, color: color.text, textAlign: 'center' },
  stars: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  star: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  starOn: { backgroundColor: color.goldBright },
  noteBox: { alignSelf: 'stretch', marginTop: space.lg, gap: space.xs },
  noteLabel: { ...type.label, color: color.text },
  noteInput: { minHeight: 88, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.md, paddingVertical: space.sm, ...type.body, color: color.text, outlineStyle: 'none' },
  error: { ...type.small, marginTop: space.md, color: color.danger, textAlign: 'center' },

  toast: { position: 'absolute', alignSelf: 'center', borderRadius: radii.pill, backgroundColor: color.primaryDeep, paddingHorizontal: space.xl, paddingVertical: space.md, ...elevation.float },
  toastText: { ...type.label, color: color.textInverse },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, backgroundColor: color.bg, paddingHorizontal: space.xxl },
  overlayIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: color.success, alignItems: 'center', justifyContent: 'center' },
  overlayTitle: { ...type.heading, color: color.text, textAlign: 'center' },
  overlayBody: { ...type.small, color: color.textSecondary, textAlign: 'center' },
});
