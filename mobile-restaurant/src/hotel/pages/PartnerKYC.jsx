import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CheckCircle, ChevronRight, Clock, FileText, Shield, XCircle } from 'lucide-react-native';
import { Button, Card, StatusBadge } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerKYC.jsx
 * (/hotel/partner/kyc). Like the web page, the steps are a fixed mock (it
 * says "derive from formData.kyc" and does not) and the upload buttons have no
 * action; the gsap entrance is dropped.
 */

const BADGES = {
  verified: { tone: 'success', Icon: CheckCircle, label: 'Verified' },
  pending: { tone: 'warning', Icon: Clock, label: 'Reviewing' },
  rejected: { tone: 'danger', Icon: XCircle, label: 'Action needed' },
};

const DocStatus = ({ status }) => {
  const badge = BADGES[status];
  if (!badge) return <StatusBadge label="Not uploaded" tone="neutral" />;
  return <StatusBadge label={badge.label} tone={badge.tone} icon={badge.Icon} />;
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
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PartnerHeader title="KYC Verification" subtitle="Complete your profile" />

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl + insets.bottom }}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Shield size={24} color={color.goldOnDark} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.heroTitle}>Verification status</Text>
            <Text style={styles.heroSub}>Complete all steps to start receiving payouts.</Text>
          </View>
        </View>

        <Card padded={false} style={{ maxWidth: 768, width: '100%', alignSelf: 'center' }}>
          {kycSteps.map((step, idx) => (
            <View key={idx} style={[styles.step, idx < kycSteps.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                <View style={styles.stepIcon}>
                  <FileText size={18} color={color.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  <DocStatus status={step.status} />
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                  {step.status === 'rejected' ? <Button title="Re-upload document" icon={Camera} variant="dangerSoft" size="sm" fullWidth={false} style={{ minHeight: 44, marginTop: space.xs }} /> : null}
                  {step.status === 'none' ? <Button title="Upload now" iconRight={ChevronRight} size="sm" fullWidth={false} style={{ minHeight: 44, marginTop: space.xs }} /> : null}
                </View>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: color.primaryDeep, padding: space.xl, borderRadius: radii.xl },
  heroIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { ...type.subheading, color: color.textInverse },
  heroSub: { ...type.small, color: color.textOnDarkMuted },
  step: { padding: space.lg },
  stepIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { ...type.bodyStrong, color: color.text },
  stepDesc: { ...type.small, color: color.textMuted },
});

export default PartnerKYC;
