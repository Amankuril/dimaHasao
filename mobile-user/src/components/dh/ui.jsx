import { useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../Fa';
import { Press } from '../ui';
import Skeleton from '../Skeleton';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { Button, fa } from '../ds';
import { color, elevation, radii, space, type } from '../../theme';

/*
 * The pieces the tourism shell's screens repeat: the white panel, the action
 * button, the −/+ counter, the form field, the state block. Design-system
 * tokens (DESIGN_SYSTEM.md); GreenButton renders the ds Button.
 */

export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** White card with the beige heritage edge (ds `Card` look). */
export function Panel({ style, children, pad = space.lg }) {
  return <View style={[dhs.panel, { padding: pad }, style]}>{children}</View>;
}

/** Title inside a panel: icon + subheading, optional trailing node. */
export function PanelTitle({ icon, children, style, right }) {
  return (
    <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }, style]}>
      <View style={[dhs.row, { gap: space.sm, flexShrink: 1 }]}>
        {icon ? <Fa name={icon} size={16} color={color.primary} /> : null}
        <Text style={dhs.h3} accessibilityRole="header">
          {children}
        </Text>
      </View>
      {right}
    </View>
  );
}

const BTN_VARIANT = { green: 'primary', gray: 'outline', red: 'danger' };

/**
 * The shell's action button, now the design-system `Button` (sentence case,
 * 36/48/54 px). `tone`: green → primary, gray → outline, red → danger;
 * `variant` picks any ds Button variant directly.
 */
export function GreenButton({ title, icon, iconRight, onPress, disabled, loading, loadingTitle = 'Processing…', size = 'md', style, textStyle, tone = 'green', variant, fullWidth = true, accessibilityLabel }) {
  return (
    <Button
      title={loading ? loadingTitle : title}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      size={size}
      variant={variant || BTN_VARIANT[tone] || 'primary'}
      icon={icon ? fa(icon) : undefined}
      iconRight={iconRight ? fa(iconRight) : undefined}
      fullWidth={fullWidth}
      style={style}
      textStyle={textStyle}
      accessibilityLabel={accessibilityLabel || title}
    />
  );
}

/** −/+ counter: 36 px round buttons with a 44 px hit area. */
export function Stepper({ value, onChange, min = 1, max = Infinity, size = 36, label }) {
  const btn = (delta, sign, disabled) => (
    <Press
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      disabled={disabled}
      hitSlop={Math.max(4, (44 - size) / 2)}
      accessibilityLabel={`${delta > 0 ? 'Increase' : 'Decrease'}${label ? ` ${label}` : ''}`}
      style={[dhs.stepBtn, { width: size, height: size, borderRadius: size / 2 }, disabled && { opacity: 0.4 }]}
    >
      <Fa name={sign === '+' ? 'fa-solid fa-plus' : 'fa-solid fa-minus'} size={13} color={color.primary} />
    </Press>
  );
  return (
    <View style={[dhs.row, { gap: space.sm }]}>
      {btn(-1, '-', value <= min)}
      <Text style={dhs.stepValue} accessibilityLabel={label ? `${value} ${label}` : String(value)}>
        {value}
      </Text>
      {btn(1, '+', value >= max)}
    </View>
  );
}

/** Label above a 48 px input; beige edge at rest, brand green when focused. */
export function Field({ label, style, inputStyle, multiline, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      {label ? <Text style={dhs.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={color.textDisabled}
        multiline={multiline}
        accessibilityLabel={label || props.placeholder}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[dhs.input, multiline && dhs.inputMulti, focused && { borderColor: color.primary }, inputStyle]}
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
        <Text style={[dhs.dateText, !shown && { color: color.textDisabled }]}>{shown || placeholder}</Text>
        <Fa name="fa-regular fa-calendar" size={16} color={color.primary} />
      </Press>
    </View>
  );
}

/** `animate-pulse` grey block. */
export function Pulse({ style, tone = 200 }) {
  return <Skeleton style={[{ borderRadius: radii.sm, backgroundColor: tone === 100 ? color.surfaceMuted : color.border }, style]} />;
}

/** Centered icon + title + text + button: empty, error and not-found blocks. */
export function StateBlock({ icon, iconColor = color.primary, title, text, actionLabel, onAction, card = true, style }) {
  return (
    <View style={[card ? dhs.stateCard : dhs.statePlain, style]}>
      <View style={dhs.stateIcon}>
        <Fa name={icon} size={26} color={iconColor} />
      </View>
      <Text style={dhs.stateTitle}>{title}</Text>
      {text ? <Text style={dhs.stateText}>{text}</Text> : null}
      {actionLabel ? <GreenButton title={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} style={{ alignSelf: 'center', marginTop: space.xs }} /> : null}
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
            {tab.icon ? <Fa name={tab.icon} size={14} color={isActive ? color.primary : color.textMuted} /> : null}
            <Text numberOfLines={1} style={[dhs.segText, isActive ? { color: color.primary } : null]}>
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
export function Stars({ rating = 0, size = 14, color: starColor = color.gold }) {
  return (
    <View style={[dhs.row, { gap: 1 }]} accessibilityLabel={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Fa key={i} name={rating >= i ? 'fa-solid fa-star' : rating >= i - 0.5 ? 'fa-solid fa-star-half-stroke' : 'fa-regular fa-star'} size={size} color={starColor} />
      ))}
    </View>
  );
}

export const dhs = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  row: { flexDirection: 'row', alignItems: 'center' },
  panel: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, ...elevation.card },
  h3: { ...type.subheading, color: color.text, flexShrink: 1 },
  label: { ...type.label, color: color.textSecondary, marginBottom: space.xs + 2 },
  input: {
    height: 48, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: 0,
    ...type.body, color: color.text,
  },
  inputMulti: { height: undefined, minHeight: 96, textAlignVertical: 'top', paddingTop: space.md, paddingBottom: space.md },
  dateText: { ...type.bodyStrong, color: color.text },
  stepBtn: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  stepValue: { ...type.subheading, color: color.text, minWidth: 24, textAlign: 'center' },
  stateCard: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxxl + space.lg, paddingHorizontal: space.xxl, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border },
  statePlain: { alignItems: 'center', gap: space.sm, padding: space.xxl, marginTop: space.xxxl },
  stateIcon: { width: 60, height: 60, borderRadius: radii.lg, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  stateTitle: { ...type.subheading, color: color.text, textAlign: 'center' },
  stateText: { ...type.small, color: color.textMuted, textAlign: 'center' },
  seg: { backgroundColor: color.surfaceMuted, padding: 4, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: color.border },
  segPill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: radii.sm + 2, backgroundColor: color.surface, ...elevation.card },
  segTab: { flex: 1, minHeight: 40, paddingHorizontal: space.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs + 2 },
  segText: { ...type.label, color: color.textSecondary, flexShrink: 1 },
});
