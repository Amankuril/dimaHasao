/*
 * Tailwind class strings -> React Native styles, so screens ported from the
 * admin web keep its spacing, sizes, colours and radii exactly.
 *
 *   import { tw, cn } from '../lib/tw';
 *   <View style={tw`px-4 py-2 rounded-lg bg-white border border-slate-200`} />
 *   <Text style={tw.style('text-sm font-semibold', active ? 'text-white' : 'text-slate-700')} />
 *   <View style={[tw`p-4`, { width: 240 }]} />
 *
 * Built on twrnc with the web's palette (Tailwind v4 as sRGB, theme/index.js),
 * so `bg-slate-50` is the same hex the browser paints.
 *
 * The app renders at phone width, so everything that only applies on a wider
 * screen or to a mouse is dropped before parsing: `sm:` / `md:` / `lg:` / `xl:`
 * variants (the unprefixed class is the phone layout), `hover:` / `focus:` /
 * `group-*` states, transitions and cursors. Utilities React Native has no
 * equivalent for are dropped too (grid, space-x/y, gradients, ring, blur,
 * truncate, whitespace): build those with flex rows/`gap`, LinearGradient
 * and `numberOfLines`. `fixed` becomes `absolute`; `sr-only` hides.
 */
import { create, useDeviceContext } from 'twrnc';
import { tw as palette } from '../theme';

function buildColors() {
  const colors = { white: palette.white, black: palette.black, transparent: 'transparent', current: 'currentColor' };
  Object.entries(palette).forEach(([key, hex]) => {
    const m = key.match(/^([a-z]+?)(\d{2,3})$/);
    if (!m) return;
    colors[m[1]] = colors[m[1]] || {};
    colors[m[1]][m[2]] = hex;
  });
  return colors;
}

/*
 * The shadcn theme tokens from Frontend/src/shared/styles/global.css (light;
 * the oklch values converted to sRGB), so `bg-primary`, `text-muted-foreground`
 * and `border-border` paint what the browser paints.
 */
export const themeColors = {
  background: '#FFFFFF',
  foreground: '#270E01',
  card: { DEFAULT: '#FFFFFF', foreground: '#270E01' },
  popover: { DEFAULT: '#FFFFFF', foreground: '#270E01' },
  primary: { DEFAULT: '#C99500', foreground: '#1B0400' },
  secondary: { DEFAULT: '#F4EEE0', foreground: '#4A2200' },
  muted: { DEFAULT: '#F4F2EA', foreground: '#7B5B4A' },
  accent: { DEFAULT: '#FFDEA9', foreground: '#371801' },
  destructive: { DEFAULT: '#E7000B', foreground: '#FFFFFF' },
  border: '#E4DDCF',
  input: '#F1EEE7',
  ring: '#C99500',
  sidebar: { DEFAULT: '#FBF8F1', foreground: '#270E01', primary: '#C99500', 'primary-foreground': '#1B0400', accent: '#F4EEE0', 'accent-foreground': '#4A2200', border: '#E4DDCF', ring: '#C99500' },
  'page-bg': '#FFFFFF',
  'primary-orange': '#DC2626',
};

/*
 * global.css sets --radius: 0.625rem and derives sm/md/lg/xl from it; the
 * rest are Tailwind v4's defaults.
 */
const RADII = { none: '0px', xs: '2px', sm: '6px', DEFAULT: '4px', md: '8px', lg: '10px', xl: '14px', '2xl': '16px', '3xl': '24px', '4xl': '32px', full: '9999px' };

/** A twrnc instance on the web palette; `extend` adds a panel's own @theme (Taxi). */
export function makeTw(extend = {}) {
  return create({
    theme: {
      borderRadius: { ...RADII, ...(extend.borderRadius || {}) },
      extend: {
        ...extend,
        colors: { ...buildColors(), ...themeColors, ...(extend.colors || {}) },
      },
    },
  });
}

const base = makeTw();

const DROP_VARIANT = /^(?:hover|focus|focus-within|focus-visible|active|disabled|enabled|visited|placeholder|selection|marker|before|after|first-letter|first-line|file|open|checked|invalid|required|indeterminate|sm|md|lg|xl|2xl|3xl|dark|print|portrait|landscape|ltr|rtl|motion-safe|motion-reduce|contrast-more|first|last|odd|even|only|empty|target|group(?:-[\w-]+)?|peer(?:-[\w-]+)?|aria-[\w-]+|data-[\w-]+|supports-[\w-]+|has-[\w-]+|max-[\w-]+|min-[\w-]+|\*|\[[^\]]*\]):/;

