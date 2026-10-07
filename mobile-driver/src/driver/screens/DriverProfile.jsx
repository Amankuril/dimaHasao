import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import {
  BadgePercent,
  Bell,
  Car,
  Check,
  ChevronRight,
  FileText,
  Gift,
  HandCoins,
  History,
  Info,
  Landmark,
  LogOut,
  Mail,
  Phone,
  Route,
  Shield,
  Star,
  User,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react-native';
import Img from '../../components/Img';
import { Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { openExternal } from '../../lib/links';
import { clearSavedFcmToken } from '../../lib/push';
import { localStore } from '../../lib/storage';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, playfair, shadow } from '../../theme';
import { socketService } from '../api/socket';
import DriverBottomNav, { NAV_BAR_HEIGHT } from '../components/DriverBottomNav';
import { DT } from '../ui/dt';
import { Card, SectionLabel } from '../ui/Surface';
import { useSupportInfo } from '../hooks/useDriverSupportInfo';
import { clearDriverAuthState, getCurrentDriver, updateDriverProfile } from '../services/registrationService';

// Web: Taxi/modules/driver/pages/DriverProfile.jsx (/taxi/driver/profile)
// Fixed vs web: the web's route-booking toggle calls updateDriverProfile without importing it (a ReferenceError
// shown as the profile error line); here it is imported so the toggle actually saves.

const unwrapDriver = (response) => response?.data?.data || response?.data || response || null;
const ROUTE_BOOKING_STORAGE_KEY = 'driver_route_booking_preferences';

const readRouteBookingPreferences = () => {
  try {
    const raw = localStore.getItem(ROUTE_BOOKING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { enabled: false, coordinates: null, label: '' };
  } catch {
    return { enabled: false, coordinates: null, label: '' };
  }
};

const writeRouteBookingPreferences = (nextValue) => {
  localStore.setItem(ROUTE_BOOKING_STORAGE_KEY, JSON.stringify(nextValue));
  return nextValue;
};

const formatRouteBookingLabel = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return 'Receive requests from your selected area';
  }

  const [lng, lat] = coordinates;
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return 'Receive requests from your selected area';
  }

  return `Selected area ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
};

const normalizeRouteBookingPreferences = (routeBooking = null) => {
  const coordinates = Array.isArray(routeBooking?.coordinates) && routeBooking.coordinates.length === 2 ? routeBooking.coordinates : null;

  return {
    enabled: Boolean(routeBooking?.enabled && coordinates),
    coordinates,
    label: String(routeBooking?.label || (coordinates ? formatRouteBookingLabel(coordinates) : '')).trim(),
    updatedAt: routeBooking?.updatedAt || null,
  };
};

const normalizeBankDetails = (bankDetails = {}) => ({
  accountHolderName: String(bankDetails?.accountHolderName || '').trim(),
  upiId: String(bankDetails?.upiId || '').trim(),
  qrCodeImage: String(bankDetails?.qrCodeImage || '').trim(),
  accountNumber: String(bankDetails?.accountNumber || '').trim(),
  ifsc: String(bankDetails?.ifsc || '').trim().toUpperCase(),
  branchName: String(bankDetails?.branchName || '').trim(),
  updatedAt: bankDetails?.updatedAt || null,
});

const LEGAL_CONTENT = {
  driver_app: {
    title: 'Driver Application',
    Icon: UserPlus,
    description: 'Join the Dima Hasao fleet as a certified driver.',
    content: `Dima Hasao is always looking for professional, dedicated drivers to join our growing ecosystem.

Steps to apply:
1. Ensure you have a valid Commercial Driving License.
2. Visit the Dima Hasao Driver Onboarding center or use the Mobile App.
3. Submit required documents: Aadhaar, PAN, License, and Police Verification.
4. Complete the Biometric enrollment process at any authorized Service Center.
5. Once approved, you can start accepting rides and managing your earnings via the dashboard.`,
  },
  terms: {
    title: 'Terms and Conditions',
    Icon: FileText,
    description: 'General rules for using the Dima Hasao platform.',
    content: `By using the Dima Hasao platform, you agree to comply with all applicable transport regulations and our safety standards.

