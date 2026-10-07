import { StyleSheet, Text, View } from 'react-native';
import { Calendar, CheckCircle2, Navigation } from 'lucide-react-native';
import { Spinner } from '../../components/ui';
import { Button, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { useIntercityConfirm } from '../hooks/useIntercityConfirm';

const TONE = {
  scheduled: { bg: color.successSoft, fg: color.success, badge: 'success', label: 'Scheduled' },
  error: { bg: color.dangerSoft, fg: color.danger, badge: 'danger', label: 'Failed' },
  saving: { bg: color.warningSoft, fg: color.warning, badge: 'warning', label: 'Saving' },
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
          <Icon size={28} color={tone.fg} />
        </View>
        <StatusBadge label={tone.label} tone={tone.badge} style={{ alignSelf: 'center', marginTop: space.lg }} />
        <Text style={styles.title} accessibilityRole="header">
          {status === 'scheduled' ? 'Intercity ride scheduled' : status === 'error' ? 'Scheduling failed' : 'Scheduling your ride'}
        </Text>
        <Text style={styles.body} accessibilityLiveRegion="polite">
          {status === 'scheduled'
            ? 'Your booking has been saved. Drivers will be notified automatically at the scheduled time.'
            : status === 'error'
              ? error
              : 'Saving your intercity booking and preparing automatic driver notification.'}
        </Text>

        <View style={styles.panel}>
          <View style={styles.row}>
            <Calendar size={18} color={color.goldText} />
            <Text style={styles.panelLabel}>Scheduled for</Text>
          </View>
          <Text style={styles.when}>{formattedSchedule || state.date || 'Scheduled'}</Text>
          <View style={[styles.row, { marginTop: space.md }]}>
            <View style={styles.pickupDot} />
            <Text style={styles.route} numberOfLines={1}>{state.fromCity}</Text>
          </View>
          <View style={[styles.row, { marginTop: space.xs }]}>
            <View style={styles.dropSquare} />
            <Text style={styles.route} numberOfLines={1}>{state.toCity}</Text>
          </View>
        </View>

        {status === 'saving' ? (
          <View style={styles.saving} accessibilityRole="progressbar">
            <Spinner size={18} color={color.primary} />
            <Text style={styles.savingText}>Saving schedule</Text>
          </View>
        ) : null}

        <Button title={status === 'error' ? 'Back to home' : 'Done'} size="lg" onPress={() => navigate(routePrefix || '/')} style={{ marginTop: space.xl }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg, paddingHorizontal: space.lg },
  card: { width: '100%', maxWidth: 480, borderRadius: radii.xl, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.xl, paddingVertical: space.xxl, alignItems: 'center', ...elevation.card },
  icon: { width: 64, height: 64, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.heading, marginTop: space.sm, color: color.text, textAlign: 'center' },
  body: { ...type.small, marginTop: space.sm, color: color.textSecondary, textAlign: 'center' },
  panel: { alignSelf: 'stretch', marginTop: space.xl, borderRadius: radii.lg, backgroundColor: color.goldSoft, padding: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  panelLabel: { ...type.label, color: color.goldText },
  when: { ...type.price, marginTop: space.sm, color: color.text },
  pickupDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.primary },
  dropSquare: { width: 10, height: 10, borderRadius: 2, backgroundColor: color.danger },
  route: { ...type.small, flex: 1, minWidth: 0, color: color.textSecondary },
  saving: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, marginTop: space.xl },
  savingText: { ...type.label, color: color.warning },
});
