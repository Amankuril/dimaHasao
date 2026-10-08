/*
 * The web's shadcn/ui kit (Frontend/src/modules/Food/components/ui/*.tsx) for
 * React Native: same component names, same props (`open` / `onOpenChange`,
 * `value` / `onValueChange`, `checked` / `onCheckedChange`, `asChild`), same
 * base classes, and `className` overrides merged after them as twMerge does.
 *
 *   Button Input Textarea Label Badge Skeleton Card* Switch Checkbox
 *   RadioGroup RadioGroupItem Tabs* Dialog* AlertDialog* Sheet* Select*
 *   DropdownMenu* Popover*
 *
 * Overlays (Dialog, Sheet, Select, DropdownMenu, Popover) render in a Modal.
 * Select / DropdownMenu / Popover open anchored under their trigger, as Radix
 * places them, flipped above it when there is no room below.
 */
import { Children, Fragment, cloneElement, createContext, forwardRef, isValidElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown, Circle, X } from 'lucide-react-native';
import { cn, tw } from '../lib/tw';
import { useAnimatedValue } from '../lib/useAnimatedValue';
import { InheritedText, Text, inheritText, splitTextStyle } from './Text';
import { Div, Icon, Input as WebInput, Textarea as WebTextarea, domEvent, wrapStrings } from './web';

const flat = (...classes) => StyleSheet.flatten(tw.style(cn(...classes))) || {};

/** Radix `asChild`: give the child the press handler instead of wrapping it. */
function Slot({ asChild, children, onPress, ...rest }) {
  if (asChild && isValidElement(children)) {
    const own = children.props.onClick || children.props.onPress;
    return cloneElement(children, {
      ...rest,
      onClick: (e) => {
        own?.(e);
        onPress?.(e);
      },
    });
  }
  return (
    <Div onClick={onPress} {...rest}>
      {children}
    </Div>
  );
}

/** Something that measures where it is on screen (for anchored overlays). */
function useAnchor() {
  const ref = useRef(null);
  const [rect, setRect] = useState(null);
  const measure = useCallback(
    () =>
      new Promise((resolve) => {
        const node = ref.current;
        if (!node?.measureInWindow) {
          resolve(null);
          return;
        }
        node.measureInWindow((x, y, width, height) => {
          const r = { x, y, width, height };
          setRect(r);
          resolve(r);
        });
      }),
    [],
  );
  return { ref, rect, measure };
}

/* ------------------------------------------------------------------ button */

const BUTTON_VARIANTS = {
  default: 'bg-primary text-primary-foreground shadow-xs',
  destructive: 'bg-destructive text-white',
  outline: 'border border-input bg-background text-foreground shadow-xs',
  secondary: 'bg-secondary text-secondary-foreground',
  ghost: '',
  link: 'text-primary',
};
const BUTTON_SIZES = { default: 'h-9 px-4 py-2', sm: 'h-8 rounded-md gap-1.5 px-3', lg: 'h-10 rounded-md px-6', icon: 'size-9' };

export const Button = forwardRef(function Button({ variant = 'default', size = 'default', className, style, disabled, onClick, onPress, asChild, children, ...rest }, ref) {
  const classes = cn('flex items-center justify-center gap-2 rounded-md text-sm font-medium', BUTTON_VARIANTS[variant] ?? '', BUTTON_SIZES[size] ?? '', className);
  if (asChild && isValidElement(children)) return cloneElement(children, { className: cn(classes, children.props.className), disabled, onClick: onClick || onPress });
  return (
    <Div ref={ref} className={classes} style={[disabled ? { opacity: 0.5 } : null, style]} onClick={onClick || onPress} disabled={disabled} {...rest}>
      {children}
    </Div>
  );
});

/* ------------------------------------------------------------------- input */

export const Input = forwardRef(function Input({ className, ...rest }, ref) {
  return <WebInput ref={ref} className={cn('h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base text-foreground shadow-xs', className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...rest }, ref) {
  return <WebTextarea ref={ref} className={cn('min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs', className)} {...rest} />;
});

export function Label({ className, style, children, ...rest }) {
  return (
    <Text style={[flat('text-sm leading-none font-medium', className), style]} {...rest}>
      {children}
    </Text>
  );
}

/* ------------------------------------------------------- badge / skeleton */

const BADGE_VARIANTS = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive: 'border-transparent bg-destructive text-white',
  outline: 'text-foreground',
};

