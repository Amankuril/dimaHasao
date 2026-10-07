import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { navigateTo } from '../../lib/webRouter';
import { outfit, playfair, shadow } from '../../theme';
import { DT } from './dt';

/*
 * The header of a driver screen, in the user app's taxi style: deep green with
 * rounded bottom corners, a gold serif title and a cream subtitle.
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
    <View style={[st.wrap, { paddingTop: insets.top + 14 }]}>
      <View style={st.row}>
        {back ? (
          <Press scale={0.92} accessibilityLabel="Go back" onPress={onBack || (() => navigateTo(-1))} style={st.back} hitSlop={8}>
            <ArrowLeft size={20} color={DT.onBrand} strokeWidth={2.5} />
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
    backgroundColor: DT.brandDeep,
    paddingHorizontal: DT.space.xl,
    paddingBottom: 20,
    borderBottomLeftRadius: DT.radius.xl,
    borderBottomRightRadius: DT.radius.xl,
    ...shadow('md'),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, lineHeight: 28, color: DT.gold, ...playfair(700) },
  subtitle: { marginTop: 2, fontSize: 12, lineHeight: 17, color: DT.onBrandMuted, ...outfit(500) },
  right: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
