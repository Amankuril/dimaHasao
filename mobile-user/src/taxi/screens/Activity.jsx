import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, Clock, Clock3, Headset, Route, ShieldCheck, User } from 'lucide-react-native';
import Img from '../../components/Img';
import { Button, Card, Chip, ChipRow, EmptyState, Money, StatusBadge } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import { ErrorState, LoadingState, PageTitle, Pulse, RouteLines, statusTone, useNavPad } from '../account/ui';
import { useActivity } from '../hooks/useActivity';
import { TABS } from '../components/activity/activityHelpers';
import { toSrc } from '../components/live/parts';

const EMPTY_MESSAGES = { all: 'Nothing here yet', rides: 'No rides yet', outstation: 'No outstation trips yet', scheduled: 'No scheduled rides', support: 'No support requests yet' };

/** "A to B" (built by activityHelpers) back into its two ends, for the pickup → drop markers. */
const splitRoute = (address) => {
  const text = String(address || '');
  const at = text.indexOf(' to ');
  if (at < 0) return null;
  return { pickup: text.slice(0, at), drop: text.slice(at + 4) };
};

function ActivityCard({ type: kind, title, address, date, time, status, price, onPress, driverName, driverImage, vehicleImage, eyebrow }) {
  const [vehicleBroken, setVehicleBroken] = useState(false);
  const [driverBroken, setDriverBroken] = useState(false);
  const statusLabel = String(status || '').charAt(0).toUpperCase() + String(status || '').slice(1).toLowerCase();
  const initials = String(driverName || 'C').trim().charAt(0).toUpperCase();
  const route = splitRoute(address);
  return (
    <Card onPress={onPress} accessibilityLabel={`${title}, ${statusLabel}, ${date} ${time}, ₹${price}`} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          {vehicleBroken || !vehicleImage ? (
            <Img source={{ uri: kind === 'parcel' ? '/5_Parcel.png' : '/1_Bike.png' }} style={styles.fill} resizeMode="cover" />
          ) : (
            <Image source={toSrc(vehicleImage)} onError={() => setVehicleBroken(true)} style={styles.fill} resizeMode="cover" />
          )}
          <View style={styles.driverThumb}>
            {driverBroken || !driverImage || /ui-avatars\.com/.test(String(driverImage)) ? (
              <Text style={[type.caption, { color: color.text }]}>{initials}</Text>
            ) : (
              <Image source={toSrc(driverImage)} onError={() => setDriverBroken(true)} style={styles.fill} />
            )}
          </View>
        </View>
        <View style={styles.grow}>
          <View style={styles.metaRow}>
            <Calendar size={14} color={color.textMuted} />
            <Text style={[type.caption, { color: color.textMuted }]}>{date}</Text>
            <Text style={[type.caption, { color: color.textDisabled }]}>·</Text>
            <Clock size={14} color={color.textMuted} />
            <Text style={[type.caption, { color: color.textMuted }]}>{time}</Text>
          </View>
          <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>{title}</Text>
          <Text style={[type.caption, { color: color.textMuted }]} numberOfLines={1}>{eyebrow || driverName}</Text>
        </View>
        <Money value={`₹${price}`} />
      </View>

      <View style={styles.routeBox}>
        {route ? <RouteLines pickup={route.pickup} drop={route.drop} /> : <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={2}>{address}</Text>}
      </View>

      <View style={styles.cardFoot}>
        <StatusBadge label={statusLabel} tone={statusTone(status)} />
        <View style={styles.viewLink}>
          <Text style={[type.label, { color: color.primary }]}>View details</Text>
          <ChevronRight size={16} color={color.primary} />
        </View>
      </View>
    </Card>
  );
}

