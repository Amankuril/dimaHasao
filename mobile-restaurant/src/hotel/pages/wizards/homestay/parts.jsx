import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircle, CheckCircle } from 'lucide-react-native';
import { Press } from '../../../../components/ui';
import { poppins, tw } from '../../../../theme';
import { HT, WIZARD, wizard, wizardInput } from '../../../theme';

/* Shared building blocks of the homestay wizard (the web's `.input`, `.wizard-label` and repeated markup). */

/** `<label className="wizard-label">` */
export function Label({ children, style }) {
  return <Text style={[wizard.label, style]}>{children}</Text>;
}

/** The small uppercase caption used for the image sections (text-xs font-semibold uppercase tracking-wider). */
export function Caption({ children }) {
  return <Text style={styles.caption}>{String(children).toUpperCase()}</Text>;
}

/** `.input` with its focus ring; `icon` is drawn inside on the left (the web's `!pl-12` / `pl-11` fields). */
export function WInput({ icon, iconLeft = 16, iconPad = 44, multiline, minHeight, style, ...rest }) {
  const [focused, setFocused] = useState(false);
  const input = (
    <TextInput
      placeholderTextColor={WIZARD.placeholder}
      multiline={multiline}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...rest}
      style={[wizardInput({ focused, multiline }), icon ? { paddingLeft: iconPad } : null, minHeight ? { minHeight } : null, style]}
    />
  );
  if (!icon) return input;
  return (
    <View>
      {input}
      <View pointerEvents="none" style={[styles.inputIcon, { left: iconLeft }]}>
        {icon}
      </View>
    </View>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

/** Dashed empty state ("No nearby places added yet", "No inventory added yet"). */
export function EmptyState({ icon, tint, title, hint, padding = 40 }) {
  return (
    <View style={[styles.empty, { paddingVertical: padding }]}>
      <View style={[styles.emptyIcon, { backgroundColor: tint }]}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

/** Primary tinted action (Add Nearby Place / Add Inventory). */
export function TintButton({ onPress, disabled, icon, children }) {
  return (
    <Press onPress={onPress} disabled={disabled} scale={0.98} style={[styles.tintButton, disabled ? { opacity: 0.5 } : null]}>
      {icon}
      <Text style={styles.tintButtonText}>{children}</Text>
    </Press>
  );
}

// partnerTheme.css: `bg-[#005CA8] hover:bg-[#004b8a]` renders the strong green (the hover class matches by substring and its
// rule comes later) and `shadow-[#005CA8]/25` loses its alpha, so the shadow is solid green.
const SHADOW_MD = `0 4px 6px -1px ${HT.primary}, 0 2px 4px -2px ${HT.primary}`;
const SHADOW_LG = `0 10px 15px -3px ${HT.primary}, 0 4px 6px -4px ${HT.primary}`;

/** Cancel / confirm pair at the bottom of the inline editors. */
export function ActionPair({ onCancel, onConfirm, confirmLabel, cancelWeight = 600, shadow = 'md' }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingTop: 8 }}>
      <Press onPress={onCancel} style={[styles.actionButton, { backgroundColor: tw.gray100 }]}>
        <Text style={[styles.actionText, { color: tw.gray600, ...poppins(cancelWeight) }]}>Cancel</Text>
      </Press>
      <Press onPress={onConfirm} style={[styles.actionButton, { backgroundColor: HT.primaryStrong, boxShadow: shadow === 'lg' ? SHADOW_LG : SHADOW_MD }]}>
        <Text style={[styles.actionText, { color: '#fff', ...poppins(700) }]}>{confirmLabel}</Text>
      </Press>
    </View>
  );
}

/** The inline editor card (nearby place / inventory) with its tinted title bar and Close button. */
export function EditorCard({ title, onClose, children }) {
  return (
    <View style={styles.editor}>
      <View style={styles.editorBar}>
        <Text style={styles.editorTitle}>{title}</Text>
        <Press onPress={onClose} scale={0.95} style={{ padding: 4, borderRadius: 6, backgroundColor: HT.primarySoft }}>
          <Text style={styles.editorClose}>Close</Text>
        </Press>
      </View>
      <View style={{ padding: 16 }}>{children}</View>
    </View>
  );
}

