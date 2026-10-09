/*
 * The admin design system: tokens and the components every panel's screens
 * share. Import from here rather than re-styling a card or a page header on
 * each screen — one change should move the whole product.
 *
 *   import { AdminPage, PageHeader, Card, StatCard, Toolbar, DataTable, TBody,
 *            Row, Cell, StatusBadge, EmptyState, ErrorState, TableSkeleton,
 *            Field, Pagination, useLayoutWidth } from '../../admin/ui';
 *
 * Tokens (A): the values measured as dominant across the ported screens, so
 * adopting them is a consistency pass, not a rebrand — blue-600 actions,
 * one slate neutral ramp, white cards on slate-50.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RefreshCw } from 'lucide-react-native';
import { cn, tw } from '../lib/tw';
import { useAnimatedValue } from '../lib/useAnimatedValue';
import { Text } from '../components/Text';
import { Button, Div, HScroll, Icon, ScrollDiv, Span } from '../components/web';

/* ------------------------------------------------------------------ tokens */

export const A = {
  // surfaces
  pageBg: '#F8FAFC', // slate-50
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9', // slate-100
  border: '#E2E8F0', // slate-200
  borderStrong: '#CAD5E2', // slate-300

  // text
  text: '#0F172B', // slate-900
  textSecondary: '#45556C', // slate-600
  textMuted: '#62748E', // slate-500
  textDisabled: '#90A1B9', // slate-400
  onDark: '#FFFFFF',

  // actions
  primary: '#155DFC', // blue-600
  primaryPressed: '#1447E6', // blue-700
  primarySoft: '#DBEAFE', // blue-100
  onPrimary: '#FFFFFF',

  // status
  success: '#008236',
  successSoft: '#DCFCE7',
  warning: '#BB4D00',
  warningSoft: '#FEF3C6',
  danger: '#C10007',
  dangerSoft: '#FFE2E2',
  info: '#1447E6',
  infoSoft: '#DBEAFE',
  neutralSoft: '#F1F5F9',
};

/** Spacing steps. Page gutter is `space.page`; everything else is a multiple of 4. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, page: 16 };
export const radii = { sm: 6, md: 8, card: 12, lg: 16, pill: 999 };
/** Android's minimum comfortable touch target. */
export const touch = 44;

/** Status name -> { fg, bg }. Covers the words the panels actually use. */
export const TONES = {
  neutral: { fg: A.textSecondary, bg: A.neutralSoft },
  success: { fg: A.success, bg: A.successSoft },
  warning: { fg: A.warning, bg: A.warningSoft },
  danger: { fg: A.danger, bg: A.dangerSoft },
  info: { fg: A.info, bg: A.infoSoft },
};

const STATUS_TONE = {
  active: 'success', approved: 'success', completed: 'success', delivered: 'success', paid: 'success', online: 'success', verified: 'success', enabled: 'success', success: 'success', accepted: 'success', confirmed: 'success',
  pending: 'warning', processing: 'warning', ongoing: 'warning', review: 'warning', 'under review': 'warning', requested: 'warning', partial: 'warning', hold: 'warning', scheduled: 'warning',
  cancelled: 'danger', canceled: 'danger', rejected: 'danger', failed: 'danger', blocked: 'danger', inactive: 'danger', offline: 'danger', refunded: 'danger', expired: 'danger', disabled: 'danger', suspended: 'danger',
};

/** The tone a status word carries, so the same word is never two colours. */
/** A KPI value: thousands-separated, or an em dash when there is no number. */
export function formatCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString() : '—';
}

export const toneFor = (status) => STATUS_TONE[String(status || '').trim().toLowerCase()] || 'neutral';

/* -------------------------------------------------------------- breakpoints */

/**
 * The app is built for a phone and must also be usable on an Android tablet.
 * `width` is the window width; `tablet` is true from 700 px (a 7" tablet in
 * portrait), `wide` from 1000 px (a tablet in landscape).
 */
