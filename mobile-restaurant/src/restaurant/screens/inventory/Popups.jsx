import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ChevronDown, Clock, Minus, Plus } from 'lucide-react-native';
import { BottomSheet } from '../../../components/kit';
import { Button, IconButton, StatusBadge } from '../../../components/ds';
import { Press } from '../../../components/ui';
import { color, radii, space, type } from '../../../theme';
import { Radio, SheetPanel } from './partnerKit';

/** The "Filters" bottom sheet. */
export function FilterSheet({ filterOpen, setFilterOpen, activeTab, selectedFilter, setSelectedFilter, activeFilterOptions, addonFilterCounts, menuFilterCounts, handleFilterClear, handleFilterApply }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={filterOpen} onClose={() => setFilterOpen(false)} backdrop={color.overlay}>
      <SheetPanel
        title="Filters"
        subtitle={activeTab === 'add-ons' ? 'Refine add-ons by availability or approval.' : 'Refine your menu by stock, recommendation or food type.'}
        onClose={() => setFilterOpen(false)}
        right={selectedFilter !== 'all' ? <StatusBadge label="Active" tone="primary" /> : null}
        style={{ maxHeight: '100%' }}
      >
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm }}>
          {activeFilterOptions.map((option) => {
            const count = activeTab === 'add-ons' ? addonFilterCounts[option.value] || 0 : menuFilterCounts[option.value] || 0;
            const on = selectedFilter === option.value;
            return (
              <Press
                key={option.value}
                scale={1}
                onPress={() => setSelectedFilter(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${option.label}, ${count}`}
                style={[styles.filterRow, on && styles.filterRowOn]}
              >
                <Radio selected={on} />
                <Text style={[type.body, { flex: 1, color: color.text }]}>{option.label}</Text>
                <View style={styles.count}>
                  <Text style={[type.caption, { color: color.textSecondary }]}>{count}</Text>
                </View>
              </Press>
            );
          })}
        </ScrollView>
        <View style={[styles.actions, { paddingBottom: space.lg + insets.bottom }]}>
          {selectedFilter !== 'all' ? <Button title="Clear" variant="outline" onPress={handleFilterClear} style={{ flex: 1 }} /> : null}
          <Button title="Apply" onPress={handleFilterApply} style={{ flex: 1 }} />
        </View>
      </SheetPanel>
    </BottomSheet>
  );
}

function OptionRow({ children, selected, onPress, last, label, labelNote }) {
  return (
    <View style={[styles.optRow, last ? { borderBottomWidth: 0 } : null]}>
      <Press scale={1} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} style={styles.optPress}>
        <Radio selected={selected} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.body, { color: color.text }]}>{label}</Text>
          {labelNote ? <Text style={[type.small, { color: color.textMuted, marginTop: 2 }]}>{labelNote}</Text> : null}
        </View>
      </Press>
      {children}
    </View>
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
    <BottomSheet visible={visible} onClose={() => setTogglePopupOpen(false)} backdrop={color.overlay}>
      <SheetPanel title={toggleTarget?.type === 'category' ? 'Mark category out of stock' : 'Mark item out of stock'} subtitle="When should it come back in stock?" onClose={() => setTogglePopupOpen(false)} style={{ maxHeight: '90%' }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md }}>
          {categoryData ? (
            <View style={styles.catBox}>
              <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={2}>{categoryData.name}</Text>
              <Text style={[type.small, { color: color.textMuted }]}>
                Includes {categoryData.itemCount} item{categoryData.itemCount !== 1 ? 's' : ''}
              </Text>
            </View>
          ) : null}

          <OptionRow label="For a specific time" selected={selectedOption === 'specific-time'} onPress={() => setSelectedOption('specific-time')}>
            {selectedOption === 'specific-time' ? (
              <View style={styles.stepper}>
                <IconButton icon={Minus} label="Decrease hours" variant="soft" onPress={() => setHours(Math.max(1, hours - 1))} />
                <Text style={[type.bodyStrong, styles.hours]}>
                  {hours} hour{hours !== 1 ? 's' : ''}
                </Text>
                <IconButton icon={Plus} label="Increase hours" variant="soft" onPress={() => setHours(hours + 1)} />
              </View>
            ) : null}
          </OptionRow>
          <OptionRow label="Next business day, at opening time" selected={selectedOption === 'next-business-day'} onPress={() => setSelectedOption('next-business-day')} />
          <OptionRow label="Custom date and time" selected={selectedOption === 'custom-date-time'} onPress={() => setSelectedOption('custom-date-time')}>
            {selectedOption === 'custom-date-time' ? (
              <View style={styles.pickRow}>
                <Press scale={0.98} onPress={() => setShowCalendar(true)} accessibilityLabel="Choose date" style={styles.pickBtn}>
                  <Calendar size={18} color={color.primary} />
                  <Text style={[type.body, { flex: 1, color: color.text }]} numberOfLines={1}>{selectedDate ? formatDate(selectedDate) : '15 Dec 2025'}</Text>
                  <ChevronDown size={18} color={color.textMuted} />
                </Press>
                <Press scale={0.98} onPress={() => setShowTimePicker(true)} accessibilityLabel="Choose time" style={styles.pickBtn}>
                  <Clock size={18} color={color.primary} />
                  <Text style={[type.body, { flex: 1, color: color.text }]} numberOfLines={1}>{formatTime(selectedTime)}</Text>
                  <ChevronDown size={18} color={color.textMuted} />
                </Press>
              </View>
            ) : null}
          </OptionRow>
          <OptionRow last label="I will turn it on manually" labelNote="Customers won't see it on the app until you mark it back in stock." selected={selectedOption === 'manual'} onPress={() => setSelectedOption('manual')} />
        </ScrollView>

        <View style={[styles.actions, { paddingBottom: space.lg + insets.bottom }]}>
          <Button title="Back" variant="outline" onPress={() => setTogglePopupOpen(false)} style={{ flex: 1 }} />
          <Button title={isConfirming ? 'Confirming…' : 'Confirm'} loading={isConfirming} onPress={handleToggleConfirm} disabled={isConfirming} style={{ flex: 1 }} />
        </View>
      </SheetPanel>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg },
  filterRowOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  count: { minWidth: 28, height: 24, borderRadius: radii.pill, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  actions: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  catBox: { backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: space.md, gap: 2, marginBottom: space.sm },
  optRow: { paddingVertical: space.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  optPress: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, paddingVertical: space.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: 34, paddingBottom: space.sm },
  hours: { minWidth: 72, textAlign: 'center', color: color.text },
  pickRow: { gap: space.sm, paddingLeft: 34, paddingBottom: space.sm },
  pickBtn: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, paddingHorizontal: space.md, backgroundColor: color.surface },
});
