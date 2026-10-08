/*
 * HTML-shaped primitives for screens ported from the admin web.
 *
 * Each one takes the web's Tailwind `className` (through lib/tw, so only what
 * applies at phone width is painted) plus an optional `style`, and behaves the
 * way the HTML element does where React Native differs:
 *
 * - Containers (Div, Section, Form, Ul, Li, ...) are Views. Their text classes
 *   (`text-sm text-slate-500 font-medium text-center`) are inherited by the
 *   text inside them, as in CSS, and bare strings among their children are
 *   wrapped in Text. `onClick` makes them pressable.
 * - Text elements (Span, P, H1-H6, Label, Strong, ...) are Text. `truncate`
 *   becomes numberOfLines={1}, `line-clamp-N` numberOfLines={N}.
 * - Button is a pressable container. Inside a <Form>, a button with no type
 *   or type="submit" submits the form, as in HTML. `disabled:` classes apply
 *   while disabled.
 * - Input / Textarea / Select call `onChange` with an event shaped like the
 *   DOM's (`e.target.value`, `e.target.checked`, `e.target.name`), so the
 *   web's handlers port unchanged. type="date" / "time" / "datetime-local"
 *   open the Android picker and produce the same strings the browser does;
 *   type="checkbox" / "radio" render a box / dot.
 * - Img resolves `/uploads/...` paths against the API origin.
 * - Icon renders a lucide-react-native icon from the web's sizing and colour
 *   classes; with no text colour it takes the inherited one (`currentColor`).
 * - Table / Tr / Th / Td lay out a table at phone width the way the web does
 *   (`overflow-x-auto`): it scrolls sideways, columns get the widths in `cols`.
 */
import { Children, Fragment, createContext, forwardRef, isValidElement, useContext, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Check, ChevronDown } from 'lucide-react-native';
import { tw } from '../lib/tw';
import { mediaUrl } from '../api/client';
import { navigateTo } from '../lib/webRouter';
import { BottomSheet } from './kit';
import { InheritedText, Text, TextInput, inheritText, splitTextStyle, useInheritedText } from './Text';

/* ------------------------------------------------------------------ helpers */

/** `disabled:x` applies while disabled; every other state variant is dropped by lib/tw. */
function stateClasses(className, { disabled = false, checked = false } = {}) {
  if (!className) return '';
  return String(className)
    .split(/\s+/)
    .map((p) => {
      const m = p.match(/^(disabled|aria-disabled|data-\[disabled\]|checked|data-\[state=checked\]|data-\[state=active\]|aria-selected|aria-checked):(.+)$/);
      if (!m) return p;
      const on = /disabled/.test(m[1]) ? disabled : checked;
      return on ? m[2] : '';
    })
    .join(' ');
}

const flat = (className, style, state) => StyleSheet.flatten([tw.style(stateClasses(className, state)), style]) || {};

function linesFrom(className) {
  if (!className) return undefined;
  if (/(^|\s)truncate(\s|$)/.test(className)) return 1;
  const m = String(className).match(/(?:^|\s)line-clamp-(\d+)(?:\s|$)/);
  return m ? Number(m[1]) : undefined;
}

/** Text-level elements: a container holding only these and strings lays them out inline, as HTML flows them. */
const INLINE = new Set();
const isInline = (child) => typeof child === 'string' || typeof child === 'number' || child == null || typeof child === 'boolean' || (isValidElement(child) && (INLINE.has(child.type) || (child.type === Fragment && Children.toArray(child.props.children).every(isInline))));

/**
 * Bare strings and numbers among a View's children -> Text (fragments
 * included). When every child is text-level (strings, Span, Strong, ...) and
 * there is at least one string, they become one Text so they flow inline.
 */
export function wrapStrings(children) {
  const list = Children.toArray(children);
  if (list.length > 1 && list.some((c) => typeof c === 'string' || typeof c === 'number') && list.every(isInline)) {
    return <Text>{children}</Text>;
  }
  return Children.map(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      if (typeof child === 'string' && !child.trim()) return null;
      return <Text>{child}</Text>;
    }
    if (isValidElement(child) && child.type === Fragment) return wrapStrings(child.props.children);
    return child;
  });
}

/** A DOM-like event for handlers ported from the web. */
export function domEvent(target = {}, native = null) {
  const t = { value: '', checked: false, ...target };
  return {
    target: t,
    currentTarget: t,
    nativeEvent: native,
    key: target.key,
    preventDefault() {},
    stopPropagation() {},
    persist() {},
  };
}

