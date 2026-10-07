import { useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, SlidersHorizontal, Utensils, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import RestaurantNavbar from '../components/RestaurantNavbar';
import { useInventory } from '../hooks/pages/useInventory';
import { RT, RT_GRADIENT } from '../theme';
import AddonsPanel from './inventory/AddonsPanel';
import CategoryCard from './inventory/CategoryCard';
import { FilterSheet, ToggleSheet } from './inventory/Popups';
import SimpleCalendar from './inventory/SimpleCalendar';
import TimePickerWheel from './inventory/TimePickerWheel';

const GRADIENT_PROPS = { colors: RT_GRADIENT, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
const PAGE_BG = '#f3f5f8';
const FIELD_BORDER = '#e7d5e0';

/** The tab pill: gradient when active, white card otherwise, with an item-count badge. */
function TabButton({ label, count, active, onPress }) {
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 28 }}>
      <Text style={{ fontSize: 14, lineHeight: 20, color: active ? '#fff' : '#6d6470', ...poppins(600) }}>{label}</Text>
      <View style={[styles.badge, { backgroundColor: active ? '#fff' : '#f6ecf3' }]}>
        <Text style={{ fontSize: 12, lineHeight: 16, color: active ? RT.primary : '#6d6470', ...poppins(600) }}>{count}</Text>
      </View>
    </View>
  );
  return (
    <Press scale={1} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[{ flex: 1, transform: [{ scale: active ? 1.02 : 1 }] }, active ? shadow('lg') : null]}>
      {active ? (
        <LinearGradient {...GRADIENT_PROPS} style={[styles.tab, { borderColor: RT.primary }]}>{inner}</LinearGradient>
      ) : (
        <View style={[styles.tab, { borderColor: RT.border, backgroundColor: 'rgba(255,255,255,0.9)' }]}>{inner}</View>
      )}
    </Press>
  );
}

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
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <RestaurantNavbar showSearch={false} showOfflineOnlineTag={false} showNotifications={false} />

      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', gap: 12 }}>
        <TabButton label="All items" count={totalItems} active={activeTab === 'all-items'} onPress={() => setActiveTab('all-items')} />
        <TabButton label="Add ons" count={addons.length} active={isAddons} onPress={() => setActiveTab('add-ons')} />
      </View>

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: 128 + BOTTOM_NAV_HEIGHT + insets.bottom }}
        onTouchStart={touch(handleTouchStart)}
        onTouchMove={touch(handleTouchMove)}
        onTouchEnd={handleTouchEnd}
      >
        <View style={{ backgroundColor: 'rgba(243,245,248,0.95)', paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={styles.tools}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.slate950, ...poppins(600) }}>{isAddons ? 'Search and review add-ons' : 'Search and manage menu inventory'}</Text>
                <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.slate500, ...poppins(400) }}>
                  {isAddons
                    ? `${filteredAddons.length} add-on${filteredAddons.length !== 1 ? 's' : ''} in this view`
                    : `${listToRender.length} categor${listToRender.length !== 1 ? 'ies' : 'y'} and ${activeFilterCount} item${activeFilterCount !== 1 ? 's' : ''} in focus`}
                </Text>
              </View>
              {hasActiveTools ? (
                <Press
                  scale={1}
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedFilter('all');
                  }}
                  style={{ borderRadius: 999, borderWidth: 1, borderColor: '#e7d5e0', paddingHorizontal: 12, paddingVertical: 6 }}
                >
                  <Text style={{ fontSize: 12, lineHeight: 16, color: '#6b4d62', ...poppins(600) }}>Clear all</Text>
                </Press>
              ) : null}
            </View>

            <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexGrow: 1, flexBasis: 220, minWidth: 220 }}>
                <View style={{ position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 }} pointerEvents="none">
                  <Search size={16} color={tw.slate400} />
                </View>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={isAddons ? 'Search add-ons by name or status' : 'Search categories or menu items'}
                  placeholderTextColor={tw.slate400}
                  accessibilityLabel="Search"
                  style={styles.search}
                />
                {searchQuery ? (
                  <Press onPress={() => setSearchQuery('')} accessibilityLabel="Clear search" style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
                    <X size={16} color={tw.slate400} />
                  </Press>
                ) : null}
              </View>
              <Press scale={1} onPress={() => setFilterOpen(true)} accessibilityLabel="Filters" style={styles.filterBtn}>
                <SlidersHorizontal size={16} color={RT.primary} />
                <Text style={{ fontSize: 14, lineHeight: 20, color: RT.primaryStrong, ...poppins(600) }}>Filters</Text>
                {selectedFilter !== 'all' ? (
                  <LinearGradient {...GRADIENT_PROPS} style={styles.dot} />
                ) : null}
              </Press>
              {isAddons ? (
                <Press scale={1} onPress={() => setIsAddAddonOpen((v) => !v)} style={[{ minWidth: 128, borderRadius: 20, overflow: 'hidden' }, shadow('lg')]}>
                  <LinearGradient {...GRADIENT_PROPS} style={{ height: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) }}>{isAddAddonOpen ? 'Close' : 'Add Add-on'}</Text>
                  </LinearGradient>
                </Press>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginTop: 16 }}>
              {activeFilterOptions.map((option) => {
                const count = isAddons ? addonFilterCounts[option.value] || 0 : menuFilterCounts[option.value] || 0;
                const active = selectedFilter === option.value;
                const body = (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 12, lineHeight: 16, color: active ? '#fff' : '#6d6470', ...poppins(600) }}>{option.label}</Text>
                    <View style={[styles.chipCount, { backgroundColor: active ? 'rgba(255,255,255,0.2)' : '#fff' }]}>
                      <Text style={{ fontSize: 11, lineHeight: 16, color: active ? '#fff' : '#8a7a89', ...poppins(400) }}>{count}</Text>
                    </View>
                  </View>
                );
                return (
                  <Press key={option.value} scale={1} onPress={() => setSelectedFilter(option.value)} accessibilityState={{ selected: active }}>
                    {active ? (
                      <LinearGradient {...GRADIENT_PROPS} style={[styles.chip, { borderColor: RT.primary }]}>{body}</LinearGradient>
                    ) : (
                      <View style={[styles.chip, { borderColor: FIELD_BORDER, backgroundColor: '#fcf7fb' }]}>{body}</View>
                    )}
                  </Press>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ gap: 16, marginBottom: 24 }} onLayout={(e) => { listY.current = e.nativeEvent.layout.y; }}>
            {isAddons ? (
              <AddonsPanel
                isAddAddonOpen={isAddAddonOpen} addonName={addonName} setAddonName={setAddonName} addonDescription={addonDescription} setAddonDescription={setAddonDescription}
                addonPrice={addonPrice} setAddonPrice={setAddonPrice} addonImageFile={addonImageFile} addonImagePreview={addonImagePreview} savingAddon={savingAddon}
                handleAddonImagePick={handleAddonImagePick} handleSaveAddon={handleSaveAddon} resetAddonForm={resetAddonForm} setIsAddAddonOpen={setIsAddAddonOpen}
                loadingAddons={loadingAddons} filteredAddons={filteredAddons} hasActiveTools={hasActiveTools} handleAddonToggle={handleAddonToggle}
              />
            ) : null}

            {!isAddons && !loadingInventory && listToRender.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 18, lineHeight: 28, color: tw.slate700, textAlign: 'center', ...poppins(600) }}>{hasActiveTools ? 'No matching categories or items found' : 'No menu categories available'}</Text>
                <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: tw.slate500, textAlign: 'center', ...poppins(400) }}>
                  {hasActiveTools ? 'Try adjusting your search or filters.' : 'Your menu categories will appear here once items are added.'}
                </Text>
              </View>
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
                    <ActivityIndicator size="small" color={tw.slate400} />
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
          {isMenuOpen ? <Press scale={1} onPress={() => setIsMenuOpen(false)} accessibilityLabel="Close menu" style={StyleSheet.absoluteFill} /> : null}
          {isMenuOpen ? (
            <View style={[styles.menu, { width: Math.min(winW * 0.6, 384), height: winH * 0.45 }]}>
              <LinearGradient colors={['#fcf4f9', '#f6e8f1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: RT.primaryStrong, ...poppins(600) }}>Jump to category</Text>
              </LinearGradient>
              <View style={{ marginHorizontal: 16, height: 1, backgroundColor: tw.slate200 }} />
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                {categories.map((category, index) => {
                  const itemCount = category.itemCount || category.items?.length || 0;
                  const isLast = index === categories.length - 1;
                  return (
                    <Press
                      key={category.id}
                      scale={1}
                      onPress={() => {
                        setIsMenuOpen(false);
                        setTimeout(() => scrollToCategory(category.id), 200);
                      }}
                      style={{ paddingVertical: 12 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(500) }}>{category.name}</Text>
                        <View style={styles.menuCount}>
                          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.slate700, ...poppins(600) }}>{itemCount}</Text>
                        </View>
                      </View>
                      {!isLast ? <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: tw.slate200, borderStyle: 'dashed' }} /> : null}
                    </Press>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
          <View pointerEvents="box-none" style={[styles.fab, { bottom: 96 + insets.bottom }]}>
            <Press scale={0.96} onPress={() => navigate('/food/restaurant/hub-menu/item/new', { state: { backTo: '/food/restaurant/inventory' } })} style={[{ borderRadius: 999, overflow: 'hidden' }, shadow('xl')]}>
              <LinearGradient {...GRADIENT_PROPS} style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) }}>+ Add item</Text>
              </LinearGradient>
            </Press>
            <Press scale={0.96} onPress={() => setIsMenuOpen((prev) => !prev)} style={styles.menuBtn}>
              <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>{isMenuOpen ? <X size={16} color={RT.primaryStrong} /> : <Utensils size={16} color={RT.primary} />}</View>
              <Text style={{ fontSize: 14, lineHeight: 20, color: RT.primaryStrong, ...poppins(600) }}>{isMenuOpen ? 'Close' : 'Menu'}</Text>
            </Press>
          </View>
        </>
      ) : null}

      <BottomNavOrders />
    </View>
  );
}

