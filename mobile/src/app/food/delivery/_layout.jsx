import { Stack } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';

/*
 * Web: DeliveryV2Router. Guest-only pages sit behind AuthRedirect (a signed-in
 * rider is sent home), the app behind ProtectedRoute (a signed-out rider is
 * sent to /login). Stack.Protected does both: a screen whose guard turns false
 * is dropped and the rider lands on the first one still available.
 */
export default function DeliveryLayout() {
  const { signedIn } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ animation: "none" }} />
        <Stack.Screen name="otp" options={{ animation: 'none' }} />
        <Stack.Screen name="signup/index" />
        <Stack.Screen name="signup/details" />
        <Stack.Screen name="signup/documents" />
      </Stack.Protected>
      <Stack.Screen name="pending-verification" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="help/content" />
    </Stack>
  );
}
