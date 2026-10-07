import { useEffect } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Clock, FileText, HelpCircle, ShieldCheck, TrendingUp } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { outfit, playfair } from '../../theme';
import { BrandHero, LogoBadge } from '../components/OnboardingShell';
import { obCard, up } from '../components/onboardingTheme';
import { Chip, CtaButton } from '../ui/Surface';
import { DT } from '../ui/dt';

/*
 * Port of driver/pages/registration/ApplicationStatus.jsx (/taxi/driver/status).
 * On the web the `taxi-*` colour classes (taxi-bg, taxi-text, taxi-secondary, taxi-primary)
 * are not defined anywhere, so the page inherits the taxi root colours (#1C2833 on #F9F9F9)
 * and the "pulsing ring" (bg-taxi-primary) is invisible. Kept as is.
 */

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
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 + insets.bottom }}>
        <BrandHero top={insets.top + 14} style={{ paddingBottom: 64 }}>
          <View style={styles.maxW}>
            <LogoBadge size={48} />
            <Text style={styles.h1} accessibilityRole="header">Application Successfully Submitted</Text>
            <Text style={styles.lead}>
              Our team is currently reviewing your documents. This usually takes <Text style={{ color: DT.accent, ...outfit(800) }}>12-24 hours.</Text>
            </Text>
          </View>
        </BrandHero>

        <View style={[styles.maxW, { paddingHorizontal: 20, marginTop: -36, gap: 16 }]}>
          <View style={styles.statusCard}>
            <Animated.View style={[styles.hero, { opacity: enter, transform: [{ rotate }, { scale }] }]}>
              <Clock size={40} strokeWidth={2.5} color={DT.warn} />
              <View style={styles.badge}>
                <CheckCircle2 size={18} strokeWidth={3} color={DT.onBrand} />
              </View>
            </Animated.View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chip label="In review" tone="warn" />
              <Text style={styles.statusText}>We will notify you as soon as there is a decision.</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: DT.successSoft }]}>
                <FileText size={20} color={DT.success} />
              </View>
              <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>KYC Verification</Text>
                <Text style={styles.rowSub}>{up('In Progress')}</Text>
              </View>
            </View>
            <Animated.View style={{ opacity: pulse }}>
              <TrendingUp size={18} color={DT.success} />
            </Animated.View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: DT.bgSoft }]}>
                <ShieldCheck size={20} color={DT.faint} />
              </View>
              <View style={{ gap: 2, opacity: 0.6, flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>Background Check</Text>
                <Text style={styles.rowSub}>{up('Waiting')}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: 20 + insets.bottom }]}>
        <CtaButton
          variant="outline"
          title={up('Contact Support')}
          accessibilityLabel="Contact Support"
          onPress={() => navigate('/taxi/driver/support')}
          icon={<HelpCircle size={20} strokeWidth={2.5} color={DT.muted} />}
          style={styles.maxW}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  maxW: { width: '100%', maxWidth: 448, alignSelf: 'center' },
  statusCard: { ...obCard, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  hero: { width: 80, height: 80, backgroundColor: DT.warnSoft, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', bottom: -6, right: -6, width: 32, height: 32, backgroundColor: DT.success, borderRadius: 16, borderWidth: 3, borderColor: DT.card, alignItems: 'center', justifyContent: 'center' },
  h1: { ...playfair(700), fontSize: 26, lineHeight: 34, color: DT.gold, marginTop: 16 },
  lead: { ...outfit(500), fontSize: 14, lineHeight: 21, color: DT.onBrandMuted, marginTop: 8 },
  statusText: { ...outfit(500), fontSize: 13, lineHeight: 19, color: DT.inkSoft, marginTop: 8 },
  row: { ...obCard, padding: 16, borderRadius: DT.radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...outfit(800), fontSize: 14, lineHeight: 20, color: DT.ink },
  rowSub: { ...outfit(700), fontSize: 11, lineHeight: 16, letterSpacing: 0.5, minWidth: 40, color: DT.muted },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'rgba(248,250,252,0.96)' },
});
