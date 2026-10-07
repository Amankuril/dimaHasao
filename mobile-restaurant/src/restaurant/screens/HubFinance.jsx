import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Bell, Calendar, ChevronDown, Download, FileText, Menu, Wallet, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { restaurantAPI } from '../../api/restaurant';
import { alert } from '../../lib/webShim';
import { poppins, shadow, tw } from '../../theme';
import BottomNavOrders from '../components/BottomNavOrders';
import DateRangeDialog from '../components/DateRangeDialog';
import { useHubFinance } from '../hooks/pages/useHubFinance';
import { RT, RT_GRADIENT } from '../theme';

const inr = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

const STATUS_STYLE = {
  // text-green-700 / text-amber-700 are repainted to the theme's strong green; red is left alone.
  green: { backgroundColor: tw.green100, color: RT.primaryStrong },
  red: { backgroundColor: tw.red100, color: tw.red700 },
  amber: { backgroundColor: tw.amber100, color: RT.primaryStrong },
};

function OrderRow({ order, formatDateTime, last }) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, last ? null : { borderBottomWidth: 1, borderBottomColor: tw.gray200, paddingBottom: 12 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.orderId}>Order ID: {order.orderId || 'N/A'}</Text>
        <Text style={styles.orderDate}>{formatDateTime(order.createdAt || order.deliveredAt)}</Text>
        <Text style={styles.orderFood}>{order.foodNames || (order.items && order.items.map((item) => item.name).join(', ')) || 'N/A'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: 16 }}>
        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) }}>₹{inr(order.payout || 0)}</Text>
        <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) }}>Earning</Text>
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
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <View style={[styles.nav, { paddingTop: 12 + insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {showBack ? (
            <Press onPress={goBack} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 6 }}>
              <ArrowLeft size={20} color={tw.gray900} />
            </Press>
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text numberOfLines={1} style={styles.navTitle} accessibilityRole="header">{restaurantData?.name || financeData?.restaurant?.name || 'Restaurant'}</Text>
              <ChevronDown size={16} color={tw.gray600} />
            </View>
            <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray600, marginTop: 2, ...poppins(400) }}>{subtitle}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}>
            <Press onPress={() => navigate('/food/restaurant/withdrawal-history', { state: { from: location.pathname } })} accessibilityLabel="Withdrawal History" style={styles.navIcon}>
              <Wallet size={20} color={tw.gray700} />
            </Press>
            <Press onPress={() => navigate('/food/restaurant/notifications', { state: { from: location.pathname } })} accessibilityLabel="Notifications" style={styles.navIcon}>
              <Bell size={20} color={tw.gray700} />
            </Press>
            <Press onPress={() => navigate('/food/restaurant/explore')} accessibilityLabel="Menu" style={styles.navIcon}>
              <Menu size={20} color={tw.gray700} />
            </Press>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {[['payouts', 'Payouts'], ['invoices', 'Invoices & Taxes']].map(([id, label]) => {
          const active = activeTab === id;
          return (
            <Press key={id} scale={0.98} onPress={() => setActiveTab(id)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={{ flex: 1 }}>
              <LinearGradient colors={active ? RT_GRADIENT : ['#fff', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tab, active ? null : { borderWidth: 1, borderColor: tw.gray300 }]}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: active ? '#fff' : tw.gray600, ...poppins(500) }}>{label}</Text>
              </LinearGradient>
            </Press>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 112 + insets.bottom }} keyboardShouldPersistTaps="handled">
        {activeTab === 'payouts' ? (
          <View style={{ gap: 24 }}>
            <View>
              <Text style={styles.h2}>Current cycle</Text>
              <View style={styles.box}>
                {loading ? (
                  <Text style={{ paddingVertical: 32, textAlign: 'center', color: tw.gray500, ...poppins(400) }}>Loading...</Text>
                ) : (
                  <>
                    <Text style={{ fontSize: 36, lineHeight: 40, color: tw.gray900, marginBottom: 8, ...poppins(700) }}>₹{inr(payout)}</Text>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, marginBottom: 16, ...poppins(400) }}>
                      {financeData?.currentCycle?.totalOrders || 0} {financeData?.currentCycle?.totalOrders === 1 ? 'order' : 'orders'}
                    </Text>
                    <Press scale={0.98} disabled={!canWithdraw} onPress={() => { setWithdrawalAmount(''); setShowWithdrawalModal(true); }} accessibilityState={{ disabled: !canWithdraw }} style={{ marginTop: 16 }}>
                      <LinearGradient colors={canWithdraw ? RT_GRADIENT : [tw.gray200, tw.gray200]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.withdraw}>
                        <Wallet size={20} color={canWithdraw ? '#fff' : tw.gray500} />
                        <Text style={{ fontSize: 16, lineHeight: 24, color: canWithdraw ? '#fff' : tw.gray500, ...poppins(600) }}>Withdraw</Text>
                      </LinearGradient>
                    </Press>
                  </>
                )}
              </View>
            </View>

            <View>
              <Text style={styles.h2}>Withdrawal requests</Text>
              <View style={styles.box}>
                {loadingWithdrawals ? (
                  <Text style={styles.empty}>Loading withdrawal requests...</Text>
                ) : withdrawalRequests.length === 0 ? (
                  <Text style={styles.empty}>No withdrawal requests found.</Text>
                ) : (
                  <View style={{ gap: 12 }}>
                    {withdrawalRequests.slice(0, 8).map((request, index) => {
                      const cls = getWithdrawalStatusClass(request?.status);
                      const st = cls.includes('green') ? STATUS_STYLE.green : cls.includes('red') ? STATUS_STYLE.red : STATUS_STYLE.amber;
                      return (
                        <View key={request?._id || request?.id || index} style={styles.reqCard}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) }}>₹{inr(request?.amount)}</Text>
                              <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) }}>Requested: {formatDateTime(request?.createdAt || request?.requestedAt)}</Text>
                              {request?.processedAt ? (
                                <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 2, ...poppins(400) }}>Processed: {formatDateTime(request?.processedAt)}</Text>
                              ) : null}
                            </View>
                            <Text style={[styles.badge, { backgroundColor: st.backgroundColor, color: st.color }]}>{formatWithdrawalStatus(request?.status)}</Text>
                          </View>
                        </View>
                      );
                    })}
                    {withdrawalRequests.length > 8 ? (
                      <Press scale={1} onPress={() => navigate('/food/restaurant/withdrawal-history')} style={{ paddingTop: 4, alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, lineHeight: 20, color: '#000', ...poppins(500) }}>View all requests</Text>
                      </Press>
                    ) : null}
                  </View>
                )}
              </View>
            </View>

            <View>
              <Text style={styles.h2}>Past cycles</Text>
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8, zIndex: 20 }}>
                  <Press scale={1} onPress={() => setShowDateRangePicker(!showDateRangePicker)} accessibilityLabel={`Date range ${selectedDateRange}`} style={styles.rangeBtn}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Calendar size={16} color={tw.gray600} />
                      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) }}>{selectedDateRange}</Text>
                    </View>
                    <ChevronDown size={16} color={tw.gray600} style={showDateRangePicker ? { transform: [{ rotate: '180deg' }] } : null} />
                  </Press>
                  <View ref={reportBtnRef} collapsable={false}>
                    <Press scale={0.98} onPress={toggleReportMenu} accessibilityLabel="Get report">
                      <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.report}>
                        <Download size={16} color="#fff" />
                        <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) }}>Get report</Text>
                        <ChevronDown size={16} color="#fff" />
                      </LinearGradient>
                    </Press>
                  </View>
                </View>

                {!loadingPastCycles && pastOrders ? (
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, marginBottom: 12, paddingHorizontal: 4, ...poppins(500) }}>{pastOrders.length} orders found</Text>
                ) : null}

                {loadingPastCycles ? (
                  <View style={styles.box}>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, textAlign: 'center', ...poppins(400) }}>Loading past cycles...</Text>
                  </View>
                ) : (
                  <>
                    {pastOrders && pastOrders.length > 0 ? (
                      <View style={[styles.box, { gap: 12 }]}>
                        {pastOrders.map((order, index) => (
                          <OrderRow key={order.orderId || index} order={order} formatDateTime={formatDateTime} last={index === pastOrders.length - 1} />
                        ))}
                      </View>
                    ) : pastOrders && pastOrders.length === 0 ? (
                      <View style={[styles.box, { padding: 32, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray300 }]}>
                        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, fontStyle: 'italic', ...poppins(400) }}>No orders found for this selected range.</Text>
                      </View>
                    ) : null}

                    {(!pastCyclesData || !pastOrders) && !loadingPastCycles && currentOrders && currentOrders.length > 0 ? (
                      <View style={[styles.box, { gap: 12 }]}>
                        {currentOrders.map((order, index) => (
                          <OrderRow key={order.orderId || index} order={order} formatDateTime={formatDateTime} last={index === currentOrders.length - 1} />
                        ))}
                      </View>
                    ) : null}

                    {(!pastCyclesData || !pastOrders || pastOrders.length === 0) && (!currentOrders || currentOrders.length === 0) && !loadingPastCycles && !loading ? (
                      <View style={[styles.box, { padding: 48, alignItems: 'center', borderWidth: 1, borderColor: tw.gray200 }]}>
                        <Text style={{ color: tw.gray400, marginBottom: 8, ...poppins(400) }}>No transaction history available</Text>
                        <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, textAlign: 'center', ...poppins(400) }}>Your earnings and order payouts will appear here.</Text>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {activeTab === 'invoices' ? (
          <View style={{ gap: 16 }}>
            <View style={[styles.box, { borderWidth: 1, borderColor: tw.gray200 }]}>
              <Text style={styles.h3}>Invoices & Taxes Summary</Text>
              <View style={{ gap: 12 }}>
                {[
                  ['Orders', String(invoiceSummary.count)],
                  ['Earnings', `₹${inr(invoiceSummary.earnings)}`],
                  ['Commission', `₹${inr(invoiceSummary.commission)}`],
                  ['Gross amount', `₹${inr(invoiceSummary.gross)}`],
                ].map(([label, value]) => (
                  <View key={label} style={{ borderRadius: 6, backgroundColor: tw.gray50, padding: 12 }}>
                    <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) }}>{label}</Text>
                    <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) }}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.box, { borderWidth: 1, borderColor: tw.gray200 }]}>
              <Text style={styles.h3}>Order invoice details</Text>
              {loading ? (
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) }}>Loading invoice data...</Text>
              ) : invoiceOrders.length === 0 ? (
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) }}>No invoice data available for selected range.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {invoiceOrders.map((order, index) => (
                    <View key={`${order.orderId || index}-invoice`} style={{ borderWidth: 1, borderColor: tw.gray100, borderRadius: 6, padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) }}>Order: {order.orderId || 'N/A'}</Text>
                          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray600, marginTop: 2, ...poppins(400) }}>{order.paymentMethod || 'N/A'} | {order.orderStatus || 'N/A'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) }}>₹{inr(order.totalAmount || 0)}</Text>
                          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) }}>Total</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={showDownloadMenu && Boolean(menuPos)} transparent animationType="fade" onRequestClose={() => setShowDownloadMenu(false)} statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowDownloadMenu(false)} accessibilityLabel="Close menu" />
        <View style={[styles.menu, { top: menuPos?.top || 0, right: menuPos?.right || 0 }]}>
          <Press scale={1} onPress={downloadPDF} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
            <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={16} color={RT.primary} />
            </View>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) }}>Download PDF</Text>
          </Press>
        </View>
      </Modal>

      <Dialog visible={showDateRangePicker} onClose={() => setShowDateRangePicker(false)} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.rangePanel}>
        <View style={styles.rangeHead}>
          <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) }}>Select Date Range</Text>
          <Press onPress={() => setShowDateRangePicker(false)} accessibilityLabel="Close" style={{ padding: 4, borderRadius: 999 }}>
            <X size={20} color={tw.gray500} />
          </Press>
        </View>
        <ScrollView style={{ padding: 8 }} contentContainerStyle={{ gap: 4 }}>
          {getDateOptions().map((option) => (
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
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
            >
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) }}>{option.label}</Text>
              {!option.custom ? <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) }}>{option.range}</Text> : null}
            </Press>
          ))}
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

      <Dialog visible={showWithdrawalModal} onClose={closeWithdrawal} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.wPanel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) }}>Withdraw Amount</Text>
          <Press onPress={closeWithdrawal} accessibilityLabel="Close" style={{ padding: 4, borderRadius: 999 }}>
            <X size={20} color={tw.gray600} />
          </Press>
        </View>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, marginBottom: 8, ...poppins(400) }}>
            Available Balance: <Text style={{ color: tw.gray900, ...poppins(600) }}>₹{inr(payout)}</Text>
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, marginBottom: 8, ...poppins(500) }}>Enter Amount to Withdraw</Text>
          <TextInput
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
            placeholderTextColor={tw.gray400}
            accessibilityLabel="Enter Amount to Withdraw"
            style={styles.amount}
          />
          {overBalance ? <Text style={{ fontSize: 14, lineHeight: 20, color: RT.primary, marginTop: 4, ...poppins(400) }}>Amount cannot exceed available balance</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Press scale={0.98} onPress={closeWithdrawal} style={[styles.wBtn, { borderWidth: 1, borderColor: tw.gray300 }]}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) }}>Cancel</Text>
          </Press>
          <Press scale={0.98} disabled={submitOff} onPress={submitWithdrawal} accessibilityState={{ disabled: submitOff, busy: submittingWithdrawal }} style={{ flex: 1 }}>
            <LinearGradient colors={submitOff ? [tw.gray300, tw.gray300] : RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wBtn}>
              {submittingWithdrawal ? <ActivityIndicator size="small" color="#fff" /> : null}
              <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) }}>{submittingWithdrawal ? 'Submitting...' : 'Submit Request'}</Text>
            </LinearGradient>
          </Press>
        </View>
      </Dialog>

      <BottomNavOrders />
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  navTitle: { flexShrink: 1, fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  navIcon: { padding: 8, borderRadius: 999 },
  tab: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center' },
  h2: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 12, ...poppins(700) },
  h3: { fontSize: 14, lineHeight: 20, color: tw.gray900, marginBottom: 12, ...poppins(600) },
  box: { backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  empty: { paddingVertical: 24, textAlign: 'center', fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  withdraw: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  reqCard: { borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, padding: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', fontSize: 12, lineHeight: 16, ...poppins(600) },
  rangeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, paddingHorizontal: 16, paddingVertical: 12 },
  report: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  menu: { position: 'absolute', minWidth: 180, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, paddingVertical: 8, zIndex: 50, ...shadow('2xl') },
  orderId: { fontSize: 14, lineHeight: 20, color: tw.gray900, marginBottom: 4, ...poppins(600) },
  orderDate: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginBottom: 4, ...poppins(400) },
  orderFood: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  rangePanel: { width: '100%', maxWidth: 384, maxHeight: '80%', alignSelf: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, ...shadow('xl') },
  rangeHead: { padding: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wPanel: { width: '100%', maxWidth: 448, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 24, ...shadow('xl') },
  amount: { paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, fontSize: 16, color: tw.gray900, ...poppins(400) },
  wBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
});
