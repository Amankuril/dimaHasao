import { Stack } from 'expo-router';
import { DeliveryRealtimeShell } from '../../../../delivery/DeliveryRealtimeContext';

// Web: <ProtectedRoute><DeliveryRealtimeShell /></ProtectedRoute> around every signed-in page.
export default function DeliveryAppLayout() {
  return (
    <DeliveryRealtimeShell>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </DeliveryRealtimeShell>
  );
}