export function useLayoutWidth() {
  const { width } = useWindowDimensions();
  return useMemo(() => ({ width, phone: width < 700, tablet: width >= 700, wide: width >= 1000, columns: width >= 1000 ? 3 : width >= 700 ? 2 : 1 }), [width]);
}

/**
 * The width to hand a gifted-charts chart, and the style for its axis labels.
 *
 * `width` on those charts is the *plot* width: the y-axis label column is drawn
 * outside it, so a chart given the full card width overflows by exactly
 * `axisWidth`. Subtract the page gutter (16+16), the card padding (16+16) and
 * that column.
 */
// gifted-charts draws its labels with a bare RN <Text>, which bypasses
// components/Text.jsx and so falls back to the OS font. Name the family here.
export const AXIS_TEXT = { color: A.textMuted, fontSize: 11, fontFamily: 'Poppins_400Regular' };

export function useChartWidth(axisWidth = 44, maxWidth = 1200) {
  const { width } = useWindowDimensions();
  return Math.max(200, Math.min(width, maxWidth) - 64 - axisWidth);
}

/**
 * Point spacing for a gifted-charts series. `adjustToWidth` divides by
 * `count - 1`, so a single-point series stretches the chart far past the card;
 * this keeps every series inside `width`.
 */
export function chartSpacing(width, count, initial = 10) {
  return Math.max(8, Math.floor((width - initial * 2) / Math.max(1, count)));
}

/* ------------------------------------------------------------------- page */

/**
 * A screen's root: the scrolling page with the standard gutter and background.
 * On a tablet the content is capped and centred instead of stretching a
 * phone layout across 10 inches.
 */
export function AdminPage({ children, className, contentClassName, maxWidth = 900, padded = true, scroll = true, style, ...rest }) {
  const { tablet } = useLayoutWidth();
  const insets = useSafeAreaInsets();
  const inner = (
    <Div style={tablet && maxWidth ? { width: '100%', maxWidth, alignSelf: 'center' } : null} className={contentClassName}>
      {children}
    </Div>
  );
  if (!scroll) {
    return (
      <Div className={cn('flex-1 bg-slate-50', padded && 'p-4', className)} style={style} {...rest}>
        {inner}
      </Div>
    );
  }
  return (
    <ScrollDiv className={cn('flex-1 bg-slate-50', padded && 'p-4', className)} contentStyle={{ paddingBottom: 24 + insets.bottom }} style={style} {...rest}>
      {inner}
    </ScrollDiv>
  );
}

/**
 * The title block at the top of a screen: an optional breadcrumb that scrolls
 * rather than running off the edge, the title, a one-line description and the
 * screen's primary actions (which wrap under the title on a phone).
 */
export function PageHeader({ title, subtitle, breadcrumb, actions, icon: IconCmp, className }) {
  return (
    <Div className={cn('mb-4', className)}>
      {breadcrumb?.length ? (
        <HScroll className="mb-2" contentClassName="flex-row items-center gap-1.5">
          {breadcrumb.map((crumb, i) => (
            <Div key={`${crumb.label}-${i}`} className="flex-row items-center gap-1.5">
              {i > 0 ? <Icon as={ChevronRight} size={12} className="text-slate-400" /> : null}
              <Span
                className={cn('text-xs py-2', i === breadcrumb.length - 1 ? 'text-slate-900 font-semibold' : 'text-slate-500')}
                onClick={crumb.onPress}
                // A 12px line of text is not a tap target; the padding plus hitSlop gives it 44.
                hitSlop={crumb.onPress ? { top: 10, bottom: 10, left: 6, right: 6 } : undefined}
                accessibilityRole={crumb.onPress ? 'link' : undefined}
                accessibilityLabel={crumb.onPress ? `Go to ${crumb.label}` : undefined}
              >
                {crumb.label}
              </Span>
            </Div>
          ))}
        </HScroll>
      ) : null}
      <Div className="flex-row items-start gap-3">
        {IconCmp ? (
          <Div className="w-10 h-10 rounded-lg bg-blue-600 items-center justify-center shrink-0">
            <Icon as={IconCmp} size={20} className="text-white" />
          </Div>
        ) : null}
        <Div className="flex-1 min-w-0">
          <Text style={tw`text-xl font-bold text-slate-900`} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={tw`text-sm text-slate-500 mt-0.5`} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </Div>
      </Div>
      {actions ? <Div className="flex-row flex-wrap items-center gap-2 mt-3">{actions}</Div> : null}
    </Div>
  );
}

