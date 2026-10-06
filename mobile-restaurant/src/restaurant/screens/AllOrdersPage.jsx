import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Check, ChevronDown, ChevronRight, Copy, Filter, HelpCircle, Search, X } from 'lucide-react-native';
import { BottomSheet, Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import DateRangeDialog from '../components/DateRangeDialog';
import { PageHeader } from '../components/ui';
import { useAllOrdersPage } from '../hooks/pages/useAllOrdersPage';
import { RT, RT_GRADIENT } from '../theme';

const BADGE = { TAKEAWAY: tw.orange600, DINING: tw.blue600, 'HOME DELIVERY': tw.slate600 };
const STATUS_BG = { REJECTED: tw.red700, CANCELLED: tw.red700, DELIVERED: tw.green600, PREPARING: tw.yellow600, 'OUT FOR DELIVERY': tw.purple600 };
const noop = { stopPropagation() {} };

function Badge({ label, color }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }) {
  if (status === 'READY') {
    return (
      <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
        <Text style={styles.badgeText}>{status}</Text>
      </LinearGradient>
    );
  }
  return <Badge label={status} color={STATUS_BG[status] || tw.gray600} />;
}

function Empty({ title, children }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={title.color ? [styles.emptyTitle, { color: title.color }] : styles.emptyTitle}>{title.text}</Text>
      {children}
    </View>
  );
}