/* --------------------------------------------------------------- containers */

const FormContext = createContext(null);

/* ----------------------------------------------- grid / divide (CSS only) */

/** Base (phone-width) `grid-cols-N`, when the element is a grid. */
function gridColsOf(className) {
  const c = ` ${className || ''} `;
  if (!/ grid /.test(c)) return 0;
  const m = c.match(/ grid-cols-(\d+) /);
  return m ? Number(m[1]) : 0;
}

function spanOf(child, cols) {
  const c = ` ${child?.props?.className || ''} `;
  if (/ col-span-full /.test(c)) return cols;
  const m = c.match(/ col-span-(\d+) /);
  return m ? Math.min(cols, Number(m[1])) : 1;
}

/**
 * CSS grid at phone width: a wrapping row whose children take 1/N of it
 * (`col-span-K` takes K/N); the column gap becomes padding split between
 * neighbours, the row gap stays a gap.
 */
function gridLayout(children, cols, viewStyle) {
  const gx = viewStyle.columnGap ?? viewStyle.gap ?? 0;
  const gy = viewStyle.rowGap ?? viewStyle.gap ?? 0;
  const { gap, columnGap, rowGap, ...rest } = viewStyle; // eslint-disable-line no-unused-vars
  const style = { ...rest, flexDirection: 'row', flexWrap: 'wrap', rowGap: gy, marginHorizontal: (rest.marginHorizontal || 0) - gx / 2 };
  const items = Children.toArray(children)
    .filter((c) => c != null && c !== false && c !== '')
    .map((child, i) => (
      <View key={child?.key ?? i} style={{ width: `${(spanOf(child, cols) / cols) * 100}%`, paddingHorizontal: gx / 2 }}>
        {typeof child === 'string' || typeof child === 'number' ? <Text>{child}</Text> : child}
      </View>
    ));
  return [style, items];
}

/** `divide-y divide-slate-200`: a hairline between consecutive children. */
function divideLayout(children, className) {
  const c = ` ${className || ''} `;
  const y = / divide-y(-\d+)? /.exec(c);
  const x = / divide-x(-\d+)? /.exec(c);
  if (!y && !x) return null;
  const colorMatch = c.match(/ divide-((?:[a-z]+-\d{2,3}|white|black|transparent)(?:\/\d+)?) /);
  const color = (colorMatch && tw.color(colorMatch[1])) || '#E4DDCF';
  const width = Number((y || x)[1]?.slice(1) || 1);
  return Children.toArray(children)
    .filter((ch) => ch != null && ch !== false && ch !== '')
    .map((child, i) =>
      i === 0 ? child : (
        <View key={child?.key ?? i} style={y ? { borderTopWidth: width, borderColor: color } : { borderLeftWidth: width, borderColor: color }}>
          {child}
        </View>
      ),
    );
}

function makeBox(displayName) {
  const Box = forwardRef(function Box({ className, style, onClick, onPress, onLongPress, disabled, children, pressedStyle, ...rest }, ref) {
    const inherited = useContext(InheritedText);
    let [viewStyle, textStyle] = splitTextStyle(flat(className, style, { disabled }));
    const passed = inheritText(inherited, textStyle);
    let content;
    const cols = gridColsOf(className);
    if (cols > 1) [viewStyle, content] = gridLayout(children, cols, viewStyle);
    else content = divideLayout(children, className) || wrapStrings(children);
    const press = onClick || onPress;
    const node =
      press || onLongPress ? (
        <Pressable
          ref={ref}
          onPress={disabled ? undefined : press}
          onLongPress={onLongPress}
          disabled={disabled}
          accessibilityRole="button"
          style={({ pressed }) => [viewStyle, pressed && (pressedStyle || { opacity: 0.7 })]}
          {...rest}
        >
          {content}
        </Pressable>
      ) : (
        <View ref={ref} style={viewStyle} {...rest}>
          {content}
        </View>
      );
    return passed === inherited ? node : <InheritedText.Provider value={passed}>{node}</InheritedText.Provider>;
  });
  Box.displayName = displayName;
  return Box;
}

