import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Trash2, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from '../../lib/webRouter';
import { Button, Card, IconButton, SectionHeader } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { PageTitle, useNavPad } from '../account/ui';
import { socketService } from '../api/socket';
import { userAuthService } from '../services/authService';
import { clearCurrentRide } from '../services/currentRideService';

const REASONS = ['I use another app', 'Too expensive', 'Privacy concerns', 'Technical issues', 'Taking a break', 'Other'];
const CONSEQUENCES = [
  'An admin will review your deletion request',
  'Your account stays active until the request is approved',
  'After approval, ride history, addresses, and preferences may be removed',
  'Active bookings may be cancelled after approval',
  'Rejected requests keep your account unchanged',
];

/** Port of Taxi/modules/user/pages/profile/DeleteAccount.jsx (/taxi/user/profile/delete-account). */
export default function DeleteAccount() {
  const bottomPad = useNavPad(space.xxl);
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await userAuthService.requestAccountDeletion(reason);
      clearCurrentRide();
      socketService.disconnect();
      setShowConfirm(false);
      // Web: clears the local session and returns to the login page.
      await clearSession?.();
      navigate('/app/login', { replace: true });
    } catch (requestError) {
      setError(requestError?.message || 'Something went wrong. Please try again.');
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <View style={styles.flex}>
      <PageTitle title="Delete account" subtitle="Admin approval is required" onBack={() => navigate('/taxi/user/profile')} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}>
        {error ? (
          <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <AlertTriangle size={18} color={color.danger} />
            <Text style={[type.small, styles.grow, { color: color.danger }]}>{error}</Text>
            <IconButton icon={X} label="Dismiss" iconSize={18} iconColor={color.danger} onPress={() => setError(null)} />
          </View>
        ) : null}

        <Card style={styles.warning}>
          <View style={styles.warningHead}>
            <View style={styles.warningIcon}>
              <AlertTriangle size={20} color={color.danger} />
            </View>
            <View style={styles.grow}>
              <Text style={[type.subheading, { color: color.text }]}>What happens next</Text>
              <Text style={[type.small, { color: color.textMuted }]}>Admin approval is required</Text>
            </View>
          </View>
          <View style={{ gap: space.sm }}>
            {CONSEQUENCES.map((c) => (
              <View key={c} style={styles.consequence}>
                <View style={styles.bullet} />
                <Text style={[type.small, styles.grow, { color: color.textSecondary }]}>{c}</Text>
              </View>
            ))}
          </View>
        </Card>

        <View>
          <SectionHeader title="Why are you leaving?" />
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <View accessibilityRole="radiogroup">
              {REASONS.map((r, i) => {
                const on = reason === r;
                return (
                  <Press key={r} scale={1} onPress={() => setReason(r)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={r} style={[styles.reason, i < REASONS.length - 1 ? styles.reasonBorder : null, on ? { backgroundColor: color.primarySoft } : null]}>
                    <View style={[styles.radio, on ? styles.radioOn : null]}>{on ? <View style={styles.radioDot} /> : null}</View>
                    <Text style={[on ? type.bodyStrong : type.body, { color: on ? color.primary : color.text }]}>{r}</Text>
                  </Press>
                );
              })}
            </View>
          </Card>
          {!reason ? <Text style={[type.caption, { color: color.textMuted, marginTop: space.sm }]}>Choose a reason to continue.</Text> : null}
        </View>

        <View style={{ gap: space.sm, paddingTop: space.sm }}>
          <Button title="Delete my account" icon={Trash2} variant="danger" size="lg" disabled={!reason} onPress={() => setShowConfirm(true)} />
          <Button title="Cancel" variant="outline" onPress={() => navigate('/taxi/user/profile')} />
        </View>
      </ScrollView>

      <Dialog visible={showConfirm} onClose={() => !loading && setShowConfirm(false)} backdrop={color.overlay} panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}>
          <AlertTriangle size={28} color={color.danger} />
        </View>
        <Text style={[type.heading, { color: color.text, textAlign: 'center' }]} accessibilityRole="header">Send deletion request?</Text>
        <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', marginTop: space.xs }]}>Admin will review this request before your account is deleted.</Text>
        <Text style={[type.small, { color: color.textMuted, textAlign: 'center', marginTop: space.xs }]}>Your account remains active until approval.</Text>
        <View style={styles.dialogActions}>
          <Button title="Yes, send request" variant="danger" loading={loading} disabled={loading} onPress={handleDelete} />
          <Button title="No, keep my account" variant="ghost" disabled={loading} onPress={() => setShowConfirm(false)} />
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.xl },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.dangerSoft, borderRadius: radii.md, paddingLeft: space.md },
  warning: { gap: space.md, borderColor: color.dangerSoft },
  warningHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  warningIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  consequence: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.danger, marginTop: 7 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, minHeight: 52 },
  reasonBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: color.primary, backgroundColor: color.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.onPrimary },
  dialog: { width: '88%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.lg, padding: space.xxl, alignItems: 'center', ...elevation.float },
  dialogIcon: { width: 60, height: 60, borderRadius: radii.lg, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  dialogActions: { alignSelf: 'stretch', gap: space.xs, marginTop: space.xl },
});
