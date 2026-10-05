import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../Fa';
import { Press } from '../ui';
import Skeleton from '../Skeleton';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { dh, montserrat, poppins, shadow, tw } from '../../theme';

/*
 * The pieces the tourism shell's screens repeat: the cream panel, the green
 * button with amber text, the −/+ counter, the form field, the state block.
 * Values are the web's Tailwind classes, resolved.
 */

export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** `bg-white rounded-2xl p-4 shadow-xs border border-[#E5DDC3]` */
export function Panel({ style, children, pad = 16 }) {
  return <View style={[dhs.panel, { padding: pad }, style]}>{children}</View>;
}

/** Section title inside a panel: `font-montserrat font-bold text-sm text-gray-900` + optional icon. */
export function PanelTitle({ icon, children, style, right }) {
  return (
    <View style={[dhs.row, { justifyContent: 'space-between' }, style]}>
      <View style={[dhs.row, { gap: 8, flexShrink: 1 }]}>
        {icon ? <Fa name={icon} size={14} color={tw.emerald800} /> : null}
        <Text style={dhs.h3}>{children}</Text>
      </View>
      {right}
    </View>
  );
}

/** `bg-[#06381e] text-amber-300 text-xs font-bold rounded-xl` */
export function GreenButton({ title, icon, iconRight, onPress, disabled, loading, loadingTitle = 'Processing…', size = 'md', style, textStyle, tone = 'green' }) {
  const pad = size === 'lg' ? { paddingVertical: 14, borderRadius: 16 } : size === 'sm' ? { paddingVertical: 6, paddingHorizontal: 12 } : { paddingVertical: 10, paddingHorizontal: 16 };
  const bg = tone === 'gray' ? tw.gray100 : tone === 'red' ? tw.red600 : dh.nav;
  const fg = tone === 'gray' ? tw.gray700 : tone === 'red' ? '#fff' : tw.amber300;
  const fontSize = size === 'lg' ? 14 : 12;
  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      scale={0.96}
      accessibilityLabel={title}
      style={[dhs.btn, pad, { backgroundColor: bg }, tone === 'green' && shadow('xs'), (disabled || loading) && { opacity: 0.6 }, style]}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color={fg} />
          <Text style={[dhs.btnText, { color: fg, fontSize }, textStyle]}>{loadingTitle}</Text>
        </>
      ) : (
        <>
          {icon ? <Fa name={icon} size={fontSize - 2} color={fg} /> : null}
          <Text style={[dhs.btnText, { color: fg, fontSize, lineHeight: fontSize * 1.4 }, textStyle]}>{title}</Text>
          {iconRight ? <Fa name={iconRight} size={fontSize - 2} color={fg} /> : null}
        </>
      )}
    </Press>
  );
}

/** The round −/+ counter (`w-5 h-5 rounded-full bg-white border border-gray-300`). */
export function Stepper({ value, onChange, min = 1, max = Infinity, size = 20, label }) {
  const btn = (delta, sign, disabled) => (
    <Press
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      disabled={disabled}
      hitSlop={8}
      accessibilityLabel={`${delta > 0 ? 'Increase' : 'Decrease'}${label ? ` ${label}` : ''}`}
      style={[dhs.stepBtn, { width: size, height: size, borderRadius: size / 2 }, disabled && { opacity: 0.4 }]}
    >
      <Text style={dhs.stepSign}>{sign}</Text>
    </Press>
  );
  return (
    <View style={[dhs.row, { gap: 8 }]}>
      {btn(-1, '-', value <= min)}
      <Text style={dhs.stepValue}>{value}</Text>
      {btn(1, '+', value >= max)}
    </View>
  );
}

/** Label + input: `bg-[#FAF6ED] border border-[#E5DDC3] rounded-xl px-3 py-2 text-xs`. */
export function Field({ label, style, inputStyle, multiline, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      {label ? <Text style={dhs.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={tw.gray400}
        multiline={multiline}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[dhs.input, multiline && { height: undefined, minHeight: 72, textAlignVertical: 'top', paddingTop: 8 }, focused && { borderColor: tw.emerald600 }, inputStyle]}
      />
    </View>
  );
}

const pad2 = (n) => String(n).padStart(2, '0');
export const toIso = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
export const fromIso = (iso) => {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : new Date();
};

/** `<input type="date">`: the field opens the OS date picker. Value is yyyy-mm-dd. */
export function DateField({ label, value, onChange, min, max, style, placeholder = 'Select date' }) {
  const open = () => {
    if (Platform.OS !== 'android') return;
    DateTimePickerAndroid.open({
      value: value ? fromIso(value) : min ? fromIso(min) : new Date(),
      mode: 'date',
      minimumDate: min ? fromIso(min) : undefined,
      maximumDate: max ? fromIso(max) : undefined,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toIso(date));
      },
    });
  };
  const shown = value ? fromIso(value).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  return (
    <View style={style}>
      {label ? <Text style={dhs.label}>{label}</Text> : null}
      <Press scale={1} onPress={open} accessibilityRole="button" accessibilityLabel={`${label || 'Date'}: ${shown || placeholder}`} style={[dhs.input, dhs.row, { justifyContent: 'space-between' }]}>
        <Text style={[dhs.dateText, !shown && { color: tw.gray400 }]}>{shown || placeholder}</Text>
        <Fa name="fa-regular fa-calendar" size={12} color={tw.gray700} />
      </Press>
    </View>
  );
}

