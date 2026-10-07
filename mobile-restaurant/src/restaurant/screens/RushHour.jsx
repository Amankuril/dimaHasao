import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap } from 'lucide-react-native';
import { Card, SectionHeader } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import { PageHeader, PrimaryButton, RadioRow } from '../components/ui';
import { useRushHour } from '../hooks/pages/useRushHour';

const BENEFITS = ['Get more time to prepare food', 'Show correct delivery time to customers', 'Avoid crowding of riders at your restaurant'];

/** Port of Food/pages/restaurant/RushHour.jsx (/food/restaurant/rush-hour). */
export default function RushHour() {
  const insets = useSafeAreaInsets();
  const { goBack, selectedTime, setSelectedTime, handleConfirm, timeOptions } = useRushHour();
  return (
    <View style={styles.page}>
      <PageHeader title="Rush in kitchen" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <View style={styles.bolt}>
            <Zap size={26} color={color.goldOnDark} strokeWidth={2.5} fill={color.goldOnDark} />
          </View>
          <Text style={styles.bannerText}>Inform us when your kitchen is in rush and you need more time to manage orders</Text>
        </View>

        <View>
          <SectionHeader title="How this helps you" />
          <Card style={{ gap: space.md }}>
            {BENEFITS.map((benefit, index) => (
              <View key={benefit} style={styles.benefit}>
                <View style={styles.number}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>
                <Text style={styles.text}>{benefit}</Text>
              </View>
            ))}
          </Card>
        </View>

        <View>
          <SectionHeader title="Increase preparation time" />
          <Text style={styles.lead}>Increase food preparation time for the next</Text>
          <Card style={{ gap: space.sm }}>
            <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
              {timeOptions.map((option) => (
                <RadioRow key={option.value} label={option.label} selected={selectedTime === option.value} onPress={() => setSelectedTime(option.value)} />
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
        <PrimaryButton title="Confirm" onPress={handleConfirm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl },
  banner: { backgroundColor: color.primaryDeep, borderRadius: radii.lg, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.lg },
  bolt: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(202,168,62,0.18)', alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1, ...type.body, color: color.textInverse },
  lead: { ...type.small, color: color.textSecondary, marginTop: -space.xs, marginBottom: space.md },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  number: { width: 28, height: 28, borderRadius: 14, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  numberText: { ...type.label, color: color.primary },
  text: { flex: 1, ...type.body, color: color.text },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
});
