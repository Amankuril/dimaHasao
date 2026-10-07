import { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { confirm } from '../../lib/notify';
import { AlertCircle, Clock, Search, ShieldCheck, ShoppingBag, Utensils, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Button, Card, Chip, StatusBadge } from '../../components/ds';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { color, radii, space, type as t } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import RestaurantNavbar from '../components/RestaurantNavbar';
import { useOrdersMain } from '../hooks/pages/useOrdersMain';
import { AllOrders, CancelledOrders, CompletedOrders, OutForDeliveryOrders, PreparingOrders, ReadyOrders, SearchResults, TableBookings, TakeawayOrders } from './orders/lists';
import { EmptyState } from './orders/parts';
import { CancelPopup, NewOrderPopup, OrderSheet, RejectPopup, VerifyTakeawayPopup } from './orders/popups';

const QUICK_FILTER_TABS = ['all', 'preparing', 'ready', 'out-for-delivery', 'table-booking', 'takeaway-orders'];

/** `animate-pulse` dot: draws the eye to tabs that need action. */
function PulseDot({ color: c, style }) {
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
  return <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: c, opacity: anim }, style]} />;
}

/** Count pill for the quick filters. */
function CountPill({ value, on }) {
  return (
    <View style={[styles.countPill, { backgroundColor: on ? color.surface : color.primary }]}>
      <Text style={[t.caption, { color: on ? color.primary : color.onPrimary }]}>{value > 99 ? '99+' : value}</Text>
    </View>
  );
}

