import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ChevronDown, HelpCircle, MessageSquareWarning, Search, SlidersHorizontal, Star } from 'lucide-react-native';
import { Button, Card, Chip, EmptyState, IconButton, SegmentedControl, StatusBadge } from '../../components/ds';
import { BottomSheet } from '../../components/kit';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { color, radii, space, type } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import DateRangeDialog from '../components/DateRangeDialog';
import { useFeedback } from '../hooks/pages/useFeedback';
import { sentenceCase } from './finance/financeUi';
import { Input, Notice, ScreenHeader, SheetPanel } from './inventory/partnerKit';

const RANGES = ['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'last5days', 'custom'];
const ISSUE_TYPES = ['Missing Item', 'Wrong Item', 'Quality Issue', 'Delivery Delay', 'Other'];
const rangeLabel = (range) => (range === 'last5days' ? 'Last 5 Days' : range.replace(/([A-Z])/g, ' $1').trim());
/** Display-only: "thisWeek" -> "This week", "last5days" -> "Last 5 days". */
const rangeText = (range) => sentenceCase(rangeLabel(String(range || '')));

/** Port of Food/pages/restaurant/Feedback.jsx (/food/restaurant/feedback): complaints and reviews. */
export default function Feedback() {
  const insets = useSafeAreaInsets();
  const h = useFeedback();
  const {
    activeTab, setActiveTab, navigate, location, goBack, showBack, tabs, complaints, isComplaintsLoading, displayedReviews, restaurantData, setIsFilterOpen,
    isComplaintsFilterOpen, setIsComplaintsFilterOpen, complaintsFilterValues, setComplaintsFilterValues, isDateSelectorOpen, setIsDateSelectorOpen, selectedDateRange,
    customDateRange, setCustomDateRange, isCustomDateOpen, setIsCustomDateOpen, handleComplaintsFilterApply, handleComplaintsFilterReset, handleDateRangeSelect, handleCustomDateApply,
    handleTouchStart, handleTouchMove, handleTouchEnd,
  } = h;
  const touch = (e) => ({ touches: [{ clientX: e.nativeEvent.pageX, clientY: e.nativeEvent.pageY }] });
  const isComplaints = activeTab === 'complaints';

  const renderComplaint = ({ item: complaint }) => {
    const open = complaint.status === 'open';
    return (
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <StatusBadge label={sentenceCase(complaint.status || 'open')} tone={open ? 'warning' : 'success'} />
          <Text style={styles.caption}>{new Date(complaint.createdAt).toLocaleDateString()}</Text>
        </View>
        <View style={styles.person}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{complaint.userId?.name?.[0] || 'U'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{complaint.userId?.name || 'Customer'}</Text>
            <Text style={styles.caption}>Order #{complaint.orderId?.orderId || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.quote}>
          {complaint.issueType ? <Text style={styles.quoteLabel}>{complaint.issueType}</Text> : null}
          <Text style={styles.quoteText}>{complaint.description}</Text>
        </View>
        {complaint.adminResponse ? (
          <Notice tone="info" title="Admin response">
            {complaint.adminResponse}
          </Notice>
        ) : null}
      </Card>
    );
  };

  const renderReview = ({ item: review }) => (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.caption}>Order #{review.orderNumber}</Text>
        <Text style={styles.caption}>{review.date}</Text>
      </View>
      <View style={styles.person}>
        <Img source={{ uri: review.userImage }} style={styles.avatar} />
        <Text style={[styles.name, { flex: 1, minWidth: 0 }]} numberOfLines={1}>{review.userName}</Text>
        <StatusBadge label={String(review.rating)} tone="gold" icon={Star} />
      </View>
      <View style={styles.quote}>
        <Text style={[styles.quoteText, { fontStyle: 'italic' }]}>&quot;{review.reviewText}&quot;</Text>
      </View>
    </Card>
  );

  const header = isComplaints ? (
    <View style={styles.filters}>
      <Press scale={0.99} onPress={() => setIsDateSelectorOpen(true)} accessibilityLabel={`Select date range, ${rangeText(selectedDateRange)}`} style={styles.rangeBtn}>
        <Calendar size={18} color={color.primary} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rangeValue} numberOfLines={1}>{rangeText(selectedDateRange)}</Text>
          <Text style={styles.caption}>Select date range</Text>
        </View>
        <ChevronDown size={18} color={color.textMuted} />
      </Press>
      <IconButton icon={SlidersHorizontal} label="Filters" variant="soft" size={48} onPress={() => setIsComplaintsFilterOpen(true)} style={styles.filterBtn} />
    </View>
  ) : (
    <View style={styles.filters}>
      {/* As on the web, this box is not wired to the list. */}
      <Input placeholder="Search reviews" accessibilityLabel="Search reviews" left={<Search size={18} color={color.textMuted} />} style={{ flex: 1 }} />
      <IconButton icon={SlidersHorizontal} label="Filters" variant="soft" size={48} onPress={() => setIsFilterOpen(true)} style={styles.filterBtn} />
    </View>
  );

  const empty = isComplaints ? (
    isComplaintsLoading ? (
      <ActivityIndicator size="small" color={color.primary} style={{ padding: 40 }} />
    ) : (
      <Card padded={false}>
        <EmptyState icon={MessageSquareWarning} title="No complaints found" />
      </Card>
    )
  ) : null;

  return (
    <View style={styles.page}>
      <ScreenHeader
        title="Feedback"
        subtitle={`Showing data for ${restaurantData?.name || 'Restaurant'}`}
        showBack={Boolean(showBack)}
        onBack={showBack ? goBack : undefined}
        right={<IconButton icon={HelpCircle} label="Open support" variant="inverse" onPress={() => navigate('/food/restaurant/help-centre/support', { state: { from: location.pathname } })} />}
      />

      <View style={styles.tabs}>
        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={tabs.map((tab) => ({ value: tab.id, label: tab.label, count: tab.id === 'complaints' && complaints.length > 0 && activeTab !== tab.id ? complaints.length : undefined }))}
        />
      </View>

      <FlatList
        data={isComplaints ? (isComplaintsLoading ? [] : complaints) : displayedReviews}
        keyExtractor={(item, index) => String((isComplaints ? item._id : item.id) ?? index)}
        renderItem={isComplaints ? renderComplaint : renderReview}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl + BOTTOM_NAV_HEIGHT + insets.bottom }}
        onTouchStart={(e) => handleTouchStart(touch(e))}
        onTouchMove={(e) => handleTouchMove(touch(e))}
        onTouchEnd={handleTouchEnd}
      />

      <BottomSheet visible={isDateSelectorOpen && !isCustomDateOpen} onClose={() => setIsDateSelectorOpen(false)} backdrop={color.overlay}>
        <SheetPanel title="Select date range" onClose={() => setIsDateSelectorOpen(false)}>
          <View style={[styles.rangeGrid, { paddingBottom: space.lg + insets.bottom }]}>
            {RANGES.map((range) => {
              const on = selectedDateRange === range;
              return (
                <Press
                  key={range}
                  scale={0.98}
                  onPress={() => handleDateRangeSelect(range)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={rangeText(range)}
                  style={[styles.rangeOpt, on ? styles.rangeOptOn : null]}
                >
                  <Text style={[styles.rangeOptText, { color: on ? color.onPrimary : color.text }]}>{rangeText(range)}</Text>
                </Press>
              );
            })}
          </View>
        </SheetPanel>
      </BottomSheet>

      <DateRangeDialog
        visible={isCustomDateOpen}
        onClose={() => setIsCustomDateOpen(false)}
        startDate={customDateRange.start}
        endDate={customDateRange.end}
        onDateRangeChange={(start, end) => setCustomDateRange({ start, end })}
        onApply={handleCustomDateApply}
      />

      <BottomSheet visible={isComplaintsFilterOpen} onClose={() => setIsComplaintsFilterOpen(false)} backdrop={color.overlay} spring={{ stiffness: 200, damping: 25 }}>
        <SheetPanel title="Filters" onClose={() => setIsComplaintsFilterOpen(false)}>
          <View style={{ padding: space.lg, paddingBottom: space.lg + insets.bottom, gap: space.lg }}>
            <Text style={styles.overline}>Issue type</Text>
            <View style={styles.chips}>
              {ISSUE_TYPES.map((issue) => {
                const on = complaintsFilterValues.issueType?.includes(issue);
                return (
                  <Chip
                    key={issue}
                    label={sentenceCase(issue)}
                    selected={Boolean(on)}
                    onPress={() => setComplaintsFilterValues({ ...complaintsFilterValues, issueType: (complaintsFilterValues.issueType || []).includes(issue) ? [] : [issue] })}
                    style={{ height: 44 }}
                  />
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Button title="Reset" variant="outline" size="lg" onPress={handleComplaintsFilterReset} style={{ flex: 1 }} />
              <Button title="Apply filters" size="lg" onPress={handleComplaintsFilterApply} style={{ flex: 2 }} />
            </View>
          </View>
        </SheetPanel>
      </BottomSheet>

      <BottomNavOrders />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  tabs: { paddingHorizontal: space.lg, paddingTop: space.md },
  filters: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg },
  filterBtn: { borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  rangeBtn: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  rangeValue: { ...type.label, color: color.text },
  caption: { ...type.caption, color: color.textMuted },
  overline: { ...type.overline, color: color.goldText },
  card: { gap: space.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...type.subheading, color: color.primary },
  name: { ...type.bodyStrong, color: color.text },
  quote: { backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: space.md, gap: space.xs },
  quoteLabel: { ...type.label, color: color.primary },
  quoteText: { ...type.body, color: color.text },
  rangeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: space.lg },
  rangeOpt: { width: '48.5%', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.sm },
  rangeOptOn: { backgroundColor: color.primary, borderColor: color.primary },
  rangeOptText: { ...type.label, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
