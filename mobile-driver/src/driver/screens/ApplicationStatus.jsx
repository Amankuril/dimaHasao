import { useEffect } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Clock, FileText, HelpCircle, ShieldCheck, TrendingUp } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { Press } from '../../components/ui';
import { outfit, tw } from '../../theme';

/*
 * Port of driver/pages/registration/ApplicationStatus.jsx (/taxi/driver/status).
 * On the web the `taxi-*` colour classes (taxi-bg, taxi-text, taxi-secondary, taxi-primary)
 * are not defined anywhere, so the page inherits the taxi root colours (#1C2833 on #F9F9F9)
 * and the "pulsing ring" (bg-taxi-primary) is invisible. Kept as is.
 */

const TEXT = '#1C2833';

export default function ApplicationStatus() {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();

  // motion.div initial rotate -15deg / scale .8 / opacity 0 -> rest (default spring)
  const enter = useAnimatedValue(0);
  const pulse = useAnimatedValue(1);
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enter, pulse]);

  const rotate = enter.interpolate({ inputRange: [0, 1], outputRange: ['-15deg', '0deg'] });
  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });

  return (
    <View style={{ flex: 1, backgroundColor: '#F9F9F9' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 32, paddingTop: 80 + insets.top, paddingBottom: 128 + insets.bottom }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 48 }}>
          <Animated.View style={[styles.hero, { opacity: enter, transform: [{ rotate }, { scale }] }]}>
            <Clock size={52} strokeWidth={2.5} color={TEXT} />
            <View style={styles.badge}>
              <CheckCircle2 size={20} strokeWidth={3} color="#fff" />
            </View>
          </Animated.View>

          <View style={{ alignItems: 'center', gap: 16, paddingHorizontal: 8 }}>
            <Text style={styles.h1}>Application Successfully Submitted</Text>
            <Text style={styles.lead}>
              Our team is currently reviewing your documents. This usually takes <Text style={{ color: TEXT }}>12-24 hours.</Text>
            </Text>
          </View>

          <View style={{ width: '100%', gap: 16 }}>
            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={[styles.rowIcon, { backgroundColor: tw.emerald50 }]}>
                  <FileText size={20} color={tw.emerald500} />
                </View>
                <View style={{ gap: 2 }}>
                  <Text style={styles.rowTitle}>KYC Verification</Text>
                  <Text style={styles.rowSub}>In Progress</Text>
                </View>
              </View>
              <Animated.View style={{ opacity: pulse }}>
                <TrendingUp size={16} color={tw.emerald500} />
              </Animated.View>
            </View>

            <View style={styles.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={[styles.rowIcon, { backgroundColor: tw.slate50 }]}>
                  <ShieldCheck size={20} color={tw.slate300} />
                </View>
                <View style={{ gap: 2, opacity: 0.4 }}>
                  <Text style={styles.rowTitle}>Background Check</Text>
                  <Text style={styles.rowSub}>Waiting</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: 48 + insets.bottom }]}>
        <Press onPress={() => navigate('/taxi/driver/support')} style={styles.support}>
          <Text style={styles.supportText}>Contact Support</Text>
          <HelpCircle size={20} strokeWidth={2.5} color={tw.slate500} />
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: 128, height: 128, backgroundColor: '#fff', borderRadius: 40, borderWidth: 1, borderColor: tw.slate100, alignItems: 'center', justifyContent: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  badge: { position: 'absolute', bottom: -8, right: -8, width: 40, height: 40, backgroundColor: tw.emerald500, borderRadius: 20, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' },
  h1: { ...outfit(900), fontSize: 30, lineHeight: 36, letterSpacing: -0.75, color: TEXT, textAlign: 'center' },
  lead: { ...outfit(700), fontSize: 14, lineHeight: 22.75, color: tw.slate400, textAlign: 'center' },
  row: { backgroundColor: '#fff', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: tw.slate50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 25px rgba(0,0,0,0.01)' },
  rowIcon: { width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...outfit(900), fontSize: 14, color: TEXT },
  rowSub: { ...outfit(700), fontSize: 11, letterSpacing: -0.55, textTransform: 'uppercase', color: tw.slate400 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 32, paddingTop: 16, backgroundColor: 'rgba(255,255,255,0.5)' },
  support: { height: 64, backgroundColor: '#fff', borderWidth: 2, borderColor: tw.slate100, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  supportText: { ...outfit(900), fontSize: 16, letterSpacing: -0.4, textTransform: 'uppercase', color: tw.slate500 },
});
