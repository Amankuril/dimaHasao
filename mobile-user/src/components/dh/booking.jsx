import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Fa from '../Fa';
import { Press } from '../ui';
import { Dialog, SelectField } from '../kit';
import { GreenButton, Panel, dhs } from './ui';
import { dh, montserrat, poppins, shadow, tw } from '../../theme';

/*
 * Pieces the hotel / tour / festival list and booking screens share on the
 * web by repetition: the search panel, the chips + sort row, the price
 * lines, and the "confirmed" dialog.
 */

export const SORTS = [
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

/** The white panel with a search field (`pl-9 pr-8`, clear button). */
export function SearchPanel({ value, onChange, placeholder, children }) {
  return (
    <Panel pad={12} style={{ gap: 10 }}>
      <View style={{ justifyContent: 'center' }}>
        <Fa name="fa-solid fa-magnifying-glass" size={12} color={tw.emerald800} style={styles.searchIcon} />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={tw.gray400}
          value={value}
          onChangeText={onChange}
          returnKeyType="search"
          style={[dhs.input, { paddingLeft: 36, paddingRight: 32 }]}
          accessibilityLabel={placeholder}
        />
        {value ? (
          <Press onPress={() => onChange('')} style={styles.clear} accessibilityLabel="Clear search" hitSlop={8}>
            <Fa name="fa-solid fa-xmark" size={12} color={tw.gray400} />
          </Press>
        ) : null}
      </View>
      {children}
    </Panel>
  );
}

/** Horizontal filter pills (`bg-[#06381e] text-amber-300` when active). */
export function ChipRow({ items, value, onChange, label = (v) => v }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }} style={{ flexGrow: 0 }}>
      {items.map((item) => {
        const active = value === item;
        return (
          <Press key={item} scale={0.94} onPress={() => onChange(item)} style={[styles.chip, active && styles.chipActive]} accessibilityState={{ selected: active }}>
            <Text style={[styles.chipText, active && { color: tw.amber300 }]}>{label(item)}</Text>
          </Press>
        );
      })}
    </ScrollView>
  );
}

