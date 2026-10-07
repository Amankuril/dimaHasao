import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ShieldAlert, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { Button, IconButton } from '../../components/ds';
import { color, radii, space, type } from '../../theme';

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
  const insets = useSafeAreaInsets();

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
    <BottomSheet visible={Boolean(isOpen)} onClose={isCancelling ? () => {} : onClose} backdrop={color.overlay} blur={8} panelStyle={styles.panel}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.titleRow}>
            <ShieldAlert size={22} color={color.danger} />
            <Text style={styles.title} accessibilityRole="header">Cancel ride</Text>
          </View>
          <Text style={styles.sub}>
            {stage === 'searching' ? 'No fee applies while searching for drivers' : stage === 'arrived' ? 'Driver has arrived at your pickup location' : 'Driver is on the way'}
          </Text>
        </View>
        <IconButton icon={X} label="Close" variant="soft" onPress={onClose} disabled={isCancelling} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {cancellationPolicyText ? (
          <View style={styles.policy}>
            <AlertCircle size={18} color={color.warning} style={{ marginTop: 1 }} />
            <Text style={styles.policyText}>{cancellationPolicyText}</Text>
          </View>
        ) : null}

        <Text style={styles.prompt}>
          Please select a reason for cancellation <Text style={{ color: color.danger }}>*</Text>
        </Text>

        <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
          {TAXI_CANCELLATION_REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <Press
                key={reason}
                scale={1}
                onPress={() => setSelectedReason(reason)}
                disabled={isCancelling}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected, disabled: isCancelling }}
                accessibilityLabel={reason}
                style={[styles.reason, isSelected && styles.reasonOn]}
              >
                <View style={[styles.radio, isSelected && styles.radioOn]}>
                  {isSelected ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={[styles.reasonText, isSelected && { color: color.primary, fontFamily: 'Poppins_600SemiBold' }]}>{reason}</Text>
              </Press>
            );
          })}
        </View>

        {isOtherSelected ? (
          <View style={{ paddingTop: space.sm, gap: space.xs }}>
            <Text style={styles.otherLabel}>
              Please tell us why you want to cancel this ride <Text style={{ color: color.danger }}>*</Text>
            </Text>
            <TextInput
              value={customComment}
              onChangeText={setCustomComment}
              placeholder="Please tell us why you want to cancel this ride..."
              placeholderTextColor={color.textDisabled}
              editable={!isCancelling}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              accessibilityLabel="Reason for cancelling"
              style={[styles.input, focused && { borderColor: color.primary }]}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
        <Button title="Back" variant="outline" onPress={onClose} disabled={isCancelling} style={{ flex: 1 }} />
        <Button
          title={isCancelling ? 'Cancelling...' : 'Confirm cancellation'}
          variant="danger"
          loading={isCancelling}
          disabled={!isFormValid || isCancelling}
          onPress={handleConfirm}
          style={{ flex: 1.6 }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '85%', overflow: 'hidden', width: '100%' },
  header: { padding: space.lg, gap: space.md, borderBottomWidth: 1, borderBottomColor: color.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { ...type.heading, color: color.text },
  sub: { ...type.small, color: color.textSecondary, marginTop: space.xxs },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { padding: space.lg, gap: space.md },
  policy: { flexDirection: 'row', gap: space.sm, padding: space.md, backgroundColor: color.warningSoft, borderRadius: radii.md },
  policyText: { ...type.small, flex: 1, color: color.text },
  prompt: { ...type.label, color: color.text },
  reason: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 52, paddingVertical: space.sm, borderRadius: radii.md, borderWidth: 1.5, backgroundColor: color.surface, borderColor: color.border },
  reasonOn: { backgroundColor: color.primarySoft, borderColor: color.primary },
  reasonText: { ...type.body, color: color.text, flex: 1, minWidth: 0 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: color.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  otherLabel: { ...type.label, color: color.text },
  input: { minHeight: 88, borderWidth: 1.5, borderColor: color.border, borderRadius: radii.md, paddingHorizontal: space.lg, paddingVertical: space.md, ...type.body, color: color.text, outlineStyle: 'none' },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.surface, flexDirection: 'row', gap: space.md },
});