const DROP_UTILITY = new RegExp(
  '^(?:' +
    [
      'transition(?:-.*)?', 'duration-.*', 'ease-.*', 'delay-.*', 'animate-.*', 'will-change-.*',
      'cursor-.*', 'select-.*', 'outline(?:-.*)?', 'ring(?:-.*)?', 'backdrop-.*', 'appearance-.*', 'resize(?:-.*)?',
      'scroll-.*', 'snap-.*', 'overscroll-.*', 'touch-.*', 'whitespace-.*', 'break-.*', 'text-ellipsis', 'text-clip',
      'truncate', 'line-clamp-.*', 'hyphens-.*', 'text-wrap', 'text-nowrap', 'text-balance', 'text-pretty', 'wrap-.*',
      'group(?:/.*)?', 'peer(?:/.*)?', 'container', 'isolate', 'isolation-.*', 'box-border', 'box-content', 'box-decoration-.*',
      'block', 'inline', 'inline-block', 'inline-grid', 'flow-root', 'contents', 'list-item', 'table(?:-.*)?',
      'grid', 'grid-cols-.*', 'grid-rows-.*', 'grid-flow-.*', 'col-.*', 'row-span-.*', 'row-start-.*', 'row-end-.*',
      'auto-cols-.*', 'auto-rows-.*', 'place-.*', 'justify-items-.*', 'justify-self-.*',
      '-space-[xy]-.*', 'divide-.*', 'sticky', 'static', 'float-.*', 'clear-.*',
      'bg-gradient-.*', 'bg-linear-.*', 'bg-radial.*', 'from-.*', 'via-.*', 'to-.*',
      'bg-clip-.*', 'bg-fixed', 'bg-local', 'bg-scroll', 'bg-cover', 'bg-contain', 'bg-center', 'bg-top', 'bg-bottom',
      'bg-left', 'bg-right', 'bg-no-repeat', 'bg-repeat(?:-.*)?', 'bg-origin-.*', 'bg-blend-.*', 'bg-\\[url.*',
      'object-.*', 'list-.*', 'antialiased', 'subpixel-antialiased', 'tabular-nums', 'lining-nums', 'oldstyle-nums',
      'proportional-nums', 'slashed-zero', 'ordinal', 'normal-nums', 'decoration-.*', 'underline-offset-.*',
      'shadow-inner', 'origin-.*', 'transform(?:-.*)?', '-?scale-.*', '-?rotate-.*', '-?translate-.*', '-?skew-.*',
      'filter', 'blur(?:-.*)?', 'drop-shadow(?:-.*)?', 'grayscale(?:-.*)?', 'invert(?:-.*)?', 'sepia(?:-.*)?',
      'saturate-.*', 'brightness-.*', 'contrast-.*', 'hue-rotate-.*', 'mix-blend-.*', 'content-\\[.*', 'content-none',
      'pointer-events-.*', 'visible', 'collapse', 'overflow-x-.*', 'overflow-y-.*', 'overflow-auto', 'overflow-clip',
      'overflow-ellipsis', 'accent-.*', 'caret-.*', 'fill-.*', 'stroke-.*', 'sr-only-not', 'not-sr-only', 'shrink',
      'columns-.*', 'break-inside-.*', 'indent-.*', 'align-.*', 'vertical-.*', 'field-sizing-.*', 'forced-color-adjust-.*',
      'perspective-.*', 'backface-.*', 'mask-.*', 'shadow-\\[.*inset.*\\]', 'max-w-screen-.*', 'prose(?:-.*)?',
      'scrollbar-.*', 'no-scrollbar', 'hide-scrollbar', 'custom-scrollbar', 'admin-.*', 'redigo-.*', 'lucide(?:-.*)?',
    ].join('|') +
    ')$',
);

const BORDER_WIDTH = /^border(-[trblxy])?(-(\d+|\[\d+px\]))?$/;
const BORDER_STYLE = /^border-(solid|dashed|dotted|double|none|hidden)$/;

/** The class list React Native can paint, at phone width. */
const WIDTH_CLASS = /^(w-|size-|flex-1$|flex-auto$)/;