export function Badge({ variant = 'default', className, style, children, ...rest }) {
  return (
    <Div className={cn('flex self-start items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 gap-1 overflow-hidden', BADGE_VARIANTS[variant], className)} style={style} {...rest}>
      {children}
    </Div>
  );
}

export function Skeleton({ className, style }) {
  const pulse = useAnimatedValue(1);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[flat('rounded-md bg-slate-200/80', className), style, { opacity: pulse }]} />;
}

/* -------------------------------------------------------------------- card */

export const Card = forwardRef(function Card({ className, ...rest }, ref) {
  return <Div ref={ref} className={cn('bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm', className)} {...rest} />;
});
export function CardHeader({ className, ...rest }) {
  return <Div className={cn('flex flex-col items-start gap-2 px-6', className)} {...rest} />;
}
export function CardTitle({ className, ...rest }) {
  return <Div className={cn('leading-none font-semibold', className)} {...rest} />;
}
export function CardDescription({ className, ...rest }) {
  return <Div className={cn('text-muted-foreground text-sm', className)} {...rest} />;
}
export function CardAction({ className, ...rest }) {
  return <Div className={cn('self-end', className)} {...rest} />;
}
export function CardContent({ className, ...rest }) {
  return <Div className={cn('px-6', className)} {...rest} />;
}
export function CardFooter({ className, ...rest }) {
  return <Div className={cn('flex items-center px-6', className)} {...rest} />;
}

/* ------------------------------------------------- switch / checkbox / radio */

