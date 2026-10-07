import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ChevronUp, Download, FileText, Info, Mail } from 'lucide-react-native';
import { Button, Card, EmptyState, IconButton, Money, SectionHeader, SegmentedControl } from '../../components/ds';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { color, radii, space, type } from '../../theme';
import { useFinanceDetailsPage } from '../hooks/pages/useFinanceDetailsPage';
import { inr2 as money } from './finance/financeUi';
import { ScreenHeader, SheetPanel } from './inventory/partnerKit';

function Line({ label, value, first }) {
  return (
    <View style={[styles.line, first ? null : styles.lineDivider]}>
      <View style={styles.lineLabelWrap}>
        <Text style={styles.lineLabel}>{label}</Text>
        <Info size={14} color={color.textDisabled} />
      </View>
      <Text style={styles.lineValue}>{money(value)}</Text>
    </View>
  );
}

function Section({ title, total, open, onToggle, children }) {
  return (
    <View style={styles.section}>
      <Press scale={1} onPress={onToggle} accessibilityRole="button" accessibilityLabel={`${title}, ${money(total)}`} accessibilityState={{ expanded: Boolean(open) }} style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { flex: 1, minWidth: 0 }]}>{title}</Text>
        <Text style={styles.sectionTotal}>{money(total)}</Text>
        {open ? <ChevronUp size={18} color={color.textMuted} /> : <ChevronDown size={18} color={color.textMuted} />}
      </Press>
      {open && children ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function ReportSheet({ visible, onClose, title, body, icon: Icon }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onClose={onClose} backdrop={color.overlay}>
      <SheetPanel title={title} onClose={onClose}>
        <View style={{ padding: space.lg, paddingBottom: space.lg + insets.bottom, gap: space.lg }}>
          <View style={styles.sheetBody}>
            <View style={styles.sheetIcon}>
              <Icon size={20} color={color.primary} />
            </View>
            <Text style={[type.body, { flex: 1, color: color.textSecondary }]}>{body}</Text>
          </View>
          <Button title="Close" size="lg" onPress={onClose} />
        </View>
      </SheetPanel>
    </BottomSheet>
  );
}

