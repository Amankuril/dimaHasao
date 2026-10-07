import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CheckCircle, ChevronRight, Clock, FileText, Shield, XCircle } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerKYC.jsx
 * (/hotel/partner/kyc). Like the web page, the steps are a fixed mock (it
 * says "derive from formData.kyc" and does not) and the upload buttons have no
 * action; the gsap entrance is dropped.
 */

const BADGES = {
  verified: { fg: tw.green600, bg: tw.green50, Icon: CheckCircle, label: 'Verified' },
  pending: { fg: tw.orange600, bg: tw.orange50, Icon: Clock, label: 'Reviewing' },
  rejected: { fg: tw.red600, bg: tw.red50, Icon: XCircle, label: 'Action Needed' },
};

const DocStatus = ({ status }) => {
  const badge = BADGES[status];
  if (!badge) {
    return (
      <View style={[styles.badge, { backgroundColor: tw.gray100 }]}>
        <Text style={[styles.badgeText, { color: tw.gray400 }]}>Not Uploaded</Text>
      </View>
    );
  }
  const { Icon } = badge;
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Icon size={10} color={badge.fg} />
      <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
    </View>
  );
};

// Mock Status (In real app, derive from formData.kyc)
const kycSteps = [
  { id: 1, label: 'Identity Proof (Aadhaar/PAN)', status: 'verified', desc: 'Verified on 12 Aug 2024' },
  { id: 2, label: 'Business Registration (GST)', status: 'pending', desc: 'Submitted yesterday. Under review.' },
  { id: 3, label: 'Bank Account Details', status: 'rejected', desc: 'Image blurred. Please re-upload cancelled cheque.' },
  { id: 4, label: 'Property Ownership Proof', status: 'none', desc: 'Required for listing approval.' },
];

const PartnerKYC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <PartnerHeader title="KYC Verification" subtitle="Complete your profile" />

      <ScrollView contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}>
        <View style={styles.hero}>
          <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <View style={styles.heroIcon}>
                <Shield size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Verification Status</Text>
                <Text style={styles.heroSub}>Complete all steps to start receiving payouts.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center', paddingHorizontal: 16, marginTop: -32 }}>
          <View style={styles.card}>
            {kycSteps.map((step, idx) => (
              <View key={idx} style={[styles.step, idx < kycSteps.length - 1 && { borderBottomWidth: 1, borderBottomColor: tw.gray50 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <View style={styles.stepIcon}>
                      <FileText size={16} color={tw.gray400} />
                    </View>
                    <Text style={styles.stepLabel}>{step.label}</Text>
                  </View>
                  <DocStatus status={step.status} />
                </View>
                <Text style={styles.stepDesc}>{step.desc}</Text>
                {step.status === 'rejected' ? (
                  <Press style={[styles.action, { backgroundColor: tw.red50 }]}>
                    <Camera size={14} color={tw.red600} />
                    <Text style={[styles.actionText, { color: tw.red600 }]}>Re-upload Document</Text>
                  </Press>
                ) : null}
                {step.status === 'none' ? (
                  <Press style={[styles.action, { backgroundColor: HT.primary }, shadow('lg')]}>
                    <Text style={[styles.actionText, { color: '#fff' }]}>Upload Now</Text>
                    <ChevronRight size={14} color="#fff" />
                  </Press>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { backgroundColor: HT.primary, padding: 24, paddingBottom: 48 },
  heroIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, lineHeight: 28, color: '#fff', ...poppins(700) },
  heroSub: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.6)', ...poppins(400) },
  card: { backgroundColor: '#fff', borderRadius: 32, padding: 8, borderWidth: 1, borderColor: tw.gray100, ...shadow('0 20px 25px -5px rgba(229,231,235,0.5)') },
  step: { padding: 16 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(700) },
  stepDesc: { fontSize: 12, lineHeight: 19.5, color: tw.gray400, paddingLeft: 44, paddingRight: 16, ...poppins(400) },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', ...poppins(900) },
  action: { marginLeft: 44, marginTop: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionText: { fontSize: 12, lineHeight: 16, ...poppins(700) },
});

export default PartnerKYC;
