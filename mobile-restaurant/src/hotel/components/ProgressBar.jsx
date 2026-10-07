import { useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { tw } from '../../theme';
import { HT } from '../theme';

/* Port of Frontend/src/modules/Hotel/app/partner/components/ProgressBar.jsx (thin track, 500ms ease-out fill). */
const ProgressBar = ({ currentStep, totalSteps }) => {
  const progress = useAnimatedValue((currentStep / totalSteps) * 100);

  useEffect(() => {
    Animated.timing(progress, { toValue: (currentStep / totalSteps) * 100, duration: 500, useNativeDriver: false }).start();
  }, [currentStep, totalSteps, progress]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: { width: '100%', height: 4, backgroundColor: tw.gray100 },
  fill: { height: '100%', backgroundColor: HT.primary },
});

export { ProgressBar };
export default ProgressBar;