/** Port of Food/pages/restaurant/FinanceDetailsPage.jsx (/food/restaurant/finance-details). Wording is the web's own. */
export default function FinanceDetailsPage() {
  const insets = useSafeAreaInsets();
  const {
    goBack, restaurantData, activeTab, setActiveTab, isTransitioning, setIsTransitioning, showDownloadPopup, setShowDownloadPopup, showEmailPopup, setShowEmailPopup,
    expandedSections, tabs, handleDownload, handleEmail, settlementData: s, estimatedPayout, toggleSection,
  } = useFinanceDetailsPage();
  const period = `${s.start} - ${s.end} ${s.month}'${s.year}`;

  return (
    <View style={styles.page}>
      <ScreenHeader title={restaurantData?.name || 'Your Restaurant'} subtitle={`ID: ${restaurantData?.restaurantId || 'N/A'} • ${restaurantData?.address || 'Location'}`} onBack={goBack} />

      <View style={styles.tabsWrap}>
        <SegmentedControl
          value={activeTab}
          options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
          onChange={(id) => {
            if (isTransitioning) return;
            setIsTransitioning(true);
            setActiveTab(id);
            setTimeout(() => setIsTransitioning(false), 300);
          }}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.xxxl + insets.bottom }]}>
        {activeTab === 'summary' ? (
          <View style={{ gap: space.xxl }}>
            <Card style={styles.hero}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.overline}>Active earnings</Text>
                <Money large value={money(estimatedPayout)} style={{ marginVertical: space.xs }} />
                <Text style={styles.small}>from {period}</Text>
                <Text style={[styles.small, { marginTop: space.xs }]}>Payout date: -</Text>
              </View>
              <View style={styles.periodBox}>
                <Text style={styles.small}>Payout for</Text>
                <Text style={styles.periodText}>{period}</Text>
              </View>
            </Card>

            <View>
              <View style={styles.summaryHead}>
                <SectionHeader title="Settlement summary" style={{ marginBottom: 0, flex: 1 }} />
                <IconButton icon={Download} label="Download report" variant="primary" iconSize={18} onPress={handleDownload} />
                <IconButton icon={Mail} label="Email report" variant="primary" iconSize={18} onPress={handleEmail} />
              </View>

              <Card padded={false} style={{ overflow: 'hidden' }}>
                <View style={[styles.section, styles.sectionHead]}>
                  <Text style={[styles.lineLabel, { flex: 1 }]}>Total orders</Text>
                  <Text style={styles.sectionTotal}>{s.totalOrders}</Text>
                </View>

                <Section title="Net order value (A)" total={s.netOrderValue?.total} open={expandedSections.netOrderValue} onToggle={() => toggleSection('netOrderValue')}>
                  <Line first label="Item subtotal" value={s.netOrderValue.itemSubtotal} />
                  <Line label="Total GST collected from customers" value={s.netOrderValue?.totalGSTCollected} />
                  <Line label="Restaurant discount (Promos)" value={s.netOrderValue.restaurantDiscountPromos} />
                  <Line label="Restaurant discount (Flat offs, Freebies, Gold, relisted orders and others)" value={s.netOrderValue?.restaurantDiscountOthers} />
                </Section>

                <Section title="Additions (B)" total={s.additions.total} open={expandedSections.additions} onToggle={() => toggleSection('additions')}>
                  <Line first label="TDS 194H" value={s.additions?.tds194H} />
                  <Line label="TDS 194C" value={s.additions.tds194C} />
                </Section>

                {/* The web gives this section no detail rows. */}
                <Section title="Order level deductions (C)" total={s.orderLevelDeductions?.total} open={expandedSections.orderLevelDeductions} onToggle={() => toggleSection('orderLevelDeductions')} />

                <Section title="Tax deductions (D)" total={s.taxDeductions.total} open={expandedSections.taxDeductions} onToggle={() => toggleSection('taxDeductions')}>
                  <Line first label="GST on service and payment mechanism fees @18%" value={s.taxDeductions?.gstOnServiceFees} />
                  <Line label="TDS 194O" value={s.taxDeductions.tds194O} />
                  <Line label="GST paid by Zomato on behalf of the restaurant u/s 9(5) of GST" value={s.taxDeductions?.gstPaidByZomato} />
                </Section>

                <Section title="Investments in growth (E)" total={s.investmentsInGrowth.total} open={expandedSections.investmentsInGrowth} onToggle={() => toggleSection('investmentsInGrowth')}>
                  <Line first label="Online ordering ads" value={s.investmentsInGrowth?.onlineOrderingAds} />
                </Section>

                <View style={styles.payout}>
                  <Text style={[styles.payoutLabel, { flex: 1, minWidth: 0 }]}>Est. payout (A + B - C - D - E)</Text>
                  <Money value={money(estimatedPayout)} style={{ color: color.primary, fontSize: 16 }} />
                </View>
              </Card>
            </View>
          </View>
        ) : (
          <Card padded={false}>
            <EmptyState icon={FileText} title={activeTab === 'orders' ? 'Orders data will be displayed here' : 'Expenses data will be displayed here'} />
          </Card>
        )}
      </ScrollView>

      <ReportSheet visible={showDownloadPopup} onClose={() => setShowDownloadPopup(false)} icon={Download} title="Download report" body="Your settlement report is being downloaded as PDF..." />
      <ReportSheet visible={showEmailPopup} onClose={() => setShowEmailPopup(false)} icon={Mail} title="Email report" body="Your settlement report has been sent to your registered email address." />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  tabsWrap: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.lg },
  hero: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  overline: { ...type.overline, color: color.goldText },
  small: { ...type.caption, color: color.textMuted },
  periodBox: { minWidth: 120, padding: space.md, borderRadius: radii.md, backgroundColor: color.surfaceMuted, alignSelf: 'flex-start', gap: 2 },
  periodText: { ...type.bodyStrong, color: color.text },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.md },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingHorizontal: space.lg, paddingVertical: space.md },
  sectionTitle: { ...type.bodyStrong, color: color.text },
  sectionTotal: { ...type.bodyStrong, color: color.text },
  sectionBody: { paddingHorizontal: space.lg, paddingBottom: space.sm, backgroundColor: color.surfaceMuted },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingVertical: space.md },
  lineDivider: { borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: color.borderStrong },
  lineLabelWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  lineLabel: { flexShrink: 1, ...type.small, color: color.textSecondary },
  lineValue: { ...type.bodyStrong, color: color.text },
  payout: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.lg, borderTopWidth: 2, borderTopColor: color.primary, backgroundColor: color.primarySoft },
  payoutLabel: { ...type.bodyStrong, color: color.primary },
  sheetBody: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  sheetIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
