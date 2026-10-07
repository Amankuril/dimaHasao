import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { AlertCircle, ChevronDown } from 'lucide-react-native';
import { Press } from '../../../../components/ui';
import { poppins, tw } from '../../../../theme';
import { HT, WIZARD, wizard, wizardInput } from '../../../theme';

/* Small form pieces for the resort wizard (the web's `.input`, `.wizard-label`, chips and the address-search status). */

/** Tailwind's `sm:` breakpoint (640px): the web shows more columns / labels from here up. */
export function useIsSm() {
  return useWindowDimensions().width >= 640;
}

/** A result list capped at `max-h-48` (192px) that scrolls inside, like the web's dropdown. */
export function ResultsBox({ children, style }) {
  return (
    <View style={[styles.resultsBox, style]}>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 192 }}>
        {children}
      </ScrollView>
    </View>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function ReviewError({ message }) {
  if (!message) return null;
  return (
    <View style={styles.reviewError}>
      <Text style={styles.reviewErrorText}>{message}</Text>
    </View>
  );
}

export function Label({ children, style }) {
  return <Text style={[wizard.label, style]}>{children}</Text>;
}

/** A wizard text field; `numeric` is the web's type="number". */
export function Field({ value, onChangeText, placeholder, multiline, numeric, style, minHeight, leftPad }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value == null ? '' : String(value)}
      onChangeText={numeric ? (v) => onChangeText(String(v).replace(/[^0-9.-]/g, '')) : onChangeText}
      placeholder={placeholder}
      placeholderTextColor={WIZARD.placeholder}
      multiline={multiline}
      keyboardType={numeric ? 'numeric' : 'default'}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[wizardInput({ focused, multiline }), minHeight ? { minHeight } : null, leftPad ? { paddingLeft: leftPad } : null, style]}
    />
  );
}

export function FieldBlock({ label, children, style }) {
  return (
    <View style={[{ gap: 4 }, style]}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

/** A native-select stand-in: tap, pick from a list. */
export function SelectField({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[wizardInput(), styles.select]}>
        <Text style={styles.selectText} numberOfLines={1}>{current ? current.label : ''}</Text>
        <ChevronDown size={16} color={WIZARD.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={[styles.option, o.value === value && { backgroundColor: HT.primaryTint }]}
                >
                  <Text style={[styles.optionText, o.value === value && { color: HT.primary, ...poppins(700) }]}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/** Primary / secondary buttons used inside the cards. */
export function PrimaryButton({ title, onPress, disabled, style }) {
  return (
    <Press onPress={onPress} disabled={disabled} scale={0.95} style={[styles.primaryBtn, disabled && { opacity: 0.5 }, style]}>
      <Text style={styles.primaryBtnText}>{title}</Text>
    </Press>
  );
}

export function SecondaryButton({ title, onPress, style }) {
  return (
    <Press onPress={onPress} scale={0.98} style={[styles.secondaryBtn, style]}>
      <Text style={styles.secondaryBtnText}>{title}</Text>
    </Press>
  );
}

/** Feedback under an address search box (the web's SearchStatus). */
export function SearchStatus({ search }) {
  if (search.status === 'searching') {
    return (
      <View style={styles.statusRow}>
        <ActivityIndicator size="small" color={tw.gray400} />
        <Text style={styles.statusMuted}>Searching…</Text>
      </View>
    );
  }
  if (search.mapsUnavailable) {
    return (
      <View style={styles.unavailable}>
        <AlertCircle size={13} color={tw.amber700} style={{ marginTop: 2 }} />
        <Text style={styles.unavailableText}>Address lookup is unavailable right now — please fill in the address below by hand.</Text>
      </View>
    );
  }
  if (search.status === 'empty') {
    return <Text style={[styles.statusMuted, { marginTop: 8 }]}>No matches. Try a different search, or enter the address below.</Text>;
  }
  if (search.status === 'error') {
    return <Text style={[styles.statusMuted, { marginTop: 8, color: tw.red600 }]}>Could not search just now. Try again, or enter the address below.</Text>;
  }
  return null;
}

const styles = StyleSheet.create({
  resultsBox: { borderWidth: 1, borderColor: tw.gray200, borderRadius: 12, overflow: 'hidden', marginTop: 4, backgroundColor: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  errorBox: { padding: 12, backgroundColor: tw.red50, borderRadius: 8 },
  errorText: { fontSize: 14, lineHeight: 20, color: tw.red600, ...poppins(400) },
  reviewError: { padding: 16, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red200, borderRadius: 16 },
  reviewErrorText: { fontSize: 14, lineHeight: 20, color: tw.red700, ...poppins(500) },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selectText: { flex: 1, fontSize: 15, color: WIZARD.text, ...poppins(400) },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  sheet: { maxHeight: 360, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  option: { paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  optionText: { fontSize: 15, color: tw.gray900, ...poppins(500) },
  primaryBtn: { flex: 1, paddingVertical: 12, backgroundColor: HT.primary, borderRadius: 12, alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(10,77,43,0.25)' },
  primaryBtnText: { fontSize: 16, color: '#fff', ...poppins(700) },
  secondaryBtn: { flex: 1, paddingVertical: 12, backgroundColor: tw.gray100, borderRadius: 12, alignItems: 'center' },
  secondaryBtnText: { fontSize: 16, color: tw.gray600, ...poppins(600) },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  statusMuted: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(400) },
  unavailable: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: tw.amber50, borderWidth: 1, borderColor: tw.amber100, borderRadius: 8 },
  unavailableText: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.amber700, ...poppins(400) },
});
