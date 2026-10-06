import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Calendar, HelpCircle, Search, SlidersHorizontal, Star, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import DateRangeDialog from '../components/DateRangeDialog';
import { useFeedback } from '../hooks/pages/useFeedback';
import { RT, RT_GRADIENT } from '../theme';

const RANGES = ['today', 'yesterday', 'thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'last5days', 'custom'];
const ISSUE_TYPES = ['Missing Item', 'Wrong Item', 'Quality Issue', 'Delivery Delay', 'Other'];
const rangeLabel = (range) => (range === 'last5days' ? 'Last 5 Days' : range.replace(/([A-Z])/g, ' $1').trim());

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

  return (
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            {showBack ? (
              <Press onPress={goBack} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 6 }}>
                <ArrowLeft size={20} color={tw.gray900} />
              </Press>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>SHOWING DATA FOR</Text>
              <Text style={styles.name} numberOfLines={1}>{restaurantData?.name || 'Restaurant'}</Text>
            </View>
          </View>
          <Press onPress={() => navigate('/food/restaurant/help-centre/support', { state: { from: location.pathname } })} accessibilityLabel="Open support" hitSlop={8} style={{ padding: 4 }}>
            <HelpCircle size={24} color={tw.gray700} />
          </Press>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {tabs.map((tab) => {
            const on = activeTab === tab.id;
            return (
              <Press key={tab.id} onPress={() => setActiveTab(tab.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <LinearGradient colors={on ? RT_GRADIENT : ['#fff', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tab, on ? null : { borderWidth: 1, borderColor: tw.gray200 }]}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: on ? '#fff' : tw.gray600, ...poppins(700) }}>{tab.label}</Text>
                </LinearGradient>
                {tab.id === 'complaints' && complaints.length > 0 && !on ? <View style={styles.tabDot} /> : null}
              </Press>
            );
          })}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 80 + BOTTOM_NAV_HEIGHT, gap: 16 }}
        onTouchStart={(e) => handleTouchStart(touch(e))}
        onTouchMove={(e) => handleTouchMove(touch(e))}
        onTouchEnd={handleTouchEnd}
      >
        {activeTab === 'complaints' ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Press scale={0.99} onPress={() => setIsDateSelectorOpen(true)} style={[styles.box, { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View>
                  <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) }}>{selectedDateRange}</Text>
                  <Text style={{ fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(400) }}>Select date range</Text>
                </View>
                <Calendar size={16} color={tw.gray400} />
              </Press>
              <Press onPress={() => setIsComplaintsFilterOpen(true)} accessibilityLabel="Filters" style={styles.box}>
                <SlidersHorizontal size={16} color={tw.gray900} />
              </Press>
            </View>

            {isComplaintsLoading ? (
              <ActivityIndicator size="small" color={tw.gray400} style={{ padding: 40 }} />
            ) : complaints.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(500) }}>No complaints found</Text>
              </View>
            ) : (
              complaints.map((complaint) => {
                const open = complaint.status === 'open';
                return (
                  <View key={complaint._id} style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      {/* orange-* utilities are repainted by the restaurant theme */}
                      <Text style={[styles.status, open ? { backgroundColor: tw.orange100, color: RT.accent } : { backgroundColor: tw.green100, color: tw.green600 }]}>{String(complaint.status || 'open').toUpperCase()}</Text>
                      <Text style={{ fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(700) }}>{new Date(complaint.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={styles.avatar}>
                        <Text style={{ fontSize: 16, color: tw.gray400, ...poppins(700) }}>{complaint.userId?.name?.[0] || 'U'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) }}>{complaint.userId?.name || 'Customer'}</Text>
                        <Text style={{ fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(700) }}>ORDER #{complaint.orderId?.orderId || 'N/A'}</Text>
                      </View>
                    </View>
                    <View style={styles.quote}>
                      <Text style={styles.quoteLabel}>{String(complaint.issueType || '').toUpperCase()}</Text>
                      <Text style={{ fontSize: 14, lineHeight: 23, color: tw.gray800, ...poppins(600) }}>{complaint.description}</Text>
                    </View>
                    {complaint.adminResponse ? (
                      <View style={[styles.quote, { backgroundColor: tw.blue50, borderWidth: 1, borderColor: tw.blue100 }]}>
                        <Text style={[styles.quoteLabel, { fontSize: 9 }]}>ADMIN RESPONSE</Text>
                        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.blue900, ...poppins(500) }}>{complaint.adminResponse}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* As on the web, this box is not wired to the list. */}
              <View style={[styles.box, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 0 }]}>
                <Search size={16} color={tw.gray400} />
                <TextInput placeholder="Search reviews" placeholderTextColor={tw.gray400} accessibilityLabel="Search reviews" style={styles.searchInput} />
              </View>
              <Press onPress={() => setIsFilterOpen(true)} accessibilityLabel="Filters" style={styles.box}>
                <SlidersHorizontal size={16} color={tw.gray900} />
              </Press>
            </View>

            {displayedReviews.map((review) => (
              <View key={review.id} style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.reviewMeta}>ORDER #{review.orderNumber}</Text>
                  <Text style={styles.reviewMeta}>{String(review.date || '').toUpperCase()}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Img source={{ uri: review.userImage }} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: tw.gray100 }} />
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) }}>{review.userName}</Text>
                  <View style={styles.stars}>
                    <Text style={{ fontSize: 10, lineHeight: 15, color: '#fff', ...poppins(700) }}>{review.rating}</Text>
                    <Star size={8} color="#fff" fill="#fff" />
                  </View>
                </View>
                <View style={styles.quote}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray800, fontStyle: 'italic', ...poppins(500) }}>&quot;{review.reviewText}&quot;</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <BottomSheet visible={isDateSelectorOpen && !isCustomDateOpen} onClose={() => setIsDateSelectorOpen(false)} backdrop="rgba(0,0,0,0.5)">
        <View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.grab} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) }}>Select Date Range</Text>
            <Press onPress={() => setIsDateSelectorOpen(false)} accessibilityLabel="Close" hitSlop={8}>
              <X size={20} color={tw.gray900} />
            </Press>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {RANGES.map((range) => {
              const on = selectedDateRange === range;
              return (
                <Press key={range} scale={0.98} onPress={() => handleDateRangeSelect(range)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ width: '48%' }}>
                  <LinearGradient colors={on ? RT_GRADIENT : ['#fff', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.range, { borderColor: on ? '#000' : tw.gray100 }]}>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: on ? '#fff' : tw.gray600, textTransform: 'capitalize', ...poppins(700) }}>{rangeLabel(range)}</Text>
                  </LinearGradient>
                </Press>
              );
            })}
          </View>
        </View>
      </BottomSheet>

      <DateRangeDialog
        visible={isCustomDateOpen}
        onClose={() => setIsCustomDateOpen(false)}
        startDate={customDateRange.start}
        endDate={customDateRange.end}
        onDateRangeChange={(start, end) => setCustomDateRange({ start, end })}
        onApply={handleCustomDateApply}
      />

      <BottomSheet visible={isComplaintsFilterOpen} onClose={() => setIsComplaintsFilterOpen(false)} blur={8} spring={{ stiffness: 200, damping: 25 }}>
        <View style={[styles.sheet, { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 24 + insets.bottom }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 20, lineHeight: 28, color: tw.slate900, ...poppins(700) }}>Filters</Text>
            <Press onPress={() => setIsComplaintsFilterOpen(false)} accessibilityLabel="Close" hitSlop={8} style={{ padding: 8 }}>
              <X size={20} color={tw.slate400} />
            </Press>
          </View>
          <Text style={{ fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: tw.slate400, marginBottom: 16, ...poppins(700) }}>ISSUE TYPE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {ISSUE_TYPES.map((type) => {
              const on = complaintsFilterValues.issueType?.includes(type);
              return (
                <Press
                  key={type}
                  onPress={() => setComplaintsFilterValues({ ...complaintsFilterValues, issueType: (complaintsFilterValues.issueType || []).includes(type) ? [] : [type] })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: Boolean(on) }}
                >
                  <LinearGradient colors={on ? RT_GRADIENT : [tw.slate50, tw.slate50]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: on ? '#fff' : tw.slate600, ...poppins(700) }}>{type}</Text>
                  </LinearGradient>
                </Press>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Press onPress={handleComplaintsFilterReset} style={{ flex: 1, paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, lineHeight: 24, color: tw.slate400, ...poppins(700) }}>Reset</Text>
            </Press>
            <Press scale={0.98} onPress={handleComplaintsFilterApply} style={{ flex: 2 }}>
              <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.apply}>
                <Text style={{ fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) }}>Apply Filters</Text>
              </LinearGradient>
            </Press>
          </View>
        </View>
      </BottomSheet>

      <BottomNavOrders />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  kicker: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: tw.gray500, ...poppins(400) },
  name: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  tab: { paddingHorizontal: 24, paddingVertical: 8, borderRadius: 999 },
  tabDot: { position: 'absolute', top: -4, right: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: RT.primary, borderWidth: 2, borderColor: '#fff' },
  box: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, justifyContent: 'center' },
  searchInput: { flex: 1, height: 42, paddingVertical: 0, fontSize: 14, color: tw.gray900, ...poppins(400) },
  empty: { alignItems: 'center', paddingVertical: 80, backgroundColor: tw.gray50, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.gray100, gap: 12, ...shadow('sm') },
  status: { fontSize: 9, lineHeight: 14, letterSpacing: -0.4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', ...poppins(800) },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  quote: { backgroundColor: tw.gray50, borderRadius: 12, padding: 12 },
  quoteLabel: { fontSize: 10, lineHeight: 15, color: RT.primary, marginBottom: 4, ...poppins(800) },
  reviewMeta: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(700) },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tw.green600, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  grab: { alignSelf: 'center', height: 4, width: 40, borderRadius: 2, backgroundColor: tw.gray300, marginBottom: 16 },
  range: { paddingVertical: 12, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  apply: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', ...shadow('xl') },
});
