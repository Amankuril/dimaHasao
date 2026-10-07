import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Clock, Pencil, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { ShadButton, ShadDialog } from '../components/ShadDialog';
import { useDaySlots } from '../hooks/pages/useDaySlots';
import { RT } from '../theme';

const ITEM = 40;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ['am', 'pm'];

/** One scrolling column of the web's TimePickerWheel (snaps to the centre row). */
function Wheel({ values, index, onIndex, format }) {
  const ref = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM, animated: false }), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pick = (e) => {
    const i = Math.max(0, Math.min(values.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM)));
    onIndex(i);
  };
  return (
    <View style={{ flex: 1, height: 192 }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        onScroll={pick}
        scrollEventThrottle={32}
        onMomentumScrollEnd={pick}
        onScrollEndDrag={pick}
        nestedScrollEnabled
      >
        <View style={{ height: 76 }} />
        {values.map((v, i) => (
          <View key={String(v)} style={{ height: ITEM, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={i === index ? styles.wheelOn : styles.wheelOff}>{format(v)}</Text>
          </View>
        ))}
        <View style={{ height: 76 }} />
      </ScrollView>
    </View>
  );
}

function TimePickerWheel({ initialHour, initialMinute, initialPeriod, onClose, onConfirm }) {
  const h = Math.max(1, Math.min(12, parseInt(initialHour, 10) || 1));
  const m = Math.max(0, Math.min(59, parseInt(initialMinute, 10) || 0));
  const p = initialPeriod === 'am' || initialPeriod === 'pm' ? initialPeriod : 'am';
  const [hi, setHi] = useState(h - 1);
  const [mi, setMi] = useState(m);
  const [pi, setPi] = useState(PERIODS.indexOf(p));
  return (
    <Dialog visible onClose={onClose} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.picker}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 }}>
        <Wheel values={HOURS} index={hi} onIndex={setHi} format={(v) => String(v)} />
        <Text style={styles.colon}>:</Text>
        <Wheel values={MINUTES} index={mi} onIndex={setMi} format={(v) => String(v).padStart(2, '0')} />
        <Wheel values={PERIODS} index={pi} onIndex={setPi} format={(v) => v.toUpperCase()} />
        <View pointerEvents="none" style={styles.lines}>
          <View style={{ height: ITEM, borderTopWidth: 1, borderBottomWidth: 1, borderColor: tw.gray300 }} />
        </View>
      </View>
      <View style={styles.okay}>
        <Press
          scale={0.97}
          onPress={() => {
            onConfirm(String(HOURS[hi]), String(MINUTES[mi]).padStart(2, '0'), PERIODS[pi]);
            onClose();
          }}
          accessibilityLabel="Okay"
        >
          <Text style={{ fontSize: 16, lineHeight: 24, color: RT.primary, ...poppins(500) }}>Okay</Text>
        </Press>
      </View>
    </Dialog>
  );
}

