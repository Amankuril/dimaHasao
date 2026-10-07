import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Fa from '../Fa';
import { Chip, IconButton, fa } from '../ds';
import { Dialog, SelectField } from '../kit';
import { GreenButton, Panel, dhs } from './ui';
import { color, elevation, radii, space, type } from '../../theme';

/*
 * Pieces the tour list and booking screens share: the search panel, the
 * chips + sort row, the price lines, and the "confirmed" dialog. Design
 * system tokens (DESIGN_SYSTEM.md).
 */

export const SORTS = [
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

/** The white panel with a 48 px search field and a clear button. */
export function SearchPanel({ value, onChange, placeholder, children }) {
  return (
    <Panel style={{ gap: space.md }}>
      <View style={styles.searchBox}>
        <Fa name="fa-solid fa-magnifying-glass" size={16} color={color.primary} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={color.textMuted}
          value={value}
          onChangeText={onChange}
          returnKeyType="search"
          style={styles.searchInput}
          accessibilityLabel={placeholder}
        />
        {value ? <IconButton icon={fa('fa-solid fa-xmark')} label="Clear search" size={40} iconSize={16} iconColor={color.textMuted} onPress={() => onChange('')} /> : null}
      </View>
      {children}
    </Panel>
  );
}

/** Horizontal filter chips (ds Chip; selected = brand green). Bleeds to the screen edge. */
export function ChipRow({ items, value, onChange, label = (v) => v }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }} style={{ flexGrow: 0, marginHorizontal: -space.lg }}>
      {items.map((item) => (
        <Chip key={item} label={label(item)} selected={value === item} onPress={() => onChange(item)} />
      ))}
    </ScrollView>
  );
}

/** "N stays available" + the Sort select. */
export function ResultsBar({ text, sortBy, onSort }) {
  return (
    <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }]}>
      <Text style={styles.count}>{text}</Text>
      <View style={[dhs.row, { gap: space.sm }]}>
        <Text style={styles.sortLabel}>Sort</Text>
        <SelectField value={sortBy} options={SORTS} onChange={onSort} accessibilityLabel="Sort" style={styles.sort} textStyle={styles.sortText} chevronColor={color.text} />
      </View>
    </View>
  );
}

/** One line of a price breakdown. */
export function FareLine({ label, value, green, style }) {
  return (
    <View style={[styles.line, style]}>
      <Text style={[styles.lineLabel, green && styles.green]}>{label}</Text>
      <Text style={[styles.lineValue, green && styles.green]}>{value}</Text>
    </View>
  );
}

export function FareTotal({ label, value }) {
  return (
    <View style={[styles.line, styles.total]}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
  );
}

export function QuoteError({ children }) {
  return <Text style={styles.quoteError}>{children}</Text>;
}

/** Radio dot used by the payment and ticket pickers. */
export function Radio({ selected }) {
  return <View style={[styles.radio, selected && { borderColor: color.primary }]}>{selected ? <View style={styles.radioDot} /> : null}</View>;
}

/**
 * The "Booking confirmed!" dialog. `rows` is the two-column grid, `kicker` /
 * `heading` / `sub` the block above it, `footer` the totals below.
 */
