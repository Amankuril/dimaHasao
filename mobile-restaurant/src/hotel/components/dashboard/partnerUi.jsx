import { forwardRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBadge } from '../../../components/ds';
import { color, radii, space, type } from '../../../theme';

/*
 * Small shared pieces for the hotel partner operations screens (dashboard,
 * bookings, properties, wallet, account), built on the design-system tokens.
 * Kept local to the hotel partner pages; see DESIGN_SYSTEM.md.
 */

/** Booking status -> { tone, label } per the DESIGN_SYSTEM state table. */
export function bookingTone(raw) {
  const s = String(raw || '').toLowerCase().trim();
  switch (s) {
    case 'confirmed':
      return { tone: 'info', label: 'Confirmed' };
    case 'checked_in':
      return { tone: 'info', label: 'Ongoing' };
    case 'checked_out':
    case 'completed':
      return { tone: 'success', label: 'Completed' };
    case 'cancelled':
      return { tone: 'danger', label: 'Cancelled' };
    case 'rejected':
      return { tone: 'danger', label: 'Rejected' };
    case 'no_show':
      return { tone: 'neutral', label: 'No show' };
    case 'pending':
      return { tone: 'warning', label: 'Pending' };
    case 'pending_payment':
    case 'awaiting_payment':
      return { tone: 'warning', label: 'Payment pending' };
    default: {
      const label = s ? s.replace(/_/g, ' ') : 'Pending';
      return { tone: 'warning', label: label.charAt(0).toUpperCase() + label.slice(1) };
    }
  }
}

export function BookingStatusBadge({ status, style }) {
  const { tone, label } = bookingTone(status);
  return <StatusBadge label={label} tone={tone} style={style} />;
}

/** Property approval status -> { tone, label }. */
export function approvalTone(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'approved') return { tone: 'success', label: 'Approved' };
  if (s === 'published') return { tone: 'success', label: 'Active' };
  if (s === 'rejected') return { tone: 'danger', label: 'Rejected' };
  if (s === 'suspended') return { tone: 'danger', label: 'Suspended' };
  if (s === 'draft') return { tone: 'neutral', label: 'Draft' };
  return { tone: 'warning', label: s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : 'Pending' };
}

/** Sentence-case a raw enum ("pay_at_hotel" -> "Pay at hotel"). */
export function sentence(raw) {
  const s = String(raw || '').replace(/_/g, ' ').trim().toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/** Full-area centred spinner. */
export function PageLoader({ style }) {
  return (
    <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg, padding: space.xxl }, style]}>
      <ActivityIndicator size="large" color={color.primary} />
    </View>
  );
}

/** Caption label over a value (detail tiles, key facts). */
export function InfoTile({ label, value, icon: Icon, style, valueStyle, numberOfLines = 2 }) {
  return (
    <View style={[ui.tile, style]}>
      <Text style={ui.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={ui.tileRow}>
        {Icon ? <Icon size={16} color={color.textMuted} /> : null}
        <Text style={[ui.tileValue, valueStyle]} numberOfLines={numberOfLines}>
          {value}
        </Text>
      </View>
    </View>
  );
}

/** Label left, value right (summaries, payment lines). */
export function KeyValue({ label, value, valueStyle, labelStyle, style }) {
  return (
    <View style={[ui.kv, style]}>
      <Text style={[ui.kvLabel, labelStyle]} numberOfLines={2}>
        {label}
      </Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[ui.kvValue, valueStyle]} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

/** Labelled 48 px text input with focus/error border. */
export const Field = forwardRef(function Field({ label, hint, error, multiline, style, inputStyle, editable = true, right, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: space.xs + 2 }, style]}>
      {label ? <Text style={ui.fieldLabel}>{label}</Text> : null}
      <View
        style={[
          ui.inputBox,
          multiline && { minHeight: 96, alignItems: 'flex-start' },
          focused && { borderColor: color.primary },
          error && { borderColor: color.danger },
          !editable && { backgroundColor: color.surfaceMuted },
        ]}
      >
        <TextInput
          ref={ref}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={color.textDisabled}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[ui.input, multiline && { textAlignVertical: 'top', paddingTop: space.md, minHeight: 96 }, !editable && { color: color.textMuted }, inputStyle]}
          {...rest}
        />
        {right}
      </View>
      {error ? <Text style={ui.error}>{error}</Text> : hint ? <Text style={ui.hint}>{hint}</Text> : null}
    </View>
  );
});

/** White bar pinned to the bottom with the safe-area inset. */
export function PinnedBar({ children, style }) {
  const insets = useSafeAreaInsets();
  return <View style={[ui.pinned, { paddingBottom: space.lg + insets.bottom }, style]}>{children}</View>;
}

export const ui = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, padding: space.md, backgroundColor: color.surfaceMuted, borderRadius: radii.md, gap: space.xxs },
  tileLabel: { ...type.caption, color: color.textMuted },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  tileValue: { ...type.bodyStrong, color: color.text, flexShrink: 1 },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, minHeight: 28 },
  kvLabel: { ...type.body, color: color.textSecondary, flex: 1, minWidth: 0 },
  kvValue: { ...type.bodyStrong, color: color.text },
  fieldLabel: { ...type.label, color: color.text },
  inputBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface, paddingHorizontal: space.md },
  input: { flex: 1, minWidth: 0, minHeight: 46, ...type.body, color: color.text, paddingVertical: 0, outlineStyle: 'none' },
  error: { ...type.small, color: color.danger },
  hint: { ...type.caption, color: color.textMuted },
  pinned: { backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: color.border },
});
