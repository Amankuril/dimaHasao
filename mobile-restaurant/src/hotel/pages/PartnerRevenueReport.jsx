/**
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerRevenueReport.jsx
 * (/hotel/partner/revenue).
 *
 * Partner revenue and settlement report.
 *
 * The scope of work asks the hotel panel for revenue reports and payment /
 * settlement reports. The dashboard only ever showed live counters, so a
 * partner had no way to see what a month actually earned them.
 *
 * Only bookings that were paid count: a confirmed pay-at-hotel booking that was
 * never collected would otherwise show as revenue that does not exist.
 *
 * The web's CSV download becomes a file in the cache handed to the share sheet;
 * its <input type="date"> is the Android date dialog (a text field elsewhere).
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, Download, TrendingUp } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { toast } from '../../lib/notify';
import { poppins, shadow, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { bookingService } from '../services/apiService';
import { formatINR as currency, toInputDate } from '../utils/format';
import { HT } from '../theme';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EMPTY = { bookings: 0, gross: 0, taxes: 0, discount: 0, commission: 0, payout: 0 };

function DateBox({ value, onChange, label }) {
  if (Platform.OS !== 'android') {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={tw.gray400}
        accessibilityLabel={label}
        style={styles.dateBox}
      />
    );
  }
  const open = () => {
    const current = value ? new Date(`${value}T00:00:00`) : new Date();
    DateTimePickerAndroid.open({
      value: Number.isNaN(current.getTime()) ? new Date() : current,
      mode: 'date',
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toInputDate(new Date(date.getTime() - date.getTimezoneOffset() * 60000)));
      },
    });
  };
  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={label} style={styles.dateBox}>
      <Text style={styles.dateText}>{value}</Text>
    </Pressable>
  );
}

const PartnerRevenueReport = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);
    return { from: toInputDate(from), to: toInputDate(to) };
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await bookingService.getPartnerRevenueReport(range);
      setReport(data);
    } catch (error) {
      toast.error(error?.message || 'Failed to load the revenue report');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = report?.totals || EMPTY;
  const byMonth = report?.byMonth || [];
  const byProperty = report?.byProperty || [];
  const peak = Math.max(1, ...byMonth.map((m) => m.payout || 0));

  const exportCsv = async () => {
    const rows = [
      ['Month', 'Bookings', 'Gross', 'Taxes', 'Discount', 'Commission', 'Payout'],
      ...byMonth.map((m) => [`${MONTH_NAMES[m.month - 1]} ${m.year}`, m.bookings, m.gross, m.taxes, m.discount, m.commission, m.payout]),
    ];
    try {
      const file = new File(Paths.cache, `revenue-${range.from}-to-${range.to}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(rows.map((r) => r.join(',')).join('\n'));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: file.name, UTI: 'public.comma-separated-values-text' });
      } else {
        toast.error('Sharing is not available on this device');
      }
    } catch {
      toast.error('Could not export the CSV');
    }
  };

  const cards = [
    ['Bookings', String(totals.bookings), tw.gray900],
    ['Gross collected', currency(totals.gross), tw.gray900],
    ['Platform commission', currency(totals.commission), tw.amber700],
    ['Your payout', currency(totals.payout), HT.primary],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <PartnerHeader />

      <ScrollView contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
        <View style={{ maxWidth: 896, width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 24, gap: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Press onPress={() => navigate(-1)} accessibilityLabel="Back" style={{ padding: 8, borderRadius: 999 }}>
              <ArrowLeft size={18} color={tw.gray900} />
            </Press>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>Revenue Report</Text>
              <Text style={styles.sub}>Paid bookings only</Text>
            </View>
            <Press onPress={exportCsv} disabled={byMonth.length === 0} style={[styles.csv, byMonth.length === 0 && { opacity: 0.5 }]}>
              <Download size={14} color="#fff" />
              <Text style={styles.csvText}>CSV</Text>
            </Press>
          </View>

          <View style={styles.rangeBar}>
            <Text style={styles.rangeLabel}>From</Text>
            <DateBox label="From" value={range.from} onChange={(v) => setRange((r) => ({ ...r, from: v }))} />
            <Text style={styles.rangeLabel}>To</Text>
            <DateBox label="To" value={range.to} onChange={(v) => setRange((r) => ({ ...r, to: v }))} />
          </View>

          {loading ? (
            <View style={{ padding: 64, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={tw.gray400} />
            </View>
          ) : (
            <>
              <View style={styles.cards}>
                {cards.map(([label, value, tone]) => (
                  <View key={label} style={styles.card}>
                    <Text style={styles.cardLabel}>{label}</Text>
                    <Text style={[styles.cardValue, { color: tone }]}>{value}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.panel, { padding: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <TrendingUp size={16} color={HT.primary} />
                  <Text style={styles.h2}>Payout by month</Text>
                </View>
                {byMonth.length === 0 ? (
                  <Text style={styles.empty}>No paid bookings in this range yet.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {byMonth.map((month) => (
                      <View key={`${month.year}-${month.month}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={styles.monthLabel}>
                          {MONTH_NAMES[month.month - 1]} {String(month.year).slice(-2)}
                        </Text>
                        <View style={styles.track}>
                          <View style={[styles.bar, { width: `${Math.max(4, (month.payout / peak) * 100)}%` }]} />
                        </View>
                        <Text style={styles.monthValue}>{currency(month.payout)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={[styles.panel, { overflow: 'hidden' }]}>
                <Text style={[styles.h2, { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100 }]}>By property</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ minWidth: 544 }}>
                    <View style={[styles.tr, { backgroundColor: tw.gray50 }]}>
                      {['Property', 'Bookings', 'Gross', 'Commission', 'Payout'].map((h, i) => (
                        <Text key={h} style={[styles.th, i === 0 ? styles.cProp : styles.cNum, i > 0 && { textAlign: 'right' }]}>{h}</Text>
                      ))}
                    </View>
                    {byProperty.length === 0 ? (
                      <Text style={styles.nothing}>Nothing to report yet.</Text>
                    ) : (
                      byProperty.map((row) => (
                        <View key={row.propertyId} style={[styles.tr, { borderTopWidth: 1, borderTopColor: tw.gray100 }]}>
                          <Text style={[styles.td, styles.cProp, { color: tw.gray900, ...poppins(600) }]}>{row.propertyName}</Text>
                          <Text style={[styles.td, styles.cNum]}>{row.bookings}</Text>
                          <Text style={[styles.td, styles.cNum]}>{currency(row.gross)}</Text>
                          <Text style={[styles.td, styles.cNum, { color: tw.amber700 }]}>{currency(row.commission)}</Text>
                          <Text style={[styles.td, styles.cNum, { color: HT.primary, ...poppins(700) }]}>{currency(row.payout)}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  h1: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(900) },
  sub: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  csv: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0a0a0a', borderRadius: 8 },
  csvText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) },
  rangeBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, backgroundColor: '#fff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  rangeLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  dateBox: { minWidth: 104, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, fontSize: 12, color: tw.gray900, ...poppins(400) },
  dateText: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(400) },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', flexGrow: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  cardLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  cardValue: { fontSize: 20, lineHeight: 28, marginTop: 4, ...poppins(900) },
  panel: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  h2: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  empty: { fontSize: 12, lineHeight: 16, color: tw.gray400, paddingVertical: 24, textAlign: 'center', ...poppins(400) },
  monthLabel: { width: 64, fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(700) },
  track: { flex: 1, height: 24, backgroundColor: tw.gray50, borderRadius: 6, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: HT.primary, borderRadius: 6 },
  monthValue: { width: 96, textAlign: 'right', fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  tr: { flexDirection: 'row', alignItems: 'center' },
  th: { padding: 16, fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', color: tw.gray500, ...poppins(600) },
  td: { padding: 16, fontSize: 14, lineHeight: 20, color: tw.gray700, textAlign: 'left', ...poppins(400) },
  cProp: { width: 184 },
  cNum: { width: 90, textAlign: 'right' },
  nothing: { padding: 32, textAlign: 'center', fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(400) },
});

export default PartnerRevenueReport;