/** Port of Food/pages/restaurant/DaySlots.jsx (/food/restaurant/outlet-timings/:day). */
export default function DaySlots() {
  const insets = useSafeAreaInsets();
  const {
    companyName, navigate, dayName, dayData, copyToAllDays, setCopyToAllDays, deleteDialogOpen, setDeleteDialogOpen, setSlotToDelete,
    timePickerOpen, setTimePickerOpen, getTimeParts, handleCustomTimeChange, calculateSlotDuration, calculateTotalDuration,
    addSlot, deleteSlot, confirmDelete, handleSave,
  } = useDaySlots();

  const closePicker = () => setTimePickerOpen({ slotId: null, field: null, type: null });
  const current = timePickerOpen.slotId ? dayData.slots.find((s) => s.id === timePickerOpen.slotId) : null;
  const currentTime = current ? (timePickerOpen.field === 'start' ? current.start : current.end) : '';
  const parts = getTimeParts(currentTime);

  const row = (slot, field) => {
    const isStart = field === 'start';
    const time = isStart ? slot.start : slot.end;
    const period = isStart ? slot.startPeriod : slot.endPeriod;
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Clock size={16} color={tw.gray600} />
          <Text style={styles.rowLabel}>{isStart ? 'Start Time' : 'End Time'}</Text>
        </View>
        <Press scale={1} onPress={() => setTimePickerOpen({ slotId: slot.id, field, type: 'time' })} accessibilityLabel={`${isStart ? 'Start' : 'End'} time ${time}`} style={styles.timeBox}>
          <Text style={styles.timeText}>{time}</Text>
          <Pencil size={16} color={tw.gray500} />
        </Press>
        <Press scale={1} onPress={() => setTimePickerOpen({ slotId: slot.id, field, type: 'period' })} accessibilityLabel={`${isStart ? 'Start' : 'End'} period ${period}`} style={styles.periodBox}>
          <Text style={styles.periodText}>{period.toUpperCase()}</Text>
          <ChevronDown size={16} color={tw.gray500} style={{ opacity: 0.5 }} />
        </Press>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press onPress={() => navigate('/food/restaurant/outlet-timings')} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 6 }}>
          <ArrowLeft size={24} color={tw.gray900} />
        </Press>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">{dayName}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{companyName} delivery</Text>
        </View>
      </View>
      <View style={{ backgroundColor: tw.gray50, padding: 8 }}>
        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) }}>
          Add or modify your restaurant timings here. You can create maximum up to 3 time slots in a day.
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{ gap: 24 }}>
          {dayData.slots.map((slot, index) => (
            <View key={slot.id} style={styles.slot}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text>
                  <Text style={styles.slotTitle}>Slot-{index + 1}</Text>
                  <Text style={styles.slotDur}>  ({calculateSlotDuration(slot.start, slot.end, slot.startPeriod, slot.endPeriod)})</Text>
                </Text>
                <Press onPress={() => deleteSlot(slot.id)} accessibilityLabel="Delete slot" style={styles.trash}>
                  <Trash2 size={16} color="#f87171" />
                </Press>
              </View>
              {row(slot, 'start')}
              {row(slot, 'end')}
            </View>
          ))}
        </View>
        {dayData.slots.length < 3 ? (
          <Press scale={1} onPress={addSlot} style={{ paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: RT.primary, ...poppins(500) }}>+ Add time slot</Text>
          </Press>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Press scale={1} onPress={() => setCopyToAllDays(!copyToAllDays)} accessibilityRole="checkbox" accessibilityState={{ checked: copyToAllDays }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.check, copyToAllDays ? { backgroundColor: tw.green600, borderColor: tw.green600 } : null]}>
            {copyToAllDays ? <Check size={14} color="#fff" /> : null}
          </View>
          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) }}>Copy above timings to all days</Text>
        </Press>
        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) }}>Total: {calculateTotalDuration()}</Text>
        <Press scale={0.98} onPress={handleSave} style={styles.save}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) }}>Save</Text>
        </Press>
      </View>

      {current && timePickerOpen.type ? (
        <TimePickerWheel
          key={`${timePickerOpen.slotId}-${timePickerOpen.field}-${timePickerOpen.type}`}
          initialHour={parts.hour}
          initialMinute={parts.minute}
          initialPeriod={timePickerOpen.field === 'start' ? current.startPeriod : current.endPeriod}
          onClose={closePicker}
          onConfirm={(hour, minute, period) => handleCustomTimeChange(timePickerOpen.slotId, timePickerOpen.field, hour, minute, period)}
        />
      ) : null}

      <ShadDialog visible={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} style={styles.deleteDialog}>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, paddingRight: 40 }}>
            <View style={styles.deleteIcon}>
              <AlertTriangle size={24} color={RT.primary} />
            </View>
            <Text style={styles.deleteTitle}>Delete Time Slot</Text>
          </View>
          <Text style={styles.deleteDesc}>Are you sure you want to delete this time slot? This action cannot be undone.</Text>
        </View>
        {/* DialogFooter is flex-col-reverse on a phone: the primary action sits on top */}
        <View style={{ gap: 8, marginTop: 8 }}>
          <ShadButton title="Delete" onPress={confirmDelete} />
          <ShadButton variant="outline" title="Cancel" onPress={() => { setDeleteDialogOpen(false); setSlotToDelete(null); }} />
        </View>
      </ShadDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { width: '90%', maxWidth: 320, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', ...shadow('xl') },
  wheelOn: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  wheelOff: { fontSize: 16, lineHeight: 24, color: tw.gray400, ...poppins(400) },
  colon: { paddingHorizontal: 8, fontSize: 24, lineHeight: 32, color: tw.gray900, ...poppins(700) },
  lines: { position: 'absolute', left: 16, right: 16, top: 0, bottom: 0, justifyContent: 'center' },
  okay: { borderTopWidth: 1, borderTopColor: tw.gray200, paddingHorizontal: 16, paddingVertical: 16, alignItems: 'center' },
  slot: { backgroundColor: '#fff', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  slotTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  slotDur: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  trash: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fce7f3', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },
  timeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 112, paddingHorizontal: 8, height: 40, borderWidth: 1, borderColor: tw.gray300, borderRadius: 2, backgroundColor: tw.gray50 },
  timeText: { fontSize: 15, color: tw.gray900, ...poppins(700) },
  periodBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 70, height: 36, paddingHorizontal: 12, borderWidth: 1, borderColor: tw.gray300, borderRadius: 2, backgroundColor: '#fff' },
  periodText: { fontSize: 14, color: tw.gray900, ...poppins(500) },
  footer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.gray200, paddingHorizontal: 16, paddingVertical: 16, gap: 16, ...shadow('lg') },
  check: { width: 20, height: 20, borderWidth: 2, borderColor: tw.gray300, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  save: { backgroundColor: tw.gray800, borderRadius: 8, height: 36, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  headerTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  headerSub: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  deleteDialog: { width: '94%', maxWidth: 425, padding: 16, gap: 8 },
  deleteIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: tw.red100, alignItems: 'center', justifyContent: 'center' },
  deleteTitle: { flex: 1, fontSize: 18, lineHeight: 24, color: tw.gray900, ...poppins(600) },
  deleteDesc: { paddingTop: 8, fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
});