export const Div = makeBox('Div');
export const Section = makeBox('Section');
export const Article = makeBox('Article');
export const Aside = makeBox('Aside');
export const Header = makeBox('Header');
export const Footer = makeBox('Footer');
export const Main = makeBox('Main');
export const Nav = makeBox('Nav');
export const Ul = makeBox('Ul');
export const Ol = makeBox('Ol');
export const Li = makeBox('Li');
export const Fieldset = makeBox('Fieldset');
export const Figure = makeBox('Figure');
export const Dl = makeBox('Dl');
export const Dt = makeBox('Dt');
export const Dd = makeBox('Dd');

/** <form onSubmit>: buttons inside it submit it, as in HTML. */
export const Form = forwardRef(function Form({ onSubmit, children, ...rest }, ref) {
  const submit = useMemo(() => (onSubmit ? () => onSubmit(domEvent()) : null), [onSubmit]);
  return (
    <FormContext.Provider value={submit}>
      <Div ref={ref} {...rest}>
        {children}
      </Div>
    </FormContext.Provider>
  );
});

/**
 * A hand-made web modal: `{open && <div className="fixed inset-0 bg-black/50 z-50 flex items-center
 * justify-center p-4" onClick={close}>...panel...</div>}`. Rendered in a Modal over everything (the
 * web's `fixed` covers the viewport); the hardware back button calls onClose (or the backdrop's onClick).
 * A panel taller than the screen should be a ScrollDiv with a max height (`max-h-[90vh]`).
 */
export function Overlay({ className, style, onClick, onClose, children, ...rest }) {
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose || onClick || (() => {})}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Div className={className} style={[StyleSheet.absoluteFill, style]} onClick={onClick} pressedStyle={{}} {...rest}>
          {children}
        </Div>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** `overflow-y-auto` / `overflow-auto`: padding, gap and alignment go to the content. */
