import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Calendar, CheckCircle2, Clock3, Navigation } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';
import { useIntercityConfirm } from '../hooks/useIntercityConfirm';

const TONE = {
  scheduled: { bg: 'rgba(5,150,105,0.2)', fg: tw.emerald400 },
  error: { bg: 'rgba(225,29,72,0.2)', fg: tw.rose400 },
  saving: { bg: 'rgba(37,99,235,0.2)', fg: tw.blue400 },
};

/** Port of Taxi/modules/user/pages/intercity/IntercityConfirm.jsx (/taxi/user/intercity/confirm). */
export default function IntercityConfirm() {
  const h = useIntercityConfirm();
  if (h.__guard) return null;
  const { navigate, routePrefix, state, status, error, formattedSchedule } = h;
  const tone = TONE[status] || TONE.saving;
  const Icon = status === 'scheduled' ? CheckCircle2 : Navigation;

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={[styles.icon, { backgroundColor: tone.bg }]}>
          <Icon size={26} color={tone.fg} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {status === 'scheduled' ? 'Intercity ride scheduled' : status === 'error' ? 'Scheduling failed' : 'Scheduling your ride'}
        </Text>
        <Text style={styles.body}>
          {status === 'scheduled'
            ? 'Your booking has been saved. Drivers will be notified automatically at the scheduled time.'
            : status === 'error'
              ? error
              : 'Saving your intercity booking and preparing automatic driver notification.'}
        </Text>

        <View style={styles.panel}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Calendar size={16} color={tw.blue300} />
            <Text style={styles.panelLabel}>Scheduled For</Text>
          </View>
          <Text style={styles.when}>{formattedSchedule || state.date || 'Scheduled'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <Clock3 size={15} color="rgba(255,255,255,0.65)" />
            <Text style={styles.route} numberOfLines={2}>{String(`${state.fromCity} to ${state.toCity}`).toUpperCase()}</Text>
          </View>
        </View>

        {status === 'saving' ? (
          <View style={styles.saving} accessibilityRole="progressbar">
            <ActivityIndicator size="small" color={tw.blue300} />
            <Text style={styles.savingText}>SAVING SCHEDULE</Text>
          </View>
        ) : null}

        <Press onPress={() => navigate(routePrefix || '/')} style={styles.done}>
          <Text style={styles.doneText}>{status === 'error' ? 'BACK TO HOME' : 'DONE'}</Text>
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.slate950, paddingHorizontal: 24 },
  card: { width: '100%', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center', ...shadow('2xl') },
  icon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 20, fontSize: 22, lineHeight: 28, color: '#fff', textAlign: 'center', ...fo(900) },
  body: { marginTop: 8, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.55)', textAlign: 'center', ...fo(700) },
  panel: { alignSelf: 'stretch', marginTop: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16 },
  panelLabel: { fontSize: 14, lineHeight: 20, color: '#fff', ...fo(700) },
  when: { marginTop: 8, fontSize: 18, lineHeight: 28, color: '#fff', ...fo(900) },
  route: { flex: 1, fontSize: 12, lineHeight: 16, letterSpacing: 1.9, color: 'rgba(255,255,255,0.65)', ...fo(700) },
  saving: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 },
  savingText: { fontSize: 12, lineHeight: 16, letterSpacing: 2.2, color: tw.blue300, ...fo(900) },
  done: { alignSelf: 'stretch', height: 48, marginTop: 24, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  doneText: { fontSize: 14, letterSpacing: 2.2, color: tw.slate900, ...fo(900) },
});
