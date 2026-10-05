import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, ArrowLeft, Power } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { navigateTo } from '../../../lib/webRouter';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { performUserLogout } from '../../../shared/utils/userSession';
import { Button, Card, CardContent } from '../../components/cart/ui';
import { poppins, shadow, tw } from '../../../theme';

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
      <Power size={32} color={tw.gray700} />
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
    <ScrollView style={{ flex: 1, backgroundColor: '#faf6ed' }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Press onPress={() => navigateTo('/user/profile')} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={16} color="#000" />
        </Press>
        <Text style={styles.h1}>Log out</Text>
      </View>

      {!isLoggingOut ? (
        <>
          <Card style={[styles.whiteCard, { marginBottom: 16 }]}>
            <CardContent style={{ padding: 24, alignItems: 'center' }}>
              <View style={styles.iconCircle}>
                <Power size={32} color={tw.gray700} />
              </View>
              <Text style={styles.h2}>Log out?</Text>
              <Text style={styles.p}>Are you sure you want to log out? You&apos;ll need to sign in again to access your account.</Text>
            </CardContent>
          </Card>

          <Card style={[styles.yellowCard, { marginBottom: 16 }]}>
            <CardContent style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={styles.alertIcon}>
                  <AlertCircle size={20} color={tw.yellow600} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.h3}>Before you go</Text>
                  <Text style={styles.yellowP}>Make sure you&apos;ve saved any important information. Your cart and preferences will be saved for next time.</Text>
                </View>
              </View>
            </CardContent>
          </Card>

          <View style={{ gap: 12 }}>
            <Button onPress={handleLogout} style={styles.logoutBtn} textStyle={{ color: '#fff' }}>Yes, Log out</Button>
            <Button variant="outline" onPress={() => navigateTo('/user/profile')} style={{ width: '100%' }}>Cancel</Button>
          </View>
        </>
      ) : (
        <Card style={[styles.whiteCard, shadow('md'), { borderRadius: 16, overflow: 'hidden' }]}>
          <CardContent style={{ padding: 24, alignItems: 'center' }}>
            <View style={styles.iconCircle}>
              <PulsePower />
            </View>
            <Text style={styles.h2}>Logging out...</Text>
            <Text style={[styles.p, { marginBottom: 12 }]}>Please wait while we sign you out.</Text>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </CardContent>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: { height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  h1: { fontSize: 20, lineHeight: 28, color: '#000', ...poppins(700) },
  whiteCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 0 },
  yellowCard: { backgroundColor: tw.yellow50, borderColor: tw.yellow200, borderRadius: 12 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  h2: { fontSize: 20, lineHeight: 28, color: tw.gray900, marginBottom: 8, textAlign: 'center', ...poppins(700) },
  p: { fontSize: 14, lineHeight: 20, color: tw.gray600, marginBottom: 16, textAlign: 'center', ...poppins(400) },
  alertIcon: { backgroundColor: tw.yellow100, borderRadius: 999, padding: 8, marginTop: 2 },
  h3: { fontSize: 16, lineHeight: 24, color: tw.yellow900, marginBottom: 4, ...poppins(600) },
  yellowP: { fontSize: 14, lineHeight: 20, color: tw.yellow700, ...poppins(400) },
  logoutBtn: { width: '100%', height: 40, backgroundColor: tw.red600 },
  errorBox: { marginTop: 16, padding: 12, backgroundColor: tw.yellow50, borderWidth: 1, borderColor: tw.yellow200, borderRadius: 8, alignSelf: 'stretch' },
  errorText: { fontSize: 12, lineHeight: 16, color: tw.yellow800, ...poppins(400) },
});
