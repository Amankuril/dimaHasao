import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Accessibility as AccessibilityIcon, Eye, LifeBuoy, MousePointerClick, Volume2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigateTo } from '../../../lib/webRouter';
import { Button, Card, ListRow } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { PageHeader } from '../../components/profile/ProfileChrome';
import { color, radii, space, type } from '../../../theme';

const OPTIONS = [
  { key: 'largeText', Icon: Eye, label: 'Large Text', desc: 'Increase text size for better readability' },
  { key: 'highContrast', Icon: Eye, label: 'High Contrast', desc: 'Enhance contrast for better visibility' },
  { key: 'screenReader', Icon: Volume2, label: 'Screen Reader Support', desc: 'Optimize for screen readers' },
  { key: 'reduceMotion', Icon: MousePointerClick, label: 'Reduce Motion', desc: 'Minimize animations and transitions' },
];

/** Port of pages/user/profile/Accessibility.jsx (the toggles are local state only, as on the web). */
export default function Accessibility() {
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState({ largeText: false, highContrast: false, screenReader: false, reduceMotion: false });

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageHeader title="Accessibility" onBack={() => navigateTo('/user/profile')} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }]}>
        <Card style={styles.intro}>
          <View style={styles.iconWrap}>
            <AccessibilityIcon size={22} color={color.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.h3}>Make the app more accessible</Text>
            <Text style={styles.p}>Customize your experience to better suit your needs and preferences.</Text>
          </View>
        </Card>

        <Card padded={false} style={{ overflow: 'hidden' }}>
          {OPTIONS.map(({ key, Icon, label, desc }, i) => (
            <ListRow
              key={key}
              icon={Icon}
              title={label}
              subtitle={desc}
              divider={i < OPTIONS.length - 1}
              right={
                <Switch
                  value={values[key]}
                  onValueChange={(v) => setValues((prev) => ({ ...prev, [key]: v }))}
                  trackColor={{ false: color.borderStrong, true: color.primary }}
                  thumbColor={color.surface}
                  accessibilityLabel={label}
                />
              }
            />
          ))}
        </Card>

        <Card style={{ gap: space.sm }}>
          <Text style={styles.h3}>Need more help?</Text>
          <Text style={styles.p}>If you need additional accessibility features or have suggestions, please contact our support team.</Text>
          <Button title="Contact Support" icon={LifeBuoy} variant="outline" onPress={() => navigateTo('/user/help')} style={{ marginTop: space.sm }} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md },
  intro: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  iconWrap: { width: 44, height: 44, backgroundColor: color.primarySoft, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  h3: { ...type.subheading, color: color.text },
  p: { marginTop: space.xxs, ...type.body, color: color.textSecondary },
});