/** Port of Taxi/modules/user/pages/Activity.jsx and components/activity/* (logic: useActivity). */
export default function Activity() {
  const bottomPad = useNavPad(space.xxl);
  const {
    activeTab, setActiveTab, activities, loading, error, setReloadKey, setCurrentPage, pagination, navigate, routePrefix, currentRide, driverName, serviceType,
    vehicleLabel, currentRideIcon, trackingPath, isScheduledAcceptedRide, rideStageContextLabel, scheduledDateLabel, scheduledCountdown, rentalCurrentCharge,
    rentalTimerLabel, handleItemClick, helperText,
  } = useActivity();
  const rental = serviceType === 'rental';

  return (
    <View style={styles.flex}>
      <PageTitle title="Recent activity" subtitle={helperText} onBack={() => navigate(-1)} />

      <View style={styles.tabsBar}>
        <ChipRow style={{ flexGrow: 0 }} contentStyle={styles.tabs}>
          {TABS.map((tab) => (
            <Chip key={tab} label={tab} selected={activeTab === tab} onPress={() => setActiveTab(tab)} style={styles.tab} />
          ))}
        </ChipRow>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}>
        {currentRide ? (
          <Card onPress={() => navigate(trackingPath, { state: currentRide })} accessibilityLabel={`Active trip. ${rideStageContextLabel}. View details`} style={styles.active}>
            <View style={styles.rowBetween}>
              <StatusBadge label="Active trip" tone="info" icon={ShieldCheck} />
              <View style={styles.live}>
                <Pulse style={styles.liveDot} />
                <Text style={[type.caption, { color: color.success }]}>Live status</Text>
              </View>
            </View>

            <View style={[styles.rowBetween, { alignItems: 'center' }]}>
              <View style={styles.grow}>
                <Text style={[type.heading, { color: color.text }]}>{rideStageContextLabel}</Text>
                <Text style={[type.small, { color: color.textMuted }]}>{isScheduledAcceptedRide ? scheduledDateLabel : rental ? 'Rental Booking' : 'Active Booking'}</Text>
              </View>
              <View style={styles.rideIcon}>
                <Image source={toSrc(currentRideIcon)} style={{ width: 32, height: 32 }} resizeMode="contain" />
              </View>
            </View>

            <RouteLines pickup={currentRide.pickup || 'Pickup location'} drop={currentRide.drop || 'Drop location'} numberOfLines={1} />

            {rental ? (
              <View style={styles.chips}>
                <StatusBadge label={rentalTimerLabel} tone="neutral" icon={Clock3} />
                <StatusBadge label={`Live charge ₹${rentalCurrentCharge.toFixed(0)}`} tone="success" />
              </View>
            ) : isScheduledAcceptedRide ? (
              <View style={styles.chips}>
                <StatusBadge label={driverName} tone="info" icon={User} />
                {scheduledCountdown ? <StatusBadge label={scheduledCountdown} tone="neutral" /> : null}
              </View>
            ) : null}

            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <User size={18} color={color.primary} />
              </View>
              <View style={styles.grow}>
                <Text style={[type.caption, { color: color.textMuted }]}>Driver & vehicle</Text>
                <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
                  {driverName} • {vehicleLabel}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[type.caption, { color: color.textMuted }]}>Fare</Text>
                <Text style={[type.bodyStrong, { color: color.text }]}>₹{Number(rental ? rentalCurrentCharge : currentRide?.fare || 0).toFixed(0)}</Text>
              </View>
              <ChevronRight size={20} color={color.primary} />
            </View>
          </Card>
        ) : null}

        {activeTab === 'Support' ? (
          <EmptyState icon={Headset} title="No support tickets" message="You haven't raised any support tickets yet." actionLabel="Contact us" onAction={() => navigate(`${routePrefix}/support`)} />
        ) : loading ? (
          <LoadingState label="Loading your trips" />
        ) : error ? (
          <ErrorState title={error} actionLabel="Retry" onAction={() => setReloadKey((current) => current + 1)} />
        ) : activities.length === 0 ? (
          <EmptyState icon={Route} title={EMPTY_MESSAGES[String(activeTab || '').toLowerCase()] || 'Nothing here yet'} message="Your trips will appear here once you book one." />
        ) : (
          <View style={{ gap: space.md }}>
            {activities.map((activity) => (
              <ActivityCard key={activity.id} {...activity} onPress={() => handleItemClick(activity)} />
            ))}
            {pagination.totalPages > 1 ? (
              <View style={styles.pager}>
                <Button
                  title="Previous"
                  icon={ChevronLeft}
                  variant="outline"
                  size="md"
                  disabled={!pagination.hasPrevPage}
                  onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  accessibilityLabel="Previous page"
                  style={styles.grow}
                />
                <Text style={[type.label, { color: color.textSecondary }]} accessibilityLiveRegion="polite">
                  {pagination.page} / {pagination.totalPages}
                </Text>
                <Button
                  title="Next"
                  iconRight={ChevronRight}
                  variant="secondary"
                  size="md"
                  disabled={!pagination.hasNextPage}
                  onPress={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
                  accessibilityLabel="Next page"
                  style={styles.grow}
                />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  fill: { width: '100%', height: '100%' },
  tabsBar: { paddingBottom: space.md },
  tabs: { alignItems: 'center', paddingVertical: space.xxs },
  tab: { height: 44 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },

  active: { gap: space.lg, borderColor: color.primaryBorder },
  live: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.success },
  rideIcon: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radii.md, padding: space.md, backgroundColor: color.surfaceMuted },
  driverAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },

  card: { gap: space.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  thumb: { width: 56, height: 56, borderRadius: radii.md, overflow: 'hidden', borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted },
  driverThumb: { position: 'absolute', bottom: 3, right: 3, width: 24, height: 24, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: color.surface, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap', marginBottom: space.xxs },
  routeBox: { padding: space.md, borderRadius: radii.md, backgroundColor: color.bg, borderWidth: 1, borderColor: color.border },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  viewLink: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },

  pager: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
});