/** "N Stays Available" + the Sort select. */
export function ResultsBar({ text, sortBy, onSort }) {
  return (
    <View style={[dhs.row, { justifyContent: 'space-between', paddingHorizontal: 4 }]}>
      <Text style={styles.count}>{text}</Text>
      <View style={[dhs.row, { gap: 6 }]}>
        <Text style={styles.sortLabel}>Sort:</Text>
        <SelectField value={sortBy} options={SORTS} onChange={onSort} accessibilityLabel="Sort" style={styles.sort} textStyle={styles.sortText} chevronColor={tw.gray800} />
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

/** Radio dot used by the payment and ticket pickers (`accent-emerald-800`). */
export function Radio({ selected }) {
  return <View style={[styles.radio, selected && { borderColor: tw.emerald800 }]}>{selected ? <View style={styles.radioDot} /> : null}</View>;
}

/**
 * The "Booking Confirmed!" dialog. `rows` is the two-column grid, `kicker` /
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
    <Dialog visible={visible} onClose={() => {}} closeOnBackdrop={false} backdrop="rgba(0,0,0,0.7)" panelStyle={[styles.modal, { maxHeight: height * 0.9 }]}>
      <ScrollView contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={styles.okIcon}>
            <Fa name={icon} size={24} color={tw.emerald800} />
          </View>
          <Text style={styles.okTitle}>{title}</Text>
          <Text style={styles.okText}>{text}</Text>
          {id ? <Text style={styles.okId}>ID: {id}</Text> : null}
        </View>

        <View style={styles.invoice}>
          <View style={styles.invoiceHead}>
            <Text style={styles.invoiceKicker}>{kicker}</Text>
            <Text style={styles.invoiceHeading}>{heading}</Text>
            {sub ? <Text style={styles.invoiceSub}>{sub}</Text> : null}
          </View>
          <View style={styles.invoiceGrid}>
            {rows.map(([label, value, opts]) => (
              <View key={label} style={{ width: opts?.wide ? '100%' : '50%', marginBottom: 8 }}>
                <Text style={styles.invoiceLabel}>{label}</Text>
                <Text style={[styles.invoiceValue, opts?.green && { color: tw.emerald800 }]}>{value}</Text>
              </View>
            ))}
          </View>
          {footer ? <View style={styles.invoiceTotal}>{footer}</View> : null}
        </View>

        <View style={{ gap: 8, paddingTop: 4 }}>
          {extraActions}
          <GreenButton title="View in My Bookings" icon="fa-solid fa-calendar-check" style={{ paddingVertical: 12, ...shadow('md') }} onPress={() => leave('/app/bookings')} />
          <GreenButton tone="gray" title="Back to Home" textStyle={poppins(600)} onPress={() => leave(null)} />
        </View>
      </ScrollView>
    </Dialog>
  );
}

/** A label/value pair inside ConfirmedDialog's footer. */
export function InvoiceTotalRow({ label, value, amber }) {
  return (
    <View style={[dhs.row, { justifyContent: 'space-between' }]}>
      <Text style={[styles.invoiceTotalLabel, amber && { color: tw.amber800, ...poppins(600) }]}>{label}</Text>
      <Text style={[styles.invoiceTotalValue, amber && { color: tw.amber800, fontSize: 12, ...poppins(700) }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchIcon: { position: 'absolute', left: 14, zIndex: 1 },
  clear: { position: 'absolute', right: 10, padding: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: dh.border },
  chipActive: { backgroundColor: dh.nav, borderColor: tw.emerald800 },
  chipText: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(700) },
  count: { fontSize: 12, lineHeight: 16, color: tw.gray700, flexShrink: 1, ...poppins(700) },
  sortLabel: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(500) },
  sort: { backgroundColor: '#fff', borderWidth: 1, borderColor: dh.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 96, gap: 4 },
  sortText: { fontSize: 11, lineHeight: 16.5, color: tw.gray800, ...poppins(600) },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lineLabel: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  lineValue: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(600) },
  green: { color: tw.emerald700, ...poppins(600) },
  total: { paddingTop: 8, marginTop: 2, borderTopWidth: 1, borderTopColor: tw.gray200, alignItems: 'baseline' },
  totalLabel: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  totalValue: { fontSize: 18, lineHeight: 28, color: tw.emerald950, ...montserrat(900) },
  quoteError: { fontSize: 12, lineHeight: 16, color: tw.red600, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red100, borderRadius: 12, padding: 10, ...poppins(400) },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: tw.gray400, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tw.emerald800 },
  modal: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: tw.emerald200, ...shadow('2xl') },
  okIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: tw.emerald100, alignItems: 'center', justifyContent: 'center' },
  okTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, textAlign: 'center', ...montserrat(700) },
  okText: { fontSize: 12, lineHeight: 16, color: tw.gray500, textAlign: 'center', ...poppins(400) },
  okId: { fontSize: 12, lineHeight: 16, color: tw.emerald900, backgroundColor: dh.cream, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: dh.border, overflow: 'hidden', fontFamily: 'monospace', fontWeight: '700' },
  invoice: { backgroundColor: dh.cream, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: dh.border, gap: 8 },
  invoiceHead: { borderBottomWidth: 1, borderBottomColor: dh.border, paddingBottom: 8 },
  invoiceKicker: { fontSize: 10, lineHeight: 15, color: tw.gray400, textTransform: 'uppercase', ...poppins(700) },
  invoiceHeading: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  invoiceSub: { fontSize: 12, lineHeight: 16, color: tw.emerald800, ...poppins(600) },
  invoiceGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  invoiceLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(400) },
  invoiceValue: { fontSize: 11, lineHeight: 16.5, color: tw.gray700, paddingRight: 6, ...poppins(600) },
  invoiceTotal: { paddingTop: 8, borderTopWidth: 1, borderTopColor: dh.border, gap: 4 },
  invoiceTotalLabel: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  invoiceTotalValue: { fontSize: 14, lineHeight: 20, color: tw.emerald950, ...montserrat(900) },
});
