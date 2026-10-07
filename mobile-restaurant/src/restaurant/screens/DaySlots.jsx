import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ChevronDown, Clock, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Button, Card, IconButton } from '../../components/ds';
import { Press } from '../../components/ui';
import { color, elevation, radii, space, type } from '../../theme';
import { useDaySlots } from '../hooks/pages/useDaySlots';
import { CheckRow, Notice, PinnedBar, ScreenHeader } from './inventory/partnerKit';

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
    <Dialog visible onClose={onClose} backdrop={color.overlay} panelStyle={styles.picker}>
      <Text style={[type.heading, { color: color.text, paddingHorizontal: space.lg, paddingTop: space.lg }]} accessibilityRole="header">Choose time</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.lg, paddingHorizontal: space.lg }}>
        <Wheel values={HOURS} index={hi} onIndex={setHi} format={(v) => String(v)} />
        <Text style={styles.colon}>:</Text>
        <Wheel values={MINUTES} index={mi} onIndex={setMi} format={(v) => String(v).padStart(2, '0')} />
        <Wheel values={PERIODS} index={pi} onIndex={setPi} format={(v) => v.toUpperCase()} />
        <View pointerEvents="none" style={styles.lines}>
          <View style={styles.band} />
        </View>
      </View>
      <View style={styles.okay}>
        <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button
          title="Okay"
          onPress={() => {
            onConfirm(String(HOURS[hi]), String(MINUTES[mi]).padStart(2, '0'), PERIODS[pi]);
            onClose();
          }}
          style={{ flex: 1 }}
        />
      </View>
    </Dialog>
  );
}

/** Port of Food/pages/restaurant/DaySlots.jsx (/food/restaurant/outlet-timings/:day). */
export default function DaySlots() {
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
      <View style={styles.timeRow}>
        <Text style={[type.label, { color: color.textSecondary, width: 44 }]}>{isStart ? 'Start' : 'End'}</Text>
        <Press scale={0.98} onPress={() => setTimePickerOpen({ slotId: slot.id, field, type: 'time' })} accessibilityLabel={`${isStart ? 'Start' : 'End'} time ${time}`} style={styles.timeBox}>
          <Clock size={18} color={color.primary} />
          <Text style={[type.bodyStrong, { flex: 1, color: color.text }]}>{time}</Text>
          <Pencil size={16} color={color.textMuted} />
        </Press>
        <Press scale={0.98} onPress={() => setTimePickerOpen({ slotId: slot.id, field, type: 'period' })} accessibilityLabel={`${isStart ? 'Start' : 'End'} period ${period}`} style={styles.periodBox}>
          <Text style={[type.bodyStrong, { color: color.text }]}>{period.toUpperCase()}</Text>
          <ChevronDown size={16} color={color.textMuted} />
        </Press>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title={dayName} subtitle={`${companyName} delivery`} onBack={() => navigate('/food/restaurant/outlet-timings')} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg, gap: space.md }}>
        <Notice tone="neutral" icon={Clock}>Add or change your timings here. You can create up to 3 time slots in a day.</Notice>
        {dayData.slots.map((slot, index) => (
          <Card key={slot.id} style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.subheading, { color: color.text }]}>Slot {index + 1}</Text>
                <Text style={[type.caption, { color: color.textMuted }]}>{calculateSlotDuration(slot.start, slot.end, slot.startPeriod, slot.endPeriod)}</Text>
              </View>
              <IconButton icon={Trash2} label={`Delete slot ${index + 1}`} variant="danger" onPress={() => deleteSlot(slot.id)} />
            </View>
            {row(slot, 'start')}
            {row(slot, 'end')}
          </Card>
        ))}
        {dayData.slots.length < 3 ? <Button title="Add time slot" icon={Plus} variant="secondary" onPress={addSlot} /> : null}
      </ScrollView>

      <PinnedBar style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <CheckRow label="Copy these timings to all days" checked={copyToAllDays} onPress={() => setCopyToAllDays(!copyToAllDays)} style={{ flex: 1 }} />
          <Text style={[type.label, { color: color.textSecondary }]}>Total {calculateTotalDuration()}</Text>
        </View>
        <Button title="Save" onPress={handleSave} />
      </PinnedBar>

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

      <Dialog visible={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} backdrop={color.overlay} panelStyle={styles.deleteDialog}>
        <View style={styles.deleteIcon}>
          <AlertTriangle size={26} color={color.danger} />
        </View>
        <Text style={[type.heading, { color: color.text, textAlign: 'center' }]} accessibilityRole="header">Delete time slot?</Text>
        <Text style={[type.small, { color: color.textSecondary, textAlign: 'center', marginTop: space.sm, marginBottom: space.xl }]}>This time slot will be removed. This can&apos;t be undone.</Text>
        <View style={{ flexDirection: 'row', gap: space.md, alignSelf: 'stretch' }}>
          <Button title="Cancel" variant="outline" onPress={() => { setDeleteDialogOpen(false); setSlotToDelete(null); }} style={{ flex: 1 }} />
          <Button title="Delete" variant="danger" onPress={confirmDelete} style={{ flex: 1 }} />
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { width: '90%', maxWidth: 320, alignSelf: 'center', backgroundColor: color.surface, borderRadius: radii.lg, overflow: 'hidden', ...elevation.sheet },
  wheelOn: { ...type.heading, color: color.primary },
  wheelOff: { ...type.body, color: color.textMuted },
  colon: { paddingHorizontal: space.sm, ...type.priceLg, color: color.text },
  lines: { position: 'absolute', left: space.lg, right: space.lg, top: 0, bottom: 0, justifyContent: 'center' },
  band: { height: ITEM, borderRadius: radii.md, backgroundColor: color.primarySoft, opacity: 0.6 },
  okay: { flexDirection: 'row', gap: space.md, padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  timeBox: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface },
  periodBox: { minHeight: 48, minWidth: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface },
  deleteDialog: { width: '90%', maxWidth: 380, alignSelf: 'center', backgroundColor: color.surface, borderRadius: radii.lg, padding: space.xxl, alignItems: 'center' },
  deleteIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
});
