import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, BackHandler, Easing, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { confirm } from '../../lib/notify';
import { AlertCircle, Clock, Search, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { poppins, shadow, tw } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import RestaurantNavbar from '../components/RestaurantNavbar';
import { useOrdersMain } from '../hooks/pages/useOrdersMain';
import { RT, RT_GRADIENT } from '../theme';
import { AllOrders, CancelledOrders, CompletedOrders, OutForDeliveryOrders, PreparingOrders, ReadyOrders, SearchResults, TableBookings, TakeawayOrders } from './orders/lists';
import { BRAND, EmptyState } from './orders/parts';
import { CancelPopup, NewOrderPopup, OrderSheet, RejectPopup, VerifyTakeawayPopup } from './orders/popups';

const QUICK_FILTER_TABS = ['all', 'preparing', 'ready', 'out-for-delivery', 'table-booking', 'takeaway-orders'];

/** `animate-pulse` dot */
function PulseDot({ color }) {
  const anim = useAnimatedValue(1);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.4, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: anim }} />;
}

function CountBadge({ value, bg, fg }) {
  return <Text style={[styles.countBadge, { backgroundColor: bg, color: fg }]}>{value}</Text>;
}

/** Port of Food/pages/restaurant/OrdersMain.jsx (/food/restaurant): the restaurant's home. */
export default function OrdersMain() {
  const h = useOrdersMain();
  // Root screen: the old wrapper asked "Exit App?" before leaving.
  const lastBack = useRef(0);
  useFocusEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Date.now() - lastBack.current < 400) return true;
      lastBack.current = Date.now();
      confirm('Exit App?', 'Are you sure you want to exit?', { confirmText: 'Exit', cancelText: 'Cancel' }).then((ok) => ok && BackHandler.exitApp());
      return true;
    });
    return () => sub.remove();
  });
  const {
    activeFilter, setActiveFilter, isTransitioning, setIsTransitioning, filterTabs, searchQuery, setSearchQuery, searchResults, isSearching, restaurantStatus,
    handleReverify, isReverifying, pendingDiningRequest, pendingOrdersCount, activeTakeawayCount, pendingBookingsCount, handleSelectOrder, handleCancelClick,
    handleVerifyTakeawayClick, ordersRefreshToken, requestOrdersRefresh, transformOrderForList, handleTouchStart, handleTouchMove, handleTouchEnd,
  } = h;

  // The web scrolls the filter bar to the active pill by measuring the DOM; here the pill positions come from layout.
  const filterScroll = useRef(null);
  const pillLayouts = useRef({});
  const barWidth = useRef(0);
  useEffect(() => {
    const pill = pillLayouts.current[activeFilter];
    if (!pill || !filterScroll.current) return;
    filterScroll.current.scrollTo({ x: Math.max(0, pill.x - barWidth.current / 2 + pill.width / 2), animated: true });
  }, [activeFilter]);

  const selectFilter = (id) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveFilter(id);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // Horizontal swipes on the list change the filter, as on the web; the hook reads touches the browser way.
  const touch = (e) => ({ touches: [{ clientX: e.nativeEvent.pageX, clientY: e.nativeEvent.pageY }] });

  const renderContent = () => {
    if (searchQuery.trim() !== '') {
      return <SearchResults query={searchQuery} results={searchResults} isLoading={isSearching} onSelectOrder={handleSelectOrder} onVerifyTakeaway={handleVerifyTakeawayClick} transformOrderForList={transformOrderForList} />;
    }
    switch (activeFilter) {
      case 'all':
        return <AllOrders onSelectOrder={handleSelectOrder} onCancel={handleCancelClick} onVerifyTakeaway={handleVerifyTakeawayClick} refreshToken={ordersRefreshToken} />;
      case 'preparing':
        return <PreparingOrders onSelectOrder={handleSelectOrder} onCancel={handleCancelClick} refreshToken={ordersRefreshToken} onStatusChanged={requestOrdersRefresh} />;
      case 'ready':
        return <ReadyOrders onSelectOrder={handleSelectOrder} onVerifyTakeaway={handleVerifyTakeawayClick} refreshToken={ordersRefreshToken} />;
      case 'out-for-delivery':
        return <OutForDeliveryOrders onSelectOrder={handleSelectOrder} refreshToken={ordersRefreshToken} />;
      case 'completed':
        return <CompletedOrders onSelectOrder={handleSelectOrder} refreshToken={ordersRefreshToken} />;
      case 'table-booking':
        return <TableBookings />;
      case 'takeaway-orders':
        return <TakeawayOrders onSelectOrder={handleSelectOrder} onCancel={handleCancelClick} onVerifyTakeaway={handleVerifyTakeawayClick} refreshToken={ordersRefreshToken} />;
      case 'cancelled':
        return <CancelledOrders onSelectOrder={handleSelectOrder} refreshToken={ordersRefreshToken} />;
      default:
        return <EmptyState />;
    }
  };

  const showVerification = !restaurantStatus.isLoading && !restaurantStatus.isActive && restaurantStatus.onboarding?.completedSteps === 4;
  const rejectionLines = String(restaurantStatus.rejectionReason || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const showQuickFilters = searchQuery.trim() === '' && QUICK_FILTER_TABS.includes(activeFilter);

  const quickFilter = (id, label, badge) => {
    const on = activeFilter === id;
    return (
      <Press onPress={() => setActiveFilter(on ? 'all' : id)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, minWidth: 0, transform: [{ scale: on ? 1.05 : 1 }] }}>
        <LinearGradient colors={on ? RT_GRADIENT : ['#fff', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quick}>
          <Text style={[styles.quickText, { color: on ? '#fff' : '#000' }]} numberOfLines={1}>{label}</Text>
          {badge}
        </LinearGradient>
      </Press>
    );
  };

  return (
    <View style={styles.page}>
      <RestaurantNavbar showNotifications hideSearch />

      <View style={styles.top}>
        <View style={styles.search}>
          <Search size={18} color={tw.slate400} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by order ID or dish name"
            placeholderTextColor={tw.slate400}
            returnKeyType="search"
            accessibilityLabel="Search orders"
            style={styles.searchInput}
          />
          {searchQuery ? (
            <Press onPress={() => setSearchQuery('')} accessibilityLabel="Clear search" hitSlop={10}>
              <X size={16} color={tw.slate400} />
            </Press>
          ) : null}
        </View>

        <ScrollView
          ref={filterScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(e) => {
            barWidth.current = e.nativeEvent.layout.width;
          }}
          contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}
        >
          {filterTabs.map((tab) => {
            const on = activeFilter === tab.id;
            const pending = tab.id === 'all' && pendingOrdersCount > 0;
            return (
              <Press
                key={tab.id}
                onPress={() => selectFilter(tab.id)}
                onLayout={(e) => {
                  pillLayouts.current[tab.id] = e.nativeEvent.layout;
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={{ opacity: on ? 1 : 0.7, transform: [{ scale: on ? 1.05 : 1 }] }}
              >
                <LinearGradient colors={on ? RT_GRADIENT : ['#fff', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
                  <Text style={[styles.pillText, { color: on ? '#fff' : '#000' }]}>{tab.label}</Text>
                  {pending ? <CountBadge value={pendingOrdersCount} bg={tw.amber100} fg={RT.primaryStrong} /> : null}
                  {pending ? <PulseDot color={BRAND} /> : null}
                </LinearGradient>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 + BOTTOM_NAV_HEIGHT }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onTouchStart={(e) => handleTouchStart(touch(e))}
        onTouchMove={(e) => handleTouchMove(touch(e))}
        onTouchEnd={handleTouchEnd}
      >
        {showVerification ? (
          <View style={[styles.card, { borderColor: restaurantStatus.rejectionReason ? tw.red200 : tw.yellow200 || '#fef08a' }]}>
            {restaurantStatus.rejectionReason ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <View style={{ borderRadius: 999, padding: 8, backgroundColor: tw.red100 }}>
                    <AlertCircle size={20} color={BRAND} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.cardTitle, { color: BRAND, marginBottom: 8 }]}>Denied Verification</Text>
                    <View style={styles.rejection}>
                      <Text style={styles.rejectionLabel}>Reason for Rejection:</Text>
                      {rejectionLines.length > 1 ? (
                        rejectionLines.map((point, index) => (
                          <Text key={index} style={styles.rejectionText}>{'•'} {point}</Text>
                        ))
                      ) : (
                        <Text style={styles.rejectionText}>{restaurantStatus.rejectionReason}</Text>
                      )}
                    </View>
                  </View>
                </View>
                <Text style={[styles.cardBody, { color: tw.gray700, marginBottom: 12 }]}>
                  Please correct the above issues and click &quot;Reverify&quot; to resubmit your request for approval.
                </Text>
                <Press scale={0.99} onPress={handleReverify} disabled={isReverifying} accessibilityState={{ disabled: isReverifying, busy: isReverifying }} style={isReverifying ? { opacity: 0.5 } : null}>
                  <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.reverify}>
                    {isReverifying ? <ActivityIndicator size="small" color="#fff" /> : null}
                    <Text style={styles.reverifyText}>{isReverifying ? 'Submitting...' : 'Reverify'}</Text>
                  </LinearGradient>
                </Press>
              </>
            ) : (
              <>
                <Text style={[styles.cardTitle, { marginBottom: 4 }]}>Verification Done in 24 Hours</Text>
                <Text style={styles.cardBody}>Your account is under verification. You&apos;ll be notified once approved.</Text>
              </>
            )}
          </View>
        ) : null}

        {pendingDiningRequest ? (
          <View style={[styles.card, { borderColor: tw.blue200 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <View style={{ padding: 8, borderRadius: 999, backgroundColor: tw.blue100 }}>
                <Clock size={16} color={BRAND} />
              </View>
              <Text style={{ flex: 1, fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) }}>Dining Activation Request Pending</Text>
            </View>
            <Text style={styles.cardBody}>
              Your request to {pendingDiningRequest.requestedSettings?.isEnabled ? 'enable' : 'update'} dining services is being reviewed by our team. You&apos;ll be notified via SMS/Dashboard once it&apos;s approved.
            </Text>
            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <PulseDot color={tw.blue500} />
              <Text style={styles.underReview}>UNDER REVIEW</Text>
            </View>
          </View>
        ) : null}

        {showQuickFilters ? (
          <View style={styles.quickRow}>
            {quickFilter(
              'takeaway-orders',
              'Takeaway Orders',
              activeTakeawayCount > 0 && activeFilter !== 'all' ? (
                <>
                  <CountBadge value={activeTakeawayCount} bg={tw.amber100} fg={RT.primaryStrong} />
                  <PulseDot color={RT.accent} />
                </>
              ) : null,
            )}
            {quickFilter(
              'table-booking',
              'Dining Booking',
              pendingBookingsCount > 0 ? (
                <>
                  <CountBadge value={pendingBookingsCount} bg={tw.red100} fg={BRAND} />
                  <PulseDot color={BRAND} />
                </>
              ) : null,
            )}
          </View>
        ) : null}

        {renderContent()}
      </ScrollView>

      <NewOrderPopup h={h} />
      <RejectPopup h={h} />
      <CancelPopup h={h} />
      <VerifyTakeawayPopup h={h} />
      <OrderSheet h={h} />

      <BottomNavOrders />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.gray100 },
  top: { backgroundColor: tw.gray100, paddingHorizontal: 16, paddingBottom: 8 },
  search: { marginVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, borderRadius: 16, ...shadow('sm') },
  searchInput: { flex: 1, height: 46, paddingVertical: 0, fontSize: 14, color: tw.slate900, ...poppins(600) },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  pillText: { fontSize: 14, lineHeight: 20, ...poppins(500) },
  countBadge: { fontSize: 10, lineHeight: 15, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', ...poppins(800) },
  card: { marginVertical: 16, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#fff', borderWidth: 1, ...shadow('sm') },
  cardTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  cardBody: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  rejection: { backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red200, borderRadius: 8, padding: 12, marginBottom: 12, gap: 4 },
  rejectionLabel: { fontSize: 12, lineHeight: 16, color: tw.red800, marginBottom: 4, ...poppins(600) },
  rejectionText: { fontSize: 12, lineHeight: 16, color: tw.red700, ...poppins(400) },
  reverify: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  reverifyText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) },
  underReview: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.blue500, ...poppins(800) },
  quickRow: { paddingVertical: 8, flexDirection: 'row', justifyContent: 'center', gap: 12 },
  quick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: tw.gray200, ...shadow('sm') },
  quickText: { flexShrink: 1, fontSize: 14, lineHeight: 20, ...poppins(700) },
});
