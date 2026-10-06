import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Dialog } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { poppins, tw } from '../../../theme';
import { RT } from '../../theme';

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
    <Dialog visible={Boolean(isOpen)} onClose={onClose} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.panel}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 16 }}>
        <Wheel values={HOURS} selected={hour} onSelect={setHour} render={(v) => v} active={isOpen} />
        <View style={{ paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 24, lineHeight: 32, color: tw.gray900, ...poppins(700) }}>:</Text>
        </View>
        <Wheel values={MINUTES} selected={minute} onSelect={setMinute} render={(v) => v.toString().padStart(2, '0')} active={isOpen} />
        <Wheel values={PERIODS} selected={period} onSelect={setPeriod} render={(v) => v} active={isOpen} />
        <View pointerEvents="none" style={styles.lines}>
          <View style={{ borderTopWidth: 1, borderTopColor: tw.gray300, marginHorizontal: 16 }} />
          <View style={{ borderBottomWidth: 1, borderBottomColor: tw.gray300, marginHorizontal: 16, marginTop: 40 }} />
        </View>
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: tw.gray200, paddingHorizontal: 16, paddingVertical: 16, alignItems: 'center' }}>
        <Press scale={1} onPress={handleConfirm}>
          <Text style={{ fontSize: 16, lineHeight: 24, color: RT.primary, ...poppins(500) }}>Okay</Text>
        </Press>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  panel: { width: 320, maxWidth: '90%', backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  on: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  off: { fontSize: 16, lineHeight: 24, color: tw.gray400, ...poppins(400) },
  lines: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: -20 },
});