Key Highlights:
• Professionalism: Drivers and Staff must maintain a high standard of service.
• Vehicle Readiness: All vehicles listed must be in active, roadworthy condition.
• Compliance: You must ensure all permits and insurance are valid.
• Platform Fees: Dima Hasao charges a service fee for every successful booking handled.
• Account Security: You are responsible for keeping your credentials and biometric data secure.`,
  },
  privacy: {
    title: 'Privacy Policy',
    Icon: Shield,
    description: 'How we handle your data and biometrics.',
    content: `Dima Hasao takes data security seriously. We collect specific information to ensure safety and service quality.

Data Collected:
• Biometrics: Fingerprint hashes are stored encrypted (AES-256) for verification only. Raw images are never stored permanently.
• Location: Live GPS tracking is used during active bookings for safety.
• Contact: Phone and email are used for booking updates and support.
• Vehicle Data: Inspection logs and photos are kept for insurance purposes.

We do not share your biometric data with third-party advertising networks.`,
  },
  refund: {
    title: 'Refund Policy',
    Icon: HandCoins,
    description: 'Cancellation and refund guidelines.',
    content: `Transparent refund rules for customers and partners.

Booking Cancellations:
• Customer-initiated: Refund varies based on how close the pickup time is.
• Operator-initiated: If a vehicle fails inspection, a full refund is processed to the customer.
• Service Center Fees: Fees for inspections are non-refundable once the inspection report is generated.

