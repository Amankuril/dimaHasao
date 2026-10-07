import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ChevronRight, CreditCard, Globe, Lock, LogOut, Moon, Smartphone } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Card, SectionHeader } from '../../components/ds';
import { useNavigate } from '../../lib/webRouter';
import { color, radii, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerSettings.jsx
 * (/hotel/partner/settings). As on the web, the toggles are local state only
 * and the security rows and Sign Out have no action; the link goes to
 * /hotel/partner/bank-details (the web's /hotel/bank-details redirects there).
 * The gsap entrance is dropped.
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
  const [settings, setSettings] = useState({
    notifications: true,
    emailAlerts: false,
    darkMode: false,
  });

  const toggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

          {/* Account Section */}
          <Section title="General" />
          <Card padded={false}>
            <SettingItem icon={Bell} label="Push notifications" value={settings.notifications} onChange={() => toggle('notifications')} />
            <SettingItem icon={Smartphone} label="SMS alerts" value={settings.emailAlerts} onChange={() => toggle('emailAlerts')} />
            <SettingItem icon={Globe} label="Language" type="value" value="English (UK)" last />
          </Card>

          {/* Security Section */}
          <Section title="Security" />
          <Card padded={false}>
            <SettingItem icon={Lock} label="Two-factor authentication" type="link" />
            <SettingItem icon={Lock} label="Change password" type="link" last />
          </Card>

          {/* App Section */}
          <Section title="System" />
          <Card padded={false}>
            <SettingItem icon={Moon} label="Dark mode" value={settings.darkMode} onChange={() => toggle('darkMode')} last />
          </Card>

          <Card padded={false} style={{ marginTop: space.xl }}>
            <Press scale={1} accessibilityLabel="Sign out" style={styles.signOut}>
              <View style={[styles.itemIcon, { backgroundColor: color.dangerSoft }]}>
                <LogOut size={18} color={color.danger} />
              </View>
              <Text style={styles.signOutText}>Sign out</Text>
            </Press>
          </Card>

          <Text style={styles.version}>Dima Hasao Partner App v1.0.2</Text>
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
