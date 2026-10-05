import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircle, Check, ShieldAlert, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { Spinner } from '../../components/Loader';
import { fo } from '../account/ui';
import { tw } from '../../theme';

export const TAXI_CANCELLATION_REASONS = [
  'I booked the ride by mistake',
  'I no longer need the ride',
  'I want to change my destination',
  'I entered the wrong pickup location',
  'I entered the wrong destination',
  'Driver is taking too long to arrive',
  'Driver is moving away from my pickup location',
  'Driver asked me to cancel the ride',
  'Driver is not responding',
  'Driver is not coming to the pickup location',
  'Driver asked for extra fare',
  'Fare is too high',
  'Estimated arrival time is too long',
  'I found another ride',
  "I don't feel comfortable with the driver",
  'I have an issue with the vehicle',
  'I want to change the vehicle type',
  'Emergency / urgent situation',
  'Other',
];

export default function RideCancellationModal({ isOpen, onClose, onConfirm, isCancelling = false, stage = 'searching', cancellationPolicyText = '' }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customComment, setCustomComment] = useState('');
  const [focused, setFocused] = useState(false);

  const isOtherSelected = selectedReason === 'Other';
  const isFormValid = Boolean(selectedReason) && (!isOtherSelected || Boolean(customComment.trim()));

  const handleConfirm = () => {
    if (!isFormValid || isCancelling) return;
    onConfirm({
      reason: selectedReason,
      cancellationReason: selectedReason,
      cancellationComment: customComment.trim(),
      comment: customComment.trim(),
    });
  };

  return (
    <BottomSheet visible={Boolean(isOpen)} onClose={isCancelling ? () => {} : onClose} backdrop="rgba(15,23,43,0.6)" blur={8} panelStyle={styles.panel}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <ShieldAlert size={20} color={tw.red500} />
            <Text style={styles.title}>Cancel Ride</Text>
          </View>
          <Text style={styles.sub}>
            {stage === 'searching' ? 'No fee applies while searching for drivers' : stage === 'arrived' ? 'Driver has arrived at your pickup location' : 'Driver is on the way'}
          </Text>
        </View>
        <Press onPress={onClose} disabled={isCancelling} style={styles.closeBtn} accessibilityLabel="Close">
          <X size={16} color={tw.slate500} />
        </Press>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {cancellationPolicyText ? (
          <View style={styles.policy}>
            <AlertCircle size={16} color={tw.amber600} style={{ marginTop: 2 }} />
            <Text style={styles.policyText}>{cancellationPolicyText}</Text>
          </View>
        ) : null}

        <Text style={styles.prompt}>
          Please select a reason for cancellation <Text style={{ color: tw.red500 }}>*</Text>
        </Text>

        <View style={{ gap: 8 }}>
          {TAXI_CANCELLATION_REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <Press key={reason} scale={1} onPress={() => setSelectedReason(reason)} disabled={isCancelling} style={[styles.reason, isSelected && styles.reasonOn]}>
                <Text style={[styles.reasonText, isSelected && { color: tw.red600 }]}>{reason}</Text>
                <View style={[styles.radio, isSelected && { borderColor: tw.red500, backgroundColor: tw.red500 }]}>
                  {isSelected ? <Check size={10} color="#fff" strokeWidth={3} /> : null}
                </View>
              </Press>
            );
          })}
        </View>

        {isOtherSelected ? (
          <View style={{ paddingTop: 8, gap: 6 }}>
            <Text style={styles.otherLabel}>
              Please tell us why you want to cancel this ride <Text style={{ color: tw.red500 }}>*</Text>
            </Text>
            <TextInput
              value={customComment}
              onChangeText={setCustomComment}
              placeholder="Please tell us why you want to cancel this ride..."
              placeholderTextColor={tw.slate400}
              editable={!isCancelling}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={[styles.input, focused && { borderColor: tw.red500 }]}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Press onPress={onClose} disabled={isCancelling} style={[styles.btn, { backgroundColor: tw.slate100 }]}>
          <Text style={[styles.btnText, { color: tw.slate700 }]}>Back</Text>
        </Press>
        <Press onPress={handleConfirm} disabled={!isFormValid || isCancelling} style={[styles.btn, styles.btnDanger, (!isFormValid || isCancelling) && { opacity: 0.5 }]}>
          {isCancelling ? (
            <>
              <Spinner size={16} />
              <Text style={[styles.btnText, { color: '#fff' }]}>Cancelling...</Text>
            </>
          ) : (
            <Text style={[styles.btnText, { color: '#fff' }]}>Confirm Cancellation</Text>
          )}
        </Press>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', overflow: 'hidden', borderWidth: 1, borderColor: tw.slate100, width: '100%' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: tw.slate100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(248,250,252,0.5)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...fo(700), fontSize: 18, color: tw.slate900 },
  sub: { ...fo(400), fontSize: 12, color: tw.slate500, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0, flexShrink: 1 },
  policy: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: tw.amber50, borderWidth: 1, borderColor: tw.amber200, borderRadius: 16 },
  policyText: { flex: 1, ...fo(500), fontSize: 12, color: tw.amber800, lineHeight: 19.5 },
  prompt: { ...fo(600), fontSize: 12, color: tw.slate600 },
  reason: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(248,250,252,0.8)', borderColor: 'rgba(226,232,240,0.8)' },
  reasonOn: { backgroundColor: tw.red50, borderColor: tw.red500 },
  reasonText: { ...fo(600), fontSize: 12, color: tw.slate700, flex: 1 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: tw.slate300, alignItems: 'center', justifyContent: 'center' },
  otherLabel: { ...fo(700), fontSize: 12, color: tw.slate700 },
  input: { minHeight: 80, borderWidth: 2, borderColor: tw.slate200, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, ...fo(400), fontSize: 12, color: tw.slate800 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: tw.slate100, backgroundColor: 'rgba(248,250,252,0.5)', flexDirection: 'row', gap: 12 },
  btn: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnDanger: { backgroundColor: tw.red600, boxShadow: '0 10px 15px -3px rgba(239,68,68,0.2)' },
  btnText: { ...fo(700), fontSize: 12 },
});