Processing Time: Refunds are typically credited back to the original payment method within 5-7 working days.`,
  },
};

function InfoCell({ label, value }) {
  return (
    <View style={{ width: '47.5%' }}>
      <Text style={st.infoLabel}>{label}</Text>
      <Text style={st.infoValue}>{value}</Text>
    </View>
  );
}

export default function DriverProfile() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const navigate = useNavigate();
  const [routeBookingPreferences, setRouteBookingPreferences] = useState(() => readRouteBookingPreferences());
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [routeBookingBusy, setRouteBookingBusy] = useState(false);
  const routePrefix = '/taxi/driver';
  const supportInfo = useSupportInfo();

  useEffect(() => {
    let active = true;

    const loadDriver = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await getCurrentDriver();
        if (!active) return;
        const nextDriver = unwrapDriver(response);
        setDriver(nextDriver);
        const nextRouteBooking = normalizeRouteBookingPreferences(nextDriver?.routeBooking);
        setRouteBookingPreferences(writeRouteBookingPreferences(nextRouteBooking));
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Unable to load driver profile');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadDriver();

    return () => {
      active = false;
    };
  }, []);

  const openLegal = (type) => {
    setLegalModal(LEGAL_CONTENT[type]);
  };

  const handleLogout = () => {
    clearDriverAuthState();
    // Native extras: stop the live socket and forget the saved push token so the next login registers again.
    socketService.disconnect();
    clearSavedFcmToken();
    setIsLogoutOpen(false);
    navigate(`${routePrefix}/login`, { replace: true });
  };

  const driverName = useMemo(() => {
    if (!driver?.name) return 'Driver';
    return String(driver.name);
  }, [driver?.name]);

  const driverPhone = useMemo(() => driver?.phone || 'N/A', [driver?.phone]);
  const driverEmail = useMemo(() => driver?.email || 'N/A', [driver?.email]);
  const driverVehicle = useMemo(() => {
    const parts = [driver?.registerFor, driver?.vehicleType].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : 'N/A';
  }, [driver?.registerFor, driver?.vehicleType]);
  const driverLocation = useMemo(() => driver?.city || 'N/A', [driver?.city]);
  const driverZone = useMemo(() => driver?.zone?.name || 'N/A', [driver?.zone?.name]);
  const driverNumber = useMemo(() => driver?.vehicleNumber || 'N/A', [driver?.vehicleNumber]);
  const driverColor = useMemo(() => driver?.vehicleColor || 'N/A', [driver?.vehicleColor]);
  const driverRating = useMemo(() => Number(driver?.rating || 0), [driver?.rating]);
  const routeBookingSubtitle = useMemo(() => {
    if (!routeBookingPreferences.enabled) {
      return 'Receive requests from your live location';
    }

    return routeBookingPreferences.label || formatRouteBookingLabel(routeBookingPreferences.coordinates);
  }, [routeBookingPreferences.coordinates, routeBookingPreferences.enabled, routeBookingPreferences.label]);
  const bankDetails = useMemo(() => normalizeBankDetails(driver?.bankDetails), [driver?.bankDetails]);
  const bankDetailsSubtitle = useMemo(() => {
    if (bankDetails.accountHolderName) return bankDetails.accountHolderName;
    if (bankDetails.upiId) return bankDetails.upiId;
    if (bankDetails.accountNumber) return `A/C ${bankDetails.accountNumber.slice(-4).padStart(bankDetails.accountNumber.length, '*')}`;
    return 'Add UPI, QR and bank account';
  }, [bankDetails.accountHolderName, bankDetails.accountNumber, bankDetails.upiId]);

  const hasProfileImage = Boolean(driver?.profileImage);

  const openBankDetails = () => {
    navigate(`${routePrefix}/profile/bank-details`);
  };

  const handleRouteBookingToggle = async () => {
    if (routeBookingBusy) {
      return;
    }

    if (routeBookingPreferences.enabled) {
      setRouteBookingBusy(true);
      setError('');
      try {
        const response = await updateDriverProfile({
          routeBooking: {
            enabled: false,
          },
        });
        const nextRouteBooking = normalizeRouteBookingPreferences(unwrapDriver(response)?.routeBooking || { enabled: false });
        setRouteBookingPreferences(writeRouteBookingPreferences(nextRouteBooking));
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Could not update route booking.');
      } finally {
        setRouteBookingBusy(false);
      }
      return;
    }

    setRouteBookingBusy(true);
    setError('');

    let position;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('denied');
      position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    } catch {
      setRouteBookingBusy(false);
      setError('Please allow location permission to enable route booking.');
      return;
    }

    const nextCoordinates = [position.coords.longitude, position.coords.latitude];
    const nextLabel = formatRouteBookingLabel(nextCoordinates);

    try {
      const response = await updateDriverProfile({
        routeBooking: {
          enabled: true,
          coordinates: nextCoordinates,
          label: nextLabel,
        },
      });
      const nextRouteBooking = normalizeRouteBookingPreferences(
        unwrapDriver(response)?.routeBooking || {
          enabled: true,
          coordinates: nextCoordinates,
          label: nextLabel,
        },
      );
      setRouteBookingPreferences(writeRouteBookingPreferences(nextRouteBooking));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not update route booking.');
    } finally {
      setRouteBookingBusy(false);
    }
  };

  const sections = [
    {
      title: 'Your Account',
      items: [
        { id: 'personal', label: 'Personal Information', sub: driverPhone, Icon: User, path: `${routePrefix}/edit-profile` },
        { id: 'wallet', label: 'Wallet', Icon: Wallet, path: `${routePrefix}/wallet` },
        { id: 'bankDetails', label: 'Bank Details', sub: bankDetailsSubtitle, Icon: Landmark, action: openBankDetails },
        { id: 'vehicle', label: 'My Vehicle', Icon: Car, path: `${routePrefix}/vehicle-fleet` },
        { id: 'docs', label: 'Documents', Icon: FileText, path: `${routePrefix}/documents` },
        { id: 'history', label: 'Ride History', Icon: History, path: `${routePrefix}/history` },
        { id: 'notifications', label: 'Notifications', Icon: Bell, path: `${routePrefix}/notifications` },
      ],
    },
    {
      title: 'Benefits',
      items: [
        { id: 'refer', label: 'Refer & Earn', Icon: Gift, path: `${routePrefix}/referral` },
        { id: 'incentives', label: 'Incentives', Icon: BadgePercent, path: `${routePrefix}/incentives` },
        { id: 'sos', label: 'Emergency SOS', Icon: Shield, path: `${routePrefix}/security` },
      ],
    },
    {
      title: 'Preferences',
      items: [{ id: 'routeBooking', label: 'My Route Booking', sub: routeBookingSubtitle, Icon: Route, type: 'toggle' }],
    },
    {
      title: 'Legal & Support',
      items: [
        { id: 'driver_app', label: 'Driver Application', Icon: UserPlus, action: () => openLegal('driver_app') },
        { id: 'terms', label: 'Terms & Conditions', Icon: FileText, action: () => openLegal('terms') },
        { id: 'privacy', label: 'Privacy Policy', Icon: Shield, action: () => openLegal('privacy') },
        { id: 'refund', label: 'Refund Policy', Icon: HandCoins, action: () => openLegal('refund') },
      ],
    },
    {
      title: 'Danger Zone',
      items: [{ id: 'deleteAccount', label: 'Delete Account', Icon: LogOut, path: `${routePrefix}/delete-account` }],
    },
  ];

  return (
    <View style={st.root}>
      <View style={[st.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={st.headerTitle} accessibilityRole="header">
            Profile
          </Text>
          <Press onPress={() => navigate(`${routePrefix}/help-support`)} scale={1} accessibilityLabel="Help and support" style={st.helpBtn}>
            <Info size={16} color={DT.accent} />
            <Text style={st.help}>Help & Support</Text>
          </Press>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View>
            <View style={[st.avatar, hasProfileImage ? { backgroundColor: DT.dark } : { backgroundColor: DT.brandSoft }]}>
              {hasProfileImage ? <Img source={{ uri: driver?.profileImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={driverName} /> : <User size={32} color={DT.brand} strokeWidth={1.8} />}
            </View>
            {hasProfileImage ? (
              <View style={st.badge}>
                <Check size={12} color={DT.onBrand} strokeWidth={4} />
              </View>
            ) : null}
          </View>
          <View style={{ gap: 6, flex: 1, minWidth: 0 }}>
            <Text style={st.name} numberOfLines={1}>
              {isLoading ? 'Loading...' : driverName}
            </Text>
            <View style={st.ratingChip}>
              <Star size={13} color={DT.accent} fill={DT.accent} />
              <Text style={st.rating}>{driverRating.toFixed(1)} Rating</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: NAV_BAR_HEIGHT + 24 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Card>
            <SectionLabel style={{ marginBottom: 12 }}>Your details</SectionLabel>
            {error ? (
              <Text style={st.errorLine}>{error}</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, rowGap: 14, justifyContent: 'space-between' }}>
                <InfoCell label="Phone" value={driverPhone} />
                <InfoCell label="Email" value={driverEmail} />
                <InfoCell label="Vehicle Type" value={driverVehicle} />
                <InfoCell label="City" value={driverLocation} />
                <InfoCell label="Zone" value={driverZone} />
                <InfoCell label="Vehicle No." value={driverNumber} />
                <InfoCell label="Color" value={driverColor} />
              </View>
            )}
          </Card>
        </View>

        <View style={{ gap: 4 }}>
          {sections.map((section) => (
            <View key={section.title} style={{ paddingTop: 20, paddingHorizontal: 16 }}>
              <SectionLabel style={st.sectionTitle}>{section.title}</SectionLabel>
              <Card style={st.listCard}>
                {section.items.map((item, idx) => {
                  const danger = section.title === 'Danger Zone';
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        if (item.action) item.action();
                        else if (item.path) navigate(item.path);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      style={({ pressed }) => [st.row, idx > 0 && st.rowDivider, pressed && item.type !== 'toggle' && { backgroundColor: DT.bg }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                        <View style={[st.iconTile, danger && { backgroundColor: DT.dangerSoft }]}>
                          <item.Icon size={20} color={danger ? DT.danger : DT.brand} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[st.rowLabel, danger && { color: DT.dangerInk }]}>{item.label}</Text>
                          {item.sub ? <Text style={st.rowSub}>{item.sub}</Text> : null}
                        </View>
                      </View>
                      {item.type === 'toggle' ? (
                        <Pressable
                          onPress={handleRouteBookingToggle}
                          disabled={routeBookingBusy}
                          accessibilityRole="switch"
                          accessibilityLabel="Route booking"
                          accessibilityState={{ checked: routeBookingPreferences.enabled }}
                          hitSlop={10}
                          style={[st.toggle, { backgroundColor: routeBookingPreferences.enabled ? DT.brand : DT.border }, routeBookingBusy && { opacity: 0.7 }]}
                        >
                          <View style={[st.knob, { left: routeBookingPreferences.enabled ? 22 : 2 }]} />
                        </Pressable>
                      ) : (
                        <ChevronRight size={18} color={DT.faint} />
                      )}
                    </Pressable>
                  );
                })}
              </Card>
            </View>
          ))}
        </View>

        {/* Owner Support Section */}
        {supportInfo.email || supportInfo.phone ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, marginTop: 20 }}>
            <View style={st.support}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: DT.success }} />
                <Text style={st.supportTitle}>DISTRICT SUPPORT</Text>
              </View>

              <View style={{ gap: 20 }}>
                {supportInfo.email ? (
                  <Pressable onPress={() => openExternal(`mailto:${supportInfo.email}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={st.supportIcon}>
                      <Mail size={18} color={DT.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.supportLabel}>EMAIL SUPPORT</Text>
                      <Text style={st.supportValue}>{supportInfo.email}</Text>
                    </View>
                  </Pressable>
                ) : null}

                {supportInfo.phone ? (
                  <Pressable onPress={() => openExternal(`tel:${supportInfo.phoneHref}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={st.supportIcon}>
                      <Phone size={18} color={DT.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.supportLabel}>CALL SUPPORT</Text>
                      <Text style={st.supportValue}>{supportInfo.phone}</Text>
                    </View>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* Sign Out Section */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <Press onPress={() => setIsLogoutOpen(true)} scale={0.98} accessibilityLabel="Logout from Account" style={st.logoutBtn}>
            <LogOut size={18} strokeWidth={2.5} color={DT.danger} />
            <Text style={st.logout}>Logout from Account</Text>
          </Press>
        </View>
      </ScrollView>

      <DriverBottomNav />

      <Dialog visible={isLogoutOpen} onClose={() => setIsLogoutOpen(false)} backdrop="rgba(0,0,0,0.45)" blur={4} panelStyle={st.logoutPanel}>
        <View style={{ gap: 8, alignItems: 'center' }}>
          <Text style={st.logoutTitle}>Logout</Text>
          <Text style={st.logoutText}>Are you sure you want to logout?</Text>
        </View>

        <View style={{ marginTop: 24, flexDirection: 'row', gap: 12 }}>
          <Press onPress={() => setIsLogoutOpen(false)} scale={1} style={st.cancelBtn}>
            <Text style={st.cancelText}>Cancel</Text>
          </Press>
          <Press onPress={handleLogout} scale={1} style={st.confirmBtn}>
            <Text style={st.confirmText}>Logout</Text>
          </Press>
        </View>
      </Dialog>

      {/* Legal Modal */}
      <Modal visible={Boolean(legalModal)} transparent animationType="slide" onRequestClose={() => setLegalModal(null)} statusBarTranslucent>
        <View style={st.legalWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLegalModal(null)} accessibilityLabel="Close" />
          {legalModal ? (
            <View style={st.legal}>
              <View style={{ padding: 32 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <View style={st.legalIcon}>
                    <legalModal.Icon size={28} color={DT.brand} />
                  </View>
                  <Press onPress={() => setLegalModal(null)} accessibilityLabel="Close" style={st.legalClose}>
                    <X size={20} color={DT.muted} />
                  </Press>
                </View>

                <View style={{ marginTop: 24 }}>
                  <Text style={st.legalTitle}>{legalModal.title}</Text>
                  <Text style={st.legalDesc}>{legalModal.description}</Text>
                </View>

                <ScrollView style={{ marginTop: 32, maxHeight: height * 0.4 }} contentContainerStyle={{ paddingRight: 8 }}>
                  <Text style={st.legalBody}>{legalModal.content}</Text>
                </ScrollView>

                <Press onPress={() => setLegalModal(null)} style={st.understood}>
                  <Text style={st.understoodText}>Understood</Text>
                </Press>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: DT.bg },
  header: { paddingHorizontal: 20, paddingBottom: 24, backgroundColor: DT.brandDeep, borderBottomLeftRadius: DT.radius.xl, borderBottomRightRadius: DT.radius.xl, zIndex: 60, ...shadow('md') },
  headerTitle: { fontSize: 22, lineHeight: 28, color: DT.gold, ...playfair(700) },
  helpBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: DT.radius.pill, backgroundColor: 'rgba(255,255,255,0.12)' },
  help: { fontSize: 13, color: DT.onBrand, ...fo(700) },
  name: { fontSize: 22, lineHeight: 28, color: DT.onBrand, ...fo(700) },
  ratingChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: DT.radius.pill, backgroundColor: 'rgba(255,255,255,0.14)' },
  rating: { fontSize: 13, color: DT.accent, ...fo(700) },
  avatar: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: DT.gold },
  badge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, backgroundColor: DT.success, borderRadius: 11, borderWidth: 2, borderColor: DT.brandDeep, alignItems: 'center', justifyContent: 'center' },
  errorLine: { fontSize: 12, color: DT.danger, ...fo(500) },
  infoLabel: { fontSize: 11, color: DT.muted, ...fo(500) },
  infoValue: { fontSize: 13, color: DT.ink, ...fo(700) },
  sectionTitle: { paddingHorizontal: 8, marginBottom: 10 },
  listCard: { padding: 0, overflow: 'hidden', borderRadius: DT.radius.xl },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: DT.borderSoft },
  iconTile: { width: 40, height: 40, borderRadius: 14, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, color: DT.ink, ...fo(600) },
  rowSub: { marginTop: 1, fontSize: 12, color: DT.muted, ...fo(500) },
  toggle: { width: 44, height: 24, borderRadius: 12, justifyContent: 'center' },
  knob: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: DT.onBrand, ...shadow('sm') },
  support: { borderRadius: DT.radius.xl, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, padding: 20, ...shadow('sm') },
  supportTitle: { fontSize: 13, letterSpacing: 0.65, minWidth: 120, color: DT.ink, ...fo(700) },
  supportIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  supportLabel: { fontSize: 10, letterSpacing: 1, minWidth: 90, color: DT.muted, ...fo(700) },
  supportValue: { fontSize: 14, color: DT.ink, ...fo(700) },
  logoutBtn: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.dangerSoft, backgroundColor: DT.dangerSoft },
  logout: { fontSize: 14, color: DT.dangerInk, ...fo(700) },
  logoutPanel: { width: '100%', maxWidth: 320, borderRadius: DT.radius.xl, backgroundColor: DT.card, padding: 24, borderWidth: 1, borderColor: DT.borderSoft, ...shadow('2xl') },
  logoutTitle: { fontSize: 18, letterSpacing: -0.45, color: DT.ink, ...fo(700) },
  logoutText: { fontSize: 13, color: DT.muted, textAlign: 'center', ...fo(500) },
  cancelBtn: { flex: 1, height: 48, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 13, color: DT.inkSoft, ...fo(700) },
  confirmBtn: { flex: 1, height: 48, borderRadius: DT.radius.md, backgroundColor: DT.danger, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 13, color: DT.onBrand, ...fo(700) },
  legalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 16, paddingBottom: 32 },
  legal: { overflow: 'hidden', borderRadius: 32, backgroundColor: DT.card, ...shadow('2xl') },
  legalIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  legalClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.bgSoft, alignItems: 'center', justifyContent: 'center' },
  legalTitle: { fontSize: 24, color: DT.brand, ...playfair(700) },
  legalDesc: { marginTop: 4, fontSize: 14, color: DT.muted, ...fo(500) },
  legalBody: { fontSize: 14, lineHeight: 26, color: DT.inkSoft, ...fo(500) },
  understood: { marginTop: 32, width: '100%', minHeight: 52, borderRadius: DT.radius.lg, backgroundColor: DT.brand, paddingVertical: 16, alignItems: 'center' },
  understoodText: { fontSize: 14, color: DT.onBrand, ...fo(700) },
});
