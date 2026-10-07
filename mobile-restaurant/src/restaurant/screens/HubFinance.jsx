import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Calendar, Check, ChevronDown, ChevronRight, Download, FileText, Menu, Receipt, Wallet } from 'lucide-react-native';
import { Button, Card, EmptyState, IconButton, Money, SectionHeader, SegmentedControl, StatusBadge } from '../../components/ds';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { restaurantAPI } from '../../api/restaurant';
import { alert } from '../../lib/webShim';
import { color, elevation, radii, space, type } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import DateRangeDialog from '../components/DateRangeDialog';
import { useHubFinance } from '../hooks/pages/useHubFinance';
import { DialogHead, StatTile, dialogPanel, inr2, useKeyboardHeight } from './finance/financeUi';
import { Field, Input, ScreenHeader } from './inventory/partnerKit';

const formatDateForDisplay = (date) => {
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day} ${month}'${year}`;
};
const formatDateRange = (start, end) => `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}`;

/** The preset list of the web's "Select Date Range" popup. */
const getDateOptions = () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const last7DaysStart = new Date(today);
  last7DaysStart.setDate(today.getDate() - 7);
  last7DaysStart.setHours(0, 0, 0, 0);
  const last30DaysStart = new Date(today);
  last30DaysStart.setDate(today.getDate() - 30);
  last30DaysStart.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - daysFromMonday);
  thisWeekStart.setHours(0, 0, 0, 0);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
  thisWeekEnd.setHours(23, 59, 59, 999);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekEnd);
  lastWeekEnd.setDate(thisWeekEnd.getDate() - 7);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
  return [
    { label: 'Today', range: formatDateRange(todayStart, today), startDate: todayStart, endDate: today },
    { label: 'Last 7 days', range: formatDateRange(last7DaysStart, today), startDate: last7DaysStart, endDate: today },
    { label: 'Last 30 days', range: formatDateRange(last30DaysStart, today), startDate: last30DaysStart, endDate: today },
    { label: 'This week', range: formatDateRange(thisWeekStart, thisWeekEnd), startDate: thisWeekStart, endDate: thisWeekEnd },
    { label: 'Last week', range: formatDateRange(lastWeekStart, lastWeekEnd), startDate: lastWeekStart, endDate: lastWeekEnd },
    { label: 'This month', range: formatDateRange(thisMonthStart, thisMonthEnd), startDate: thisMonthStart, endDate: thisMonthEnd },
    { label: 'Last month', range: formatDateRange(lastMonthStart, lastMonthEnd), startDate: lastMonthStart, endDate: lastMonthEnd },
    { label: 'Custom date range', custom: true },
  ];
};

/** getWithdrawalStatusClass() answers with class names; map them onto the status tones. */
const withdrawalTone = (cls) => (cls.includes('green') ? 'success' : cls.includes('red') ? 'danger' : 'warning');

