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
import { ArrowLeft, CalendarDays, Download, TrendingUp } from 'lucide-react-native';
import { Button, Card, EmptyState, IconButton, SectionHeader } from '../../components/ds';
import { useNavigate } from '../../lib/webRouter';
import { toast } from '../../lib/notify';
import { color, elevation, radii, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { bookingService } from '../services/apiService';
import { formatINR as currency, toInputDate } from '../utils/format';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EMPTY = { bookings: 0, gross: 0, taxes: 0, discount: 0, commission: 0, payout: 0 };

function DateBox({ value, onChange, label }) {
  if (Platform.OS !== 'android') {
    return (
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={color.textDisabled}
        accessibilityLabel={label}
        style={[styles.dateBox, styles.dateText]}
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
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} style={[styles.dateBox, styles.dateRow]}>
      <CalendarDays size={16} color={color.textMuted} />
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
    ['Bookings', String(totals.bookings), color.text],
    ['Gross collected', currency(totals.gross), color.text],
    ['Platform commission', currency(totals.commission), color.goldText],
    ['Your payout', currency(totals.payout), color.success],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PartnerHeader />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl + insets.bottom }}>
        <View style={{ maxWidth: 896, width: '100%', alignSelf: 'center', padding: space.lg, gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <IconButton icon={ArrowLeft} label="Back" onPress={() => navigate(-1)} style={{ marginLeft: -space.sm }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.h1}>Revenue report</Text>
              <Text style={styles.sub}>Paid bookings only</Text>
            </View>
            <Button title="CSV" icon={Download} variant="outline" size="sm" fullWidth={false} onPress={exportCsv} disabled={byMonth.length === 0} style={{ minHeight: 44 }} accessibilityLabel="Export CSV" />
          </View>

          <Card style={styles.rangeBar}>
            <View style={{ flex: 1, gap: space.xs }}>
              <Text style={styles.rangeLabel}>From</Text>
              <DateBox label="From" value={range.from} onChange={(v) => setRange((r) => ({ ...r, from: v }))} />
            </View>
            <View style={{ flex: 1, gap: space.xs }}>
              <Text style={styles.rangeLabel}>To</Text>
              <DateBox label="To" value={range.to} onChange={(v) => setRange((r) => ({ ...r, to: v }))} />
            </View>
          </Card>

          {loading ? (
            <View style={{ padding: space.xxxl * 2, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={color.primary} />
            </View>
          ) : (
            <>
              <View style={styles.cards}>
                {cards.map(([label, value, tone]) => (
                  <View key={label} style={styles.card}>
                    <Text style={styles.cardLabel}>{label}</Text>
                    <Text style={[styles.cardValue, { color: tone }]} numberOfLines={1} adjustsFontSizeToFit>
                      {value}
                    </Text>
                  </View>
                ))}
              </View>

              <Card>
                <SectionHeader title="Payout by month" />
                {byMonth.length === 0 ? (
                  <EmptyState icon={TrendingUp} title="No paid bookings in this range yet." style={{ paddingVertical: space.xxl }} />
                ) : (
                  <View style={{ gap: space.sm }}>
                    {byMonth.map((month) => (
                      <View key={`${month.year}-${month.month}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
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
              </Card>

              <Card padded={false} style={{ overflow: 'hidden' }}>
                <SectionHeader title="By property" style={{ padding: space.lg, marginBottom: 0 }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ minWidth: 544 }}>
                    <View style={[styles.tr, { backgroundColor: color.surfaceMuted }]}>
                      {['Property', 'Bookings', 'Gross', 'Commission', 'Payout'].map((h, i) => (
                        <Text key={h} style={[styles.th, i === 0 ? styles.cProp : styles.cNum, i > 0 && { textAlign: 'right' }]}>
                          {h}
                        </Text>
                      ))}
                    </View>
                    {byProperty.length === 0 ? (
                      <Text style={styles.nothing}>Nothing to report yet.</Text>
                    ) : (
                      byProperty.map((row) => (
                        <View key={row.propertyId} style={[styles.tr, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border }]}>
                          <Text style={[styles.td, styles.cProp, type.bodyStrong, { color: color.text }]} numberOfLines={2}>
                            {row.propertyName}
                          </Text>
                          <Text style={[styles.td, styles.cNum]}>{row.bookings}</Text>
                          <Text style={[styles.td, styles.cNum]}>{currency(row.gross)}</Text>
                          <Text style={[styles.td, styles.cNum, { color: color.goldText }]}>{currency(row.commission)}</Text>
                          <Text style={[styles.td, styles.cNum, type.bodyStrong, { color: color.success, textAlign: 'right' }]}>{currency(row.payout)}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  h1: { ...type.heading, color: color.text },
  sub: { ...type.small, color: color.textMuted },
  rangeBar: { flexDirection: 'row', gap: space.md, padding: space.md },
  rangeLabel: { ...type.label, color: color.text },
  dateBox: { minHeight: 48, paddingHorizontal: space.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, justifyContent: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dateText: { ...type.body, color: color.text },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  card: { width: '47%', flexGrow: 1, backgroundColor: color.surface, padding: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, gap: space.xs, ...elevation.card },
  cardLabel: { ...type.label, color: color.textSecondary },
  cardValue: { ...type.price, fontSize: 20, lineHeight: 28 },
  monthLabel: { width: 56, ...type.caption, color: color.textSecondary },
  track: { flex: 1, height: 24, backgroundColor: color.surfaceMuted, borderRadius: radii.sm, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: color.primary, borderRadius: radii.sm },
  monthValue: { minWidth: 80, textAlign: 'right', ...type.label, color: color.text },
  tr: { flexDirection: 'row', alignItems: 'center' },
  th: { padding: space.md, ...type.caption, fontFamily: type.label.fontFamily, color: color.textSecondary },
  td: { padding: space.md, ...type.body, color: color.textSecondary, textAlign: 'left' },
  cProp: { width: 184 },
  cNum: { width: 90, textAlign: 'right' },
  nothing: { padding: space.xxl, textAlign: 'center', ...type.small, color: color.textMuted },
});

export default PartnerRevenueReport;
