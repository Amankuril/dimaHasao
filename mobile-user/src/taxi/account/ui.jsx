import { forwardRef, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AlertCircle, ArrowLeft } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Button, IconButton } from '../../components/ds';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { color, radii, space, touch, tw, type } from '../../theme';

/* Shared bits of the taxi account / activity / support screens. */

// Web font: Outfit (Taxi/index.css). Kept for screens outside this group that still import it.
const OUTFIT = { 400: 'Outfit_400Regular', 500: 'Outfit_500Medium', 600: 'Outfit_600SemiBold', 700: 'Outfit_700Bold', 800: 'Outfit_800ExtraBold', 900: 'Outfit_900Black' };
export const fo = (w = 400) => ({ fontFamily: OUTFIT[w] || OUTFIT[400] });

export const goBack = (fallback = '/taxi/user') => {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
};

export const BG_SOFT = '#F3F4F6';

export function useHeaderTop() {
  return useSafeAreaInsets().top + 16; // web pt-10
}

export function BackBtn({ onPress, size = 36, radius = 12, color: fg = tw.slate900, strokeWidth = 2.5, style }) {
  return (
    <Press
      onPress={onPress || (() => goBack())}
      accessibilityLabel="Back"
      style={[{ width: size, height: size, borderRadius: radius, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <ArrowLeft size={18} color={fg} strokeWidth={strokeWidth} />
    </Press>
  );
}

export function Pulse({ style }) {
  const o = useAnimatedValue(1);
  useEffect(() => {
    const e = Easing.bezier(0.4, 0, 0.6, 1);
    const a = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 0.5, duration: 1000, easing: e, useNativeDriver: true }),
      Animated.timing(o, { toValue: 1, duration: 1000, easing: e, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [o]);
  return <Animated.View style={[style, { opacity: o }]} />;
}

export function Eyebrow({ children, color: fg = tw.slate400, style }) {
  return <Text style={[{ fontSize: 9, letterSpacing: 2.3, textTransform: 'uppercase', color: fg, ...fo(900) }, style]}>{children}</Text>;
}

export const sh = { boxShadow: '0 4px 14px rgba(15,23,42,0.06)' };
export const headerShadow = { boxShadow: '0 4px 20px rgba(15,23,42,0.05)' };

export const styles = StyleSheet.create({ flex: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'center' } });
export { View };

/* ───────────── Design-system primitives local to this group ─────────────
 * The heritage module header comes from TaxiShell, so each screen adds a
 * light in-page title bar under it (PageTitle) rather than a second dark bar.
 */

/** Bottom space a scrolling screen needs to clear the floating nav and the home indicator. */
export function useNavPad(extra = space.lg) {
  return extra + NAV_CLEARANCE + useSafeAreaInsets().bottom;
}

/** In-page title bar: 44 px back button, heading title, optional supporting line and a right slot. */
export function PageTitle({ title, subtitle, onBack, right, showBack = true, titleLines = 1 }) {
  return (
    <View style={ps.titleBar}>
      {showBack ? <IconButton icon={ArrowLeft} label="Go back" onPress={onBack || (() => goBack())} variant="soft" /> : null}
      <View style={ps.titleText}>
        <Text style={[type.heading, { color: color.text }]} accessibilityRole="header" numberOfLines={titleLines}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.small, { color: color.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Labelled text field: label above, 48 px input, focus ring, error line. */
export const Field = forwardRef(function Field({ label, hint, error, icon: Icon, right, multiline, inputStyle, style, editable = true, onFocus, onBlur, ...input }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: space.xs + 2 }, style]}>
      {label ? <Text style={[type.label, { color: color.text }]}>{label}</Text> : null}
      <View
        style={[
          ps.field,
          multiline && ps.fieldMulti,
          focused && { borderColor: color.primary },
          error ? { borderColor: color.danger } : null,
          !editable && { backgroundColor: color.surfaceMuted },
        ]}
      >
        {Icon ? <Icon size={18} color={color.textMuted} /> : null}
        <TextInput
          ref={ref}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={color.textDisabled}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[ps.input, multiline && ps.inputMulti, !editable && { color: color.textMuted }, inputStyle]}
          {...input}
        />
        {right}
      </View>
      {error ? <Text style={[type.small, { color: color.danger }]}>{error}</Text> : hint ? <Text style={[type.caption, { color: color.textMuted }]}>{hint}</Text> : null}
    </View>
  );
});

/** Centered loading state with an optional line. */
export function LoadingState({ label, style }) {
  return (
    <View style={[ps.center, style]}>
      <ActivityIndicator size="large" color={color.primary} />
      {label ? <Text style={[type.small, { color: color.textMuted, textAlign: 'center' }]}>{label}</Text> : null}
    </View>
  );
}

/** Error state with a retry action. */
export function ErrorState({ title = 'Something went wrong', message, actionLabel = 'Try again', onAction, style }) {
  return (
    <View style={[ps.center, style]}>
      <View style={ps.errIcon}>
        <AlertCircle size={26} color={color.danger} />
      </View>
      <Text style={[type.subheading, { color: color.text, textAlign: 'center' }]}>{title}</Text>
      {message ? <Text style={[type.small, { color: color.textMuted, textAlign: 'center' }]}>{message}</Text> : null}
      {onAction ? <Button title={actionLabel} onPress={onAction} variant="secondary" size="sm" fullWidth={false} style={{ alignSelf: 'center', marginTop: space.sm }} /> : null}
    </View>
  );
}

/** Pinned bottom action bar that sits above the floating nav. */
export function CtaBar({ children, style }) {
  const pad = useNavPad(space.md);
  return <View style={[ps.cta, { paddingBottom: pad }, style]}>{children}</View>;
}

/** Ride route: pickup (green dot) → drop (gold square), joined by a rail. */
export function RouteLines({ pickup, drop, numberOfLines = 2 }) {
  return (
    <View style={{ gap: space.xs }}>
      <View style={ps.routeRow}>
        <View style={ps.routeMarkCol}>
          <View style={[ps.dot, { backgroundColor: color.success }]} />
          <View style={ps.rail} />
        </View>
        <View style={ps.routeText}>
          <Text style={[type.caption, { color: color.textMuted }]}>Pickup</Text>
          <Text style={[type.small, { color: color.text }]} numberOfLines={numberOfLines}>
            {pickup}
          </Text>
        </View>
      </View>
      <View style={ps.routeRow}>
        <View style={ps.routeMarkCol}>
          <View style={[ps.square, { backgroundColor: color.goldText }]} />
        </View>
        <View style={ps.routeText}>
          <Text style={[type.caption, { color: color.textMuted }]}>Drop</Text>
          <Text style={[type.small, { color: color.text }]} numberOfLines={numberOfLines}>
            {drop}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Map a free-form ride / ticket / payment status to a DESIGN_SYSTEM tone. */
export function statusTone(status) {
  const s = String(status || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (!s) return 'neutral';
  if (/(cancel|fail|reject|expire|declin)/.test(s)) return 'danger';
  if (/(complete|deliver|paid|approved|refund|resolved|closed|success|credit)/.test(s)) return 'success';
  if (/(pending|process|search|await|waiting|scheduled|open|new|in review)/.test(s)) return 'warning';
  if (/(book|confirm|placed|accept|ongoing|on the way|arriv|start|progress|active|assigned)/.test(s)) return 'info';
  return 'neutral';
}

/** First letter upper case, the rest as given (no all-caps). */
export const sentence = (value) => {
  const s = String(value || '').replace(/[_]+/g, ' ').trim();
  if (!s) return '';
  const lower = s === s.toUpperCase() ? s.toLowerCase() : s;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const ps = StyleSheet.create({
  titleBar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md, backgroundColor: color.bg },
  titleText: { flex: 1, minWidth: 0 },
  field: { minHeight: touch, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  fieldMulti: { alignItems: 'flex-start', paddingVertical: space.sm },
  input: { flex: 1, minWidth: 0, minHeight: touch - 2, ...type.body, color: color.text, outlineStyle: 'none' },
  inputMulti: { minHeight: 96, textAlignVertical: 'top', paddingTop: space.xs },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.xxxl + space.lg, paddingHorizontal: space.xxl },
  errIcon: { width: 60, height: 60, borderRadius: radii.lg, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  cta: { backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  routeRow: { flexDirection: 'row', gap: space.sm },
  routeMarkCol: { width: 12, alignItems: 'center', paddingTop: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  square: { width: 10, height: 10, borderRadius: 2 },
  rail: { flex: 1, width: 2, minHeight: 12, marginTop: 3, backgroundColor: color.border },
  routeText: { flex: 1, minWidth: 0 },
});