function OrderRow({ order, formatDateTime, last }) {
  return (
    <View style={[styles.orderRow, last ? null : styles.rowDivider]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.orderId} numberOfLines={1}>Order ID: {order.orderId || 'N/A'}</Text>
        <Text style={styles.orderDate}>{formatDateTime(order.createdAt || order.deliveredAt)}</Text>
        <Text style={styles.orderFood} numberOfLines={2}>{order.foodNames || (order.items && order.items.map((item) => item.name).join(', ')) || 'N/A'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Money value={inr2(order.payout || 0)} style={styles.rowMoney} />
        <Text style={styles.rowMoneyLabel}>Earning</Text>
      </View>
    </View>
  );
}

/** Port of Food/pages/restaurant/HubFinance.jsx (/food/restaurant/hub-finance). */
export default function HubFinance() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const reportBtnRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);
  const keyboardHeight = useKeyboardHeight();
  const h = useHubFinance();
  const {
    navigate, location, goBack, showBack, activeTab, setActiveTab, selectedDateRange, setSelectedDateRange, showDownloadMenu, setShowDownloadMenu,
    showDateRangePicker, setShowDateRangePicker, showCalendar, setShowCalendar, startDate, setStartDate, endDate, setEndDate, financeData, setFinanceData,
    loading, pastCyclesData, loadingPastCycles, restaurantData, showWithdrawalModal, setShowWithdrawalModal, withdrawalAmount, setWithdrawalAmount,
    submittingWithdrawal, setSubmittingWithdrawal, withdrawalRequests, setWithdrawalRequests, loadingWithdrawals, formatRestaurantId, invoiceOrders,
    invoiceSummary, getWithdrawalStatusClass, formatWithdrawalStatus, formatDateTime, fetchPastCyclesData, downloadPDF,
  } = h;

  // The web's menu is an absolutely positioned dropdown that closes on an outside tap. Android does not deliver
  // touches to a child drawn outside its parent, so it is shown in a transparent Modal under the button instead.
  const toggleReportMenu = () => {
    if (showDownloadMenu) {
      setShowDownloadMenu(false);
      return;
    }
    reportBtnRef.current?.measureInWindow((x, y, w, hgt) => {
      setMenuPos({ top: y + hgt + 8, right: Math.max(0, windowWidth - (x + w)) });
      setShowDownloadMenu(true);
    });
  };

  const payout = financeData?.currentCycle?.estimatedPayout || 0;
  const canWithdraw = payout > 0;

  const restaurantId = restaurantData?.restaurantId || financeData?.restaurant?.restaurantId;
  const address = restaurantData?.address || financeData?.restaurant?.address || '';
  const subtitleParts = [];
  if (restaurantId) subtitleParts.push(`ID: ${formatRestaurantId(restaurantId)}`);
  if (address) subtitleParts.push(address.length > 40 ? `${address.substring(0, 40)}...` : address);
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' • ') : 'Loading...';

  const closeWithdrawal = () => {
    setShowWithdrawalModal(false);
    setWithdrawalAmount('');
  };

  const submitWithdrawal = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (amount > payout) {
      alert('Amount cannot exceed available balance');
      return;
    }
    try {
      setSubmittingWithdrawal(true);
      const response = await restaurantAPI.createWithdrawalRequest(amount);
      if (response.data?.success) {
        alert('Withdrawal request submitted successfully!');
        setShowWithdrawalModal(false);
        setWithdrawalAmount('');
        const financeResponse = await restaurantAPI.getFinance();
        if (financeResponse.data?.success && financeResponse.data?.data) {
          setFinanceData(financeResponse.data.data);
        }
        const withdrawalResponse = await restaurantAPI.getWithdrawalHistory();
        const withdrawalPayload = withdrawalResponse?.data?.data;
        const withdrawalList = Array.isArray(withdrawalPayload) ? withdrawalPayload : Array.isArray(withdrawalPayload?.withdrawals) ? withdrawalPayload.withdrawals : [];
        setWithdrawalRequests(withdrawalList);
      } else {
        alert(response.data?.message || 'Failed to submit withdrawal request');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit withdrawal request. Please try again.');
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const amountNum = parseFloat(withdrawalAmount);
  const overBalance = Boolean(withdrawalAmount) && amountNum > payout;
  const submitOff = submittingWithdrawal || !withdrawalAmount || amountNum <= 0 || amountNum > payout;

  const pastOrders = pastCyclesData?.orders;
  const currentOrders = financeData?.currentCycle?.orders;

  return (
    <View style={styles.page}>
      <ScreenHeader
        title={restaurantData?.name || financeData?.restaurant?.name || 'Restaurant'}
        subtitle={subtitle}
        showBack={Boolean(showBack)}
        onBack={showBack ? goBack : undefined}
        right={
          <View style={styles.headerActions}>
            <IconButton icon={Bell} label="Notifications" variant="inverse" onPress={() => navigate('/food/restaurant/notifications', { state: { from: location.pathname } })} />
            <IconButton icon={Menu} label="Menu" variant="inverse" onPress={() => navigate('/food/restaurant/explore')} />
          </View>
        }
      />

      <View style={styles.tabsWrap}>
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'payouts', label: 'Payouts' },
            { value: 'invoices', label: 'Invoices & taxes' },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.xxxl + BOTTOM_NAV_HEIGHT + insets.bottom }]} keyboardShouldPersistTaps="handled">
        {activeTab === 'payouts' ? (
          <View style={{ gap: space.xxl }}>
            <View>
              <SectionHeader title="Current cycle" />
              <Card>
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={color.primary} />
                    <Text style={styles.muted}>Loading...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.overline}>Estimated payout</Text>
                    <Money large value={inr2(payout)} style={{ marginTop: space.xs }} />
                    <Text style={[styles.muted, { marginTop: space.xs }]}>
                      {financeData?.currentCycle?.totalOrders || 0} {financeData?.currentCycle?.totalOrders === 1 ? 'order' : 'orders'}
                    </Text>
                    <Button
                      title="Withdraw"
                      icon={Wallet}
                      size="lg"
                      disabled={!canWithdraw}
                      onPress={() => {
                        setWithdrawalAmount('');
                        setShowWithdrawalModal(true);
                      }}
                      style={{ marginTop: space.lg }}
                    />
                  </>
                )}
              </Card>
            </View>

            <View>
              <SectionHeader title="Withdrawal requests" action="History" onAction={() => navigate('/food/restaurant/withdrawal-history', { state: { from: location.pathname } })} />
              <Card padded={false}>
                {loadingWithdrawals ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={color.primary} />
                    <Text style={styles.muted}>Loading withdrawal requests...</Text>
                  </View>
                ) : withdrawalRequests.length === 0 ? (
                  <EmptyState icon={Wallet} title="No withdrawal requests found." style={styles.emptyCompact} />
                ) : (
                  <View>
                    {withdrawalRequests.slice(0, 8).map((request, index, list) => (
                      <View key={request?._id || request?.id || index} style={[styles.reqRow, index < list.length - 1 || withdrawalRequests.length > 8 ? styles.rowDivider : null]}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Money value={inr2(request?.amount)} style={styles.reqMoney} />
                          <Text style={styles.caption}>Requested: {formatDateTime(request?.createdAt || request?.requestedAt)}</Text>
                          {request?.processedAt ? <Text style={styles.caption}>Processed: {formatDateTime(request?.processedAt)}</Text> : null}
                        </View>
                        <StatusBadge label={formatWithdrawalStatus(request?.status)} tone={withdrawalTone(getWithdrawalStatusClass(request?.status))} />
                      </View>
                    ))}
                    {withdrawalRequests.length > 8 ? (
                      <Button title="View all requests" variant="ghost" iconRight={ChevronRight} onPress={() => navigate('/food/restaurant/withdrawal-history')} />
                    ) : null}
                  </View>
                )}
              </Card>
            </View>

            <View>
              <SectionHeader title="Past cycles" />
              <View style={{ gap: space.md }}>
                <View style={styles.filterRow}>
                  <Press scale={1} onPress={() => setShowDateRangePicker(!showDateRangePicker)} accessibilityLabel={`Date range ${selectedDateRange}`} style={styles.rangeBtn}>
                    <Calendar size={18} color={color.primary} />
                    <Text numberOfLines={1} style={styles.rangeText}>{selectedDateRange}</Text>
                    <ChevronDown size={18} color={color.textMuted} style={showDateRangePicker ? { transform: [{ rotate: '180deg' }] } : null} />
                  </Press>
                  <View ref={reportBtnRef} collapsable={false}>
                    <Button title="Get report" variant="secondary" icon={Download} iconRight={ChevronDown} fullWidth={false} onPress={toggleReportMenu} accessibilityLabel="Get report" />
                  </View>
                </View>

                {!loadingPastCycles && pastOrders ? <Text style={styles.found}>{pastOrders.length} orders found</Text> : null}

                {loadingPastCycles ? (
                  <Card style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={color.primary} />
                    <Text style={styles.muted}>Loading past cycles...</Text>
                  </Card>
                ) : (
                  <>
                    {pastOrders && pastOrders.length > 0 ? (
                      <Card padded={false}>
                        {pastOrders.map((order, index) => (
                          <OrderRow key={order.orderId || index} order={order} formatDateTime={formatDateTime} last={index === pastOrders.length - 1} />
                        ))}
                      </Card>
                    ) : pastOrders && pastOrders.length === 0 ? (
                      <Card style={styles.dashed}>
                        <Text style={[styles.muted, { textAlign: 'center' }]}>No orders found for this selected range.</Text>
                      </Card>
                    ) : null}

                    {(!pastCyclesData || !pastOrders) && !loadingPastCycles && currentOrders && currentOrders.length > 0 ? (
                      <Card padded={false}>
                        {currentOrders.map((order, index) => (
                          <OrderRow key={order.orderId || index} order={order} formatDateTime={formatDateTime} last={index === currentOrders.length - 1} />
                        ))}
                      </Card>
                    ) : null}

                    {(!pastCyclesData || !pastOrders || pastOrders.length === 0) && (!currentOrders || currentOrders.length === 0) && !loadingPastCycles && !loading ? (
                      <Card padded={false}>
                        <EmptyState icon={Receipt} title="No transaction history available" message="Your earnings and order payouts will appear here." style={styles.emptyCompact} />
                      </Card>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {activeTab === 'invoices' ? (
          <View style={{ gap: space.xxl }}>
            <View>
              <SectionHeader title="Invoices & taxes summary" />
              <View style={styles.tileGrid}>
                <View style={styles.tileRow}>
                  <StatTile label="Orders" value={String(invoiceSummary.count)} />
                  <StatTile label="Earnings" value={inr2(invoiceSummary.earnings)} tone="primary" />
                </View>
                <View style={styles.tileRow}>
                  <StatTile label="Commission" value={inr2(invoiceSummary.commission)} />
                  <StatTile label="Gross amount" value={inr2(invoiceSummary.gross)} />
                </View>
              </View>
            </View>

            <View>
              <SectionHeader title="Order invoice details" />
              <Card padded={false}>
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={color.primary} />
                    <Text style={styles.muted}>Loading invoice data...</Text>
                  </View>
                ) : invoiceOrders.length === 0 ? (
                  <EmptyState icon={FileText} title="No invoice data available for selected range." style={styles.emptyCompact} />
                ) : (
                  invoiceOrders.map((order, index) => (
                    <View key={`${order.orderId || index}-invoice`} style={[styles.orderRow, index < invoiceOrders.length - 1 ? styles.rowDivider : null]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.orderId} numberOfLines={1}>Order: {order.orderId || 'N/A'}</Text>
                        <Text style={styles.orderFood}>{order.paymentMethod || 'N/A'} | {order.orderStatus || 'N/A'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Money value={inr2(order.totalAmount || 0)} style={styles.rowMoney} />
                        <Text style={styles.rowMoneyLabel}>Total</Text>
                      </View>
                    </View>
                  ))
                )}
              </Card>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={showDownloadMenu && Boolean(menuPos)} transparent animationType="fade" onRequestClose={() => setShowDownloadMenu(false)} statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDownloadMenu(false)} accessibilityLabel="Close menu" />
        <View style={[styles.menu, { top: menuPos?.top || 0, right: menuPos?.right || 0 }]}>
          <Press scale={1} onPress={downloadPDF} accessibilityRole="menuitem" accessibilityLabel="Download PDF" style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <FileText size={18} color={color.primary} />
            </View>
            <Text style={styles.menuText}>Download PDF</Text>
          </Press>
        </View>
      </Modal>

      <Dialog visible={showDateRangePicker} onClose={() => setShowDateRangePicker(false)} backdrop={color.overlay} panelStyle={[dialogPanel, styles.rangePanel]}>
        <DialogHead title="Select date range" onClose={() => setShowDateRangePicker(false)} />
        <ScrollView contentContainerStyle={{ padding: space.md, gap: space.sm }}>
          {getDateOptions().map((option) => {
            const selected = !option.custom && (option.range === selectedDateRange || option.label === selectedDateRange);
            return (
              <Press
                key={option.label}
                scale={1}
                onPress={() => {
                  if (option.custom) {
                    setShowDateRangePicker(false);
                    setShowCalendar(true);
                  } else {
                    setSelectedDateRange(option.range);
                    setStartDate(option.startDate);
                    setEndDate(option.endDate);
                    setShowDateRangePicker(false);
                    fetchPastCyclesData(option.startDate, option.endDate);
                  }
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                style={[styles.option, selected ? styles.optionOn : null]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {!option.custom ? <Text style={styles.caption}>{option.range}</Text> : null}
                </View>
                {selected ? <Check size={18} color={color.primary} /> : option.custom ? <ChevronRight size={18} color={color.textMuted} /> : null}
              </Press>
            );
          })}
        </ScrollView>
      </Dialog>

      <DateRangeDialog
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
        onApply={() => {
          if (startDate && endDate) {
            setSelectedDateRange(`${formatDateForDisplay(new Date(startDate))} - ${formatDateForDisplay(new Date(endDate))}`);
            setShowCalendar(false);
            fetchPastCyclesData(startDate, endDate);
          }
        }}
      />

      <Dialog visible={showWithdrawalModal} onClose={closeWithdrawal} backdrop={color.overlay} panelStyle={[dialogPanel, { marginBottom: keyboardHeight }]}>
        <DialogHead title="Withdraw amount" onClose={closeWithdrawal} />
        <View style={{ padding: space.xl, gap: space.lg }}>
          <View style={styles.balance}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Money value={inr2(payout)} style={{ color: color.primary }} />
          </View>
          <Field label="Enter amount to withdraw" error={overBalance ? 'Amount cannot exceed available balance' : null}>
            <Input
              value={withdrawalAmount}
              onChangeText={(text) => {
                let val = text.replace(/[^0-9.]/g, '');
                const parts = val.split('.');
                if (parts.length > 2) val = `${parts[0]}.${parts.slice(1).join('')}`;
                if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                setWithdrawalAmount(val);
              }}
              keyboardType="decimal-pad"
              autoComplete="off"
              placeholder="Enter amount"
              accessibilityLabel="Enter amount to withdraw"
              error={overBalance}
              left={<Text style={styles.rupee}>₹</Text>}
            />
          </Field>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Button title="Cancel" variant="outline" onPress={closeWithdrawal} style={{ flex: 1 }} />
            <Button title={submittingWithdrawal ? 'Submitting...' : 'Submit request'} loading={submittingWithdrawal} disabled={submitOff} onPress={submitWithdrawal} style={{ flex: 1.4 }} />
          </View>
        </View>
      </Dialog>

      <BottomNavOrders />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  tabsWrap: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.lg },
  overline: { ...type.overline, color: color.goldText },
  muted: { ...type.body, color: color.textMuted },
  caption: { ...type.caption, color: color.textMuted, marginTop: 2 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.lg },
  emptyCompact: { paddingVertical: space.xxl },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg },
  reqMoney: { ...type.bodyStrong, fontSize: 16 },
  orderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, padding: space.lg },
  orderId: { ...type.bodyStrong, color: color.text },
  orderDate: { ...type.caption, color: color.textMuted, marginTop: 2 },
  orderFood: { ...type.small, color: color.textSecondary, marginTop: 2 },
  rowMoney: { ...type.bodyStrong, fontSize: 15 },
  rowMoneyLabel: { ...type.caption, color: color.textMuted },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rangeBtn: { flex: 1, minWidth: 0, height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  rangeText: { flex: 1, minWidth: 0, ...type.label, color: color.text },
  found: { ...type.label, color: color.textSecondary },
  dashed: { borderStyle: 'dashed', borderColor: color.borderStrong, paddingVertical: space.xxl },
  tileGrid: { gap: space.md },
  tileRow: { flexDirection: 'row', gap: space.md },
  menu: { position: 'absolute', minWidth: 200, backgroundColor: color.surface, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, paddingVertical: space.xs, ...elevation.float },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingHorizontal: space.lg },
  menuIcon: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  menuText: { ...type.bodyStrong, color: color.text },
  rangePanel: { maxHeight: '80%' },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  optionOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  optionLabel: { ...type.bodyStrong, color: color.text },
  balance: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, padding: space.md, borderRadius: radii.md, backgroundColor: color.primarySoft },
  balanceLabel: { ...type.label, color: color.textSecondary },
  rupee: { ...type.bodyStrong, color: color.textSecondary },
});