/** `animate-pulse` grey block. */
export function Pulse({ style, tone = 200 }) {
  return <Skeleton style={[{ borderRadius: 4, backgroundColor: tone === 100 ? tw.gray100 : tw.gray200 }, style]} />;
}

/** Centered icon + title + text + button: empty, error and not-found blocks. */
export function StateBlock({ icon, iconColor = tw.gray300, title, text, actionLabel, onAction, card = true, style }) {
  return (
    <View style={[card ? dhs.stateCard : dhs.statePlain, style]}>
      <Fa name={icon} size={36} color={iconColor} />
      <Text style={dhs.stateTitle}>{title}</Text>
      {text ? <Text style={dhs.stateText}>{text}</Text> : null}
      {actionLabel ? <GreenButton title={actionLabel} onPress={onAction} style={{ alignSelf: 'center' }} /> : null}
    </View>
  );
}

/** The sliding-pill segmented control used by the hotel and bookings screens. */
export function SegTabs({ tabs, active, onChange }) {
  const index = Math.max(0, tabs.findIndex((t) => t.id === active));
  const [width, setWidth] = useState(0);
  const x = useAnimatedValue(index);
  useEffect(() => {
    Animated.timing(x, { toValue: index, duration: 300, useNativeDriver: true }).start();
  }, [index, x]);
  const pill = width ? (width - 8) / tabs.length : 0;
  return (
    <View style={dhs.seg} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {pill ? <Animated.View pointerEvents="none" style={[dhs.segPill, { width: pill, transform: [{ translateX: Animated.multiply(x, pill) }] }]} /> : null}
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Press key={tab.id} scale={1} onPress={() => onChange(tab.id)} accessibilityRole="tab" accessibilityState={{ selected: isActive }} style={dhs.segTab}>
            {tab.icon ? <Fa name={tab.icon} size={10.5} color={isActive ? dh.nav : tw.stone400} /> : null}
            <Text numberOfLines={1} style={[dhs.segText, isActive ? { color: dh.nav, ...poppins(800) } : null]}>
              {tab.label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

/** A scrolling form that keeps the focused input above the keyboard. */
export function FormScroll({ children, contentContainerStyle, bottomSpace = 24, ...rest }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[{ paddingBottom: bottomSpace + insets.bottom }, contentContainerStyle]}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Five stars for a rating (full / half / empty), amber. */
export function Stars({ rating = 0, size = 12, color = tw.amber400 }) {
  return (
    <View style={[dhs.row, { gap: 1 }]} accessibilityLabel={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Fa key={i} name={rating >= i ? 'fa-solid fa-star' : rating >= i - 0.5 ? 'fa-solid fa-star-half-stroke' : 'fa-regular fa-star'} size={size} color={color} />
      ))}
    </View>
  );
}

export const dhs = StyleSheet.create({
  page: { flex: 1, backgroundColor: dh.cream },
  row: { flexDirection: 'row', alignItems: 'center' },
  panel: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: dh.border, ...shadow('xs') },
  h3: { fontSize: 14, lineHeight: 20, color: tw.gray900, flexShrink: 1, ...montserrat(700) },
  label: { fontSize: 11, lineHeight: 16.5, color: tw.gray700, marginBottom: 4, ...poppins(600) },
  input: {
    height: 36, backgroundColor: dh.cream, borderWidth: 1, borderColor: dh.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 0,
    fontSize: 12, color: tw.gray900, ...poppins(500),
  },
  dateText: { fontSize: 12, color: tw.gray900, ...poppins(700) },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 },
  btnText: { ...poppins(700) },
  stepBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray300, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontSize: 12, lineHeight: 14, color: tw.gray700, ...poppins(700) },
  stepValue: { fontSize: 12, lineHeight: 16, color: tw.gray900, minWidth: 10, textAlign: 'center', ...poppins(700) },
  stateCard: { alignItems: 'center', gap: 12, paddingVertical: 64, paddingHorizontal: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: dh.border },
  statePlain: { alignItems: 'center', gap: 12, padding: 24, marginTop: 40 },
  stateTitle: { fontSize: 14, lineHeight: 20, color: tw.gray800, textAlign: 'center', ...poppins(700) },
  stateText: { fontSize: 12, lineHeight: 16, color: tw.gray500, textAlign: 'center', ...poppins(400) },
  seg: { backgroundColor: '#EDE8DC', padding: 4, borderRadius: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DFD6C4' },
  segPill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(223,214,196,0.8)', ...shadow('xs') },
  segTab: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segText: { fontSize: 12, lineHeight: 16, color: tw.stone600, flexShrink: 1, ...poppins(600) },
});
