import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Bike, HelpCircle, Repeat, Share2, Star } from 'lucide-react-native';
import Image from '../../components/Img';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { Press } from '../../components/ui';
import { useLocation, useNavigate, useParams } from '../../lib/webRouter';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';
import api from '../api/client';
import { useSettings } from '../context/SettingsContext';
import { getTaxiUserRoutePrefix } from '../utils/routePrefix';

const unwrap = (response) => response?.data || response;
const formatLongDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Trip details';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};
const pickFirstString = (...values) => {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
};
const coordLabel = (location, fallback) => {
  const [lng, lat] = location?.coordinates || [];
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
  return fallback;
};
const initialsOf = (name) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'C';

/** Port of Taxi/modules/user/pages/ride/RideDetail.jsx (/taxi/user/ride/detail/:id). */
export default function RideDetail() {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const appName = settings.general?.app_name || 'App';
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [ride, setRide] = useState(location.state?.ride || null);
  const [loading, setLoading] = useState(!location.state?.ride);
  const [error, setError] = useState('');
  const routePrefix = getTaxiUserRoutePrefix();

  useEffect(() => {
    if (ride || !id) return undefined;
    let active = true;
    api
      .get(`/rides/${id}`)
      .then((response) => {
        if (active) setRide(unwrap(response));
      })
      .catch((loadError) => {
        if (active) setError(loadError?.message || 'Could not load trip details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, ride]);

  const details = useMemo(() => {
    const driver = ride?.driver || ride?.driverId || {};
    const timeSource = ride?.completedAt || ride?.startedAt || ride?.acceptedAt || ride?.createdAt || ride?.updatedAt;
    const fare = Number(ride?.fare || 0);
    const taxes = Math.max(Math.round(fare * 0.18), 0);
    const status = String(ride?.status || ride?.liveStatus || 'trip').toLowerCase();
    const rideCode = String(ride?.rideId || ride?._id || ride?.id || id || 'ride');
    return {
      pickup: pickFirstString(ride?.pickupAddress, ride?.pickup?.address, ride?.pickup?.name) || coordLabel(ride?.pickupLocation || ride?.pickup, 'Pickup location'),
      drop: pickFirstString(ride?.dropAddress, ride?.drop?.address, ride?.drop?.name, ride?.destinationAddress) || coordLabel(ride?.dropLocation || ride?.drop, 'Drop location'),
      fare,
      taxes,
      baseFare: Math.max(fare - taxes, 0),
      timeSource,
      startTime: ride?.startedAt || ride?.acceptedAt || timeSource,
      endTime: ride?.completedAt || timeSource,
      statusLabel: status.charAt(0).toUpperCase() + status.slice(1),
      driverName: driver.name || 'Captain',
      rating: driver.rating || '4.9',
      plate: driver.vehicleNumber || 'Assigned',
      vehicle: driver.vehicleType || ride?.vehicleIconType || 'Taxi',
      paymentMethod: String(ride?.paymentMethod || ride?.payment_method || ride?.paymentType || ride?.payment_type || 'cash').trim().toLowerCase() === 'cash' ? 'Cash' : 'Online',
      rideCode,
      shortRideCode: rideCode.length > 14 ? `${rideCode.slice(0, 6)}...${rideCode.slice(-4)}` : rideCode,
    };
  }, [ride, id]);

  const handleShare = () => {
    const text = `My ${appName} trip #${details.shortRideCode} - ${details.pickup} to ${details.drop} | Rs ${details.fare}.00`;
    Share.share({ title: `${appName} Trip`, message: text }).catch(() => {});
  };
  const toSupport = () => navigate(`${routePrefix}/support`);
  const rebook = () => {
    const vehicleTypeStr = String(ride?.vehicleIconType || ride?.vehicle?.icon_types || ride?.driver?.vehicleType || '').toLowerCase();
    const selectedCategory = vehicleTypeStr.includes('bike') || vehicleTypeStr.includes('scooty') ? 'bike' : vehicleTypeStr.includes('auto') ? 'auto' : 'car';
    navigate(`${routePrefix}/ride/select-location`, {
      state: {
        pickup: details.pickup,
        drop: details.drop,
        pickupCoords: ride?.pickupLocation?.coordinates || ride?.pickup?.coordinates || null,
        dropCoords: ride?.dropLocation?.coordinates || ride?.drop?.coordinates || null,
        selectedCategory,
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FDFDFD' }}>
      <View style={[styles.header, { paddingTop: 20 + insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16, flex: 1, minWidth: 0 }}>
          <Press scale={0.95} onPress={() => navigate(-1)} accessibilityLabel="Go back" style={{ padding: 8, marginLeft: -8 }} hitSlop={6}>
            <ArrowLeft size={24} color={tw.gray900} strokeWidth={3} />
          </Press>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header" accessibilityLabel={`Trip ID ${details.rideCode}`}>Trip ID: #{details.shortRideCode}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {details.statusLabel.toUpperCase()}: {formatLongDate(details.timeSource).toUpperCase()}
            </Text>
          </View>
        </View>
        <Press scale={0.9} onPress={handleShare} accessibilityLabel="Share trip details" hitSlop={12}>
          <Share2 size={20} color={tw.gray400} />
        </Press>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 32 }}>
        {loading ? (
          <View style={styles.notice} accessibilityRole="progressbar">
            <Text style={styles.noticeText}>Loading trip details...</Text>
          </View>
        ) : null}
        {error ? (
          <View style={[styles.notice, { borderColor: tw.red100, backgroundColor: tw.red50 }]}>
            <Text style={[styles.noticeText, { color: tw.red600 }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.map}>
          <Image source={require('../../../assets/taxi/map_image.png')} style={{ width: '100%', height: '100%', opacity: 0.6 }} resizeMode="cover" accessibilityLabel="Map view" />
          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.8)']} style={StyleSheet.absoluteFill} />
        </View>

        <View style={{ paddingLeft: 32, gap: 24 }}>
          <View style={styles.line} />
          {[
            ['PICKUP', details.pickup, details.startTime, tw.green500],
            ['DROP', details.drop, details.endTime, tw.orange500],
          ].map(([label, place, time, color]) => (
            <View key={label}>
              <View style={[styles.stop, { borderColor: color }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
              </View>
              <Text style={styles.stopLabel}>{label}</Text>
              <Text style={styles.stopPlace}>{place}</Text>
              <Text style={styles.stopTime}>{formatTime(time)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.vehicleIcon}>
              <Bike size={22} color={tw.gray900} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>{details.vehicle} Ride</Text>
              <Text style={styles.payBy}>PAYMENT BY {details.paymentMethod.toUpperCase()}</Text>
            </View>
          </View>
          <View style={{ gap: 12, paddingTop: 8 }}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Base Fare</Text>
              <Text style={styles.rowValue}>Rs {details.baseFare}.00</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel} numberOfLines={1}>{'Taxes & Fees'}</Text>
              <Text style={styles.rowValue}>Rs {details.taxes}.00</Text>
            </View>
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: tw.gray50, paddingTop: 12 }]}>
              <Text style={styles.total}>Total Paid</Text>
              <Text style={styles.total}>Rs {details.fare}.00</Text>
            </View>
          </View>
        </View>

        <View style={styles.driver}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(details.driverName)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.driverName} numberOfLines={1}>{details.driverName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Star size={12} color={tw.orange600} fill={tw.orange600} />
                <Text style={styles.driverMeta} numberOfLines={1}>
                  {details.rating} - {details.plate}
                </Text>
              </View>
            </View>
          </View>
          <Press scale={0.95} onPress={toSupport} accessibilityLabel="Support" style={styles.supportBtn}>
            <Text style={styles.supportText}>Support</Text>
          </Press>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 24 + NAV_CLEARANCE + insets.bottom }]}>
        <Press scale={0.97} onPress={rebook} accessibilityLabel="Rebook this ride" style={styles.rebook}>
          <Repeat size={18} color="#fff" />
          <Text style={[styles.footText, { color: '#fff' }]}>REBOOK RIDE</Text>
        </Press>
        <Press scale={0.97} onPress={toSupport} accessibilityLabel="Help" style={styles.help}>
          <HelpCircle size={18} color={tw.gray900} />
          <Text style={styles.footText}>HELP</Text>
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray50, ...shadow('sm') },
  title: { fontSize: 17, lineHeight: 20, color: tw.gray900, ...fo(900) },
  subtitle: { marginTop: 4, fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: tw.gray400, ...fo(700) },
  notice: { borderRadius: 24, borderWidth: 1, borderColor: tw.gray50, backgroundColor: '#fff', padding: 20, alignItems: 'center', ...shadow('sm') },
  noticeText: { fontSize: 13, lineHeight: 18, color: tw.gray500, textAlign: 'center', ...fo(900) },
  map: { height: 160, borderRadius: 32, overflow: 'hidden', backgroundColor: tw.gray100, ...shadow('sm') },
  line: { position: 'absolute', left: 7, top: 8, bottom: 8, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: tw.gray100 },
  stop: { position: 'absolute', left: -32, top: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stopLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: tw.gray400, marginBottom: 4, ...fo(900) },
  stopPlace: { fontSize: 15, lineHeight: 19, color: tw.gray800, ...fo(900) },
  stopTime: { fontSize: 11, lineHeight: 16, color: tw.gray400, marginTop: 4, ...fo(700) },
  card: { backgroundColor: '#fff', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: tw.gray50, gap: 16, ...shadow('sm') },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tw.gray50 },
  vehicleIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  vehicleName: { fontSize: 15, lineHeight: 20, color: tw.gray900, textTransform: 'capitalize', ...fo(900) },
  payBy: { fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: tw.gray400, ...fo(700) },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { flex: 1, marginRight: 12, fontSize: 13, lineHeight: 18, color: tw.gray500, ...fo(700) },
  rowValue: { textAlign: 'right', fontSize: 13, lineHeight: 18, color: tw.gray900, ...fo(700) },
  total: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...fo(900) },
  driver: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 20, backgroundColor: 'rgba(255,247,237,0.5)', borderRadius: 28, borderWidth: 1, borderColor: tw.orange50 },
  avatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: tw.orange100, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, color: '#000', ...fo(700) },
  driverName: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...fo(900) },
  driverMeta: { flexShrink: 1, fontSize: 11, lineHeight: 16, color: tw.orange600, ...fo(900) },
  supportBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: tw.orange100 },
  supportText: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...fo(900) },
  footer: { flexDirection: 'row', gap: 16, padding: 24, borderTopWidth: 1, borderTopColor: tw.gray50, backgroundColor: '#fff' },
  rebook: { flex: 2, backgroundColor: '#1C2833', paddingVertical: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, ...shadow('xl') },
  help: { flex: 1, backgroundColor: tw.gray50, paddingVertical: 20, borderRadius: 24, borderWidth: 1, borderColor: tw.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: tw.gray900, ...fo(900) },
});
