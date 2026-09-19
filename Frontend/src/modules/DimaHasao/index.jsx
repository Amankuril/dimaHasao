import { BookingProvider } from './context/BookingContext';
import { MobileFrame } from './components/layout/MobileFrame';
import { UserRoutes } from './routes/userRoutes';
import { ScrollToTop } from './components/common/ScrollToTop';
import './dimahasao.css';

// Dima Hasao customer app. The host app owns the Router, so this mounts the
// approved v1 shell as a descendant route tree.
//
// There is no splash screen. In a browser it was a second of branding; inside
// the Flutter wrapper it lands on top of the native splash the APK already
// shows, so the app appeared to start twice and the first interaction was
// delayed by an animation nobody asked for.
export default function DimaHasaoApp() {
  return (
    <div className="dh-app">
      <BookingProvider>
        <ScrollToTop />

        <MobileFrame>
          <UserRoutes />
        </MobileFrame>
      </BookingProvider>
    </div>
  );
}
