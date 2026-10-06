import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Zap } from 'lucide-react-native';
import { poppins, tw } from '../../theme';
import { PageHeader, PrimaryButton, RadioRow } from '../components/ui';
import { useRushHour } from '../hooks/pages/useRushHour';
import { RT_GRADIENT } from '../theme';

const BENEFITS = ['Get more time to prepare food', 'Show correct delivery time to customers', 'Avoid crowding of riders at your restaurant'];

/** Port of Food/pages/restaurant/RushHour.jsx (/food/restaurant/rush-hour). */
export default function RushHour() {
  const insets = useSafeAreaInsets();
  const { goBack, selectedTime, setSelectedTime, handleConfirm, timeOptions } = useRushHour();
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <PageHeader title="Rush in kitchen" onBack={goBack} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}>
        <View style={styles.banner}>
          <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bolt}>
            <Zap size={28} color="#fff" strokeWidth={2.5} fill="#fff" />
          </LinearGradient>
          <Text style={styles.bannerText}>Inform us when your kitchen is in rush and you need more time to manage orders</Text>
        </View>

        <View style={{ marginBottom: 32 }}>
          <Text style={styles.h2}>How this helps you</Text>
          <View style={{ gap: 12 }}>
            {BENEFITS.map((benefit, index) => (
              <View key={benefit} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.number}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>
                <Text style={styles.text}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={styles.h2}>Increase food preparation time for the next</Text>
          <View style={{ gap: 16 }} accessibilityRole="radiogroup">
            {timeOptions.map((option) => (
              <RadioRow key={option.value} label={option.label} selected={selectedTime === option.value} onPress={() => setSelectedTime(option.value)} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>
        <PrimaryButton title="Confirm" onPress={handleConfirm} textStyle={{ fontSize: 16, lineHeight: 24 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: tw.blue50, borderRadius: 8, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  bolt: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1, paddingTop: 4, fontSize: 14, lineHeight: 23, color: tw.gray900, ...poppins(400) },
  h2: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 16, ...poppins(700) },
  number: { width: 24, height: 24, borderRadius: 12, backgroundColor: tw.gray200, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(600) },
  text: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) },
  footer: { paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.gray200 },
});
