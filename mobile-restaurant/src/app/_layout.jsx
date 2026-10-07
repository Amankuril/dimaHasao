import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
} from '@expo-google-fonts/montserrat';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_600SemiBold_Italic,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { AuthProvider, useAuth } from '../context/AuthContext';
import AnimatedSplash from '../components/AnimatedSplash';
import OfflineBanner from '../components/OfflineBanner';
import { ToastContainer } from '../components/Toast';
import { ConfirmModalContainer } from '../components/ConfirmModal';
import PartnerWorkspaceSwitcher from '../restaurant/components/PartnerWorkspaceSwitcher';
import RazorpayHost from '../components/RazorpayHost';

export { default as ErrorBoundary } from '../components/CrashScreen';

// Web preview only: Animated passes collapsable={false} to SVG DOM nodes.
LogBox.ignoreLogs(['non-boolean attribute']);

SplashScreen.preventAutoHideAsync().catch(() => {});

function Boot() {
  const { booting } = useAuth();
  // The families and weights the web's index.html loads, plus the icon font.
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Montserrat_900Black,
    Cinzel_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_600SemiBold_Italic,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...FontAwesome6.font,
  });
  return (
    <AnimatedSplash ready={!booting && (fontsLoaded || Boolean(fontError))}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' }, animation: 'fade', animationDuration: 120 }} />
      {/* Renders only for partners who run both businesses. */}
      <PartnerWorkspaceSwitcher />
      <OfflineBanner />
      <ToastContainer />
      <ConfirmModalContainer />
      {/* Hotel wallet "add money" opens Razorpay checkout in a WebView through this host. */}
      <RazorpayHost />
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
