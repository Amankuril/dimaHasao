import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Clock, Mail, Search } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { Press } from '../../components/ui';
import { outfit, tw } from '../../theme';
import {
  clearDriverAuthState,
  clearDriverRegistrationSession,
  getDriverApprovalStatus,
  getDriverDocumentTemplates,
  getLocalDriverToken,
  persistDriverAuthSession,
} from '../services/registrationService';
import { DRIVER_BRAND_LOGO } from '../components/OnboardingShell';
import { Spin } from '../components/OnboardingFields';
import { OB, jk } from '../components/onboardingTheme';

/*
 * Port of driver/pages/registration/RegistrationStatus.jsx (/taxi/driver/registration-status):
 * polls the approval status every 2.5 s and lists the document review state.
 * Push tokens are registered by the shell (the web's syncPushTokens).
 */

const APPROVAL_POLL_MS = 2500;
const unwrapDriver = (response) =>
  response?.data?.data || response?.data || response;

const isDriverApproved = (driver) => {
  if (!driver) {
    return false;
  }

  const approval = String(driver.approve ?? '').toLowerCase();
  const status = String(driver.status || '').toLowerCase();

  return (
    driver.approve === true ||
    driver.approve === 1 ||
    ['true', '1', 'yes', 'approved'].includes(approval) ||
    ['approved', 'active', 'verified'].includes(status)
  );
};

const redirectToDriverLogin = (navigate) => {
  clearDriverAuthState();
  navigate('/taxi/driver/login', { replace: true });
};

const getStatusColors = (status) => {
  const s = String(status || '').toLowerCase();
  if (['approved', 'active', 'verified', 'true', '1'].includes(s)) return { color: OB.primary, backgroundColor: OB.primarySoft };
  if (['rejected', 'declined', 'failed'].includes(s)) return { color: tw.rose500, backgroundColor: tw.rose50 };
  return { color: tw.amber500, backgroundColor: tw.amber50 };
};

const getDocumentStatus = (doc = {}) =>
  String(doc?.approvalStatus || doc?.reviewStatus || doc?.status || 'pending').toLowerCase();

const getDocumentReason = (doc = {}) =>
  String(doc?.comment || doc?.remarks || doc?.reason || doc?.admin_comment || doc?.rejection_reason || '').trim();

const getDocumentImage = (doc = {}) =>
  String(doc?.previewUrl || doc?.secureUrl || doc?.url || '').trim();

const getDocumentReviewTimestamp = (doc = {}) => {
  const reviewTime = new Date(doc?.reverificationRequestedAt || doc?.uploadedAt || doc?.updatedAt || 0).getTime();
  const reviewedTime = new Date(doc?.reviewedAt || 0).getTime();

  if (!Number.isFinite(reviewTime) || reviewTime <= 0) {
    return false;
  }

  return Number.isFinite(reviewedTime) && reviewedTime > 0 && reviewTime >= reviewedTime;
};

const routePrefix = '/taxi/driver';