/** Round check marker (checkbox / amenity tick). */
export function CheckDot({ checked, size = 20, radius = 10, icon = 12, square }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: square ? 4 : radius,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        backgroundColor: checked ? HT.primary : '#fff',
        borderColor: checked ? 'transparent' : tw.gray300,
      }}
    >
      {checked ? <CheckCircle size={icon} color="#fff" /> : null}
    </View>
  );
}

/** Feedback under an address search box (SearchStatus on the web). */
export function SearchStatus({ search }) {
  if (search.status === 'searching') {
    return (
      <View style={styles.statusRow}>
        <ActivityIndicator size="small" color={tw.gray400} style={{ transform: [{ scale: 0.6 }] }} />
        <Text style={styles.statusText}>Searching…</Text>
      </View>
    );
  }

  if (search.mapsUnavailable) {
    return (
      <View style={styles.statusAmber}>
        <AlertCircle size={13} color={tw.amber700} style={{ marginTop: 2 }} />
        <Text style={[styles.statusText, { color: tw.amber700, flex: 1 }]}>
          Address lookup is unavailable right now — please fill in the address below by hand.
        </Text>
      </View>
    );
  }

  if (search.status === 'empty') {
    return <Text style={[styles.statusText, { marginTop: 8 }]}>No matches. Try a different search, or enter the address below.</Text>;
  }

  if (search.status === 'error') {
    return <Text style={[styles.statusText, { marginTop: 8, color: tw.red600 }]}>Could not search just now. Try again, or enter the address below.</Text>;
  }

  return null;
}

/** Dropdown list of search results rendered inline under the box. */
export function ResultList({ results, onSelect, secondary, maxHeight = 240 }) {
  if (!results.length) return null;
  return (
    <ScrollView style={[styles.results, { maxHeight }]} nestedScrollEnabled keyboardShouldPersistTaps="handled">
      {results.map((r, i) => (
        <Press key={i} scale={1} onPress={() => onSelect(r)} style={[styles.resultRow, i === results.length - 1 ? { borderBottomWidth: 0 } : null]}>
          <Text style={styles.resultName}>{r.name}</Text>
          <Text style={styles.resultAddr} numberOfLines={1}>
            {secondary(r)}
          </Text>
        </Press>
      ))}
    </ScrollView>
  );
}

export const styles = StyleSheet.create({
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray500, ...poppins(600) },
  inputIcon: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' },
  errorBanner: { padding: 12, backgroundColor: tw.red50, borderRadius: 8 },
  errorText: { fontSize: 14, lineHeight: 20, color: tw.red600, ...poppins(400) },
  empty: { alignItems: 'center', paddingHorizontal: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray200, borderRadius: 16, backgroundColor: 'rgba(249,250,251,0.5)' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: tw.gray500, fontSize: 14, lineHeight: 20, textAlign: 'center', ...poppins(500) },
  emptyHint: { marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.gray400, textAlign: 'center', ...poppins(400) },
  tintButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderWidth: 1, borderColor: HT.primaryBorder, backgroundColor: HT.primaryTint, borderRadius: 12 },
  tintButtonText: { color: HT.primaryStrong, fontSize: 14, lineHeight: 20, ...poppins(700) },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionText: { fontSize: 14, lineHeight: 24 },
  editor: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: HT.primaryBorder, overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
  editorBar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: HT.primaryTint, borderBottomWidth: 1, borderBottomColor: HT.primaryBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editorTitle: { color: HT.primaryStrong, fontSize: 14, lineHeight: 20, ...poppins(700) },
  editorClose: { color: HT.primary, fontSize: 12, lineHeight: 16, ...poppins(700) },
  statusRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(400) },
  statusAmber: { marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: tw.amber50, borderWidth: 1, borderColor: tw.amber100, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  results: { marginTop: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray100, borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' },
  resultRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray50 },
  resultName: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(700) },
  resultAddr: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
});
