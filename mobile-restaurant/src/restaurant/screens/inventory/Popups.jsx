import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Minus, Plus } from 'lucide-react-native';
import { BottomSheet } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { poppins, tw } from '../../../theme';
import { RT, RT_GRADIENT } from '../../theme';

function GradientAction({ title, onPress, disabled, style }) {
  return (
    <Press scale={1} onPress={onPress} disabled={disabled} style={[{ borderRadius: 8, overflow: 'hidden' }, disabled ? { opacity: 0.6 } : null, style]}>
      <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 12, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(500) }}>{title}</Text>
      </LinearGradient>
    </Press>
  );
}

function OutlineAction({ title, onPress }) {
  return (
    <Press scale={1} onPress={onPress} style={{ flex: 1, borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, paddingVertical: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(500) }}>{title}</Text>
    </Press>
  );
}

/** The "Filters" bottom sheet. */
export function FilterSheet({ filterOpen, setFilterOpen, activeTab, selectedFilter, setSelectedFilter, activeFilterOptions, addonFilterCounts, menuFilterCounts, handleFilterClear, handleFilterApply }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={filterOpen} onClose={() => setFilterOpen(false)} backdrop="rgba(0,0,0,0.5)">
      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <ScrollView style={{ maxHeight: '100%' }} contentContainerStyle={{ padding: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) }}>Filters</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 4, ...poppins(400) }}>
                {activeTab === 'add-ons' ? 'Refine the add-ons list by availability or approval status.' : 'Refine your inventory by stock state, recommendation, or food type.'}
              </Text>
            </View>
            {selectedFilter !== 'all' ? (
              <View style={{ borderRadius: 999, backgroundColor: tw.gray100, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(500) }}>Active</Text>
              </View>
            ) : null}
          </View>

          <View style={{ gap: 16, marginBottom: 24 }}>
            {activeFilterOptions.map((option) => {
              const count = activeTab === 'add-ons' ? addonFilterCounts[option.value] || 0 : menuFilterCounts[option.value] || 0;
              return (
                <Press key={option.value} scale={1} onPress={() => setSelectedFilter(option.value)} accessibilityRole="radio" accessibilityState={{ selected: selectedFilter === option.value }} style={styles.filterRow}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.radio, selectedFilter === option.value ? { borderColor: RT.primary } : null]}>{selectedFilter === option.value ? <View style={styles.radioDot} /> : null}</View>
                    <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(400) }}>{option.label}</Text>
                  </View>
                  <View style={styles.count}>
                    <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(500) }}>{count}</Text>
                  </View>
                </Press>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {selectedFilter !== 'all' ? <OutlineAction title="Clear" onPress={handleFilterClear} /> : null}
            <GradientAction title="Apply" onPress={handleFilterApply} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

function OptionRow({ children, selected, onPress, last, label, labelNote }) {
  return (
    <Press scale={1} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.optRow, last ? { borderBottomWidth: 0 } : null]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ flex: 1, fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(400) }}>{label}</Text>
          {children}
          <View style={[styles.radio, selected ? { borderColor: RT.primary } : null]}>{selected ? <View style={styles.radioDot} /> : null}</View>
        </View>
        {labelNote ? <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) }}>{labelNote}</Text> : null}
      </View>
    </Press>
  );
}

/** The "Mark item / sub category out of stock" bottom sheet. */
export function ToggleSheet({
  togglePopupOpen, toggleTarget, setTogglePopupOpen, getCategoryData, selectedOption, setSelectedOption, hours, setHours, selectedDate, selectedTime, setShowCalendar, setShowTimePicker,
  formatDate, formatTime, isConfirming, handleToggleConfirm,
}) {
  const insets = useSafeAreaInsets();
  const visible = Boolean(togglePopupOpen && toggleTarget);
  const categoryData = visible && toggleTarget.type === 'category' ? getCategoryData() : null;
  return (
    <BottomSheet visible={visible} onClose={() => setTogglePopupOpen(false)} backdrop="rgba(0,0,0,0.5)">
      <View style={[styles.sheet, { maxHeight: '90%' }]}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 24 + insets.bottom + 16 }}>
          <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, textAlign: 'center', marginBottom: 24, ...poppins(700) }}>
            {toggleTarget?.type === 'category' ? 'Mark sub category out of stock' : 'Mark item out of stock'}
          </Text>

          {categoryData ? (
            <View>
              <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 12, ...poppins(700) }}>{categoryData.name}</Text>
              <View style={{ gap: 4 }}>
                <Text style={styles.bullet}>• {categoryData.name}</Text>
                <Text style={styles.bullet}>• Includes {categoryData.itemCount} item{categoryData.itemCount !== 1 ? 's' : ''}</Text>
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: tw.gray200, marginTop: 16 }} />
            </View>
          ) : null}

          <View style={{ marginBottom: 24 }}>
            <OptionRow label="For specific time" selected={selectedOption === 'specific-time'} onPress={() => setSelectedOption('specific-time')}>
              {selectedOption === 'specific-time' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Press onPress={() => setHours(Math.max(1, hours - 1))} accessibilityLabel="Decrease hours" style={styles.step}>
                    <Minus size={16} color={tw.gray700} />
                  </Press>
                  <Text style={{ minWidth: 60, textAlign: 'center', fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(500) }}>{hours} hour{hours !== 1 ? 's' : ''}</Text>
                  <Press onPress={() => setHours(hours + 1)} accessibilityLabel="Increase hours" style={styles.step}>
                    <Plus size={16} color={tw.gray700} />
                  </Press>
                </View>
              ) : null}
            </OptionRow>
            <OptionRow label="Next business day - Opening time" selected={selectedOption === 'next-business-day'} onPress={() => setSelectedOption('next-business-day')} />
            <OptionRow label="Custom date & time" selected={selectedOption === 'custom-date-time'} onPress={() => setSelectedOption('custom-date-time')} />
            {selectedOption === 'custom-date-time' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 }}>
                <Press scale={1} onPress={() => setShowCalendar(true)} style={styles.pickBtn}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) }}>{selectedDate ? formatDate(selectedDate) : '15 Dec 2025'}</Text>
                  <ChevronDown size={16} color={tw.gray500} />
                </Press>
                <Press scale={1} onPress={() => setShowTimePicker(true)} style={styles.pickBtn}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) }}>{formatTime(selectedTime)}</Text>
                  <ChevronDown size={16} color={tw.gray500} />
                </Press>
              </View>
            ) : null}
            <OptionRow last label="I will turn it on manually" labelNote="Item won't be visible to customers on app till you mark it back in stock" selected={selectedOption === 'manual'} onPress={() => setSelectedOption('manual')} />
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <OutlineAction title="Back" onPress={() => setTogglePopupOpen(false)} />
            <GradientAction title={isConfirming ? 'Confirming...' : 'Confirm'} onPress={handleToggleConfirm} disabled={isConfirming} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, paddingHorizontal: 16, paddingVertical: 12 },
  count: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  optRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: tw.gray300, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: RT.primary },
  step: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.gray200, alignItems: 'center', justifyContent: 'center' },
  pickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff' },
  bullet: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
});
