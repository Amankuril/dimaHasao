import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold, Outfit_900Black } from '@expo-google-fonts/outfit';
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold, Montserrat_900Black } from '@expo-google-fonts/montserrat';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import { PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { useTwDevice } from '../lib/tw';
import { AuthProvider, useAuth } from '../context/AuthContext';
import AnimatedSplash from '../components/AnimatedSplash';
import OfflineBanner from '../components/OfflineBanner';
import { ToastContainer } from '../components/Toast';
import { ConfirmModalContainer } from '../components/ConfirmModal';
import { setHomeResolver } from '../lib/webRouter';
import { currentAdminHome } from '../admin/access';

export { default as ErrorBoundary } from '../components/CrashScreen';

// Web preview only: Animated passes collapsable={false} to SVG DOM nodes.
LogBox.ignoreLogs(['non-boolean attribute']);

SplashScreen.preventAutoHideAsync().catch(() => {});
setHomeResolver(currentAdminHome);

function Boot() {
  const { booting } = useAuth();
  useTwDevice();
  // The families and weights the admin web loads (index.html, Taxi/index.css, the auth shell).
  const [fontsLoaded, fontError] = useFonts({
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
    Cinzel_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });
  return (
    <AnimatedSplash ready={!booting && (fontsLoaded || Boolean(fontError))}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' }, animation: 'fade', animationDuration: 120 }} />
      <OfflineBanner />
      <ToastContainer />
      <ConfirmModalContainer />
    </AnimatedSplash>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Boot />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