export function nativeClasses(input) {
  const out = [];
  const parts = String(input || '').split(/\s+/);
  // `mx-auto` on the web centres a block that still fills its container (`max-w-7xl mx-auto`).
  // In React Native an auto horizontal margin makes the view shrink to its content instead, which
  // pushed whole pages wider than the screen. Centre it, and give it the full width the block had
  // unless the classes set a width of their own.
  const autoFill = parts.includes('mx-auto') && !parts.some((p) => WIDTH_CLASS.test(p));
  let display = false;
  let direction = false;
  let hasBorder = false;
  let hasBorderColor = false;
  parts.forEach((raw) => {
      if (!raw) return;
      let cls = raw.replace(/^!/, '').replace(/!$/, '');
      if (DROP_VARIANT.test(cls)) return;
      if (cls === 'fixed') cls = 'absolute';
      else if (cls === 'sr-only' || cls === 'invisible') {
        out.push(cls === 'sr-only' ? 'hidden' : 'opacity-0');
        return;
      }
      if (DROP_UTILITY.test(cls)) return;
      if (cls === 'mx-auto') {
        out.push('self-center');
        if (autoFill) out.push('w-full');
        return;
      }
      // `space-y-4` puts margin between children: a gap does the same.
      const space = cls.match(/^space-([xy])-(.+)$/);
      if (space) cls = `gap-${space[1]}-${space[2]}`;
      // CSS `display:flex` lays children out in a row; React Native's default is a column.
      if (cls === 'flex' || cls === 'inline-flex') {
        display = true;
        return;
      }
      if (/^flex-(row|col)(-reverse)?$/.test(cls)) direction = true;
      // A bare `shadow-[0_4px_12px_rgba(...)]` is a web box-shadow: keep a soft native shadow instead.
      if (/^shadow-\[/.test(cls)) cls = 'shadow-md';
      else if (cls === 'shadow-xs' || cls === 'shadow-2xs') cls = 'shadow-sm';
      else if (/^shadow-[a-z]+-\d+(\/\d+)?$/.test(cls) && !/^shadow-(sm|md|lg|xl|2xl|none)$/.test(cls)) return; // shadow colour
      if (BORDER_WIDTH.test(cls)) hasBorder = true;
      else if (/^border-/.test(cls) && !BORDER_STYLE.test(cls)) hasBorderColor = true;
      out.push(cls);
    });
  if (display && !direction) out.push('flex-row');
  // global.css: `* { @apply border-border }`. A bare `border` is that colour on the web, black in React Native.
  if (hasBorder && !hasBorderColor) out.push('border-border');
  return out.join(' ');
}

/** clsx: strings, arrays and `{ class: condition }` objects -> one class string. */
export function cn(...inputs) {
  const out = [];
  const walk = (v) => {
    if (!v) return;
    if (typeof v === 'string' || typeof v === 'number') out.push(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'object') Object.entries(v).forEach(([k, on]) => on && out.push(k));
  };
  inputs.forEach(walk);
  return out.join(' ');
}

const cache = new Map();

function styleFor(classes) {
  const key = nativeClasses(classes);
  if (cache.has(key)) return cache.get(key);
  const style = key ? base.style(key) : {};
  if (cache.size > 4000) cache.clear();
  cache.set(key, style);
  return style;
}

/**
 * tw`...` (template) or tw.style(...classInputs). Style objects passed to
 * tw.style are merged in as-is.
 */
function twTag(strings, ...values) {
  const text = Array.isArray(strings) ? strings.reduce((acc, s, i) => acc + s + (i < values.length ? (values[i] ?? '') : ''), '') : String(strings ?? '');
  return styleFor(text);
}

twTag.style = (...inputs) => {
  const classes = [];
  const objects = [];
  const walk = (v) => {
    if (!v) return;
    if (typeof v === 'string' || typeof v === 'number') classes.push(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (typeof v === 'object') {
      // `{ 'text-white': active }` (clsx object) vs a style object: a style object has a non-boolean value.
      const vals = Object.values(v);
      if (vals.length && vals.every((x) => typeof x === 'boolean' || x == null)) Object.entries(v).forEach(([k, on]) => on && classes.push(k));
      else objects.push(v);
    }
  };
  inputs.forEach(walk);
  const style = styleFor(classes.join(' '));
  return objects.length ? Object.assign({}, style, ...objects) : style;
};

/** A palette colour by Tailwind name: tw.color('slate-500') -> '#62748E'. */
twTag.color = (name) => base.color(String(name || '').replace(/^(text|bg|border)-/, ''));

export const tw = twTag;

/** Root layout only: lets `h-screen`, `w-screen` and `vh`/`vw` units resolve against the window. */
export function useTwDevice() {
  useDeviceContext(base);
}
export default tw;