const CONTENT_KEYS = /^(padding|gap|rowGap|columnGap|alignItems|justifyContent|flexDirection|flexWrap)/;
export const ScrollDiv = forwardRef(function ScrollDiv({ className, style, contentClassName, contentStyle, horizontal, children, ...rest }, ref) {
  const inherited = useContext(InheritedText);
  const [viewStyle, textStyle] = splitTextStyle(flat(className, style));
  const outer = {};
  const inner = {};
  Object.entries(viewStyle).forEach(([k, v]) => (CONTENT_KEYS.test(k) ? (inner[k] = v) : (outer[k] = v)));
  const passed = inheritText(inherited, textStyle);
  return (
    <InheritedText.Provider value={passed}>
      <ScrollView
        ref={ref}
        horizontal={horizontal}
        style={outer}
        contentContainerStyle={[inner, tw.style(contentClassName), contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        {...rest}
      >
        {wrapStrings(children)}
      </ScrollView>
    </InheritedText.Provider>
  );
});

/** `overflow-x-auto`: a row that scrolls sideways. */
export const HScroll = forwardRef(function HScroll(props, ref) {
  return <ScrollDiv ref={ref} horizontal {...props} />;
});

/* -------------------------------------------------------------------- text */

function makeText(displayName) {
  const T = forwardRef(function T({ className, style, onClick, numberOfLines, children, ...rest }, ref) {
    return (
      <Text ref={ref} style={[tw.style(className), style]} onPress={onClick} numberOfLines={numberOfLines ?? linesFrom(className)} {...rest}>
        {children}
      </Text>
    );
  });
  T.displayName = displayName;
  return T;
}

export const Span = makeText('Span');
export const P = makeText('P');
export const H1 = makeText('H1');
export const H2 = makeText('H2');
export const H3 = makeText('H3');
export const H4 = makeText('H4');
export const H5 = makeText('H5');
export const H6 = makeText('H6');
export const Label = makeText('Label');
export const Strong = makeText('Strong');
export const B = makeText('B');
export const Em = makeText('Em');
export const Small = makeText('Small');
export const Code = makeText('Code');
export const Pre = makeText('Pre');
[Span, Strong, B, Em, Small, Code].forEach((t) => INLINE.add(t));

/** <br /> inside a P / Span. */
export const Br = () => <Text>{'\n'}</Text>;

/** <hr className="border-slate-200" /> */
export function Hr({ className, style }) {
  return <View style={[{ height: 0, borderBottomWidth: 1, borderColor: '#E4DDCF', alignSelf: 'stretch' }, tw.style(className), style]} />;
}

/** <a href> / <Link to>: in-app paths navigate, http(s)/tel/mailto open outside. */
export const A = forwardRef(function A({ href, to, onClick, children, className, style, replace, state, ...rest }, ref) {
  const target = to ?? href;
  const press = (e) => {
    onClick?.(e);
    if (!target) return;
    const t = String(target);
    if (/^(https?:|tel:|mailto:|whatsapp:)/i.test(t)) Linking.openURL(t).catch(() => {});
    else navigateTo(t, { replace, state });
  };
  const hasElements = Children.toArray(children).some((c) => isValidElement(c) && c.type !== Span && c.type !== Strong);
  if (hasElements) {
    return (
      <Div ref={ref} onClick={press} className={className} style={style} {...rest}>
        {children}
      </Div>
    );
  }
  return (
    <Span ref={ref} onClick={press} className={className} style={style} {...rest}>
      {children}
    </Span>
  );
});

/** react-router's <Link to>. */
export const Link = A;
export const NavLink = A;

/* ------------------------------------------------------------------ button */

export const Button = forwardRef(function Button({ type, onClick, disabled, className, style, children, ...rest }, ref) {
  const submit = useContext(FormContext);
  const press = async (e) => {
    const r = onClick?.(e);
    if (submit && type !== 'button' && type !== 'reset') {
      await r;
      submit();
    }
    return r;
  };
  return (
    <Div ref={ref} onClick={press} disabled={disabled} className={className} style={[disabled && !/disabled:/.test(className || '') ? { opacity: 0.5 } : null, style]} {...rest}>
      {children}
    </Div>
  );
});

/* -------------------------------------------------------------------- icon */

/**
 * <Icon as={Plus} className="w-4 h-4 text-slate-500" /> — the web's
 * `<Plus className="w-4 h-4 text-slate-500" />`. Lucide's default is 24px and
 * `currentColor`, as on the web.
 */
export function Icon({ as: Comp, className, style, size, color, strokeWidth, fill, ...rest }) {
  const inherited = useInheritedText();
  if (!Comp) return null;
  const s = flat(className, style);
  const { width, height, color: c, ...viewStyle } = s;
  const fillMatch = String(className || '').match(/(?:^|\s)fill-([a-z]+-\d{2,3}|white|black|current)(?:\s|$)/);
  const resolvedColor = color || c || inherited.color;
  const resolvedFill = fill ?? (fillMatch ? (fillMatch[1] === 'current' ? resolvedColor : tw.color(fillMatch[1])) : undefined);
  // Pass fill / strokeWidth only when set: an explicit undefined replaces lucide's own defaults (fill="none").
  const extra = {};
  if (resolvedFill !== undefined) extra.fill = resolvedFill;
  const strokeMatch = String(className || '').match(/(?:^|\s)stroke-\[?(\d+(?:\.\d+)?)\]?(?:\s|$)/);
  if (strokeWidth !== undefined) extra.strokeWidth = strokeWidth;
  else if (strokeMatch) extra.strokeWidth = Number(strokeMatch[1]);
  return <Comp size={size ?? (typeof width === 'number' ? width : typeof height === 'number' ? height : 24)} color={resolvedColor} style={viewStyle} {...extra} {...rest} />;
}

/* --------------------------------------------------------------------- img */

function fitFrom(className) {
  const m = String(className || '').match(/(?:^|\s)object-(cover|contain|fill|none|scale-down)(?:\s|$)/);
  return m ? { cover: 'cover', contain: 'contain', fill: 'fill', none: 'none', 'scale-down': 'scale-down' }[m[1]] : 'cover';
}

/** <img src className alt />. `fallback` is shown when the image fails (the web's onError swap). */
export function Img({ src, source, alt, className, style, fallback, onError, onLoad, contentFit, ...rest }) {
  const [failed, setFailed] = useState(false);
  const uri = failed ? fallback : src;
  const resolved = source || (typeof uri === 'number' ? uri : uri ? { uri: mediaUrl(uri) } : null);
  if (!resolved) return <View style={[tw.style(className), style]} />;
  return (
    <ExpoImage
      source={resolved}
      accessibilityLabel={alt}
      contentFit={contentFit || fitFrom(className)}
      style={[tw.style(className), style]}
      onError={() => {
        if (fallback && !failed) setFailed(true);
        onError?.(domEvent({ src }));
      }}
      onLoad={onLoad}
      cachePolicy="memory-disk"
      transition={0}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------- input */

const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const hm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

function parseValue(type, value) {
  if (!value) return new Date();
  if (type === 'time') {
    const [h, m] = String(value).split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  }
  if (type === 'month') return new Date(`${value}-01T00:00:00`);
  const d = new Date(type === 'date' ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function formatValue(type, d) {
  if (type === 'time') return hm(d);
  if (type === 'month') return ymd(d).slice(0, 7);
  if (type === 'datetime-local') return `${ymd(d)}T${hm(d)}`;
  return ymd(d);
}

function openPicker({ type, value, min, max, onPick }) {
  const current = parseValue(type, value);
  const bounds = {};
  if (min && type !== 'time') bounds.minimumDate = parseValue(type, min);
  if (max && type !== 'time') bounds.maximumDate = parseValue(type, max);
  const pickTime = (base) =>
    DateTimePickerAndroid.open({
      value: base,
      mode: 'time',
      is24Hour: false,
      onChange: (ev, t) => {
        if (ev.type !== 'set' || !t) return;
        const d = new Date(base);
        d.setHours(t.getHours(), t.getMinutes(), 0, 0);
        onPick(formatValue(type, d));
      },
    });
  if (type === 'time') {
    pickTime(current);
    return;
  }
  DateTimePickerAndroid.open({
    value: current,
    mode: 'date',
    ...bounds,
    onChange: (ev, d) => {
      if (ev.type !== 'set' || !d) return;
      if (type === 'datetime-local') {
        const base = new Date(d);
        base.setHours(current.getHours(), current.getMinutes(), 0, 0);
        pickTime(base);
      } else onPick(formatValue(type, d));
    },
  });
}

/** A ticked box: `<input type="checkbox">` drawn like the browser's default (accent blue). */
export function CheckBox({ checked, onChange, disabled, className, style, name, value, accent = '#2563EB' }) {
  const s = flat(className, style);
  const size = typeof s.width === 'number' ? s.width : 16;
  return (
    <Pressable
      onPress={() => !disabled && onChange?.(domEvent({ checked: !checked, value: value ?? 'on', name, type: 'checkbox' }))}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(checked), disabled: Boolean(disabled) }}
      hitSlop={10}
      style={[{ width: size, height: size, borderRadius: 3, borderWidth: 1.5, borderColor: checked ? accent : '#767676', backgroundColor: checked ? accent : '#FFFFFF', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }, s, { width: size, height: size }]}
    >
      {checked ? <Check size={size - 4} color="#FFFFFF" strokeWidth={3} /> : null}
    </Pressable>
  );
}

function RadioDot({ checked, onChange, disabled, className, style, name, value, accent = '#2563EB' }) {
  const s = flat(className, style);
  const size = typeof s.width === 'number' ? s.width : 16;
  return (
    <Pressable
      onPress={() => !disabled && onChange?.(domEvent({ checked: true, value: value ?? 'on', name, type: 'radio' }))}
      accessibilityRole="radio"
      accessibilityState={{ checked: Boolean(checked), disabled: Boolean(disabled) }}
      hitSlop={10}
      style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: checked ? accent : '#767676', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }, s, { width: size, height: size }]}
    >
      {checked ? <View style={{ width: size / 2, height: size / 2, borderRadius: size / 4, backgroundColor: accent }} /> : null}
    </Pressable>
  );
}

const KEYBOARD = { number: 'decimal-pad', tel: 'phone-pad', email: 'email-address', url: 'url', search: 'default' };

/**
 * <input>. `onChange(e)` gets e.target.value as a string (as the DOM gives it);
 * `onChangeText(text)` works too. Enter -> onKeyDown({ key: 'Enter' }) / onSubmitEditing.
 */
export const Input = forwardRef(function Input(
  { type = 'text', value, defaultValue, onChange, onChangeText, onKeyDown, onKeyPress, onBlur, onFocus, name, placeholder, disabled, readOnly, className, style, min, max, maxLength, autoFocus, checked, accept, multiple, step, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  if (type === 'checkbox') return <CheckBox checked={checked} onChange={onChange} disabled={disabled} className={className} style={style} name={name} value={value} />;
  if (type === 'radio') return <RadioDot checked={checked} onChange={onChange} disabled={disabled} className={className} style={style} name={name} value={value} />;
  if (type === 'hidden') return null;

  const s = flat(className, style, { disabled });
  const emit = (text) => {
    onChangeText?.(text);
    onChange?.(domEvent({ value: text, name, type }));
  };

  if (type === 'date' || type === 'time' || type === 'datetime-local' || type === 'month') {
    const [viewStyle, textStyle] = splitTextStyle(s);
    const shown = value ? String(value).replace('T', ' ') : '';
    return (
      <Pressable
        ref={ref}
        disabled={disabled || readOnly}
        onPress={() => openPicker({ type, value, min, max, onPick: emit })}
        accessibilityRole="button"
        accessibilityLabel={placeholder || name || type}
        style={[{ justifyContent: 'center' }, viewStyle, disabled && { opacity: 0.5 }]}
      >
        <Text style={[textStyle, !shown && { color: '#90A1B9' }]} numberOfLines={1}>
          {shown || placeholder || (type === 'time' ? '--:--' : 'dd-mm-yyyy')}
        </Text>
      </Pressable>
    );
  }

  return (
    <TextInput
      ref={ref}
      value={value == null ? undefined : String(value)}
      defaultValue={defaultValue == null ? undefined : String(defaultValue)}
      onChangeText={emit}
      placeholder={placeholder}
      editable={!disabled && !readOnly}
      secureTextEntry={type === 'password'}
      keyboardType={KEYBOARD[type] || 'default'}
      autoCapitalize={type === 'email' || type === 'password' || type === 'url' ? 'none' : 'sentences'}
      autoCorrect={type !== 'email' && type !== 'password'}
      maxLength={maxLength}
      autoFocus={autoFocus}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(domEvent({ value: value == null ? '' : String(value), name, type }, e?.nativeEvent));
      }}
      onSubmitEditing={() => {
        onKeyDown?.(domEvent({ value, name, key: 'Enter' }));
        onKeyPress?.(domEvent({ value, name, key: 'Enter' }));
      }}
      returnKeyType={type === 'search' ? 'search' : 'done'}
      style={[{ paddingVertical: 0 }, s, disabled && { opacity: 0.5 }, focused && s.borderWidth ? { borderColor: '#171717' } : null]}
      {...rest}
    />
  );
});

