import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Bike, HelpCircle, Repeat, Share2, Star } from 'lucide-react-native';
import Image from '../../components/Img';
import { Button, Card, IconButton, StatusBadge } from '../../components/ds';
import { useLocation, useNavigate, useParams } from '../../lib/webRouter';
import { color, radii, space, type } from '../../theme';
import { CtaBar, PageTitle, sentence, statusTone } from '../account/ui';
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

  const statusT = statusTone(details.statusLabel);

  return (
    <View style={styles.flex}>
      <PageTitle
        title={`Trip #${details.shortRideCode}`}
        subtitle={formatLongDate(details.timeSource)}
        onBack={() => navigate(-1)}
        right={<IconButton icon={Share2} label="Share trip details" variant="soft" onPress={handleShare} />}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.statusRow}>
          <StatusBadge label={sentence(details.statusLabel)} tone={statusT} />
          <Text style={[type.caption, { color: color.textMuted }]} numberOfLines={1} selectable accessibilityLabel={`Trip ID ${details.rideCode}`}>
            ID {details.rideCode}
          </Text>
        </View>

        {loading ? (
          <Card style={styles.notice} accessibilityRole="progressbar">
            <ActivityIndicator color={color.primary} />
            <Text style={[type.small, { color: color.textMuted }]}>Loading trip details...</Text>
          </Card>
        ) : null}
        {error ? (
          <View style={[styles.notice, styles.noticeError]} accessibilityRole="alert">
            <AlertCircle size={18} color={color.danger} />
            <Text style={[type.small, { color: color.danger, flex: 1 }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.map}>
          <Image source={require('../../../assets/taxi/map_image.webp')} style={styles.mapImg} resizeMode="cover" accessibilityLabel="Map view" />
        </View>

        <Card style={{ gap: space.lg }}>
          {[
            ['Pickup', details.pickup, details.startTime, 'pickup'],
            ['Drop', details.drop, details.endTime, 'drop'],
          ].map(([label, place, time, kind], i) => (
            <View key={label} style={styles.stopRow}>
              <View style={styles.stopRail}>
                <View style={kind === 'pickup' ? styles.markPickup : styles.markDrop} />
                {i === 0 ? <View style={styles.rail} /> : null}
              </View>
              <View style={styles.grow}>
                <View style={styles.stopHead}>
                  <Text style={[type.label, { color: color.textMuted }]}>{label}</Text>
                  <Text style={[type.caption, { color: color.textMuted }]}>{formatTime(time)}</Text>
                </View>
                <Text style={[type.bodyStrong, { color: color.text }]}>{place}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Card style={{ gap: space.md }}>
          <View style={styles.cardHead}>
            <View style={styles.vehicleIcon}>
              <Bike size={22} color={color.primary} />
            </View>
            <View style={styles.grow}>
              <Text style={[type.subheading, { color: color.text, textTransform: 'capitalize' }]}>{details.vehicle} ride</Text>
              <Text style={[type.small, { color: color.textMuted }]}>Payment by {details.paymentMethod.toLowerCase()}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={[type.body, styles.grow, { color: color.textSecondary }]}>Base fare</Text>
            <Text style={[type.bodyStrong, { color: color.text }]}>Rs {details.baseFare}.00</Text>
          </View>
          <View style={styles.row}>
            <Text style={[type.body, styles.grow, { color: color.textSecondary }]} numberOfLines={1}>{'Taxes & fees'}</Text>
            <Text style={[type.bodyStrong, { color: color.text }]}>Rs {details.taxes}.00</Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={[type.subheading, styles.grow, { color: color.text }]}>Total paid</Text>
            <Text style={[type.price, { color: color.text }]}>Rs {details.fare}.00</Text>
          </View>
        </Card>

        <Card style={styles.driver}>
          <View style={styles.avatar}>
            <Text style={[type.subheading, { color: color.goldOnDark }]}>{initialsOf(details.driverName)}</Text>
          </View>
          <View style={styles.grow}>
            <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>{details.driverName}</Text>
            <View style={styles.metaRow}>
              <Star size={14} color={color.gold} fill={color.gold} />
              <Text style={[type.small, { color: color.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                {details.rating} · {details.plate}
              </Text>
            </View>
          </View>
          <Button title="Support" variant="secondary" size="sm" fullWidth={false} onPress={toSupport} style={{ minHeight: 44 }} />
        </Card>
      </ScrollView>

      <CtaBar style={styles.footer}>
        <Button title="Rebook ride" icon={Repeat} size="lg" onPress={rebook} accessibilityLabel="Rebook this ride" style={{ flex: 2 }} />
        <Button title="Help" icon={HelpCircle} variant="outline" size="lg" onPress={toSupport} style={{ flex: 1 }} />
      </CtaBar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xxl, gap: space.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg },
  noticeError: { backgroundColor: color.dangerSoft, borderRadius: radii.md },
  map: { height: 150, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border },
  mapImg: { width: '100%', height: '100%', opacity: 0.85 },
  stopRow: { flexDirection: 'row', gap: space.md },
  stopRail: { width: 14, alignItems: 'center', paddingTop: 3 },
  markPickup: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: color.success, backgroundColor: color.surface },
  markDrop: { width: 14, height: 14, borderRadius: 3, backgroundColor: color.goldText },
  rail: { position: 'absolute', top: 20, bottom: -space.lg - 2, width: 2, backgroundColor: color.border },
  stopHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  vehicleIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingTop: space.md },
  driver: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.primaryDeep, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  footer: { flexDirection: 'row', gap: space.md },
});
