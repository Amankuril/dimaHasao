import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Clock3, ShieldCheck, XCircle } from 'lucide-react-native';
import { fetchPartnerProfiles } from '../../api/partner';
import { Button, Card, StatusBadge } from '../../components/ds';
import HeritageHeader from '../../components/HeritageHeader';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from '../../lib/webRouter';
import { isHotelAuthenticated, isModuleAuthenticated } from '../../restaurant/utils/auth';
import { clearPartnerSessions } from '../../restaurant/utils/partnerSession';
import { color, radii, space, type } from '../../theme';

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
  pending: { label: 'Under review', tone: 'warning', icon: Clock3 },
  approved: { label: 'Approved', tone: 'success', icon: ShieldCheck },
  rejected: { label: 'Rejected', tone: 'danger', icon: XCircle },
  banned: { label: 'Disabled', tone: 'danger', icon: XCircle },
};

function StatusCard({ title, status, note }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <View style={styles.statusCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
        <Text style={[type.bodyStrong, { flex: 1, color: color.text }]}>{title}</Text>
        <StatusBadge label={meta.label} tone={meta.tone} icon={meta.icon} />
      </View>
      {note ? <Text style={[type.small, { color: color.textSecondary }]}>{note}</Text> : null}
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
      <HeritageHeader title="Under review" />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.xxl + insets.bottom }]}>
        <Card style={styles.panel}>
          <View style={styles.clock}>
            <Clock3 size={30} color={color.goldText} />
          </View>

          <View style={{ alignItems: 'center', gap: space.sm }}>
            <Text style={styles.kicker}>Application submitted</Text>
            <Text style={styles.title} accessibilityRole="header">
              Your details are under review
            </Text>
            <Text style={styles.body}>
              Our team verifies new partners before their dashboard opens. You&apos;ll be able to come straight in the moment each business is approved.
            </Text>
            <View style={styles.checkingRow} accessibilityLiveRegion="polite">
              {loading ? (
                <>
                  <ActivityIndicator size="small" color={color.textMuted} />
                  <Text style={styles.checking}>Checking latest status...</Text>
                </>
              ) : null}
            </View>
          </View>

          <View style={{ gap: space.md, alignSelf: 'stretch' }}>
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

          <Button title="Back to login" variant="outline" onPress={signOut} accessibilityLabel="Back to login" />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.lg, paddingTop: space.xxl },
  panel: { width: '100%', maxWidth: 448, alignSelf: 'center', alignItems: 'center', gap: space.xl, padding: space.xl },
  clock: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.goldSoft, alignItems: 'center', justifyContent: 'center' },
  kicker: { ...type.overline, color: color.goldText },
  title: { ...type.heading, color: color.text, textAlign: 'center' },
  body: { ...type.body, color: color.textSecondary, textAlign: 'center' },
  checkingRow: { minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  checking: { ...type.caption, color: color.textMuted },
  statusCard: { gap: space.xs + 2, padding: space.lg, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.bg },
});
