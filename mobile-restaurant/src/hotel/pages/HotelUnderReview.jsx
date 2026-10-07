import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Clock3, ShieldCheck, XCircle } from 'lucide-react-native';
import { fetchPartnerProfiles } from '../../api/partner';
import { Press } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from '../../lib/webRouter';
import { AUTH } from '../../restaurant/components/AuthShell';
import { isHotelAuthenticated, isModuleAuthenticated } from '../../restaurant/utils/auth';
import { clearPartnerSessions } from '../../restaurant/utils/partnerSession';
import { montserrat, poppins, shadow } from '../../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/HotelUnderReview.jsx
 * (/hotel/partner/under-review).
 *
 * The one review screen for whichever business(es) were just submitted.
 *
 * Reached from the hotel-only wizard, and from the end of the combined "both"
 * wizard: GET /partner/profiles already reports both halves in one call, so
 * this renders a card per business that exists.
 *
 * Each business unlocks independently: the moment one is approved, this
 * redirects to that dashboard, even if the other is still pending, so a
 * partner is not blocked from serving customers on the half of their business
 * that already cleared review. The web re-checks on tab focus; the app does it
 * when it returns to the foreground.
 */

const STATUS_META = {
  pending: { label: 'Under review', tone: 'pending' },
  approved: { label: 'Approved', tone: 'approved' },
  rejected: { label: 'Rejected', tone: 'rejected' },
  banned: { label: 'Disabled', tone: 'rejected' },
};

const TONES = {
  approved: { bg: '#ecfdf5', fg: '#047857' },
  rejected: { bg: '#fef2f2', fg: '#dc2626' },
  pending: { bg: '#fffbeb', fg: '#b45309' },
};

function StatusCard({ title, status, note }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const tone = TONES[meta.tone];
  const Icon = meta.tone === 'approved' ? ShieldCheck : meta.tone === 'rejected' ? XCircle : Clock3;
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Icon size={11} color={tone.fg} />
          <Text style={[styles.pillText, { color: tone.fg }]}>{meta.label}</Text>
        </View>
      </View>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

export default function HotelUnderReview() {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const { updateUser, updateHotelUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState({ restaurant: null, hotel: null });
  const redirectedRef = useRef(false);

  const check = useCallback(async () => {
    try {
      const data = await fetchPartnerProfiles();
      setProfiles({ restaurant: data?.restaurant || null, hotel: data?.hotel || null });

      // Web: patchStoredUser('restaurant' | 'partner', ...).
      if (data?.restaurant) {
        updateUser({ status: data.restaurant.status });
      }
      if (data?.hotel) {
        updateHotelUser({
          partnerApprovalStatus: data.hotel.partnerApprovalStatus,
          onboardingComplete: data.hotel.onboardingComplete,
        });
      }

      if (redirectedRef.current) return;

      if (data?.restaurant?.status === 'approved') {
        redirectedRef.current = true;
        navigate('/food/restaurant', { replace: true });
        return;
      }

      if (data?.hotel?.partnerApprovalStatus === 'approved') {
        redirectedRef.current = true;
        navigate('/hotel/partner/dashboard', { replace: true });
      }
    } catch {
      // Keep the review screen up: a failed check is not a status change.
    } finally {
      setLoading(false);
    }
  }, [navigate, updateUser, updateHotelUser]);

  useEffect(() => {
    if (!isHotelAuthenticated() && !isModuleAuthenticated('restaurant')) {
      navigate('/food/restaurant/login', { replace: true });
      return undefined;
    }

    check();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [check, navigate]);

  const signOut = async () => {
    await clearPartnerSessions();
    navigate('/food/restaurant/login', { replace: true });
  };

  return (
    <View style={styles.page}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom }}>
        <View style={styles.panel}>
          <View style={{ marginBottom: 20, alignItems: 'center' }}>
            <View style={styles.clock}>
              <Clock3 size={32} color={AUTH.gold} />
            </View>
          </View>

          <View style={{ marginBottom: 24, alignItems: 'center' }}>
            <Text style={styles.kicker}>Application submitted</Text>
            <Text style={styles.title} accessibilityRole="header">Your details are under review</Text>
            <Text style={styles.body}>
              Our team verifies new partners before their dashboard opens. You&apos;ll be able to come straight in the moment each business is approved.
            </Text>
            {loading ? <Text style={styles.checking}>Checking latest status...</Text> : <View style={{ marginTop: 12, height: 16 }} />}
          </View>

          <View style={{ marginBottom: 24, gap: 12 }}>
            {profiles.restaurant ? (
              <StatusCard
                title="Restaurant"
                status={profiles.restaurant.status}
                note={profiles.restaurant.status === 'rejected' ? 'Contact support or re-apply from the login screen.' : null}
              />
            ) : null}
            {profiles.hotel ? (
              <StatusCard
                title="Hotel / stay"
                status={profiles.hotel.partnerApprovalStatus}
                note={profiles.hotel.partnerApprovalStatus === 'rejected' ? 'Contact support to appeal this decision.' : null}
              />
            ) : null}
          </View>

          <Press scale={0.98} onPress={signOut} accessibilityLabel="Back to login" style={styles.signOut}>
            {loading ? <ActivityIndicator size="small" color={AUTH.muted} /> : null}
            <Text style={styles.signOutText}>Back to login</Text>
          </Press>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: AUTH.bg },
  panel: { width: '100%', maxWidth: 448, alignSelf: 'center', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(202,168,62,0.3)', backgroundColor: AUTH.card, padding: 20, ...shadow('0 28px 80px rgba(0,0,0,0.65)') },
  clock: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(202,168,62,0.15)', alignItems: 'center', justifyContent: 'center' },
  kicker: { marginBottom: 8, fontSize: 12, lineHeight: 16, letterSpacing: 3.84, color: AUTH.gold, textTransform: 'uppercase', ...montserrat(600) },
  title: { maxWidth: 304, fontSize: 15, lineHeight: 20, color: AUTH.cream, textAlign: 'center', ...poppins(800) },
  body: { marginTop: 12, fontSize: 14, lineHeight: 24, color: AUTH.muted, textAlign: 'center', ...poppins(400) },
  checking: { marginTop: 12, fontSize: 12, lineHeight: 16, letterSpacing: 2.16, color: AUTH.dim, textTransform: 'uppercase', ...poppins(500) },
  card: { borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', padding: 16 },
  cardTitle: { fontSize: 14, lineHeight: 20, color: '#0f172b', ...poppins(700) },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', ...poppins(800) },
  note: { marginTop: 6, fontSize: 12, lineHeight: 16, color: '#62748e', ...poppins(400) },
  signOut: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(202,168,62,0.35)' },
  signOutText: { fontSize: 14, lineHeight: 20, color: AUTH.muted, ...poppins(600) },
});
