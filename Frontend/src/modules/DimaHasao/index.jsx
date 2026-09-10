import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BookingProvider } from './context/BookingContext';
import { MobileFrame } from './components/layout/MobileFrame';
import { UserRoutes } from './routes/userRoutes';
import { SplashScreen } from './components/common/SplashScreen';
import { ScrollToTop } from './components/common/ScrollToTop';
import './dimahasao.css';

// Dima Hasao customer app. The host app owns the Router, so this mounts the
// approved v1 shell (splash -> frame -> routes) as a descendant route tree.
export default function DimaHasaoApp() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="dh-app">
      <BookingProvider>
        <ScrollToTop />

        <AnimatePresence mode="wait">
          {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        </AnimatePresence>

        <MobileFrame>
          <UserRoutes />
        </MobileFrame>
      </BookingProvider>
    </div>
  );
}
