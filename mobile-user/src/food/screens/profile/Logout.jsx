import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Power } from 'lucide-react-native';
import { navigateTo } from '../../../lib/webRouter';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { performUserLogout } from '../../../shared/utils/userSession';
import { Button, Card } from '../../../components/ds';
import { PageHeader } from '../../components/profile/ProfileChrome';
import { color, radii, space, type } from '../../../theme';

function PulsePower() {
  const v = useAnimatedValue(1);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.5, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View style={{ opacity: v }}>
      <Power size={30} color={color.danger} />
    </Animated.View>
  );
}

/** Port of pages/user/profile/Logout.jsx. */
export default function Logout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError('');
    try {
      await performUserLogout();
      timer.current = setTimeout(() => navigateTo('/login', { replace: true }), 500);
    } catch {
      setError('An error occurred during logout, but you have been signed out locally.');
      timer.current = setTimeout(() => navigateTo('/login', { replace: true }), 2000);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageHeader title="Log out" onBack={() => navigateTo('/user/profile')} />
      <ScrollView contentContainerStyle={styles.content}>
        {!isLoggingOut ? (
          <>
            <Card style={styles.center}>
              <View style={styles.iconCircle}>
                <Power size={30} color={color.danger} />
              </View>
              <Text style={styles.h2}>Log out?</Text>
              <Text style={styles.p}>Are you sure you want to log out? You&apos;ll need to sign in again to access your account.</Text>
            </Card>

            <View style={styles.note}>
              <AlertCircle size={20} color={color.warning} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.h3}>Before you go</Text>
                <Text style={styles.noteP}>Make sure you&apos;ve saved any important information. Your cart and preferences will be saved for next time.</Text>
              </View>
            </View>

            <View style={{ gap: space.md }}>
              <Button title="Yes, Log out" variant="danger" icon={Power} onPress={handleLogout} />
              <Button title="Cancel" variant="outline" onPress={() => navigateTo('/user/profile')} />
            </View>
          </>
        ) : (
          <Card style={styles.center} accessibilityLiveRegion="polite">
            <View style={styles.iconCircle}>
              <PulsePower />
            </View>
            <Text style={styles.h2}>Logging out...</Text>
            <Text style={styles.p}>Please wait while we sign you out.</Text>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  center: { alignItems: 'center', paddingVertical: space.xxl },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  h2: { ...type.heading, color: color.text, marginBottom: space.xs, textAlign: 'center' },
  p: { ...type.body, color: color.textSecondary, textAlign: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg, borderRadius: radii.lg, backgroundColor: color.warningSoft },
  h3: { ...type.bodyStrong, color: color.warning, marginBottom: space.xxs },
  noteP: { ...type.small, color: color.textSecondary },
  errorBox: { marginTop: space.lg, padding: space.md, backgroundColor: color.warningSoft, borderRadius: radii.md, alignSelf: 'stretch' },
  errorText: { ...type.small, color: color.warning },
});
