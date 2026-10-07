import { useEffect } from 'react';
import { Animated } from 'react-native';
import { useAnimatedValue } from '../../lib/useAnimatedValue';

/* Port of Frontend/src/modules/Hotel/app/partner/components/StepWrapper.jsx: each step fades in sliding 20px from the right. */
const StepWrapper = ({ children, stepKey }) => {
  const anim = useAnimatedValue(0);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [stepKey, anim]);

  return (
    <Animated.View
      style={{
        width: '100%',
        maxWidth: 768, // the wizards' content width
        alignSelf: 'center',
        opacity: anim,
        transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
};

export { StepWrapper };
export default StepWrapper;