/** Port of Food/pages/restaurant/AllOrdersPage.jsx (/food/restaurant/orders/all, "Order History"). */
export default function AllOrdersPage() {
  const insets = useSafeAreaInsets();
  const h = useAllOrdersPage();
  const { filters, filteredOrders, formatMoney } = h;
  const filterCount = Object.values(filters).flat().length;
  const active = h.hasActiveFilters();

  const renderOrder = ({ item: order }) => (
    <Press
      scale={1}
      onPress={() => h.navigate(`/food/restaurant/orders/${order.id}`, { state: { mongoId: order.mongoId } })}
      accessibilityLabel={`Order ${order.id}, ${order.status}`}
      style={styles.card}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={order.status} />
          {order.tags?.map((tag) => <Badge key={tag} label={tag} color={BADGE[tag] || tw.green600} />)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8 }}>
          <Text style={styles.date}>{order.date}, {order.time}</Text>
          <ChevronRight size={16} color={tw.gray400} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Text style={styles.orderId} selectable>ID: {order.id}</Text>
        <Press onPress={() => h.handleCopyOrderId(order.id, noop)} accessibilityLabel="Copy order ID" hitSlop={8} style={{ padding: 4 }}>
          <Copy size={16} color={tw.gray500} />
        </Press>
      </View>

      <Text style={styles.line}>{order.restaurant}, {order.address}</Text>
      <Text style={styles.customer}>Ordered by {order.customer}</Text>

      <View style={styles.dashed} />

      <View style={{ gap: 8 }}>
        {order.items.slice(0, 2).map((item, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={[styles.itemName, { flex: 1 }]}>{item.quantity} x {item.name}</Text>
            <Text style={styles.itemPrice}>{formatMoney(item.price)}</Text>
          </View>
        ))}
        {order.items.length > 2 ? <Text style={styles.more}>+{order.items.length - 2} more items</Text> : null}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
        <Text style={styles.totalValue}>{formatMoney(order.totalPrice)}</Text>
      </View>

      {order.reason ? (
        <View style={styles.reasonBox}>
          <Text style={styles.reason}>{order.reason}</Text>
        </View>
      ) : null}
    </Press>
  );

  const header = (
    <View>
      <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={styles.searchIcon} pointerEvents="none">
              <Search size={20} color={tw.gray400} />
            </View>
            <TextInput
              value={h.searchQuery}
              onChangeText={h.setSearchQuery}
              placeholder="Search by order ID"
              placeholderTextColor={tw.gray400}
              accessibilityLabel="Search by order ID"
              style={styles.search}
            />
          </View>
          <Press onPress={() => h.setShowFilterPopup(true)} accessibilityLabel="Filter" style={[styles.filterBtn, active ? styles.filterBtnActive : null]}>
            <Filter size={20} color={active ? RT.primary : tw.gray900} />
            {active ? (
              <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.filterCount}>
                <Text style={styles.filterCountText}>{filterCount}</Text>
              </LinearGradient>
            ) : null}
          </Press>
        </View>

        <Press scale={1} onPress={() => h.setShowDateRangePopup(true)} accessibilityLabel="Select date range" style={styles.rangeBtn}>
          <View>
            <Text style={styles.rangeLabel}>{h.selectedDateRange.label}</Text>
            <Text style={styles.rangeDates}>{h.formatDateRange()}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color={tw.gray400} />
            <ChevronDown size={16} color={tw.gray400} />
          </View>
        </Press>
      </View>

      {active ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={styles.summary}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Filter size={16} color={RT.primary} />
              <Text style={styles.summaryText}>
                <Text style={poppins(600)}>{filterCount}</Text> filter{filterCount !== 1 ? 's' : ''} applied
              </Text>
            </View>
            <Press onPress={h.handleClearFilters} accessibilityLabel="Clear all filters" hitSlop={8}>
              <Text style={styles.clear}>Clear all</Text>
            </Press>
          </View>
        </View>
      ) : null}
    </View>
  );

  const body = h.loading ? (
    <View style={styles.emptyBox}>
      <ActivityIndicator size="large" color={RT.primary} />
      <Text style={styles.loadingText}>Loading orders...</Text>
    </View>
  ) : h.error ? (
    <Empty title={{ text: 'Error loading orders', color: RT.primary }}>
      <Text style={styles.emptySub}>{h.error}</Text>
    </Empty>
  ) : (
    <Empty title={{ text: 'No orders found' }}>
      <Text style={styles.emptySub}>Try changing the date range or search filters.</Text>
    </Empty>
  );

  const options = (h.filterOptions[h.activeFilterCategory] || []).filter((o) => o.label.toLowerCase().includes(h.filterSearch.toLowerCase()));
  const isRadio = h.activeFilterCategory === 'Ratings';

  return (
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <PageHeader
        title="Order History"
        subtitle={`${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'} found`}
        onBack={h.goBack}
        right={
          <Press onPress={() => h.navigate('/food/restaurant/support')} accessibilityLabel="Help" style={{ padding: 8 }}>
            <HelpCircle size={20} color={tw.gray900} />
          </Press>
        }
      />
      <FlatList
        data={h.loading || h.error ? [] : filteredOrders}
        keyExtractor={(order) => String(order.id)}
        renderItem={renderOrder}
        ListHeaderComponent={header}
        ListEmptyComponent={<View style={{ paddingHorizontal: 16 }}>{body}</View>}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      />

      <Dialog visible={h.showDateRangePopup} onClose={() => h.setShowDateRangePopup(false)} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.rangePanel}>
        <View style={styles.rangeHead}>
          <Text style={styles.rangeTitle}>Select date range</Text>
          <Press onPress={() => h.setShowDateRangePopup(false)} accessibilityLabel="Close" hitSlop={8} style={{ padding: 6 }}>
            <X size={20} color={tw.gray900} />
          </Press>
        </View>
        <View style={{ padding: 8, gap: 4 }}>
          {h.dateRangeOptions.map((option) => {
            const selected = h.selectedDateRange?.label?.toLowerCase() === option.label.toLowerCase();
            let dates = '';
            if (!option.custom) {
              const d = option.getDates();
              const fmt = (v) => v.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
              dates = `${fmt(d.start)} - ${fmt(d.end)}`;
            }
            return (
              <Press
                key={option.label}
                scale={1}
                onPress={() => h.handleDateRangeSelect(option)}
                accessibilityLabel={option.label}
                style={[styles.option, selected ? styles.optionOn : null]}
              >
                <View>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {!option.custom ? <Text style={styles.optionDates}>{dates}</Text> : null}
                </View>
                {selected ? <Text style={styles.selected}>Selected</Text> : null}
              </Press>
            );
          })}
        </View>
      </Dialog>

      <DateRangeDialog
        visible={h.showCalendar}
        onClose={() => h.setShowCalendar(false)}
        startDate={h.startDate}
        endDate={h.endDate}
        onDateRangeChange={(start, end) => {
          h.setStartDate(start);
          h.setEndDate(end);
        }}
        onApply={() => h.handleDateRangeChange(h.startDate, h.endDate)}
      />

      <BottomSheet visible={h.showFilterPopup} onClose={() => h.setShowFilterPopup(false)} panelStyle={styles.sheet}>
        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 4 }}>
          <View style={styles.handle} />
        </View>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Filters</Text>
          <Press onPress={() => h.setShowFilterPopup(false)} accessibilityLabel="Close" hitSlop={8} style={{ padding: 6 }}>
            <X size={20} color={tw.gray900} />
          </Press>
        </View>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={styles.sidebar}>
            {h.filterCategories.map((category) => {
              const on = h.activeFilterCategory === category.id;
              return (
                <Press
                  key={category.id}
                  scale={1}
                  onPress={() => {
                    h.setActiveFilterCategory(category.id);
                    h.setFilterSearch('');
                  }}
                  accessibilityLabel={category.label}
                  style={[styles.cat, on ? styles.catOn : null]}
                >
                  <Text style={[styles.catText, on ? styles.catTextOn : null]}>{category.label}</Text>
                </Press>
              );
            })}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.optSearchWrap}>
              <View style={[styles.searchIcon, { left: 12 + 12 }]} pointerEvents="none">
                <Search size={16} color={tw.gray400} />
              </View>
              <TextInput
                value={h.filterSearch}
                onChangeText={h.setFilterSearch}
                placeholder="Search"
                placeholderTextColor={tw.gray400}
                accessibilityLabel="Search filters"
                style={styles.optSearch}
              />
            </View>
            <FlatList
              data={options}
              keyExtractor={(o) => o.id}
              contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: option }) => {
                const checked = h.isFilterChecked(option);
                return (
                  <Press
                    scale={1}
                    onPress={() => h.handleFilterToggle(option)}
                    accessibilityRole={isRadio ? 'radio' : 'checkbox'}
                    accessibilityState={{ checked }}
                    accessibilityLabel={option.label}
                    style={styles.optRow}
                  >
                    {isRadio ? (
                      <View style={[styles.radio, { borderColor: checked ? RT.primary : tw.gray300 }]}>
                        {checked ? <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.radioDot} /> : null}
                      </View>
                    ) : (
                      <View style={[styles.check, checked ? { backgroundColor: tw.green600, borderColor: tw.green600 } : null]}>
                        {checked ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                      </View>
                    )}
                    <Text style={styles.optText}>{option.label}</Text>
                  </Press>
                );
              }}
            />
          </View>
        </View>
        <View style={[styles.sheetFoot, { paddingBottom: 12 + insets.bottom }]}>
          <Press onPress={h.handleClearFilters} accessibilityLabel="Clear all" style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear all</Text>
          </Press>
          <Press onPress={h.handleApplyFilters} disabled={h.isApplyingFilters} accessibilityLabel="Apply" style={{ flex: 1, opacity: h.isApplyingFilters ? 0.5 : 1 }}>
            <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.applyBtn}>
              {h.isApplyingFilters ? <ActivityIndicator size="small" color="#fff" /> : null}
              <Text style={styles.applyText}>{h.isApplyingFilters ? 'Applying...' : 'Apply'}</Text>
            </LinearGradient>
          </Press>
        </View>
      </BottomSheet>

      {h.isApplyingFilters && !h.showFilterPopup ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={RT.primary} />
          <Text style={styles.overlayText}>Applying filters...</Text>
        </View>
      ) : null}

      {h.showToast ? (
        <View style={[styles.toastWrap, { bottom: 96 + insets.bottom }]} pointerEvents="none">
          <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.toast}>
            <Check size={20} color={tw.green400} strokeWidth={2} />
            <Text style={styles.toastText}>Order ID copied to clipboard</Text>
          </LinearGradient>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  search: { height: 44, paddingLeft: 40, paddingRight: 16, backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, fontSize: 14, color: tw.gray900, ...poppins(400) },
  filterBtn: { padding: 10, borderWidth: 1, borderRadius: 8, backgroundColor: tw.gray50, borderColor: tw.gray200 },
  filterBtnActive: { backgroundColor: tw.blue50, borderColor: tw.blue500 },
  filterCount: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { fontSize: 12, lineHeight: 14, color: '#fff', ...poppins(700) },
  rangeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 8 },
  rangeLabel: { fontSize: 14, lineHeight: 20, color: tw.gray900, textTransform: 'capitalize', ...poppins(500) },
  rangeDates: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 2, ...poppins(400) },
  summary: { backgroundColor: tw.blue50, borderWidth: 1, borderColor: tw.blue200, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryText: { fontSize: 14, lineHeight: 20, color: tw.blue900, ...poppins(400) },
  clear: { fontSize: 12, lineHeight: 16, color: RT.primary, ...poppins(500) },

  card: { marginHorizontal: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, padding: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) },
  date: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  orderId: { flexShrink: 1, fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  line: { fontSize: 14, lineHeight: 20, color: tw.gray900, marginBottom: 4, ...poppins(400) },
  customer: { fontSize: 14, lineHeight: 20, color: tw.gray600, marginBottom: 12, ...poppins(400) },
  dashed: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: tw.gray300, marginVertical: 12 },
  itemName: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) },
  itemPrice: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  more: { fontSize: 12, lineHeight: 16, color: RT.primary, ...poppins(500) },
  totalRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray500, ...poppins(500) },
  totalValue: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  reasonBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.gray200 },
  reason: { fontSize: 14, lineHeight: 20, color: RT.primary, ...poppins(400) },

  emptyBox: { alignItems: 'center', gap: 12, paddingVertical: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 8 },
  emptyTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  emptySub: { fontSize: 12, lineHeight: 16, color: tw.gray500, textAlign: 'center', paddingHorizontal: 16, ...poppins(400) },
  loadingText: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },

  rangePanel: { width: '100%', maxWidth: 384, alignSelf: 'center', maxHeight: '80%', marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, ...shadow('xl') },
  rangeHead: { padding: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rangeTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12 },
  optionOn: { borderColor: tw.blue500, backgroundColor: tw.blue50 },
  optionLabel: { fontSize: 14, lineHeight: 20, color: tw.gray900, textTransform: 'capitalize', ...poppins(600) },
  optionDates: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 2, ...poppins(400) },
  selected: { fontSize: 12, lineHeight: 16, color: RT.primary, ...poppins(600) },

  sheet: { width: '100%', height: '65%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, ...shadow('2xl') },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: tw.gray300 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  sheetTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  sidebar: { width: 112, backgroundColor: tw.gray50, borderRightWidth: 1, borderRightColor: tw.gray200 },
  cat: { paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  catOn: { backgroundColor: '#fff', borderLeftWidth: 2, borderLeftColor: '#000' },
  catText: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  catTextOn: { color: tw.gray900, ...poppins(600) },
  optSearchWrap: { padding: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200, justifyContent: 'center' },
  optSearch: { height: 38, paddingLeft: 36, paddingRight: 12, backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, fontSize: 14, color: tw.gray900, ...poppins(400) },
  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  optText: { marginLeft: 12, flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  check: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: tw.gray300, alignItems: 'center', justifyContent: 'center' },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.gray200, backgroundColor: '#fff' },
  clearBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, alignItems: 'center' },
  clearText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  applyBtn: { paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  applyText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 50 },
  overlayText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, ...shadow('lg') },
  toastText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },
});
