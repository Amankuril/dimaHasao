import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, Search } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../lib/webRouter';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { Press } from '../../components/ui';
import { playfair, shadow, tw } from '../../theme';
import {
  clearDriverAuthState,
  clearDriverRegistrationSession,
  getDriverApprovalStatus,
  getDriverDocumentTemplates,
  getLocalDriverToken,
  persistDriverAuthSession,
} from '../services/registrationService';
import { BrandHero, DRIVER_BRAND_LOGO } from '../components/OnboardingShell';
import { Spin } from '../components/OnboardingFields';
import { jk, obCard, up } from '../components/onboardingTheme';
import { Chip } from '../ui/Surface';
import { DT } from '../ui/dt';

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

const getStatusTone = (status) => {
  const s = String(status || '').toLowerCase();
  if (['approved', 'active', 'verified', 'true', '1'].includes(s)) return 'success';
  if (['rejected', 'declined', 'failed'].includes(s)) return 'danger';
  return 'warn';
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

  const approved = isDriverApproved(driver);
  const tone = rejectedDocs.length > 0 ? 'danger' : approved ? 'success' : 'warn';
  const toneSet = {
    danger: { bg: DT.dangerSoft, ink: DT.danger, Icon: AlertTriangle },
    success: { bg: DT.successSoft, ink: DT.success, Icon: CheckCircle2 },
    warn: { bg: DT.warnSoft, ink: DT.warn, Icon: Clock },
  }[tone];
  const HeroIcon = toneSet.Icon;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: DT.bg }}
      onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
      onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
    >
      <BrandHero top={insets.top + 14} style={{ paddingBottom: 64 }}>
        <View style={[styles.maxW, { alignItems: 'center', gap: 10 }]}>
          <Image source={DRIVER_BRAND_LOGO} style={{ width: 44, height: 44, borderRadius: 22 }} resizeMode="contain" />
          <Text style={styles.eyebrow}>
            {up(pendingReverificationDocs.length > 0 ? 'Submission received' : isVehicleReapproval ? 'Update in review' : 'Live Audit Status')}
          </Text>
          <Text style={styles.h1} accessibilityRole="header">
            {rejectedDocs.length > 0
              ? 'Action Required'
              : pendingReverificationDocs.length > 0
              ? 'Verification Pending'
              : 'Review Started'}
          </Text>
          <Text style={styles.lead}>
            {rejectedDocs.length > 0
              ? 'Some of your documents were rejected. Please re-upload them to continue.'
              : pendingReverificationDocs.length > 0
              ? 'Your updated documents were sent back to admin for another review.'
              : 'Our team is currently performing a manual audit of your profile.'}
          </Text>
        </View>
      </BrandHero>

      <View style={[styles.maxW, { paddingHorizontal: 20, marginTop: -40, gap: 24 }]}>
        <View style={styles.heroCard}>
          <View>
            <View style={[styles.hero, { backgroundColor: toneSet.bg }]}>
              <Animated.View style={{ opacity: tone === 'warn' ? pulse : 1 }}>
                <HeroIcon size={38} strokeWidth={2.5} color={toneSet.ink} />
              </Animated.View>
            </View>
            {tone === 'warn' ? (
              <View style={styles.heroBadge}>
                <Search size={14} strokeWidth={3} color={DT.onBrand} />
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            {driver ? (
              <>
                <Text numberOfLines={1} style={styles.driverName}>{driver.name || 'Partner'}</Text>
                <Text numberOfLines={1} style={styles.driverPhone}>{up(`+91 ${driver.phone}`)}</Text>
              </>
            ) : null}
            <Chip label={driver?.status || 'Pending'} tone={tone} />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Text style={styles.sectionLabel}>{up('Checklist Summary')}</Text>
          <View style={{ gap: 12 }}>
            {docDetails.length > 0 ? (
              docDetails.map((doc, idx) => (
                <View key={idx} style={styles.docCard}>
                  <View style={styles.docHead}>
                    <Text numberOfLines={1} style={styles.docLabel}>{doc.label}</Text>
                    <Chip label={doc.status} tone={getStatusTone(doc.status)} />
                  </View>
                  {doc.reason ? (
                    <View style={styles.reasonBox}>
                      <Text style={styles.reasonLabel}>{up('Reason for rejection:')}</Text>
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
                      accessibilityLabel="Fix Document"
                      style={styles.fixBtn}
                    >
                      <Text style={styles.fixText}>{up('Fix Document')}</Text>
                      <ChevronRight size={16} strokeWidth={3} color={DT.onBrand} />
                    </Press>
                  ) : null}
                </View>
              ))
            ) : driver ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>{up('No documents were required for your application.')}</Text>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={{ marginBottom: 16 }}>
                  <Spin>
                    <View style={styles.ring} />
                  </Spin>
                </View>
                <Text style={styles.emptyText}>{up('Loading your application...')}</Text>
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
            accessibilityLabel="Contact Support"
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
  maxW: { width: '100%', maxWidth: 448, alignSelf: 'center' },
  heroCard: { ...obCard, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  hero: { width: 84, height: 84, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', bottom: -6, right: -6, width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: DT.card, backgroundColor: DT.brandMid, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...jk(800), fontSize: 11, lineHeight: 16, letterSpacing: 1.8, minWidth: 40, color: DT.onBrandMuted, textAlign: 'center' },
  h1: { ...playfair(700), fontSize: 30, lineHeight: 38, color: DT.gold, textAlign: 'center' },
  lead: { ...jk(500), fontSize: 14, lineHeight: 21, color: DT.onBrandMuted, textAlign: 'center', maxWidth: 300 },
  driverName: { ...jk(800), fontSize: 16, lineHeight: 22, color: DT.ink },
  driverPhone: { ...jk(700), fontSize: 11, lineHeight: 16, letterSpacing: 1, minWidth: 40, color: DT.muted },
  sectionLabel: { ...jk(800), fontSize: 11, lineHeight: 16, letterSpacing: 1.6, minWidth: 40, color: DT.muted, paddingHorizontal: 8 },
  docCard: { ...obCard, borderRadius: DT.radius.lg, padding: 16, gap: 12 },
  docHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  docLabel: { ...jk(800), flex: 1, fontSize: 15, lineHeight: 21, color: DT.ink },
  reasonBox: { padding: 14, backgroundColor: DT.dangerSoft, borderWidth: 1, borderColor: tw.rose100, borderRadius: DT.radius.md },
  reasonLabel: { ...jk(700), fontSize: 10, lineHeight: 14, letterSpacing: 0.8, minWidth: 40, color: DT.dangerInk, marginBottom: 4 },
  reasonText: { ...jk(700), fontSize: 13, lineHeight: 20, color: DT.dangerInk },
  reverifyBox: { padding: 14, backgroundColor: DT.brandSoft, borderWidth: 1, borderColor: DT.brandBorder, borderRadius: DT.radius.md },
  reverifyText: { ...jk(700), fontSize: 13, lineHeight: 20, color: DT.inkSoft },
  fixBtn: { minHeight: 48, backgroundColor: DT.brand, borderRadius: DT.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  fixText: { ...jk(800), fontSize: 13, lineHeight: 18, letterSpacing: 1, minWidth: 90, textAlign: 'center', color: DT.onBrand },
  emptyCard: { ...obCard, borderRadius: DT.radius.lg, padding: 36, alignItems: 'center' },
  emptyText: { ...jk(800), fontSize: 12, lineHeight: 18, letterSpacing: 1, color: DT.muted, textAlign: 'center' },
  ring: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: DT.border, borderTopColor: DT.brandMid },
  bar: { marginTop: 4, borderRadius: DT.radius.xl, borderWidth: 1, borderColor: DT.border, backgroundColor: 'rgba(255,255,255,0.97)', padding: 16, gap: 12, ...shadow('md'), zIndex: 10 },
  rejectNote: { borderRadius: DT.radius.md, backgroundColor: DT.dangerSoft, borderWidth: 1, borderColor: tw.rose100, paddingHorizontal: 16, paddingVertical: 14 },
  rejectNoteText: { ...jk(700), fontSize: 12, lineHeight: 19, color: DT.dangerInk },
  supportBtn: { minHeight: 52, backgroundColor: DT.card, borderWidth: 1, borderColor: DT.border, borderRadius: DT.radius.md, alignItems: 'center', justifyContent: 'center' },
  supportText: { ...jk(700), fontSize: 15, lineHeight: 20, color: DT.inkSoft },
});
