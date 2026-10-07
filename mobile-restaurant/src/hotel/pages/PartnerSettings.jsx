import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, ChevronRight, CreditCard, Globe, Lock, LogOut, Moon, Smartphone } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerSettings.jsx
 * (/hotel/partner/settings). As on the web, the toggles are local state only
 * and the security rows and Sign Out have no action; the link goes to
 * /hotel/partner/bank-details (the web's /hotel/bank-details redirects there).
 * The gsap entrance is dropped.
 */

const SettingItem = ({ icon: Icon, label, type = 'toggle', value, onChange, last, onPress }) => {
  const body = (
    <View style={[styles.item, !last && { borderBottomWidth: 1, borderBottomColor: tw.gray50 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon size={18} color={tw.gray400} />
        <Text style={styles.itemLabel}>{label}</Text>
      </View>

      {type === 'toggle' ? (
        <Press
          scale={1}
          accessibilityRole="switch"
          accessibilityState={{ checked: Boolean(value) }}
          onPress={() => onChange(!value)}
          style={[styles.track, { backgroundColor: value ? HT.primary : tw.gray200 }]}
        >
          <View style={[styles.thumb, { transform: [{ translateX: value ? 16 : 0 }] }]} />
        </Press>
      ) : null}

      {type === 'link' ? <ChevronRight size={16} color={tw.gray300} /> : null}

      {type === 'value' ? <Text style={styles.itemValue}>{value}</Text> : null}
    </View>
  );
  return onPress ? (
    <Press scale={1} onPress={onPress}>
      {body}
    </Press>
  ) : (
    body
  );
};

const Section = ({ title, top }) => (
  <View style={[styles.section, top && { borderTopWidth: 1, borderTopColor: tw.gray100 }]}>
    <Text style={styles.sectionText}>{title}</Text>
  </View>
);

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
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <PartnerHeader title="Settings" subtitle="Preferences" />

      <ScrollView contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}>
        <View style={{ maxWidth: 576, width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingTop: 24 }}>
          <View style={styles.card}>
            {/* Wallet Section */}
            <Section title="Payments" />
            <SettingItem icon={CreditCard} label="Saved Bank Details" type="link" last onPress={() => navigate('/hotel/partner/bank-details')} />

            {/* Account Section */}
            <Section title="General" />
            <SettingItem icon={Bell} label="Push Notifications" value={settings.notifications} onChange={() => toggle('notifications')} />
            <SettingItem icon={Smartphone} label="SMS Alerts" value={settings.emailAlerts} onChange={() => toggle('emailAlerts')} />
            <SettingItem icon={Globe} label="Language" type="value" value="English (UK)" />

            {/* Security Section */}
            <Section title="Security" top />
            <SettingItem icon={Lock} label="Two-Factor Authentication" type="link" />
            <SettingItem icon={Lock} label="Change Password" type="link" />

            {/* App Section */}
            <Section title="system" top />
            <SettingItem icon={Moon} label="Dark Mode" value={settings.darkMode} onChange={() => toggle('darkMode')} />

            <Press scale={1} style={styles.signOut}>
              <LogOut size={18} color={tw.red500} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </Press>
          </View>

          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={styles.version}>Dima Hasao Partner App v1.0.2</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 32, borderWidth: 1, borderColor: tw.gray100, overflow: 'hidden', ...shadow('sm') },
  section: { backgroundColor: 'rgba(249,250,251,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  sectionText: { fontSize: 10, lineHeight: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: tw.gray400, ...poppins(900) },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  itemLabel: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(700) },
  itemValue: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(700) },
  track: { width: 40, height: 24, borderRadius: 12, padding: 4 },
  thumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  signOut: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: tw.gray100 },
  signOutText: { fontSize: 14, lineHeight: 20, color: tw.red500, ...poppins(700) },
  version: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(400) },
});

export default PartnerSettings;