export function Switch({ checked, onCheckedChange, disabled, className, style }) {
  const x = useAnimatedValue(checked ? 1 : 0);
  useEffect(() => {
    Animated.timing(x, { toValue: checked ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [checked, x]);
  return (
    <Pressable
      onPress={() => !disabled && onCheckedChange?.(!checked)}
      accessibilityRole="switch"
      accessibilityState={{ checked: Boolean(checked), disabled: Boolean(disabled) }}
      hitSlop={8}
      style={[flat('h-6 w-11 shrink-0 justify-center rounded-full border-2 border-transparent', checked ? 'bg-[#16a34a]' : 'bg-gray-200', className), disabled && { opacity: 0.5 }, style]}
    >
      <Animated.View style={[flat('h-5 w-5 rounded-full bg-white shadow-lg'), { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
    </Pressable>
  );
}

/** Radix checkbox; the web gives it no base classes, so the page's own classes draw it. */
export function Checkbox({ checked, onCheckedChange, disabled, className, style, id }) {
  const s = flat('h-4 w-4 rounded-[4px] border border-input', checked && 'bg-primary border-primary', className);
  const size = typeof s.width === 'number' ? s.width : 16;
  return (
    <Pressable
      nativeID={id}
      onPress={() => !disabled && onCheckedChange?.(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(checked), disabled: Boolean(disabled) }}
      hitSlop={10}
      style={[{ alignItems: 'center', justifyContent: 'center' }, s, disabled && { opacity: 0.5 }, style]}
    >
      {checked ? <Check size={Math.max(10, size - 2)} color={s.color || '#1B0400'} strokeWidth={3} /> : null}
    </Pressable>
  );
}

const RadioContext = createContext(null);

export function RadioGroup({ value, defaultValue, onValueChange, disabled, className, style, children }) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const ctx = useMemo(
    () => ({
      value: current,
      disabled,
      select: (v) => {
        setInner(v);
        onValueChange?.(v);
      },
    }),
    [current, disabled, onValueChange],
  );
  return (
    <RadioContext.Provider value={ctx}>
      <Div className={cn('flex flex-col gap-2', className)} style={style}>
        {children}
      </Div>
    </RadioContext.Provider>
  );
}

export function RadioGroupItem({ value, id, disabled, className, style }) {
  const ctx = useContext(RadioContext);
  const checked = ctx?.value === value;
  const off = disabled || ctx?.disabled;
  return (
    <Pressable
      nativeID={id}
      onPress={() => !off && ctx?.select(value)}
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled: Boolean(off) }}
      hitSlop={10}
      style={[flat('h-4 w-4 rounded-full border-2 border-gray-300 items-center justify-center', checked && 'border-blue-600 bg-blue-600', className), off && { opacity: 0.5 }, style]}
    >
      {checked ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} /> : null}
    </Pressable>
  );
}

/* -------------------------------------------------------------------- tabs */

const TabsContext = createContext({ value: undefined, onValueChange: () => {} });

export function Tabs({ defaultValue, value, onValueChange, className, style, children }) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const ctx = useMemo(
    () => ({
      value: current,
      onValueChange: (v) => {
        setInner(v);
        onValueChange?.(v);
      },
    }),
    [current, onValueChange],
  );
  return (
    <TabsContext.Provider value={ctx}>
      <Div className={cn('w-full', className)} style={style}>
        {children}
      </Div>
    </TabsContext.Provider>
  );
}
export function TabsList({ className, style, children }) {
  return (
    <Div className={cn('flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)} style={style}>
      {children}
    </Div>
  );
}
export function TabsTrigger({ value, className, style, children, disabled }) {
  const ctx = useContext(TabsContext);
  const selected = ctx.value === value;
  return (
    <Div
      className={cn('flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium', selected && 'bg-background text-foreground shadow-sm', className)}
      style={style}
      onClick={() => ctx.onValueChange(value)}
      disabled={disabled}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
    >
      {children}
    </Div>
  );
}
export function TabsContent({ value, className, style, children }) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return (
    <Div className={cn('mt-2', className)} style={style}>
      {children}
    </Div>
  );
}

/* ------------------------------------------------------------------ dialog */

const DialogContext = createContext({ open: false, setOpen: () => {} });

function useOpenState(open, defaultOpen, onOpenChange) {
  const [inner, setInner] = useState(Boolean(defaultOpen));
  const current = open ?? inner;
  const setOpen = useCallback(
    (v) => {
      setInner(v);
      onOpenChange?.(v);
    },
    [onOpenChange],
  );
  return [current, setOpen];
}

export function Dialog({ open, defaultOpen, onOpenChange, children }) {
  const [current, setOpen] = useOpenState(open, defaultOpen, onOpenChange);
  const ctx = useMemo(() => ({ open: current, setOpen }), [current, setOpen]);
  return <DialogContext.Provider value={ctx}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ asChild, children, ...rest }) {
  const { setOpen } = useContext(DialogContext);
  return (
    <Slot asChild={asChild} onPress={() => setOpen(true)} {...rest}>
      {children}
    </Slot>
  );
}

export function DialogClose({ asChild, children, ...rest }) {
  const { setOpen } = useContext(DialogContext);
  return (
    <Slot asChild={asChild} onPress={() => setOpen(false)} {...rest}>
      {children}
    </Slot>
  );
}

const CONTENT_KEYS = /^(padding|gap|rowGap|columnGap|alignItems|justifyContent|flexDirection|flexWrap)/;

/** Panel classes split between the panel (size, border, background) and its scrolling content (padding, gap). */
function splitPanel(style) {
  const panel = {};
  const content = {};
  Object.entries(style).forEach(([k, v]) => (CONTENT_KEYS.test(k) ? (content[k] = v) : (panel[k] = v)));
  return [panel, content];
}

/**
 * The centred panel: `w-[calc(100%-1.5rem)] max-w-lg rounded-2xl border bg-card
 * shadow-2xl`, with the round close button at top-right unless
 * showCloseButton={false}. Content taller than the screen scrolls inside it.
 */
export function DialogContent({ className, style, children, showCloseButton = true, onInteractOutside, onEscapeKeyDown, onPointerDownOutside }) {
  const { open, setOpen } = useContext(DialogContext);
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const inherited = useContext(InheritedText);
  const anim = useAnimatedValue(0);
  useEffect(() => {
    if (open) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [open, anim]);
  if (!open) return null;
  const s = flat('rounded-2xl border border-border bg-card text-card-foreground shadow-2xl', className);
  const [viewStyle, textStyle] = splitTextStyle(StyleSheet.flatten([s, style]));
  const [panel, content] = splitPanel(viewStyle);
  const maxW = Math.min(typeof panel.maxWidth === 'number' ? panel.maxWidth : 512, width - 24);
  const close = () => {
    const evt = domEvent();
    let prevented = false;
    evt.preventDefault = () => {
      prevented = true;
    };
    onInteractOutside?.(evt);
    onPointerDownOutside?.(evt);
    if (!prevented) setOpen(false);
  };
  return (
    <Modal visible transparent animationType="none" onRequestClose={() => {
      const evt = domEvent();
      let prevented = false;
      evt.preventDefault = () => {
        prevented = true;
      };
      onEscapeKeyDown?.(evt);
      if (!prevented) setOpen(false);
    }} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={close} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          style={[
            panel,
            { width: width - 24, maxWidth: maxW, maxHeight: Math.min(typeof panel.maxHeight === 'number' ? panel.maxHeight : Infinity, height - insets.top - insets.bottom - 32), overflow: 'hidden' },
            { position: 'relative', top: undefined, left: undefined, right: undefined, bottom: undefined },
            { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
          ]}
        >
          <InheritedText.Provider value={inheritText(inherited, textStyle)}>
            <ScrollView contentContainerStyle={content} keyboardShouldPersistTaps="handled" bounces={false}>
              {wrapStrings(children)}
            </ScrollView>
          </InheritedText.Provider>
          {showCloseButton ? (
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={[flat('absolute right-5 top-5 rounded-full p-2 bg-gray-50 border border-gray-200/60')]}>
              <X size={20} color="#6A7282" strokeWidth={2.5} />
            </Pressable>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function DialogHeader({ className, ...rest }) {
  return <Div className={cn('flex flex-col gap-2 text-center', className)} {...rest} />;
}
export function DialogFooter({ className, ...rest }) {
  return <Div className={cn('flex flex-col-reverse gap-2', className)} {...rest} />;
}
export function DialogTitle({ className, style, children, ...rest }) {
  return (
    <Text style={[flat('text-lg leading-none font-semibold', className), style]} accessibilityRole="header" {...rest}>
      {children}
    </Text>
  );
}
export function DialogDescription({ className, style, children, ...rest }) {
  return (
    <Text style={[flat('text-muted-foreground text-sm', className), style]} {...rest}>
      {children}
    </Text>
  );
}
export const DialogPortal = Fragment;
export const DialogOverlay = () => null;

/* Radix AlertDialog: the same panel, no close button, closes only through its buttons. */
export const AlertDialog = Dialog;
export const AlertDialogTrigger = DialogTrigger;
export function AlertDialogContent(props) {
  return <DialogContent showCloseButton={false} onInteractOutside={(e) => e.preventDefault()} className={cn('p-6 gap-4', props.className)} {...props} />;
}
export const AlertDialogHeader = DialogHeader;
export const AlertDialogFooter = DialogFooter;
export const AlertDialogTitle = DialogTitle;
export const AlertDialogDescription = DialogDescription;
export function AlertDialogAction({ onClick, className, children, ...rest }) {
  const { setOpen } = useContext(DialogContext);
  return (
    <Button
      className={className}
      onClick={async (e) => {
        await onClick?.(e);
        setOpen(false);
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}
export function AlertDialogCancel({ onClick, className, children, ...rest }) {
  const { setOpen } = useContext(DialogContext);
  return (
    <Button
      variant="outline"
      className={className}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}

/* ------------------------------------------------------------------- sheet */

export const Sheet = Dialog;
export const SheetTrigger = DialogTrigger;
export const SheetClose = DialogClose;

export function SheetContent({ side = 'right', className, style, children, showCloseButton = true }) {
  const { open, setOpen } = useContext(DialogContext);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const inherited = useContext(InheritedText);
  const anim = useAnimatedValue(0);
  useEffect(() => {
    if (open) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  }, [open, anim]);
  if (!open) return null;
  const horizontal = side === 'left' || side === 'right';
  const base = {
    right: 'absolute top-0 bottom-0 right-0 w-3/4 border-l',
    left: 'absolute top-0 bottom-0 left-0 w-3/4 border-r',
    top: 'absolute left-0 right-0 top-0 border-b',
    bottom: 'absolute left-0 right-0 bottom-0 border-t',
  }[side];
  const s = flat('bg-background flex flex-col gap-4 shadow-lg', base, className);
  const [viewStyle, textStyle] = splitTextStyle(StyleSheet.flatten([s, style]));
  const [panel, content] = splitPanel(viewStyle);
  const from = side === 'right' ? width : side === 'left' ? -width : side === 'top' ? -height : height;
  const translate = anim.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  return (
    <Modal visible transparent animationType="none" onRequestClose={() => setOpen(false)} statusBarTranslucent navigationBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={() => setOpen(false)} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        style={[
          panel,
          horizontal ? { paddingTop: insets.top, paddingBottom: insets.bottom } : side === 'bottom' ? { paddingBottom: insets.bottom } : { paddingTop: insets.top },
          { transform: [horizontal ? { translateX: translate } : { translateY: translate }] },
        ]}
      >
        <InheritedText.Provider value={inheritText(inherited, textStyle)}>
          <ScrollView contentContainerStyle={[content, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
            {wrapStrings(children)}
          </ScrollView>
        </InheritedText.Provider>
        {showCloseButton ? (
          <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={{ position: 'absolute', right: 16, top: 16 + (horizontal || side === 'top' ? insets.top : 0), opacity: 0.7 }}>
            <X size={16} color="#270E01" />
          </Pressable>
        ) : null}
      </Animated.View>
    </Modal>
  );
}
export function SheetHeader({ className, ...rest }) {
  return <Div className={cn('flex flex-col gap-1.5 p-4', className)} {...rest} />;
}
export function SheetFooter({ className, ...rest }) {
  return <Div className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...rest} />;
}
export function SheetTitle({ className, style, children }) {
  return <Text style={[flat('text-foreground font-semibold', className), style]}>{children}</Text>;
}
export function SheetDescription({ className, style, children }) {
  return <Text style={[flat('text-muted-foreground text-sm', className), style]}>{children}</Text>;
}

/* ---------------------------------------------------------- anchored panel */

/**
 * A panel that opens under (or above) an anchor rect, `align` start/center/end,
 * clamped to the screen. Tapping outside closes it.
 */
function AnchoredPanel({ visible, anchor, onClose, align = 'start', sideOffset = 4, matchWidth = false, minWidth = 128, style, children, maxHeight }) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState(null);
  const anim = useAnimatedValue(0);
  useEffect(() => {
    if (visible) {
      setSize(null);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    }
  }, [visible, anim]);
  if (!visible || !anchor) return null;
  const panelW = matchWidth ? Math.max(anchor.width, minWidth) : undefined;
  const w = size?.width ?? panelW ?? minWidth;
  const h = size?.height ?? 0;
  let left = align === 'end' ? anchor.x + anchor.width - w : align === 'center' ? anchor.x + anchor.width / 2 - w / 2 : anchor.x;
  left = Math.max(8, Math.min(left, W - w - 8));
  const below = anchor.y + anchor.height + sideOffset;
  const roomBelow = H - insets.bottom - below - 8;
  const roomAbove = anchor.y - sideOffset - insets.top - 8;
  const flip = size && h > roomBelow && roomAbove > roomBelow;
  const top = flip ? Math.max(insets.top + 8, anchor.y - sideOffset - h) : below;
  const limit = Math.max(120, Math.min(maxHeight ?? Infinity, flip ? roomAbove : roomBelow));
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (!size || Math.abs(size.width - width) > 1 || Math.abs(size.height - height) > 1) setSize({ width, height });
        }}
        style={[{ position: 'absolute', left, top, maxHeight: limit, maxWidth: W - 16 }, panelW ? { width: panelW } : { minWidth }, style, { opacity: size ? anim : 0 }]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ select */

const SelectContext = createContext(null);

function collectItems(children, out = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === SelectItem) {
      out.push({ value: child.props.value, label: child.props.children });
      return;
    }
    if (child.props?.children) collectItems(child.props.children, out);
  });
  return out;
}

/**
 * <Select value onValueChange><SelectTrigger><SelectValue placeholder /></SelectTrigger>
 * <SelectContent><SelectItem value>Label</SelectItem></SelectContent></Select>
 */
export function Select({ value, defaultValue, onValueChange, disabled, open: openProp, onOpenChange, children }) {
  const [inner, setInner] = useState(defaultValue);
  const [open, setOpen] = useOpenState(openProp, false, onOpenChange);
  const anchor = useAnchor();
  const current = value ?? inner;
  const items = collectItems(children);
  const ctx = {
    value: current,
    disabled,
    open,
    setOpen,
    anchor,
    label: items.find((i) => String(i.value) === String(current ?? ''))?.label,
    select: (v) => {
      setInner(v);
      setOpen(false);
      onValueChange?.(v);
    },
  };
  return <SelectContext.Provider value={ctx}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ className, style, children, size = 'default', id }) {
  const ctx = useContext(SelectContext);
  return (
    <View ref={ctx.anchor.ref} collapsable={false} nativeID={id} style={style}>
      <Div
        className={cn('flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs', size === 'sm' ? 'h-8' : 'h-9', className)}
        onClick={async () => {
          if (ctx.disabled) return;
          await ctx.anchor.measure();
          ctx.setOpen(true);
        }}
        disabled={ctx.disabled}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: ctx.open, disabled: Boolean(ctx.disabled) }}
      >
        <Div className="flex-1 flex-row items-center gap-2 min-w-0">{children}</Div>
        <ChevronDown size={16} color="#7B5B4A" style={{ opacity: 0.5 }} />
      </Div>
    </View>
  );
}

export function SelectValue({ placeholder, className, children }) {
  const ctx = useContext(SelectContext);
  const shown = children ?? ctx.label;
  const empty = shown == null || shown === '';
  if (!empty && typeof shown !== 'string' && typeof shown !== 'number') return <Div className={cn('flex-row items-center gap-2', className)}>{shown}</Div>;
  return (
    <Text numberOfLines={1} style={[flat(className), empty && { color: '#7B5B4A' }]}>
      {empty ? placeholder : shown}
    </Text>
  );
}

export function SelectContent({ className, style, children, align = 'start' }) {
  const ctx = useContext(SelectContext);
  return (
    <AnchoredPanel visible={ctx.open} anchor={ctx.anchor.rect} onClose={() => ctx.setOpen(false)} align={align} matchWidth maxHeight={192 * 1.6}>
      <View style={[flat('rounded-md border border-border bg-popover shadow-lg overflow-hidden', className), style]}>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={flat('p-1')} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {children}
        </ScrollView>
      </View>
    </AnchoredPanel>
  );
}

export function SelectItem({ value, disabled, className, style, children }) {
  const ctx = useContext(SelectContext);
  const selected = String(ctx?.value ?? '') === String(value);
  return (
    <Div
      className={cn('relative flex w-full items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm border-b border-border', className)}
      style={style}
      onClick={() => ctx?.select(value)}
      disabled={disabled}
      pressedStyle={{ backgroundColor: '#FFDEA9' }}
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
    >
      {children}
      {selected ? (
        <View style={{ position: 'absolute', right: 8 }}>
          <Check size={16} color="#270E01" />
        </View>
      ) : null}
    </Div>
  );
}

export function SelectGroup({ children }) {
  return <>{children}</>;
}
export function SelectLabel({ className, children }) {
  return <Text style={flat('text-muted-foreground px-2 py-1.5 text-xs', className)}>{children}</Text>;
}
export function SelectSeparator({ className }) {
  return <View style={flat('bg-border -mx-1 my-1 h-px', className)} />;
}

/* ----------------------------------------------------------- dropdown menu */

const MenuContext = createContext(null);

export function DropdownMenu({ open: openProp, defaultOpen, onOpenChange, children }) {
  const [open, setOpen] = useOpenState(openProp, defaultOpen, onOpenChange);
  const anchor = useAnchor();
  const ctx = useMemo(() => ({ open, setOpen, anchor }), [open, setOpen, anchor]);
  return <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>;
}

export function DropdownMenuTrigger({ asChild, children, className, style, disabled }) {
  const ctx = useContext(MenuContext);
  const openMenu = async () => {
    if (disabled) return;
    await ctx.anchor.measure();
    ctx.setOpen(true);
  };
  return (
    <View ref={ctx.anchor.ref} collapsable={false} style={[{ alignSelf: 'flex-start' }, style]}>
      <Slot asChild={asChild} onPress={openMenu} className={asChild ? undefined : className}>
        {children}
      </Slot>
    </View>
  );
}

export function DropdownMenuContent({ className, style, children, align = 'start', sideOffset = 4 }) {
  const ctx = useContext(MenuContext);
  const inherited = useContext(InheritedText);
  return (
    <AnchoredPanel visible={ctx.open} anchor={ctx.anchor.rect} onClose={() => ctx.setOpen(false)} align={align} sideOffset={sideOffset}>
      <View style={[flat('min-w-[8rem] rounded-md border border-border bg-popover p-1 shadow-md overflow-hidden', className), style]}>
        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          <InheritedText.Provider value={inheritText(inherited, { color: '#270E01' })}>{wrapStrings(children)}</InheritedText.Provider>
        </ScrollView>
      </View>
    </AnchoredPanel>
  );
}

export function DropdownMenuItem({ onClick, onSelect, disabled, className, style, children, variant, inset, asChild }) {
  const ctx = useContext(MenuContext);
  const press = async (e) => {
    ctx?.setOpen(false);
    await onSelect?.(e);
    await onClick?.(e);
  };
  if (asChild && isValidElement(children)) return cloneElement(children, { onClick: press });
  return (
    <Div
      className={cn('relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm', inset && 'pl-8', variant === 'destructive' && 'text-destructive', className)}
      style={style}
      onClick={press}
      disabled={disabled}
      pressedStyle={{ backgroundColor: '#FFDEA9' }}
      accessibilityRole="menuitem"
    >
      {children}
    </Div>
  );
}

export function DropdownMenuCheckboxItem({ checked, onCheckedChange, disabled, className, children }) {
  return (
    <Div className={cn('relative flex items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm', className)} onClick={() => onCheckedChange?.(!checked)} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(checked) }}>
      <View style={{ position: 'absolute', left: 8, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>{checked ? <Check size={16} color="#270E01" /> : null}</View>
      {children}
    </Div>
  );
}

export function DropdownMenuRadioGroup({ value, onValueChange, children }) {
  return <RadioContext.Provider value={{ value, select: onValueChange }}>{children}</RadioContext.Provider>;
}
export function DropdownMenuRadioItem({ value, className, children }) {
  const ctx = useContext(RadioContext);
  const menu = useContext(MenuContext);
  const checked = ctx?.value === value;
  return (
    <Div
      className={cn('relative flex items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm', className)}
      onClick={() => {
        ctx?.select?.(value);
        menu?.setOpen(false);
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked }}
    >
      <View style={{ position: 'absolute', left: 8, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>{checked ? <Circle size={8} color="#270E01" fill="#270E01" /> : null}</View>
      {children}
    </Div>
  );
}

export function DropdownMenuLabel({ className, inset, children }) {
  return <Text style={flat('px-2 py-1.5 text-sm font-medium', inset && 'pl-8', className)}>{children}</Text>;
}
export function DropdownMenuSeparator({ className }) {
  return <View style={flat('bg-border -mx-1 my-1 h-px', className)} />;
}
export function DropdownMenuShortcut({ className, children }) {
  return <Text style={flat('text-muted-foreground ml-auto text-xs tracking-widest', className)}>{children}</Text>;
}
export function DropdownMenuGroup({ children }) {
  return <>{children}</>;
}
export const DropdownMenuPortal = Fragment;

/* ----------------------------------------------------------------- popover */

const PopoverContext = createContext(null);

export function Popover({ open: openProp, defaultOpen, onOpenChange, children }) {
  const [open, setOpen] = useOpenState(openProp, defaultOpen, onOpenChange);
  const anchor = useAnchor();
  const ctx = useMemo(() => ({ open, setOpen, anchor }), [open, setOpen, anchor]);
  // A controlled popover opened by its parent still needs to know where its trigger is.
  useEffect(() => {
    if (open && !anchor.rect) anchor.measure();
  }, [open, anchor]);
  return <PopoverContext.Provider value={ctx}>{children}</PopoverContext.Provider>;
}

export function PopoverTrigger({ asChild, children, className, style }) {
  const ctx = useContext(PopoverContext);
  return (
    <View ref={ctx.anchor.ref} collapsable={false} style={style}>
      <Slot
        asChild={asChild}
        className={asChild ? undefined : className}
        onPress={async () => {
          await ctx.anchor.measure();
          ctx.setOpen(!ctx.open);
        }}
      >
        {children}
      </Slot>
    </View>
  );
}

export function PopoverAnchor({ children }) {
  const ctx = useContext(PopoverContext);
  return (
    <View ref={ctx.anchor.ref} collapsable={false}>
      {children}
    </View>
  );
}

export function PopoverContent({ className, style, children, align = 'center', sideOffset = 4 }) {
  const ctx = useContext(PopoverContext);
  const inherited = useContext(InheritedText);
  const s = flat('w-72 rounded-md border border-border bg-popover p-4 shadow-md', className);
  const [viewStyle, textStyle] = splitTextStyle(StyleSheet.flatten([s, style]));
  return (
    <AnchoredPanel visible={ctx.open} anchor={ctx.anchor.rect} onClose={() => ctx.setOpen(false)} align={align} sideOffset={sideOffset} minWidth={typeof viewStyle.width === 'number' ? viewStyle.width : 288}>
      <InheritedText.Provider value={inheritText(inherited, { color: '#270E01', ...textStyle })}>
        <View style={viewStyle}>{wrapStrings(children)}</View>
      </InheritedText.Provider>
    </AnchoredPanel>
  );
}

/** lucide icon helper re-exported for kit users. */
export { Icon };
