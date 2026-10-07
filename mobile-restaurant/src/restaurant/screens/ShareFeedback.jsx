import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, X } from 'lucide-react-native';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { useShareFeedback } from '../hooks/pages/useShareFeedback';
import { RT, RT_GRADIENT } from '../theme';

const BARS = [
  { height: 80, color: '#a5b4fc' },
  { height: 128, color: '#f9a8d4' },
  { height: 96, color: '#d8b4fe' },
  { height: 112, color: '#86efac' },
  { height: 88, color: '#fde047' },
];

/** Port of Food/pages/restaurant/ShareFeedback.jsx (/food/restaurant/share-feedback). */
export default function ShareFeedback() {
  const insets = useSafeAreaInsets();
  const { companyName, goBack, rating, setRating, showThanks, setShowThanks, numbers, handleClose, handleContinue } = useShareFeedback();
  const done = () => {
    setShowThanks(false);
    goBack();
  };
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Share your feedback</Text>
        <Press onPress={handleClose} accessibilityLabel="Close" hitSlop={8} style={{ padding: 8 }}>
          <X size={20} color={tw.gray900} />
        </Press>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={{ marginVertical: 24 }}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, marginBottom: 4, ...poppins(400) }}>Tell us about your</Text>
          <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(600) }}>Overall experience with {companyName.toLowerCase()}</Text>
        </View>

        <View style={styles.scale} accessibilityRole="radiogroup">
          {numbers.map((num, i) => {
            const on = rating === num;
            return (
              <Press key={num} scale={0.96} onPress={() => setRating(num)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${num} out of 10`} style={[{ flex: 1 }, i > 0 ? { borderLeftWidth: 1, borderLeftColor: tw.gray200 } : null]}>
                <LinearGradient colors={on ? RT_GRADIENT : ['#fff', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, lineHeight: 16, color: on ? '#fff' : tw.gray900, ...poppins(500) }}>{num}</Text>
                </LinearGradient>
              </Press>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontSize: 12, lineHeight: 16, color: RT.primary, ...poppins(400) }}>Very Bad</Text>
          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.green600, ...poppins(400) }}>Very Good</Text>
        </View>
        {rating !== null ? (
          <Text style={{ marginTop: 12, fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) }}>
            You rated your experience <Text style={{ color: tw.gray900, ...poppins(600) }}>{rating}/10</Text>.
          </Text>
        ) : null}

        <LinearGradient colors={['#e0e7ff', '#fce7f3', '#fef9c3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.art}>
          {BARS.map((bar, i) => (
            <View key={i} style={{ width: 40, height: bar.height, borderRadius: 20, backgroundColor: bar.color }} />
          ))}
        </LinearGradient>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 + insets.bottom }}>
        <Press scale={0.98} disabled={rating === null} onPress={handleContinue} accessibilityState={{ disabled: rating === null }}>
          <LinearGradient colors={rating === null ? [tw.gray200, tw.gray200] : RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pill}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: rating === null ? tw.gray500 : '#fff', ...poppins(500) }}>Continue</Text>
          </LinearGradient>
        </Press>
      </View>

      <Dialog visible={showThanks} onClose={done} backdrop="rgba(0,0,0,0.4)" panelStyle={styles.thanks}>
        <View style={styles.thanksIcon}>
          <CheckCircle2 size={28} color={tw.green600} />
        </View>
        <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 4, textAlign: 'center', ...poppins(600) }}>Thanks for your feedback</Text>
        <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray600, marginBottom: 16, textAlign: 'center', ...poppins(400) }}>It helps us improve your experience with {companyName.toLowerCase()}.</Text>
        <Press scale={0.98} onPress={done}>
          <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.pill, { paddingVertical: 10 }]}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) }}>Done</Text>
          </LinearGradient>
        </Press>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(600) },
  scale: { flexDirection: 'row', gap: 4, borderRadius: 12, borderWidth: 1, borderColor: tw.gray300, backgroundColor: '#fff', overflow: 'hidden' },
  art: { marginTop: 40, alignSelf: 'center', width: '100%', maxWidth: 320, height: 192, borderRadius: 24, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 24 },
  pill: { paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  thanks: { width: '100%', maxWidth: 384, alignSelf: 'center', borderRadius: 24, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, ...shadow('xl') },
  thanksIcon: { alignSelf: 'center', marginBottom: 12, width: 48, height: 48, borderRadius: 24, backgroundColor: tw.green100, alignItems: 'center', justifyContent: 'center' },
});
