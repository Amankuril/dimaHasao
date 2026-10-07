import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Calendar, Check, ChevronDown, ChevronRight, CircleCheck, Copy, Filter, HelpCircle, Inbox, Search, X } from 'lucide-react-native';
import { BottomSheet, Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { Button, EmptyState, IconButton, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type as t } from '../../theme';
import DateRangeDialog from '../components/DateRangeDialog';
import { PageHeader } from '../components/ui';
import { useAllOrdersPage } from '../hooks/pages/useAllOrdersPage';
import { orderStatusTone, sentence } from './orders/parts';

const noop = { stopPropagation() {} };

/** Search box: 48 px, label-less with an icon, primary border while focused. */
function SearchBox({ value, onChangeText, placeholder, accessibilityLabel, style }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused ? { borderColor: color.primary } : null, style]}>
      <Search size={18} color={color.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={color.textMuted}
        accessibilityLabel={accessibilityLabel}
        style={styles.searchInput}
      />
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
      <View style={styles.cardTop}>
        <View style={styles.badges}>
          <StatusBadge label={sentence(order.status)} tone={orderStatusTone(order.status)} />
          {order.tags?.map((tag) => (
            <StatusBadge key={tag} label={sentence(tag)} tone="neutral" />
          ))}
        </View>
        <ChevronRight size={18} color={color.textDisabled} />
      </View>

      <View style={styles.idRow}>
        <Text style={styles.orderId} selectable numberOfLines={1}>
          #{order.id}
        </Text>
        <IconButton icon={Copy} iconSize={16} label="Copy order ID" iconColor={color.textMuted} onPress={() => h.handleCopyOrderId(order.id, noop)} />
      </View>
      <Text style={styles.date}>
        {order.date}, {order.time}
      </Text>

      <Text style={styles.line} numberOfLines={2}>
        {order.restaurant}, {order.address}
      </Text>
      <Text style={styles.customer} numberOfLines={1}>
        Ordered by {order.customer}
      </Text>

      <View style={styles.items}>
        {order.items.slice(0, 2).map((item, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.quantity} x {item.name}
            </Text>
            <Text style={styles.itemPrice}>{formatMoney(item.price)}</Text>
          </View>
        ))}
        {order.items.length > 2 ? <Text style={styles.more}>+{order.items.length - 2} more items</Text> : null}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total amount</Text>
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
    <View style={styles.headerWrap}>
      <View style={styles.searchRow}>
        <SearchBox value={h.searchQuery} onChangeText={h.setSearchQuery} placeholder="Search by order ID" accessibilityLabel="Search by order ID" style={{ flex: 1 }} />
        <Press onPress={() => h.setShowFilterPopup(true)} accessibilityLabel={active ? `Filter, ${filterCount} applied` : 'Filter'} style={[styles.filterBtn, active ? styles.filterBtnActive : null]}>
          <Filter size={20} color={active ? color.onPrimary : color.text} />
          {active ? (
            <View style={styles.filterCount}>
              <Text style={styles.filterCountText}>{filterCount}</Text>
            </View>
          ) : null}
        </Press>
      </View>

      <Press scale={1} onPress={() => h.setShowDateRangePopup(true)} accessibilityLabel="Select date range" style={styles.rangeBtn}>
        <View style={styles.rangeIcon}>
          <Calendar size={18} color={color.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rangeLabel}>{h.selectedDateRange.label}</Text>
          <Text style={styles.rangeDates}>{h.formatDateRange()}</Text>
        </View>
        <ChevronDown size={18} color={color.textMuted} />
      </Press>

      {active ? (
        <View style={styles.summary}>
          <Filter size={16} color={color.primary} />
          <Text style={styles.summaryText}>
            <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>{filterCount}</Text> filter{filterCount !== 1 ? 's' : ''} applied
          </Text>
          <Button title="Clear all" variant="ghost" size="sm" fullWidth={false} onPress={h.handleClearFilters} accessibilityLabel="Clear all filters" style={{ height: 44 }} />
        </View>
      ) : null}
    </View>
  );

  const body = h.loading ? (
    <View style={styles.emptyBox}>
      <ActivityIndicator size="large" color={color.primary} />
      <Text style={styles.loadingText}>Loading orders…</Text>
    </View>
  ) : h.error ? (
    <EmptyState icon={AlertCircle} title="Error loading orders" message={h.error} style={styles.emptyBox} />
  ) : (
    <EmptyState icon={Inbox} title="No orders found" message="Try changing the date range or search filters." style={styles.emptyBox} />
  );

  const options = (h.filterOptions[h.activeFilterCategory] || []).filter((o) => o.label.toLowerCase().includes(h.filterSearch.toLowerCase()));
  const isRadio = h.activeFilterCategory === 'Ratings';

  return (
    <View style={styles.page}>
      <PageHeader
        title="Order History"
        subtitle={`${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'} found`}
        onBack={h.goBack}
        right={<IconButton icon={HelpCircle} label="Help" variant="inverse" onPress={() => h.navigate('/food/restaurant/support')} />}
      />
      <FlatList
        data={h.loading || h.error ? [] : filteredOrders}
        keyExtractor={(order) => String(order.id)}
        renderItem={renderOrder}
        ListHeaderComponent={header}
        ListEmptyComponent={<View style={{ paddingHorizontal: space.lg }}>{body}</View>}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        contentContainerStyle={{ paddingBottom: space.xxxl + insets.bottom }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      />

      <Dialog visible={h.showDateRangePopup} onClose={() => h.setShowDateRangePopup(false)} backdrop={color.overlay} panelStyle={styles.rangePanel}>
        <View style={styles.dialogHead}>
          <Text style={styles.dialogTitle}>Select date range</Text>
          <IconButton icon={X} label="Close" onPress={() => h.setShowDateRangePopup(false)} />
        </View>
        <ScrollView contentContainerStyle={{ padding: space.md, gap: space.sm }}>
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
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                style={[styles.option, selected ? styles.optionOn : null]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {!option.custom ? <Text style={styles.optionDates}>{dates}</Text> : null}
                </View>
                {selected ? <CircleCheck size={20} color={color.primary} /> : null}
              </Press>
            );
          })}
        </ScrollView>
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
        <View style={{ alignItems: 'center', paddingTop: space.sm }}>
          <View style={styles.handle} />
        </View>
        <View style={styles.sheetHead}>
          <Text style={styles.dialogTitle}>Filters</Text>
          <IconButton icon={X} label="Close" onPress={() => h.setShowFilterPopup(false)} />
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
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
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
              <SearchBox value={h.filterSearch} onChangeText={h.setFilterSearch} placeholder="Search" accessibilityLabel="Search filters" />
            </View>
            <FlatList
              data={options}
              keyExtractor={(o) => o.id}
              contentContainerStyle={{ paddingHorizontal: space.md, paddingVertical: space.sm }}
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
                      <View style={[styles.radio, checked ? { borderColor: color.primary } : null]}>{checked ? <View style={styles.radioDot} /> : null}</View>
                    ) : (
                      <View style={[styles.check, checked ? { backgroundColor: color.primary, borderColor: color.primary } : null]}>
                        {checked ? <Check size={14} color={color.onPrimary} strokeWidth={3} /> : null}
                      </View>
                    )}
                    <Text style={styles.optText}>{option.label}</Text>
                  </Press>
                );
              }}
            />
          </View>
        </View>
        <View style={[styles.sheetFoot, { paddingBottom: space.lg + insets.bottom }]}>
          <Button title="Clear all" variant="outline" onPress={h.handleClearFilters} style={{ flex: 1 }} />
          <Button title={h.isApplyingFilters ? 'Applying…' : 'Apply'} onPress={h.handleApplyFilters} disabled={h.isApplyingFilters} loading={h.isApplyingFilters} style={{ flex: 1 }} />
        </View>
      </BottomSheet>

      {h.isApplyingFilters && !h.showFilterPopup ? (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={color.primary} />
          <Text style={styles.overlayText}>Applying filters…</Text>
        </View>
      ) : null}

      {h.showToast ? (
        <View style={[styles.toastWrap, { bottom: space.xxxl + insets.bottom }]} pointerEvents="none">
          <View style={styles.toast} accessibilityLiveRegion="polite">
            <CircleCheck size={20} color={color.goldOnDark} />
            <Text style={styles.toastText}>Order ID copied to clipboard</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  headerWrap: { padding: space.lg, gap: space.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  search: { height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md },
  searchInput: { flex: 1, minWidth: 0, height: 46, paddingVertical: 0, ...t.body, color: color.text },
  filterBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radii.md, backgroundColor: color.surface, borderColor: color.border },
  filterBtnActive: { backgroundColor: color.primary, borderColor: color.primary },
  filterCount: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: color.goldBright, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { ...t.caption, color: color.onGold },
  rangeBtn: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingHorizontal: space.md, paddingVertical: space.sm, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md },
  rangeIcon: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  rangeLabel: { ...t.bodyStrong, color: color.text, textTransform: 'capitalize' },
  rangeDates: { ...t.caption, color: color.textMuted },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.primarySoft, borderRadius: radii.md, paddingLeft: space.md },
  summaryText: { flex: 1, ...t.small, color: color.text },

  card: { marginHorizontal: space.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.lg, padding: space.lg, ...elevation.card },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm, marginBottom: space.sm },
  badges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginRight: -space.sm },
  orderId: { flex: 1, ...t.subheading, color: color.text },
  date: { ...t.caption, color: color.textMuted, marginBottom: space.sm },
  line: { ...t.small, color: color.text },
  customer: { ...t.small, color: color.textSecondary, marginTop: 2 },
  items: { gap: space.xs + 2, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: color.borderStrong },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm },
  itemName: { flex: 1, ...t.body, color: color.text },
  itemPrice: { ...t.body, color: color.textSecondary },
  more: { ...t.label, color: color.primary },
  totalRow: { marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { ...t.small, color: color.textSecondary },
  totalValue: { ...t.price, color: color.text },
  reasonBox: { marginTop: space.md, padding: space.md, borderRadius: radii.md, backgroundColor: color.dangerSoft },
  reason: { ...t.small, color: color.danger },

  emptyBox: { alignItems: 'center', gap: space.md, paddingVertical: space.xxxl + space.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.lg },
  loadingText: { ...t.body, color: color.textMuted },

  rangePanel: { width: '100%', maxWidth: 400, alignSelf: 'center', maxHeight: '80%', backgroundColor: color.surface, borderRadius: radii.xl, overflow: 'hidden', ...elevation.sheet },
  dialogHead: { paddingLeft: space.lg, paddingRight: space.xs, paddingVertical: space.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dialogTitle: { ...t.heading, color: color.text },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.lg, paddingVertical: space.sm },
  optionOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  optionLabel: { ...t.bodyStrong, color: color.text, textTransform: 'capitalize' },
  optionDates: { ...t.caption, color: color.textMuted },

  sheet: { width: '100%', height: '70%', backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, ...elevation.sheet },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.lg, paddingRight: space.xs, paddingVertical: space.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  sidebar: { width: 120, backgroundColor: color.surfaceMuted, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: color.border },
  cat: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.md, paddingVertical: space.sm, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  catOn: { backgroundColor: color.surface, borderLeftColor: color.primary },
  catText: { ...t.small, color: color.textSecondary },
  catTextOn: { color: color.primary, fontFamily: 'Poppins_600SemiBold' },
  optSearchWrap: { padding: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingHorizontal: space.xs },
  optText: { flex: 1, ...t.body, color: color.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  sheetFoot: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.surface },

  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(253,251,247,0.85)', alignItems: 'center', justifyContent: 'center', gap: space.md, zIndex: 50 },
  overlayText: { ...t.bodyStrong, color: color.text },
  toastWrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radii.md, backgroundColor: color.primaryDeep, ...elevation.float },
  toastText: { ...t.bodyStrong, color: color.textInverse },
});
