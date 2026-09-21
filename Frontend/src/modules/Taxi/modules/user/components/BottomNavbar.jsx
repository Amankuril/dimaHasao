/**
 * Taxi's consumer nav is now the platform's nav.
 *
 * It used to be Ride · Rides · Bus · Support · Profile — a second Profile
 * screen for the same account, and a "Rides" list duplicating /app/bookings,
 * which already shows this module's ride history. The five anchors are shared
 * now; what is genuinely taxi's own moved into More.
 */
import AppBottomNav from '@/shared/components/app/AppBottomNav';

const TAXI_EXTRAS = [
  { label: 'Book a Ride', icon: 'fa-solid fa-car-side', path: '/taxi/user' },
  { label: 'My Rides', icon: 'fa-solid fa-route', path: '/taxi/user/activity' },
  { label: 'Outstation', icon: 'fa-solid fa-road', path: '/taxi/user/intercity' },
  { label: 'Support', icon: 'fa-solid fa-headset', path: '/taxi/user/support' },
];

export default function BottomNavbar() {
  return <AppBottomNav extras={TAXI_EXTRAS} extrasTitle="Taxi & Auto" />;
}
