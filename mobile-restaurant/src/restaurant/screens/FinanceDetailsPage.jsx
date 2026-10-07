import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronDown, ChevronUp, Download, Info, Mail, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, tw } from '../../theme';
import { PrimaryButton } from '../components/ui';
import { useFinanceDetailsPage } from '../hooks/pages/useFinanceDetailsPage';
import { RT_GRADIENT } from '../theme';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

function Line({ label, value, first }) {
  return (
    <View style={[styles.line, first ? null : styles.dashed, first ? { marginTop: 0 } : { marginTop: 8 }]}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={styles.lineLabel}>{label}</Text>
        <Info size={14} color={tw.gray400} />
      </View>
      <Text style={styles.lineValue}>{money(value)}</Text>
    </View>
  );
}

function Section({ title, total, open, onToggle, children }) {
  return (
    <View style={styles.section}>
      <Press scale={1} onPress={onToggle} accessibilityState={{ expanded: Boolean(open) }} style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { flex: 1 }]}>{title}</Text>
        <Text style={styles.sectionTitle}>{money(total)}</Text>
        {open ? <ChevronUp size={16} color={tw.gray500} /> : <ChevronDown size={16} color={tw.gray500} />}
      </Press>
      {open && children ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function ReportSheet({ visible, onClose, title, body }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onClose={onClose} backdrop="rgba(0,0,0,0.5)">
      <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) }}>{title}</Text>
          <Press onPress={onClose} accessibilityLabel="Close" hitSlop={8} style={{ padding: 4 }}>
            <X size={20} color={tw.gray600} />
          </Press>
        </View>
        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, marginBottom: 16, ...poppins(400) }}>{body}</Text>
        <PrimaryButton title="Close" onPress={onClose} textStyle={{ fontSize: 16, lineHeight: 24, ...poppins(500) }} />
      </View>
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
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press onPress={goBack} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 4 }}>
          <ArrowLeft size={20} color={tw.gray700} />
        </Press>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) }} numberOfLines={1} accessibilityRole="header">{restaurantData?.name || 'Your Restaurant'}</Text>
          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray600, marginTop: 2, ...poppins(400) }}>ID: {restaurantData?.restaurantId || 'N/A'} • {restaurantData?.address || 'Location'}</Text>
        </View>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8, marginBottom: 8 }}>
          {tabs.map((tab) => {
            const on = activeTab === tab.id;
            return (
              <Press
                key={tab.id}
                onPress={() => {
                  if (isTransitioning) return;
                  setIsTransitioning(true);
                  setActiveTab(tab.id);
                  setTimeout(() => setIsTransitioning(false), 300);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={{ opacity: on ? 1 : 0.7, transform: [{ scale: on ? 1.05 : 1 }] }}
              >
                <LinearGradient colors={on ? RT_GRADIENT : ['#fff', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tab}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: on ? '#fff' : '#000', ...poppins(500) }}>{tab.label}</Text>
                </LinearGradient>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 24 + insets.bottom }}>
        {activeTab === 'summary' ? (
          <View style={{ gap: 24 }}>
            <View style={[styles.card, { padding: 16, flexDirection: 'row', gap: 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.small}>Active Earnings</Text>
                <Text style={{ fontSize: 24, lineHeight: 32, color: tw.gray900, marginVertical: 4, ...poppins(700) }}>{money(estimatedPayout)}</Text>
                <Text style={styles.small}>from {period}</Text>
                <Text style={[styles.small, { marginTop: 4 }]}>Payout date: -</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.small, { marginBottom: 4 }]}>Payout for</Text>
                <Text style={styles.sectionTitle}>{period}</Text>
              </View>
            </View>

            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) }}>Settlement summary</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Press onPress={handleDownload} accessibilityLabel="Download report" style={styles.iconButton}>
                    <Download size={16} color={tw.gray700} />
                  </Press>
                  <Press onPress={handleEmail} accessibilityLabel="Email report" style={styles.iconButton}>
                    <Mail size={16} color={tw.gray700} />
                  </Press>
                </View>
              </View>

              <View style={[styles.card, { overflow: 'hidden' }]}>
                <View style={[styles.section, styles.sectionHead]}>
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) }}>Total orders</Text>
                  <Text style={styles.sectionTitle}>{s.totalOrders}</Text>
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
                  <Text style={[styles.sectionTitle, { flex: 1, ...poppins(700) }]}>Est. payout (A + B - C - D - E)</Text>
                  <Text style={[styles.sectionTitle, poppins(700)]}>{money(estimatedPayout)}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.placeholder}>{activeTab === 'orders' ? 'Orders data will be displayed here' : 'Expenses data will be displayed here'}</Text>
        )}
      </ScrollView>

      <ReportSheet visible={showDownloadPopup} onClose={() => setShowDownloadPopup(false)} title="Download Report" body="Your settlement report is being downloaded as PDF..." />
      <ReportSheet visible={showEmailPopup} onClose={() => setShowEmailPopup(false)} title="Email Report" body="Your settlement report has been sent to your registered email address." />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200, paddingHorizontal: 16, paddingBottom: 12 },
  tab: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  card: { backgroundColor: '#fff', borderRadius: 8 },
  small: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  iconButton: { padding: 12, backgroundColor: '#fff', borderRadius: 8 },
  section: { borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 12, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: tw.gray200 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  dashed: { borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: tw.gray200 },
  lineLabel: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) },
  lineValue: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  payout: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 2, borderTopColor: tw.gray900, backgroundColor: tw.gray50 },
  placeholder: { fontSize: 14, lineHeight: 20, color: tw.gray800, textAlign: 'center', padding: 16, paddingVertical: 48, ...poppins(400) },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24 },
});
