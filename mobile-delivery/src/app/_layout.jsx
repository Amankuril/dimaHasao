import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold } from '@expo-google-fonts/poppins';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import AnimatedSplash from '../components/AnimatedSplash';
import OfflineBanner from '../components/OfflineBanner';
import { ToastContainer } from '../components/Toast';
import { ConfirmModalContainer } from '../components/ConfirmModal';
import RazorpayHost from '../components/RazorpayHost';

export { default as ErrorBoundary } from '../components/CrashScreen';

// Web preview only: Animated passes collapsable={false} to SVG DOM nodes.
LogBox.ignoreLogs(['non-boolean attribute']);

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="food/delivery" />
        <Stack.Screen name="legal/[slug]" />
      </Stack>
    </>
  );
}

function Boot() {
  const { booting } = useAuth();
  // The weights the web loads: deliveryTheme.css (Nunito Sans, Sora) and
  // index.html (Poppins, the app-wide body font).
  const [fontsLoaded, fontError] = useFonts({
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
    Sora_600SemiBold,
    Sora_700Bold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });
  return (
    <AnimatedSplash ready={!booting && (fontsLoaded || Boolean(fontError))}>
      <RootNavigator />
      <OfflineBanner />
      <ToastContainer />
      <ConfirmModalContainer />
      <RazorpayHost />
    </AnimatedSplash>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <Boot />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
