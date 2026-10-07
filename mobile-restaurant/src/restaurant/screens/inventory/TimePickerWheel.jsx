import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Dialog } from '../../../components/kit';
import { Button } from '../../../components/ds';
import { color, radii, space, type } from '../../../theme';

const ITEM = 40;
const PAD = 80;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ['am', 'pm'];

/** One snapping column (h-48 scroller with 80px padding and 40px rows). */
function Wheel({ values, selected, onSelect, render, active }) {
  const ref = useRef(null);
  const index = Math.max(0, values.indexOf(selected));
  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM, animated: false }), 30);
    return () => clearTimeout(timer);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (e) => {
    const i = Math.max(0, Math.min(Math.round(e.nativeEvent.contentOffset.y / ITEM), values.length - 1));
    if (values[i] !== selected) onSelect(values[i]);
  };
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <ScrollView
        ref={ref}
        style={{ width: '100%', height: 192 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={pick}
        onMomentumScrollEnd={pick}
        onScrollEndDrag={pick}
      >
        <View style={{ height: PAD }} />
        {values.map((value) => (
          <View key={String(value)} style={{ height: ITEM, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={selected === value ? styles.on : styles.off}>{render(value)}</Text>
          </View>
        ))}
        <View style={{ height: PAD }} />
      </ScrollView>
    </View>
  );
}

/** Port of the page's TimePickerWheel: hour / minute / am-pm wheels with an "Okay" button. */
export default function TimePickerWheel({ isOpen, onClose, initialHour, initialMinute, initialPeriod, onConfirm }) {
  const parsedHour = Math.max(1, Math.min(12, parseInt(initialHour, 10) || 1));
  const parsedMinute = Math.max(0, Math.min(59, parseInt(initialMinute, 10) || 0));
  const parsedPeriod = initialPeriod === 'am' || initialPeriod === 'pm' ? initialPeriod : 'am';
  const [hour, setHour] = useState(parsedHour);
  const [minute, setMinute] = useState(parsedMinute);
  const [period, setPeriod] = useState(parsedPeriod);

  useEffect(() => {
    if (isOpen) {
      setHour(parsedHour);
      setMinute(parsedMinute);
      setPeriod(parsedPeriod);
    }
  }, [isOpen, initialHour, initialMinute, initialPeriod, parsedHour, parsedMinute, parsedPeriod]);

  const handleConfirm = () => {
    onConfirm(hour.toString(), minute.toString().padStart(2, '0'), period);
    onClose();
  };

  return (
    <Dialog visible={Boolean(isOpen)} onClose={onClose} backdrop={color.overlay} panelStyle={styles.panel}>
      <Text style={[type.heading, { color: color.text, paddingHorizontal: space.lg, paddingTop: space.lg }]} accessibilityRole="header">Choose time</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: space.lg, paddingHorizontal: space.lg }}>
        <Wheel values={HOURS} selected={hour} onSelect={setHour} render={(v) => v} active={isOpen} />
        <View style={{ paddingHorizontal: 8 }}>
          <Text style={[type.priceLg, { color: color.text }]}>:</Text>
        </View>
        <Wheel values={MINUTES} selected={minute} onSelect={setMinute} render={(v) => v.toString().padStart(2, '0')} active={isOpen} />
        <Wheel values={PERIODS} selected={period} onSelect={setPeriod} render={(v) => v} active={isOpen} />
        <View pointerEvents="none" style={styles.lines}>
          <View style={styles.band} />
        </View>
      </View>
      <View style={styles.foot}>
        <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Okay" onPress={handleConfirm} style={{ flex: 1 }} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  panel: { width: 320, maxWidth: '90%', backgroundColor: color.surface, borderRadius: radii.lg, overflow: 'hidden' },
  on: { ...type.heading, color: color.primary },
  off: { ...type.body, color: color.textMuted },
  lines: { position: 'absolute', left: space.lg, right: space.lg, top: '50%', marginTop: -20 },
  band: { height: ITEM, borderRadius: radii.md, backgroundColor: color.primarySoft, opacity: 0.6 },
  foot: { flexDirection: 'row', gap: space.md, padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
});