/** <textarea rows>. */
export const Textarea = forwardRef(function Textarea({ value, onChange, onChangeText, rows = 3, name, placeholder, disabled, readOnly, className, style, maxLength, ...rest }, ref) {
  const s = flat(className, style, { disabled });
  const lh = s.lineHeight || 20;
  return (
    <TextInput
      ref={ref}
      multiline
      textAlignVertical="top"
      value={value == null ? undefined : String(value)}
      onChangeText={(text) => {
        onChangeText?.(text);
        onChange?.(domEvent({ value: text, name, type: 'textarea' }));
      }}
      placeholder={placeholder}
      editable={!disabled && !readOnly}
      maxLength={maxLength}
      style={[{ minHeight: rows * lh + (s.paddingTop || 8) + (s.paddingBottom || 8) }, s, disabled && { opacity: 0.5 }]}
      {...rest}
    />
  );
});

/* ------------------------------------------------------------------ select */

/** <option value>label</option> inside <Select>. */
export function Option() {
  return null;
}
/** <optgroup label> inside <Select>. */
export function Optgroup() {
  return null;
}

function collectOptions(children, out = [], group = null) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Option) {
      const label = Children.toArray(child.props.children).join('');
      out.push({ value: child.props.value ?? label, label, disabled: child.props.disabled, group });
    } else if (child.type === Optgroup) collectOptions(child.props.children, out, child.props.label);
    else if (child.type === Fragment) collectOptions(child.props.children, out, group);
  });
  return out;
}

