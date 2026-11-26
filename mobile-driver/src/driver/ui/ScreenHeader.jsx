import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { navigateTo } from '../../lib/webRouter';
import { outfit } from '../../theme';
import { DT } from './dt';

/*
 * The header of a driver screen: white, a hairline bottom edge, an ink title
 * and a muted subtitle. Anything passed as `right` sits on white, so use ink
 * or muted colours there.
 *
 *   <ScreenHeader title="Wallet" subtitle="Cash commission and online earnings" onBack={...} right={<Icon/>} />
 *
 * `onBack` defaults to going back (home when there is nothing to go back to);
 * pass `back={false}` on a root tab. The component reserves the status-bar
 * inset itself, so a screen using it must not add its own top padding.
 */
export default function ScreenHeader({ title, subtitle, onBack, back = true, right = null, children = null }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.wrap, { paddingTop: insets.top + 12 }]}>
      <View style={st.row}>
        {back ? (
          <Press scale={0.92} accessibilityLabel="Go back" onPress={onBack || (() => navigateTo(-1))} style={st.back} hitSlop={8}>
            <ArrowLeft size={20} color={DT.ink} strokeWidth={2} />
          </Press>
        ) : null}
        <View style={st.titles}>
          <Text style={st.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text style={st.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={st.right}>{right}</View> : null}
      </View>
      {children}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    backgroundColor: DT.card,
    paddingHorizontal: DT.space.lg,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DT.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, lineHeight: 28, color: DT.ink, ...outfit(600) },
  subtitle: { fontSize: 13, lineHeight: 18, color: DT.muted, ...outfit(400) },
  right: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