export function ConfirmedDialog({ visible, icon = 'fa-solid fa-circle-check', title, text, id, kicker, heading, sub, rows = [], footer, onDone, extraActions }) {
  const { height } = useWindowDimensions();
  const leave = (to) => {
    onDone?.();
    router.dismissTo('/app');
    if (to) router.navigate(to);
  };
  return (
    <Dialog visible={visible} onClose={() => {}} closeOnBackdrop={false} backdrop={color.overlay} panelStyle={[styles.modal, { maxHeight: height * 0.9 }]}>
      <ScrollView contentContainerStyle={{ gap: space.lg }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: space.xs }}>
          <View style={styles.okIcon}>
            <Fa name={icon} size={28} color={color.success} />
          </View>
          <Text style={styles.okTitle} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.okText}>{text}</Text>
          {id ? (
            <Text style={styles.okId} selectable>
              ID: {id}
            </Text>
          ) : null}
        </View>

        <View style={styles.invoice}>
          <View style={styles.invoiceHead}>
            <Text style={styles.invoiceKicker}>{kicker}</Text>
            <Text style={styles.invoiceHeading}>{heading}</Text>
            {sub ? <Text style={styles.invoiceSub}>{sub}</Text> : null}
          </View>
          <View style={styles.invoiceGrid}>
            {rows.map(([label, value, opts]) => (
              <View key={label} style={{ width: opts?.wide ? '100%' : '50%', marginBottom: space.sm, paddingRight: space.sm }}>
                <Text style={styles.invoiceLabel}>{String(label).replace(/:$/, '')}</Text>
                <Text style={[styles.invoiceValue, opts?.green && { color: color.success }]}>{value}</Text>
              </View>
            ))}
          </View>
          {footer ? <View style={styles.invoiceTotal}>{footer}</View> : null}
        </View>

        <View style={{ gap: space.sm }}>
          {extraActions}
          <GreenButton title="View in My Bookings" icon="fa-solid fa-calendar-check" onPress={() => leave('/app/bookings')} />
          <GreenButton tone="gray" title="Back to home" onPress={() => leave(null)} />
        </View>
      </ScrollView>
    </Dialog>
  );
}

/** A label/value pair inside ConfirmedDialog's footer. */
export function InvoiceTotalRow({ label, value, amber }) {
  return (
    <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }]}>
      <Text style={[styles.invoiceTotalLabel, amber && { color: color.warning }]}>{String(label).replace(/:$/, '')}</Text>
      <Text style={[styles.invoiceTotalValue, amber && { ...type.bodyStrong, color: color.warning }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: { height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, paddingLeft: space.md, paddingRight: space.xs },
  searchInput: { flex: 1, minWidth: 0, height: 46, padding: 0, ...type.body, color: color.text },
  count: { ...type.bodyStrong, color: color.text, flexShrink: 1 },
  sortLabel: { ...type.small, color: color.textMuted },
  sort: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, paddingHorizontal: space.md, minHeight: 44, minWidth: 120, gap: space.xs },
  sortText: { ...type.label, color: color.text },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  lineLabel: { flex: 1, ...type.small, color: color.textSecondary },
  lineValue: { ...type.bodyStrong, color: color.text },
  green: { color: color.success },
  total: { paddingTop: space.sm, marginTop: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borderStrong, alignItems: 'baseline' },
  totalLabel: { ...type.subheading, color: color.text },
  totalValue: { ...type.price, color: color.text },
  quoteError: { ...type.small, color: color.danger, backgroundColor: color.dangerSoft, borderRadius: radii.md, padding: space.md },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  modal: { width: '100%', maxWidth: 400, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xl, borderWidth: 1, borderColor: color.border, ...elevation.float },
  okIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  okTitle: { ...type.heading, color: color.text, textAlign: 'center' },
  okText: { ...type.small, color: color.textMuted, textAlign: 'center' },
  okId: { ...type.label, color: color.primary, backgroundColor: color.surfaceMuted, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.pill, overflow: 'hidden', marginTop: space.xs },
  invoice: { backgroundColor: color.surfaceMuted, borderRadius: radii.lg, padding: space.lg, gap: space.sm },
  invoiceHead: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.borderStrong, paddingBottom: space.sm, gap: 2 },
  invoiceKicker: { ...type.overline, color: color.textMuted },
  invoiceHeading: { ...type.bodyStrong, color: color.text },
  invoiceSub: { ...type.label, color: color.primary },
  invoiceGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  invoiceLabel: { ...type.caption, color: color.textMuted },
  invoiceValue: { ...type.label, color: color.text },
  invoiceTotal: { paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borderStrong, gap: space.xs },
  invoiceTotalLabel: { ...type.bodyStrong, color: color.text, flexShrink: 1 },
  invoiceTotalValue: { ...type.price, color: color.text },
});