/** Local primitive: a 48 px half-width toggle tile (icon + label + optional count) for the takeaway / dining shortcuts. */
function QuickFilter({ icon: Icon, label, on, onPress, count, pulse }) {
  return (
    <Press
      onPress={onPress}
      scale={0.98}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={count ? `${label}, ${count} waiting` : label}
      style={[styles.quick, on ? styles.quickOn : styles.quickOff]}
    >
      <Icon size={18} color={on ? color.onPrimary : color.primary} />
      <Text style={[t.label, { flexShrink: 1, color: on ? color.onPrimary : color.text }]} numberOfLines={1}>
        {label}
      </Text>
      {count ? <CountPill value={count} on={on} /> : null}
      {pulse ? <PulseDot color={on ? color.goldOnDark : color.warning} /> : null}
    </Press>
  );
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
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <View style={styles.page}>
      <RestaurantNavbar showNotifications hideSearch />

      <View style={styles.top}>
        <View style={[styles.search, searchFocused ? { borderColor: color.primary } : null]}>
          <Search size={18} color={color.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search by order ID or dish name"
            placeholderTextColor={color.textMuted}
            returnKeyType="search"
            accessibilityLabel="Search orders"
            style={styles.searchInput}
          />
          {searchQuery ? (
            <Press onPress={() => setSearchQuery('')} accessibilityLabel="Clear search" hitSlop={10} style={styles.clear}>
              <X size={18} color={color.textMuted} />
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
          accessibilityRole="tablist"
          contentContainerStyle={styles.tabs}
        >
          {filterTabs.map((tab) => {
            const on = activeFilter === tab.id;
            const pending = tab.id === 'all' && pendingOrdersCount > 0;
            return (
              <View
                key={tab.id}
                onLayout={(e) => {
                  pillLayouts.current[tab.id] = e.nativeEvent.layout;
                }}
              >
                <Chip label={tab.label} selected={on} onPress={() => selectFilter(tab.id)} count={pending ? pendingOrdersCount : undefined} style={styles.tab} />
                {pending ? <PulseDot color={color.warning} style={styles.tabDot} /> : null}
              </View>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xxxl + BOTTOM_NAV_HEIGHT }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onTouchStart={(e) => handleTouchStart(touch(e))}
        onTouchMove={(e) => handleTouchMove(touch(e))}
        onTouchEnd={handleTouchEnd}
      >
        {showVerification ? (
          <Card style={styles.banner}>
            {restaurantStatus.rejectionReason ? (
              <>
                <View style={styles.bannerHead}>
                  <View style={[styles.bannerIcon, { backgroundColor: color.dangerSoft }]}>
                    <AlertCircle size={20} color={color.danger} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                    <Text style={styles.bannerTitle}>Verification denied</Text>
                    <StatusBadge label="Rejected" tone="danger" />
                  </View>
                </View>
                <View style={styles.rejection}>
                  <Text style={styles.rejectionLabel}>Reason for rejection</Text>
                  {rejectionLines.length > 1 ? (
                    rejectionLines.map((point, index) => (
                      <Text key={index} style={styles.rejectionText}>
                        {'•'} {point}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.rejectionText}>{restaurantStatus.rejectionReason}</Text>
                  )}
                </View>
                <Text style={styles.bannerBody}>Please correct the issues above and tap &quot;Reverify&quot; to resubmit your request for approval.</Text>
                <Button title={isReverifying ? 'Submitting…' : 'Reverify'} onPress={handleReverify} loading={isReverifying} />
              </>
            ) : (
              <View style={styles.bannerHead}>
                <View style={[styles.bannerIcon, { backgroundColor: color.warningSoft }]}>
                  <ShieldCheck size={20} color={color.warning} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                  <Text style={styles.bannerTitle}>Verification done in 24 hours</Text>
                  <Text style={styles.bannerBody}>Your account is under verification. You&apos;ll be notified once approved.</Text>
                </View>
              </View>
            )}
          </Card>
        ) : null}

        {pendingDiningRequest ? (
          <Card style={styles.banner}>
            <View style={styles.bannerHead}>
              <View style={[styles.bannerIcon, { backgroundColor: color.infoSoft }]}>
                <Clock size={20} color={color.info} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                <Text style={styles.bannerTitle}>Dining activation request pending</Text>
                <Text style={styles.bannerBody}>
                  Your request to {pendingDiningRequest.requestedSettings?.isEnabled ? 'enable' : 'update'} dining services is being reviewed by our team. You&apos;ll be notified via SMS/Dashboard once it&apos;s approved.
                </Text>
              </View>
            </View>
            <View style={styles.reviewRow}>
              <PulseDot color={color.warning} />
              <StatusBadge label="Under review" tone="warning" />
            </View>
          </Card>
        ) : null}

        {showQuickFilters ? (
          <View style={styles.quickRow}>
            <QuickFilter
              icon={ShoppingBag}
              label="Takeaway orders"
              on={activeFilter === 'takeaway-orders'}
              onPress={() => setActiveFilter(activeFilter === 'takeaway-orders' ? 'all' : 'takeaway-orders')}
              count={activeTakeawayCount > 0 && activeFilter !== 'all' ? activeTakeawayCount : 0}
              pulse={activeTakeawayCount > 0 && activeFilter !== 'all'}
            />
            <QuickFilter
              icon={Utensils}
              label="Dining booking"
              on={activeFilter === 'table-booking'}
              onPress={() => setActiveFilter(activeFilter === 'table-booking' ? 'all' : 'table-booking')}
              count={pendingBookingsCount > 0 ? pendingBookingsCount : 0}
              pulse={pendingBookingsCount > 0}
            />
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
  page: { flex: 1, backgroundColor: color.bg },
  top: { backgroundColor: color.bg, paddingTop: space.md, paddingBottom: space.sm, gap: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  search: { marginHorizontal: space.lg, height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md },
  searchInput: { flex: 1, minWidth: 0, height: 48, paddingVertical: 0, ...t.body, color: color.text },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabs: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.xs },
  tab: { height: 44 },
  tabDot: { position: 'absolute', top: 0, right: 0, borderWidth: 2, borderColor: color.bg, width: 12, height: 12, borderRadius: 6 },
  banner: { marginTop: space.sm, marginBottom: space.sm, gap: space.md },
  bannerHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  bannerIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { ...t.subheading, color: color.text },
  bannerBody: { ...t.small, color: color.textSecondary },
  rejection: { backgroundColor: color.dangerSoft, borderRadius: radii.md, padding: space.md, gap: space.xs },
  rejectionLabel: { ...t.label, color: color.danger },
  rejectionText: { ...t.small, color: color.text },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  quickRow: { paddingTop: space.sm, flexDirection: 'row', gap: space.md },
  quick: { flex: 1, minWidth: 0, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1 },
  quickOn: { backgroundColor: color.primary, borderColor: color.primary },
  quickOff: { backgroundColor: color.surface, borderColor: color.border },
  countPill: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
