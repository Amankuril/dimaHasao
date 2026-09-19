import { BookingProvider } from './context/BookingContext';
import { MobileFrame } from './components/layout/MobileFrame';
import { UserRoutes } from './routes/userRoutes';
import './dimahasao.css';

// Dima Hasao customer app. The host app owns the Router, so this mounts the
// approved v1 shell as a descendant route tree.
//
// There is no splash screen. In a browser it was a second of branding; inside
// the Flutter wrapper it lands on top of the native splash the APK already
// shows, so the app appeared to start twice and the first interaction was
// delayed by an animation nobody asked for.
//
// Scrolling is handled by MobileFrame, which owns the scroll container and can
// tell going back (restore where you were) from going somewhere new (start at
// the top). The old ScrollToTop reset every container on every route change,
// which would fight that.
export default function DimaHasaoApp() {
  return (
    <div className="dh-app">
      <BookingProvider>
        <MobileFrame>
          <UserRoutes />
        </MobileFrame>
      </BookingProvider>
    </div>
  );
}
