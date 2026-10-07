import { useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Search, SlidersHorizontal, Utensils, X } from 'lucide-react-native';
import { Button, Chip, EmptyState, SegmentedControl } from '../../components/ds';
import { Press } from '../../components/ui';
import { alpha, color, elevation, radii, space, type } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import RestaurantNavbar from '../components/RestaurantNavbar';
import { useInventory } from '../hooks/pages/useInventory';
import AddonsPanel from './inventory/AddonsPanel';
import CategoryCard from './inventory/CategoryCard';
import { FilterSheet, ToggleSheet } from './inventory/Popups';
import SimpleCalendar from './inventory/SimpleCalendar';
import TimePickerWheel from './inventory/TimePickerWheel';
import { Input } from './inventory/partnerKit';

/** Port of Food/pages/restaurant/Inventory.jsx (/food/restaurant/inventory). */
export default function Inventory() {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const inv = useInventory();
  const {
    navigate, activeTab, setActiveTab, searchQuery, setSearchQuery, setFilterOpen, selectedFilter, setSelectedFilter, isLoading, loadingInventory, categories, expandedCategories, isMenuOpen, setIsMenuOpen,
    addons, filterOpen, activeFilterOptions, addonFilterCounts, menuFilterCounts, totalItems, filteredAddons, listToRender, activeFilterCount, hasActiveTools, getOutOfStockCount,
    handleFilterApply, handleFilterClear, handleToggleChange, toggleCategory, handleEditItem, getApprovalDisplayMeta, getRuleStatusLabel, handleTouchStart, handleTouchMove, handleTouchEnd,
    togglePopupOpen, toggleTarget, setTogglePopupOpen, getCategoryData, selectedOption, setSelectedOption, hours, setHours, selectedDate, setSelectedDate, selectedTime, showCalendar, setShowCalendar,
    showTimePicker, setShowTimePicker, formatDate, formatTime, isConfirming, handleToggleConfirm, handleTimePickerConfirm,
    isAddAddonOpen, setIsAddAddonOpen, addonName, setAddonName, addonDescription, setAddonDescription, addonPrice, setAddonPrice, addonImageFile, addonImagePreview, savingAddon,
    handleAddonImagePick, handleSaveAddon, resetAddonForm, loadingAddons, handleAddonToggle,
  } = inv;

  const scrollRef = useRef(null);
  const listY = useRef(0);
  const cardY = useRef({});
  // The web scrolls the page to the card (scrollToCategory); here the ScrollView does.
  const scrollToCategory = (categoryId) => {
    const y = cardY.current[categoryId];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, listY.current + y - 100), animated: true });
  };
  const touch = (fn) => (e) => {
    const t = e.nativeEvent;
    fn({ target: e.target, touches: [{ clientX: t.pageX, clientY: t.pageY }] });
  };
  const isAddons = activeTab === 'add-ons';

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <RestaurantNavbar showSearch={false} showOfflineOnlineTag={false} showNotifications={false} />

      <View style={styles.tabs}>
        <SegmentedControl
          options={[
            { value: 'all-items', label: 'All items', count: totalItems },
            { value: 'add-ons', label: 'Add-ons', count: addons.length },
          ]}
          value={isAddons ? 'add-ons' : 'all-items'}
          onChange={setActiveTab}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: space.xxxl * 3 + BOTTOM_NAV_HEIGHT + insets.bottom }}
        onTouchStart={touch(handleTouchStart)}
        onTouchMove={touch(handleTouchMove)}
        onTouchEnd={handleTouchEnd}
      >
        <View style={styles.tools}>
          <View style={styles.toolsRow}>
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={isAddons ? 'Search add-ons' : 'Search categories or items'}
              accessibilityLabel="Search"
              style={{ flex: 1 }}
              left={<Search size={18} color={color.textMuted} />}
              right={
                searchQuery ? (
                  <Press onPress={() => setSearchQuery('')} accessibilityLabel="Clear search" style={styles.clearBtn}>
                    <X size={18} color={color.textMuted} />
                  </Press>
                ) : null
              }
            />
            <Press scale={0.97} onPress={() => setFilterOpen(true)} accessibilityLabel={selectedFilter !== 'all' ? 'Filters, active' : 'Filters'} style={styles.filterBtn}>
              <SlidersHorizontal size={18} color={color.primary} />
              <Text style={[type.label, { color: color.primary }]}>Filters</Text>
              {selectedFilter !== 'all' ? <View style={styles.dot} /> : null}
            </Press>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
            {activeFilterOptions.map((option) => {
              const count = isAddons ? addonFilterCounts[option.value] || 0 : menuFilterCounts[option.value] || 0;
              return <Chip key={option.value} label={option.label} count={count} selected={selectedFilter === option.value} onPress={() => setSelectedFilter(option.value)} />;
            })}
          </ScrollView>
        </View>

        <View style={{ paddingHorizontal: space.lg }}>
          <View style={{ gap: space.md }} onLayout={(e) => { listY.current = e.nativeEvent.layout.y; }}>
            <View style={styles.summary}>
              <Text style={[type.caption, { color: color.textMuted, flex: 1 }]} numberOfLines={1}>
                {isAddons
                  ? `${filteredAddons.length} add-on${filteredAddons.length !== 1 ? 's' : ''} in this view`
                  : `${listToRender.length} categor${listToRender.length !== 1 ? 'ies' : 'y'} · ${activeFilterCount} item${activeFilterCount !== 1 ? 's' : ''} in view`}
              </Text>
              {hasActiveTools ? (
                <Press
                  scale={1}
                  hitSlop={12}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFilter('all');
                  }}
                  accessibilityLabel="Clear search and filters"
                >
                  <Text style={[type.label, { color: color.primary }]}>Clear all</Text>
                </Press>
              ) : null}
            </View>

            {isAddons ? (
              <Button
                title={isAddAddonOpen ? 'Close form' : 'Add add-on'}
                icon={isAddAddonOpen ? X : Plus}
                variant={isAddAddonOpen ? 'outline' : 'secondary'}
                onPress={() => setIsAddAddonOpen((v) => !v)}
              />
            ) : null}
            {isAddons ? (
              <AddonsPanel
                isAddAddonOpen={isAddAddonOpen} addonName={addonName} setAddonName={setAddonName} addonDescription={addonDescription} setAddonDescription={setAddonDescription}
                addonPrice={addonPrice} setAddonPrice={setAddonPrice} addonImageFile={addonImageFile} addonImagePreview={addonImagePreview} savingAddon={savingAddon}
                handleAddonImagePick={handleAddonImagePick} handleSaveAddon={handleSaveAddon} resetAddonForm={resetAddonForm} setIsAddAddonOpen={setIsAddAddonOpen}
                loadingAddons={loadingAddons} filteredAddons={filteredAddons} hasActiveTools={hasActiveTools} handleAddonToggle={handleAddonToggle}
              />
            ) : null}

            {!isAddons && !loadingInventory && listToRender.length === 0 ? (
              <EmptyState
                icon={Utensils}
                title={hasActiveTools ? 'No matching categories or items' : 'No menu categories yet'}
                message={hasActiveTools ? 'Try a different search or filter.' : 'Your menu categories will appear here once items are added.'}
              />
            ) : null}

            {listToRender.map((category) => (
              <View key={category.id} onLayout={(e) => { cardY.current[category.id] = e.nativeEvent.layout.y; }}>
                <CategoryCard
                  category={category}
                  isExpanded={expandedCategories.includes(category.id)}
                  isLoading={isLoading}
                  toggleCategory={toggleCategory}
                  handleToggleChange={handleToggleChange}
                  getOutOfStockCount={getOutOfStockCount}
                  getApprovalDisplayMeta={getApprovalDisplayMeta}
                  getRuleStatusLabel={getRuleStatusLabel}
                  handleEditItem={handleEditItem}
                />
                {isLoading ? (
                  <View style={[StyleSheet.absoluteFill, styles.overlay]}>
                    <ActivityIndicator size="small" color={color.primary} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <FilterSheet
        filterOpen={filterOpen} setFilterOpen={setFilterOpen} activeTab={activeTab} selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter}
        activeFilterOptions={activeFilterOptions} addonFilterCounts={addonFilterCounts} menuFilterCounts={menuFilterCounts} handleFilterClear={handleFilterClear} handleFilterApply={handleFilterApply}
      />
      <ToggleSheet
        togglePopupOpen={togglePopupOpen} toggleTarget={toggleTarget} setTogglePopupOpen={setTogglePopupOpen} getCategoryData={getCategoryData} selectedOption={selectedOption}
        setSelectedOption={setSelectedOption} hours={hours} setHours={setHours} selectedDate={selectedDate} selectedTime={selectedTime} setShowCalendar={setShowCalendar}
        setShowTimePicker={setShowTimePicker} formatDate={formatDate} formatTime={formatTime} isConfirming={isConfirming} handleToggleConfirm={handleToggleConfirm}
      />
      <SimpleCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} isOpen={showCalendar} onClose={() => setShowCalendar(false)} />
      <TimePickerWheel isOpen={showTimePicker} onClose={() => setShowTimePicker(false)} initialHour={selectedTime.hour} initialMinute={selectedTime.minute} initialPeriod={selectedTime.period} onConfirm={handleTimePickerConfirm} />

      {!isAddons ? (
        <>
          {isMenuOpen ? <Press scale={1} onPress={() => setIsMenuOpen(false)} accessibilityLabel="Close menu" style={[StyleSheet.absoluteFill, { backgroundColor: color.overlay }]} /> : null}
          {isMenuOpen ? (
            <View style={[styles.menu, { width: Math.min(winW - space.lg * 2, 340), maxHeight: winH * 0.5, bottom: BOTTOM_NAV_HEIGHT + insets.bottom + 144 }]}>
              <View style={styles.menuHead}>
                <Text style={[type.subheading, { color: color.text }]} accessibilityRole="header">Jump to category</Text>
                <Text style={[type.caption, { color: color.textMuted }]}>{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</Text>
              </View>
              <ScrollView contentContainerStyle={{ paddingVertical: space.xs }}>
                {categories.map((category, index) => {
                  const itemCount = category.itemCount || category.items?.length || 0;
                  return (
                    <Press
                      key={category.id}
                      scale={1}
                      onPress={() => {
                        setIsMenuOpen(false);
                        setTimeout(() => scrollToCategory(category.id), 200);
                      }}
                      accessibilityLabel={`${category.name}, ${itemCount} items`}
                      style={[styles.menuRow, index < categories.length - 1 && styles.menuDivider]}
                    >
                      <Text style={[type.body, { flex: 1, minWidth: 0, color: color.text }]} numberOfLines={1}>{category.name}</Text>
                      <View style={styles.menuCount}>
                        <Text style={[type.caption, { color: color.textSecondary }]}>{itemCount}</Text>
                      </View>
                    </Press>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
          <View pointerEvents="box-none" style={[styles.fab, { bottom: BOTTOM_NAV_HEIGHT + space.lg + insets.bottom }]}>
            <Button
              title={isMenuOpen ? 'Close' : 'Menu'}
              icon={isMenuOpen ? X : Utensils}
              variant="outline"
              fullWidth={false}
              onPress={() => setIsMenuOpen((prev) => !prev)}
              style={[styles.fabBtn, elevation.float]}
            />
            <Button
              title="Add item"
              icon={Plus}
              fullWidth={false}
              onPress={() => navigate('/food/restaurant/hub-menu/item/new', { state: { backTo: '/food/restaurant/inventory' } })}
              style={[styles.fabBtn, elevation.float]}
            />
          </View>
        </>
      ) : null}

      <BottomNavOrders />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, backgroundColor: color.bg },
  tools: { backgroundColor: color.bg, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md, gap: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, marginBottom: space.md },
  toolsRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  clearBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: -space.xs },
  filterBtn: { height: 48, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  dot: { position: 'absolute', right: 6, top: 6, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: color.surface, backgroundColor: color.gold },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 20 },
  overlay: { borderRadius: radii.lg, backgroundColor: alpha(color.bg, 0.7), alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fabBtn: { borderRadius: radii.pill },
  menu: { position: 'absolute', right: space.lg, overflow: 'hidden', borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, ...elevation.sheet },
  menuHead: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, gap: 2 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingHorizontal: space.lg },
  menuDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  menuCount: { minWidth: 28, height: 24, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
});
