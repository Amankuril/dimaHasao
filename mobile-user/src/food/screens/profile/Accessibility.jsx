import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Accessibility as AccessibilityIcon, ArrowLeft, Eye, MousePointerClick, Volume2 } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { navigateTo } from '../../../lib/webRouter';
import { Button, Card, CardContent } from '../../components/cart/ui';
import { poppins, tw } from '../../../theme';

const OPTIONS = [
  { key: 'largeText', Icon: Eye, label: 'Large Text', desc: 'Increase text size for better readability' },
  { key: 'highContrast', Icon: Eye, label: 'High Contrast', desc: 'Enhance contrast for better visibility' },
  { key: 'screenReader', Icon: Volume2, label: 'Screen Reader Support', desc: 'Optimize for screen readers' },
  { key: 'reduceMotion', Icon: MousePointerClick, label: 'Reduce Motion', desc: 'Minimize animations and transitions' },
];

/** Port of pages/user/profile/Accessibility.jsx (the toggles are local state only, as on the web). */
export default function Accessibility() {
  const [values, setValues] = useState({ largeText: false, highContrast: false, screenReader: false, reduceMotion: false });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#faf6ed' }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Press onPress={() => navigateTo('/user/profile')} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={16} color="#000" />
        </Press>
        <Text style={styles.h1}>Accessibility</Text>
      </View>

      <Card style={[styles.card, { marginBottom: 16, paddingVertical: 0 }]}>
        <CardContent style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={[styles.iconWrap, { marginTop: 2 }]}>
              <AccessibilityIcon size={20} color={tw.gray700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.h3}>Make the app more accessible</Text>
              <Text style={styles.p}>Customize your experience to better suit your needs and preferences.</Text>
            </View>
          </View>
        </CardContent>
      </Card>

      <View style={{ gap: 12 }}>
        {OPTIONS.map(({ key, Icon, label, desc }) => (
          <Card key={key} style={[styles.card, { paddingVertical: 0 }]}>
            <CardContent style={{ padding: 16 }}>
              <View style={styles.row}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={styles.iconWrap}>
                    <Icon size={20} color={tw.gray700} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.desc}>{desc}</Text>
                  </View>
                </View>
                <Switch
                  value={values[key]}
                  onValueChange={(v) => setValues((prev) => ({ ...prev, [key]: v }))}
                  trackColor={{ false: tw.gray200, true: '#16a34a' }}
                  thumbColor="#fff"
                  accessibilityLabel={label}
                />
              </View>
            </CardContent>
          </Card>
        ))}
      </View>

      <Card style={[styles.card, { marginTop: 16, paddingVertical: 0 }]}>
        <CardContent style={{ padding: 16 }}>
          <Text style={[styles.h3, { marginBottom: 8 }]}>Need more help?</Text>
          <Text style={[styles.p, { marginBottom: 12 }]}>If you need additional accessibility features or have suggestions, please contact our support team.</Text>
          <Button variant="outline" onPress={() => navigateTo('/user/help')} style={{ width: '100%', height: 40 }}>Contact Support</Button>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: { height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  h1: { fontSize: 20, lineHeight: 28, color: '#000', ...poppins(700) },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0 },
  iconWrap: { backgroundColor: tw.gray100, borderRadius: 999, padding: 8 },
  h3: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 4, ...poppins(600) },
  p: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontSize: 16, lineHeight: 16, color: tw.gray900, ...poppins(500) },
  desc: { marginTop: 4, fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
});
