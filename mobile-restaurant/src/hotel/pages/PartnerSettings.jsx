import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, CreditCard, LogOut } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Card, SectionHeader } from '../../components/ds';
import { useNavigate } from '../../lib/webRouter';
import { color, radii, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { clearPartnerSessions } from '../../restaurant/utils/partnerSession';
import usePartnerStore from '../store/partnerStore';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerSettings.jsx
 * (/hotel/partner/settings). The web's page carried push / SMS / dark-mode
 * toggles that were local state only, "Two-factor authentication" and
 * "Change password" rows with no action (partners sign in by phone OTP, there
 * is no password), a fixed "v1.0.2" and a Sign out button that did nothing.
 * Only what works is kept: bank details, a working sign out, and the real
 * app version.
 */

const SettingItem = ({ icon: Icon, label, type: kind = 'toggle', value, onChange, last, onPress }) => {
  const body = (
    <View style={[styles.item, !last && styles.itemDivider]}>
      <View style={styles.itemIcon}>
        <Icon size={18} color={color.primary} />
      </View>
      <Text style={styles.itemLabel} numberOfLines={2}>
        {label}
      </Text>

      {kind === 'toggle' ? (
        <Press
          scale={1}
          accessibilityRole="switch"
          accessibilityLabel={label}
          accessibilityState={{ checked: Boolean(value) }}
          onPress={() => onChange(!value)}
          hitSlop={8}
          style={[styles.track, { backgroundColor: value ? color.primary : color.borderStrong }]}
        >
          <View style={[styles.thumb, { transform: [{ translateX: value ? 20 : 0 }] }]} />
        </Press>
      ) : null}

      {kind === 'link' ? <ChevronRight size={18} color={color.textDisabled} /> : null}

      {kind === 'value' ? <Text style={styles.itemValue}>{value}</Text> : null}
    </View>
  );
  return onPress ? (
    <Press scale={1} onPress={onPress} accessibilityLabel={label}>
      {body}
    </Press>
  ) : (
    body
  );
};

const Section = ({ title }) => <SectionHeader title={title} style={{ marginTop: space.xl, marginBottom: space.sm }} />;

const PartnerSettings = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  // Same as the sidebar's Log Out: signs out of both businesses.
  const signOut = async () => {
    await clearPartnerSessions();
    usePartnerStore.getState().resetForm();
    navigate('/hotel/partner/login');
  };
  const version = Constants.expoConfig?.version || '';

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PartnerHeader title="Settings" subtitle="Preferences" />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl + insets.bottom }}>
        <View style={{ maxWidth: 576, width: '100%', alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.xs }}>
          {/* Wallet Section */}
          <Section title="Payments" />
          <Card padded={false}>
            <SettingItem icon={CreditCard} label="Saved bank details" type="link" last onPress={() => navigate('/hotel/partner/bank-details')} />
          </Card>

          <Card padded={false} style={{ marginTop: space.xl }}>
            <Press scale={1} onPress={signOut} accessibilityLabel="Sign out" style={styles.signOut}>
              <View style={[styles.itemIcon, { backgroundColor: color.dangerSoft }]}>
                <LogOut size={18} color={color.danger} />
              </View>
              <Text style={styles.signOutText}>Sign out</Text>
            </Press>
          </Card>

          {version ? <Text style={styles.version}>Dima Hasao Partner App v{version}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 60 },
  itemDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  itemIcon: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1, ...type.bodyStrong, color: color.text },
  itemValue: { ...type.small, color: color.textMuted },
  track: { width: 48, height: 28, borderRadius: 14, padding: 3 },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.surface },
  signOut: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 60 },
  signOutText: { ...type.bodyStrong, color: color.danger },
  version: { ...type.caption, color: color.textMuted, textAlign: 'center', marginTop: space.xl },
});

export default PartnerSettings;