export default function RegistrationStatus() {
  const navigate = useNavigate();
  const location = useLocation();
  const insets = useSafeAreaInsets();
  const [driver, setDriver] = useState(null);
  const [documentTemplates, setDocumentTemplates] = useState([]);
  const timeoutRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const mountedRef = useRef(false);

  const pulse = useAnimatedValue(1);
  useEffect(() => {
    // animate-pulse: opacity 1 -> .5 -> 1 over 2s
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const isVehicleReapproval = location.state?.statusReason === 'vehicle-update' || driver?.approve === false;

  useEffect(() => {
    if (location.state?.role) {
      persistDriverAuthSession({ role: 'driver' });
    }

    const onboardingToken =
      location.state?.completedRegistration?.token ||
      location.state?.token ||
      '';

    if (onboardingToken) {
      persistDriverAuthSession({ token: onboardingToken, role: 'driver' });
    }

    mountedRef.current = true;

    const fetchTemplates = async () => {
      try {
        const response = await getDriverDocumentTemplates('driver');
        const templates = response?.data?.data?.results || response?.data?.results || [];
        if (mountedRef.current) setDocumentTemplates(templates);
      } catch (err) {
        console.error('Failed to fetch templates', err);
      }
    };

    fetchTemplates();

    const checkApproval = async () => {
      if (!mountedRef.current || requestInFlightRef.current) {
        return;
      }

      requestInFlightRef.current = true;
      const token = getLocalDriverToken();

      if (!token) {
        redirectToDriverLogin(navigate);
        requestInFlightRef.current = false;
        return;
      }

      try {
        const response = await getDriverApprovalStatus();
        const driverData = unwrapDriver(response);
        if (mountedRef.current) setDriver(driverData);

        const isApproved = isDriverApproved(driverData);

        if (!mountedRef.current) {
          return;
        }

        if (isApproved) {
          clearDriverRegistrationSession();
          navigate('/taxi/driver/home', { replace: true });
          requestInFlightRef.current = false;
          return;
        }
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        if (error?.status === 401 || error?.status === 403) {
          redirectToDriverLogin(navigate);
          requestInFlightRef.current = false;
          return;
        }

        if (error?.status === 404) {
          redirectToDriverLogin(navigate);
          requestInFlightRef.current = false;
        }
      } finally {
        requestInFlightRef.current = false;
      }
    };

    checkApproval();
    timeoutRef.current = setInterval(checkApproval, APPROVAL_POLL_MS);

    return () => {
      mountedRef.current = false;
      requestInFlightRef.current = false;
      clearInterval(timeoutRef.current);
    };
  }, [location.state, navigate]);

  const getDocumentDetails = () => {
    const submittedDocumentSummary = Array.isArray(location.state?.submittedDocumentSummary)
      ? location.state.submittedDocumentSummary.map((item) => ({ ...item }))
      : [];

    if (!driver || !documentTemplates.length) {
      return submittedDocumentSummary;
    }

    const docs = driver.documents || {};
    const flatFields = documentTemplates.flatMap((t) => t.fields || []);

    return flatFields.map((field) => {
      const doc = docs[field.key];
      const status = getDocumentStatus(doc);
      const reason = getDocumentReason(doc);

      return {
        label: field.label || field.name || field.key,
        status,
        reason,
        key: field.key,
        previewUrl: getDocumentImage(doc),
        reverificationPending: status === 'pending' && getDocumentReviewTimestamp(doc),
      };
    });
  };

  const docDetails = getDocumentDetails();
  const rejectedDocs = docDetails.filter((d) => d.status === 'rejected' || d.status === 'declined');
  const pendingReverificationDocs = docDetails.filter((doc) => doc.reverificationPending);

  // sticky bottom-0: the support bar sits after the list, and floats at the bottom edge when the page is longer.
  const [viewH, setViewH] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [bar, setBar] = useState({ y: 0, h: 0 });
  const stick = viewH && bar.h ? Math.min(0, scrollY + viewH - (bar.y + bar.h)) : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: OB.bg }}
      onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
      onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48 + insets.top, paddingBottom: 40 + insets.bottom, alignItems: 'center' }}
    >
      <View style={{ marginBottom: 40, width: '100%', alignItems: 'center' }}>
        <Image source={DRIVER_BRAND_LOGO} style={{ width: 40, height: 40 }} resizeMode="contain" />
      </View>

      <View style={{ width: '100%', maxWidth: 384, gap: 32 }}>
        <View style={{ alignItems: 'center', gap: 24 }}>
          <View>
            <View style={styles.hero}>
              <Animated.View style={{ opacity: pulse }}>
                <Clock size={42} strokeWidth={2.5} color={OB.text} />
              </Animated.View>
            </View>
            <View style={styles.heroBadge}>
              <Search size={16} strokeWidth={3} color="#fff" />
            </View>
          </View>

          <View style={{ gap: 12, alignItems: 'center' }}>
            <Text style={styles.eyebrow}>
              {pendingReverificationDocs.length > 0 ? 'Submission received' : isVehicleReapproval ? 'Update in review' : 'Live Audit Status'}
            </Text>
            <Text style={styles.h1}>
              {rejectedDocs.length > 0 ? (
                <>
                  Action <Text style={{ color: OB.muted }}>Required</Text>
                </>
              ) : pendingReverificationDocs.length > 0 ? (
                <>
                  Verification <Text style={{ color: OB.muted }}>Pending</Text>
                </>
              ) : (
                <>
                  Review <Text style={{ color: OB.muted }}>Started</Text>
                </>
              )}
            </Text>
            <Text style={styles.lead}>
              {rejectedDocs.length > 0
                ? 'Some of your documents were rejected. Please re-upload them to continue.'
                : pendingReverificationDocs.length > 0
                ? 'Your updated documents were sent back to admin for another review.'
                : 'Our team is currently performing a manual audit of your profile.'}
            </Text>
          </View>
        </View>

        {driver ? (
          <View style={styles.driverCard}>
            <View style={styles.driverIcon}>
              <Mail size={24} color={OB.muted} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={styles.driverName}>{driver.name || 'Partner'}</Text>
              <Text numberOfLines={1} style={styles.driverPhone}>+91 {driver.phone}</Text>
            </View>
            <View style={styles.driverBadge}>
              <Text style={styles.driverBadgeText}>{driver.status || 'Pending'}</Text>
            </View>
          </View>
        ) : null}

        <View style={{ gap: 16 }}>
          <Text style={styles.sectionLabel}>Checklist Summary</Text>
          <View style={{ gap: 16 }}>
            {docDetails.length > 0 ? (
              docDetails.map((doc, idx) => {
                const colors = getStatusColors(doc.status);
                return (
                  <View key={idx} style={styles.docCard}>
                    <View style={styles.docHead}>
                      <Text numberOfLines={1} style={styles.docLabel}>{doc.label}</Text>
                      <View style={[styles.statusPill, { backgroundColor: colors.backgroundColor }]}>
                        <Text style={[styles.statusText, { color: colors.color }]}>{doc.status}</Text>
                      </View>
                    </View>
                    {doc.reason ? (
                      <View style={styles.reasonBox}>
                        <Text style={styles.reasonLabel}>Reason for rejection:</Text>
                        <Text style={styles.reasonText}>{doc.reason}</Text>
                      </View>
                    ) : null}
                    {doc.reverificationPending ? (
                      <View style={styles.reverifyBox}>
                        <Text style={styles.reverifyText}>Re-uploaded and waiting for admin re-verification.</Text>
                      </View>
                    ) : null}
                    {doc.status === 'rejected' || doc.status === 'declined' ? (
                      <Press
                        onPress={() => navigate(`${routePrefix}/documents`, { state: { focusDocumentKey: doc.key, fromRegistrationStatus: true } })}
                        style={styles.fixBtn}
                      >
                        <Text style={styles.fixText}>Fix Document</Text>
                        <ChevronRight size={16} strokeWidth={3} color="#fff" />
                      </Press>
                    ) : null}
                  </View>
                );
              })
            ) : driver ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No documents were required for your application.</Text>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={{ marginBottom: 16 }}>
                  <Spin>
                    <View style={styles.ring} />
                  </Spin>
                </View>
                <Text style={styles.emptyText}>Loading your application...</Text>
              </View>
            )}
          </View>
        </View>

        <View
          onLayout={(e) => setBar({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}
          style={[styles.bar, { transform: [{ translateY: stick }] }]}
        >
          {rejectedDocs.length > 0 ? (
            <View style={styles.rejectNote}>
              <Text style={styles.rejectNoteText}>Select a rejected document above to re-upload the correct file.</Text>
            </View>
          ) : null}
          <Press
            onPress={() =>
              navigate(`${routePrefix}/support/chat`, {
                state: { backPath: `${routePrefix}/registration-status`, backState: location.state || null },
              })
            }
            style={styles.supportBtn}
          >
            <Text style={styles.supportText}>Contact Support</Text>
          </Press>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { width: 112, height: 112, backgroundColor: '#fff', borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', boxShadow: '0 20px 50px rgba(0,0,0,0.08)' },
  heroBadge: { position: 'absolute', bottom: -4, right: -4, width: 40, height: 40, backgroundColor: OB.primary, borderRadius: 16, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' },
  eyebrow: { ...jk(800), fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: OB.muted, opacity: 0.6 },
  h1: { ...outfit(900), fontSize: 42, lineHeight: 42, letterSpacing: -1.68, color: OB.text, textAlign: 'center' },
  lead: { ...jk(700), fontSize: 15, lineHeight: 24.4, color: OB.muted, opacity: 0.8, textAlign: 'center', maxWidth: 235 },
  driverCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#fff', borderRadius: 40, padding: 24, borderWidth: 1, borderColor: OB.border, boxShadow: '0 10px 40px rgba(0,0,0,0.04)' },
  driverIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: OB.primarySoft, alignItems: 'center', justifyContent: 'center' },
  driverName: { ...jk(800), fontSize: 16, letterSpacing: -0.4, color: OB.text },
  driverPhone: { ...jk(800), fontSize: 11, letterSpacing: 1.65, textTransform: 'uppercase', color: OB.muted, opacity: 0.6 },
  driverBadge: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: OB.primary, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgba(10,77,43,0.2), 0 4px 6px -4px rgba(10,77,43,0.2)' },
  driverBadgeText: { ...jk(800), fontSize: 9, letterSpacing: 1.35, textTransform: 'uppercase', color: '#fff' },
  sectionLabel: { ...jk(800), fontSize: 11, letterSpacing: 2.2, textTransform: 'uppercase', color: OB.muted, opacity: 0.6, paddingHorizontal: 8 },
  docCard: { backgroundColor: '#fff', borderRadius: 28.8, borderWidth: 1, borderColor: OB.border, padding: 20, gap: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.03)' },
  docHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  docLabel: { ...jk(800), flex: 1, fontSize: 15, letterSpacing: -0.15, color: OB.text },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { ...jk(800), fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  reasonBox: { padding: 16, backgroundColor: tw.rose50, borderWidth: 1, borderColor: tw.rose100, borderRadius: 16 },
  reasonLabel: { ...jk(700), fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.rose600, opacity: 0.6, marginBottom: 4 },
  reasonText: { ...jk(700), fontSize: 13, lineHeight: 21.1, color: tw.rose600 },
  reverifyBox: { padding: 16, backgroundColor: 'rgba(10,77,43,0.05)', borderWidth: 1, borderColor: 'rgba(10,77,43,0.1)', borderRadius: 16 },
  reverifyText: { ...jk(700), fontSize: 13, lineHeight: 21.1, color: OB.muted },
  fixBtn: { height: 48, backgroundColor: OB.primary, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 20px 25px -5px rgba(10,77,43,0.1), 0 8px 10px -6px rgba(10,77,43,0.1)' },
  fixText: { ...jk(800), fontSize: 13, letterSpacing: 1.3, textTransform: 'uppercase', color: '#fff' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 28.8, borderWidth: 1, borderColor: OB.border, padding: 40, alignItems: 'center', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  emptyText: { ...jk(800), fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: OB.muted, opacity: 0.6, textAlign: 'center' },
  ring: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: OB.border, borderTopColor: OB.primary },
  bar: { marginTop: 8, marginHorizontal: -4, borderRadius: 28, borderWidth: 1, borderColor: OB.border, backgroundColor: 'rgba(255,255,255,0.95)', padding: 16, gap: 12, boxShadow: '0 -12px 30px rgba(15,23,42,0.08)', zIndex: 10 },
  rejectNote: { borderRadius: 16, backgroundColor: tw.rose50, borderWidth: 1, borderColor: tw.rose100, paddingHorizontal: 20, paddingVertical: 16, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  rejectNoteText: { ...jk(700), fontSize: 12, lineHeight: 19.5, color: tw.rose600 },
  supportBtn: { height: 56, backgroundColor: '#fff', borderWidth: 1, borderColor: OB.border, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  supportText: { ...jk(700), fontSize: 15, color: OB.muted },
});