/**
 * <select value onChange className><Option value="x">X</Option></select>, or
 * `options={[{ value, label }]}`. The list opens as a bottom sheet (the
 * platform's picker in place of the browser's).
 */
export function Select({ value, onChange, onValueChange, options, children, name, disabled, className, style, placeholder, ...rest }) {
  const [open, setOpen] = useState(false);
  const list = options || collectOptions(children);
  const current = list.find((o) => String(o.value) === String(value ?? ''));
  const s = flat(className, style, { disabled });
  const [viewStyle, textStyle] = splitTextStyle(s);
  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open, disabled: Boolean(disabled) }}
        style={[{ flexDirection: 'row', alignItems: 'center' }, viewStyle, disabled && { opacity: 0.5 }]}
        {...rest}
      >
        <Text style={[{ flex: 1 }, textStyle]} numberOfLines={1}>
          {current?.label ?? placeholder ?? ''}
        </Text>
        <ChevronDown size={16} color={textStyle.color || '#62748E'} />
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View style={sheet.panel}>
          <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
            {list.map((o, i) => {
              const selected = String(o.value) === String(value ?? '');
              const showGroup = o.group && o.group !== list[i - 1]?.group;
              return (
                <Fragment key={`${o.group || ''}:${o.value}:${i}`}>
                  {showGroup ? <Text style={sheet.group}>{o.group}</Text> : null}
                  <Pressable
                    disabled={o.disabled}
                    onPress={() => {
                      setOpen(false);
                      onValueChange?.(o.value);
                      onChange?.(domEvent({ value: String(o.value), name, type: 'select' }));
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected, disabled: Boolean(o.disabled) }}
                    style={({ pressed }) => [sheet.row, pressed && { backgroundColor: '#F8FAFC' }, o.disabled && { opacity: 0.4 }]}
                  >
                    <Text style={[sheet.text, selected && { fontWeight: '600', color: '#0F172B' }]}>{o.label}</Text>
                    {selected ? <Check size={18} color="#0F172B" /> : null}
                  </Pressable>
                </Fragment>
              );
            })}
          </ScrollView>
        </View>
      </BottomSheet>
    </>
  );
}