/** A white card: the one surface treatment for grouped content. */
export function Card({ children, className, padded = true, style, ...rest }) {
  return (
    <Div className={cn('bg-white rounded-xl border border-slate-200', padded && 'p-4', className)} style={style} {...rest}>
      {children}
    </Div>
  );
}

export function SectionTitle({ children, action, className }) {
  return (
    <Div className={cn('flex-row items-center justify-between gap-3 mb-3', className)}>
      <Text style={tw`text-base font-semibold text-slate-900 flex-1`} numberOfLines={1}>
        {children}
      </Text>
      {action}
    </Div>
  );
}

/**
 * A dashboard metric. The label sits above the value so a long label wraps
 * instead of squeezing the number, and the icon never takes space from it.
 */
export function StatCard({ label, value, hint, icon: IconCmp, tone = 'info', onPress, className }) {
  const t = TONES[tone] || TONES.info;
  return (
    <Card className={cn('gap-2', className)} onClick={onPress}>
      <Div className="flex-row items-start justify-between gap-2">
        <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500 flex-1`} numberOfLines={2}>
          {label}
        </Text>
        {IconCmp ? (
          <Div className="w-9 h-9 rounded-lg items-center justify-center shrink-0" style={{ backgroundColor: t.bg }}>
            <Icon as={IconCmp} size={18} color={t.fg} />
          </Div>
        ) : null}
      </Div>
      <Text style={tw`text-2xl font-bold text-slate-900`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      {hint ? (
        <Text style={tw`text-xs text-slate-500`} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

/** The KPI row: one column on a phone, two on a tablet, three when wide. */
export function StatGrid({ children, className }) {
  const { columns } = useLayoutWidth();
  return <Div className={cn(`grid grid-cols-${columns} gap-3`, className)}>{children}</Div>;
}

/** Filters / search / actions above a list. Everything wraps; nothing is cut off. */
export function Toolbar({ children, className }) {
  return <Div className={cn('flex-row flex-wrap items-center gap-2 mb-3', className)}>{children}</Div>;
}

/* ------------------------------------------------------------------ table */

/**
 * A table that scrolls sideways on a phone with a visible edge fade, so it is
 * obvious there are more columns. `cols` are the column widths in px.
 */
/**
 * Column widths are authored for a phone, where the table scrolls sideways.
 * Given more room (a tablet, or a narrow table on a phone) the columns stretch
 * to fill it instead of leaving dead space, so `scale` multiplies every width.
 */
const TableContext = createContext({ scale: 1 });

export function DataTable({ cols, children, className, minWidth }) {
  const total = minWidth || cols.reduce((a, b) => a + b, 0);
  const [avail, setAvail] = useState(0);
  const scale = avail > total ? avail / total : 1;
  const ctx = useMemo(() => ({ scale }), [scale]);
  return (
    <Div
      className={cn('bg-white rounded-xl border border-slate-200 overflow-hidden', className)}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w && Math.abs(w - avail) > 1) setAvail(w);
      }}
    >
      <TableContext.Provider value={ctx}>
        <HScroll contentClassName="flex-col" style={{ width: '100%' }}>
          <Div style={{ width: Math.round(total * scale) }}>{children}</Div>
        </HScroll>
      </TableContext.Provider>
    </Div>
  );
}

/** A column's painted width: the authored width, stretched if there is room. */
export function useColumnWidth(width) {
  const { scale } = useContext(TableContext);
  return Math.round(width * scale);
}

export function THead({ cols, labels, className }) {
  const { scale } = useContext(TableContext);
  return (
    <Div className={cn('flex-row bg-slate-50 border-b border-slate-200', className)}>
      {labels.map((label, i) => (
        <Div key={`${label}-${i}`} style={{ width: Math.round(cols[i] * scale) }} className="px-3 py-2.5 justify-center">
          <Text style={tw`text-xs font-semibold uppercase tracking-wide text-slate-500`} numberOfLines={2}>
            {label}
          </Text>
        </Div>
      ))}
    </Div>
  );
}

export function TBody({ children }) {
  return <Div>{children}</Div>;
}

export function Row({ children, onPress, className, last }) {
  return (
    <Div className={cn('flex-row items-stretch', !last && 'border-b border-slate-100', className)} onClick={onPress}>
      {children}
    </Div>
  );
}

export function Cell({ children, width, className, numberOfLines = 2, align = 'left' }) {
  const w = useColumnWidth(width);
  return (
    // overflow-hidden matters: an unbroken value (a booking id, a long email)
    // is wider than its column and would otherwise paint over the next cell.
    <Div style={{ width: w }} className={cn('px-3 py-3 justify-center overflow-hidden', align === 'right' && 'items-end', align === 'center' && 'items-center', className)}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={tw`text-sm text-slate-700`} numberOfLines={numberOfLines}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Div>
  );
}

/** A status word, always the same colour for the same word. */
export function StatusBadge({ status, label, tone, className, icon: IconCmp }) {
  const t = TONES[tone || toneFor(status)] || TONES.neutral;
  // Statuses arrive as the stored token ("awaiting_payment"); show it as words.
  const text = label ?? String(status ?? '').replace(/[_-]+/g, ' ').trim();
  return (
    <Div className={cn('flex-row items-center self-start gap-1 px-2 py-1 rounded-full', className)} style={{ backgroundColor: t.bg }}>
      {IconCmp ? <Icon as={IconCmp} size={12} color={t.fg} /> : null}
      <Text style={[tw`text-xs font-semibold`, { color: t.fg }]} numberOfLines={1}>
        {text}
      </Text>
    </Div>
  );
}

export function Pagination({ page, pages, total, onPrev, onNext, className }) {
  const canPrev = page > 1;
  const canNext = pages ? page < pages : false;
  return (
    <Div className={cn('flex-row items-center justify-between gap-3 mt-3 flex-wrap', className)}>
      <Text style={tw`text-xs text-slate-500`}>{total != null ? `${total} total · page ${page}${pages ? ` of ${pages}` : ''}` : `Page ${page}${pages ? ` of ${pages}` : ''}`}</Text>
      <Div className="flex-row items-center gap-2">
        <Button onClick={canPrev ? onPrev : undefined} disabled={!canPrev} className="flex-row items-center gap-1 px-3 h-10 rounded-lg border border-slate-200 bg-white">
          <Icon as={ChevronLeft} size={14} className="text-slate-600" />
          <Span className="text-sm text-slate-700">Prev</Span>
        </Button>
        <Button onClick={canNext ? onNext : undefined} disabled={!canNext} className="flex-row items-center gap-1 px-3 h-10 rounded-lg border border-slate-200 bg-white">
          <Span className="text-sm text-slate-700">Next</Span>
          <Icon as={ChevronRight} size={14} className="text-slate-600" />
        </Button>
      </Div>
    </Div>
  );
}

/* ------------------------------------------------- loading / empty / error */

/** A shimmering block: the shape of the content that is coming. */
export function Skeleton({ width, height = 14, className, style }) {
  const pulse = useAnimatedValue(0.4);
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width: width ?? '100%', height, borderRadius: 6, backgroundColor: A.surfaceMuted, opacity: pulse }, tw.style(className), style]} />;
}

export function TableSkeleton({ rows = 5, className }) {
  return (
    <Card className={cn('gap-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Skeleton width={36} height={36} className="rounded-lg" />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="70%" />
            <Skeleton width="40%" height={10} />
          </View>
        </View>
      ))}
    </Card>
  );
}

/** What a screen shows while its first load is in flight. */
export function LoadingState({ label = 'Loading…', className }) {
  return (
    <Card className={cn('items-center py-10 gap-3', className)}>
      <ActivityIndicator size="small" color={A.primary} />
      <Text style={tw`text-sm text-slate-500`}>{label}</Text>
    </Card>
  );
}

/** No data: say what is missing and, where there is one, offer the next step. */
export function EmptyState({ title = 'Nothing here yet', message, actionLabel, onAction, icon: IconCmp = Inbox, className }) {
  return (
    <Card className={cn('items-center py-10 px-6 gap-2', className)}>
      <Div className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center mb-1">
        <Icon as={IconCmp} size={22} className="text-slate-400" />
      </Div>
      <Text style={tw`text-base font-semibold text-slate-900 text-center`}>{title}</Text>
      {message ? <Text style={tw`text-sm text-slate-500 text-center`}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="mt-2 px-4 h-10 rounded-lg bg-blue-600 items-center justify-center">
          <Span className="text-sm font-semibold text-white">{actionLabel}</Span>
        </Button>
      ) : null}
    </Card>
  );
}

/** A failed load: what went wrong, and a way to try again. */
export function ErrorState({ title = 'Could not load this', message, onRetry, className }) {
  return (
    <Card className={cn('items-center py-10 px-6 gap-2', className)}>
      <Div className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mb-1">
        <Icon as={AlertTriangle} size={22} className="text-red-700" />
      </Div>
      <Text style={tw`text-base font-semibold text-slate-900 text-center`}>{title}</Text>
      {message ? <Text style={tw`text-sm text-slate-500 text-center`}>{String(message)}</Text> : null}
      {onRetry ? (
        <Button onClick={onRetry} className="mt-2 flex-row items-center gap-2 px-4 h-10 rounded-lg bg-blue-600">
          <Icon as={RefreshCw} size={14} className="text-white" />
          <Span className="text-sm font-semibold text-white">Try again</Span>
        </Button>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------- form */

/** A labelled form row: label, control, then either the error or the hint. */
export function Field({ label, required, hint, error, children, className }) {
  return (
    <Div className={cn('gap-1.5', className)}>
      {label ? (
        <Text style={tw`text-sm font-medium text-slate-700`}>
          {label}
          {required ? <Span className="text-red-600"> *</Span> : null}
        </Text>
      ) : null}
      {children}
      {error ? (
        <Div className="flex-row items-center gap-1">
          <Icon as={AlertTriangle} size={12} className="text-red-600" />
          <Text style={tw`text-xs text-red-600 flex-1`}>{String(error)}</Text>
        </Div>
      ) : hint ? (
        <Text style={tw`text-xs text-slate-500`}>{hint}</Text>
      ) : null}
    </Div>
  );
}

/** The class strings for the standard controls, so inputs match across screens. */
// min-w-0: a TextInput keeps an intrinsic width, so `flex-1` alone does not let
// it shrink and it pushes whatever sits beside it off the screen.
export const INPUT = 'h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 min-w-0';
export const INPUT_ERROR = 'h-11 px-3 rounded-lg border border-red-500 bg-white text-sm text-slate-900 min-w-0';
export const BTN_PRIMARY = 'flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg bg-blue-600';
export const BTN_SECONDARY = 'flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg border border-slate-300 bg-white';
export const BTN_DANGER = 'flex-row items-center justify-center gap-2 h-11 px-4 rounded-lg bg-red-600';
export const BTN_TEXT_PRIMARY = 'text-sm font-semibold text-white';
export const BTN_TEXT_SECONDARY = 'text-sm font-semibold text-slate-700';

/** Fills the row with the page gutter removed, for full-bleed strips inside a padded page. */
export const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.page },
});