const styles = StyleSheet.create({
  tab: { borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, overflow: 'hidden' },
  badge: { minHeight: 20, minWidth: 24, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignItems: 'center', justifyContent: 'center' },
  tools: { overflow: 'hidden', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', padding: 16, ...shadow('xl') },
  search: { height: 48, borderRadius: 20, borderWidth: 1, borderColor: FIELD_BORDER, backgroundColor: '#fcf7fb', paddingLeft: 44, paddingRight: 40, fontSize: 14, color: tw.slate900, ...poppins(400) },
  filterBtn: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 20, borderWidth: 1, borderColor: FIELD_BORDER, backgroundColor: '#fff', paddingHorizontal: 16 },
  dot: { position: 'absolute', right: 6, top: 6, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff', overflow: 'hidden' },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden' },
  chipCount: { minWidth: 20, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center', justifyContent: 'center' },
  empty: { borderRadius: 28, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.slate200, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 24, paddingVertical: 64 },
  overlay: { borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 16, alignItems: 'flex-end', gap: 8 },
  menuBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: RT.border, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 12, ...shadow('lg') },
  menu: { position: 'absolute', right: 16, bottom: 144, overflow: 'hidden', borderRadius: 28, borderWidth: 1, borderColor: RT.border, backgroundColor: '#fff', ...shadow('xl') },
  menuCount: { minWidth: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
});