const sheet = StyleSheet.create({
  panel: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 8, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 20 },
  text: { fontSize: 15, lineHeight: 22, color: '#314158', flex: 1 },
  group: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: '#62748E', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, textTransform: 'uppercase' },
});

/* ------------------------------------------------------------------- table */

const TableContext = createContext({ cols: [], defaultWidth: 140 });
const RowContext = createContext(null);

/**
 * <Table cols={[60, 180, 120]} className="w-full text-sm"> ... </Table>
 * scrolls sideways like the web's `overflow-x-auto` wrapper. Each Th/Td takes
 * the width of its column (or `w`, or `defaultWidth`); `colSpan` adds widths.
 */
export function Table({ cols = [], defaultWidth = 140, className, style, children, scroll = true }) {
  const value = useMemo(() => ({ cols, defaultWidth }), [cols, defaultWidth]);
  const body = (
    <Div className={className} style={style}>
      {children}
    </Div>
  );
  return (
    <TableContext.Provider value={value}>
      {scroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </TableContext.Provider>
  );
}

export const Thead = makeBox('Thead');
export const Tbody = makeBox('Tbody');
export const Tfoot = makeBox('Tfoot');

export function Tr({ className, style, children, onClick, ...rest }) {
  let index = 0;
  const cells = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const span = Number(child.props.colSpan) || 1;
    const el = <RowContext.Provider value={{ index, span }}>{child}</RowContext.Provider>;
    index += span;
    return el;
  });
  return (
    <Div className={cn2('flex flex-row', className)} style={style} onClick={onClick} {...rest}>
      {cells}
    </Div>
  );
}

const cn2 = (a, b) => `${a} ${b || ''}`;

function useCellWidth(w) {
  const { cols, defaultWidth } = useContext(TableContext);
  const pos = useContext(RowContext);
  if (w != null) return w;
  if (!pos) return defaultWidth;
  let total = 0;
  for (let i = pos.index; i < pos.index + pos.span; i += 1) total += cols[i] ?? defaultWidth;
  return total;
}

function makeCell(displayName, baseClass) {
  const Cell = function Cell({ w, className, style, children, onClick, numberOfLines, ...rest }) {
    const width = useCellWidth(w);
    const lines = numberOfLines ?? linesFrom(className);
    const content = Children.map(children, (c) =>
      typeof c === 'string' || typeof c === 'number' ? (
        <Text numberOfLines={lines}>{c}</Text>
      ) : (
        c
      ),
    );
    return (
      <Div className={cn2(baseClass, className)} style={[{ width }, style]} onClick={onClick} {...rest}>
        {content}
      </Div>
    );
  };
  Cell.displayName = displayName;
  return Cell;
}

/** <th>: `px-2 h-10 font-medium text-left`, vertically centred (the web's align-middle). */
export const Th = makeCell('Th', 'justify-center');
/** <td>: vertically centred, like `align-middle`. */
export const Td = makeCell('Td', 'justify-center');
