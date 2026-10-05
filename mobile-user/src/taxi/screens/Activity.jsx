import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowLeft, Calendar, ChevronRight, Clock, Clock3, Headset, MapPin, ShieldCheck, User } from 'lucide-react-native';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { shadow, tw } from '../../theme';
import { fo, Pulse } from '../account/ui';
import { useActivity } from '../hooks/useActivity';
import { TABS } from '../components/activity/activityHelpers';
import { toSrc } from '../components/live/parts';

const EMERALD = { 50: '#ECFDF5', 100: '#D0FAE5', 500: '#00BC7D', 600: '#009966', 700: '#007A55' };
const TONES = {
  success: { bg: EMERALD[50], fg: EMERALD[700], border: EMERALD[100] },
  danger: { bg: '#FFF1F2', fg: '#C70036', border: '#FFE4E6' },
  warn: { bg: '#FFFBEB', fg: '#BB4D00', border: '#FEF3C6' },
};
const EMPTY_MESSAGES = { all: 'Nothing here yet', rides: 'No rides yet', outstation: 'No outstation trips yet', scheduled: 'No scheduled rides', support: 'No support requests yet' };

function ActivityCard({ type, title, address, date, time, status, statusTone, price, onPress, driverName, driverImage, vehicleImage, eyebrow }) {
  const [vehicleBroken, setVehicleBroken] = useState(false);
  const [driverBroken, setDriverBroken] = useState(false);
  const tone = TONES[statusTone] || TONES.warn;
  const statusLabel = String(status || '').charAt(0).toUpperCase() + String(status || '').slice(1).toLowerCase();
  const initials = String(driverName || 'C').trim().charAt(0).toUpperCase();
  return (
    <Press scale={0.98} onPress={onPress} accessibilityLabel={`${title}, ${statusLabel}, ${date} ${time}, Rs ${price}`} style={styles.card}>
      <View style={styles.thumb}>
        {vehicleBroken || !vehicleImage ? (
          <Img source={{ uri: type === 'parcel' ? '/5_Parcel.png' : '/1_Bike.png' }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Image source={toSrc(vehicleImage)} onError={() => setVehicleBroken(true)} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        )}
        <View style={styles.driverThumb}>
          {driverBroken || !driverImage || /ui-avatars\.com/.test(String(driverImage)) ? (
            <Text style={styles.driverInitial}>{initials}</Text>
          ) : (
            <Image source={toSrc(driverImage)} onError={() => setDriverBroken(true)} style={{ width: '100%', height: '100%' }} />
          )}
        </View>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.cardEyebrow} numberOfLines={2}>{eyebrow || driverName}</Text>
            <Text style={styles.cardAddress} numberOfLines={2}>{address}</Text>
          </View>
          <Text style={styles.cardPrice}>Rs {price}</Text>
        </View>
        <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <View style={styles.meta}>
            <Calendar size={11} color={tw.slate400} strokeWidth={2.4} />
            <Text style={styles.metaText}>{date}</Text>
          </View>
          <View style={styles.meta}>
            <Clock size={11} color={tw.slate400} strokeWidth={2.4} />
            <Text style={styles.metaText}>{time}</Text>
          </View>
          <Text style={[styles.status, { backgroundColor: tone.bg, color: tone.fg, borderColor: tone.border }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.cardChevron}>
        <ChevronRight size={16} color={tw.slate300} strokeWidth={2.4} />
      </View>
    </Press>
  );
}

function State({ icon, title, body, action, onAction }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>{icon}</View>
      <Text style={styles.stateTitle}>{title}</Text>
      {body ? <Text style={styles.stateBody}>{body}</Text> : null}
      {action ? (
        <Press scale={0.95} onPress={onAction} accessibilityLabel={action} style={styles.stateBtn}>
          <Text style={styles.stateBtnText}>{action.toUpperCase()}</Text>
        </Press>
      ) : null}
    </View>
  );
}

/** Port of Taxi/modules/user/pages/Activity.jsx and components/activity/* (logic: useActivity). */
export default function Activity() {
  const insets = useSafeAreaInsets();
  const {
    activeTab, setActiveTab, activities, loading, error, setReloadKey, setCurrentPage, pagination, navigate, routePrefix, currentRide, driverName, serviceType,
    vehicleLabel, currentRideIcon, trackingPath, isScheduledAcceptedRide, rideStageContextLabel, scheduledDateLabel, scheduledCountdown, rentalCurrentCharge,
    rentalTimerLabel, handleItemClick, helperText,
  } = useActivity();
  const rental = serviceType === 'rental';

  return (
    <View style={{ flex: 1, backgroundColor: tw.slate50 }}>
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <Press scale={0.95} onPress={() => navigate(-1)} accessibilityLabel="Go back" style={{ padding: 8, marginLeft: -8 }} hitSlop={6}>
          <ArrowLeft size={22} color={tw.slate900} strokeWidth={2.6} />
        </Press>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker}>My bookings</Text>
          <Text style={styles.title} accessibilityRole="header">Recent activity</Text>
          <Text style={styles.helper}>{helperText}</Text>
        </View>
      </View>

      <View style={styles.tabsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((tab) => {
            const on = activeTab === tab;
            return (
              <Press key={tab} scale={0.99} onPress={() => setActiveTab(tab)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tab} style={[styles.tab, on ? styles.tabOn : null]}>
                <Text style={[styles.tabText, on ? { color: '#020618' } : null]}>{tab}</Text>
              </Press>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 112 + NAV_CLEARANCE + insets.bottom }}>
        {currentRide ? (
          <Press scale={0.99} onPress={() => navigate(trackingPath, { state: currentRide })} accessibilityLabel={`Active trip. ${rideStageContextLabel}. View details`} style={styles.active}>
            <View style={styles.rowBetween}>
              <View style={styles.activeTag}>
                <ShieldCheck size={11} color={EMERALD[700]} strokeWidth={3} />
                <Text style={[styles.tiny, { color: EMERALD[700] }]}>ACTIVE TRIP</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Pulse style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: EMERALD[500] }} />
                <Text style={[styles.tiny, { color: EMERALD[600], letterSpacing: 1.26 }]}>LIVE STATUS</Text>
              </View>
            </View>

            <View style={[styles.rowBetween, { marginTop: 16, alignItems: 'flex-end' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stage}>{rideStageContextLabel}</Text>
                <Text style={styles.stageSub}>{isScheduledAcceptedRide ? scheduledDateLabel : rental ? 'Rental Booking' : 'Active Booking'}</Text>
              </View>
              <View style={styles.rideIcon}>
                <Image source={toSrc(currentRideIcon)} style={{ width: 32, height: 32 }} resizeMode="contain" />
              </View>
            </View>

            <View style={[styles.place, { marginTop: 16 }]}>
              <MapPin size={12} color={EMERALD[500]} strokeWidth={2.5} />
              <Text style={styles.placeText} numberOfLines={1}>{currentRide.pickup || 'Pickup location'}</Text>
            </View>
            <View style={[styles.place, { marginTop: 4 }]}>
              <MapPin size={12} color="#FF6900" strokeWidth={2.5} />
              <Text style={styles.placeText} numberOfLines={1}>{currentRide.drop || 'Drop location'}</Text>
            </View>

            {rental ? (
              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: tw.slate100 }]}>
                  <Clock3 size={11} color={tw.slate600} />
                  <Text style={[styles.chipText, { color: tw.slate600 }]}>{rentalTimerLabel}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: EMERALD[50] }]}>
                  <Text style={[styles.chipText, { color: EMERALD[700] }]}>Live charge Rs {rentalCurrentCharge.toFixed(0)}</Text>
                </View>
              </View>
            ) : isScheduledAcceptedRide ? (
              <View style={styles.chips}>
                <View style={[styles.chip, { backgroundColor: '#F0F9FF' }]}>
                  <User size={11} color="#0069A8" />
                  <Text style={[styles.chipText, { color: '#0069A8' }]}>{driverName}</Text>
                </View>
                {scheduledCountdown ? (
                  <View style={[styles.chip, { backgroundColor: tw.slate100 }]}>
                    <Text style={[styles.chipText, { color: tw.slate600 }]}>{scheduledCountdown}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.driverRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <View style={styles.driverAvatar}>
                  <User size={16} color={EMERALD[600]} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.tiny, { color: tw.slate500, letterSpacing: 1.26, ...fo(600) }]}>DRIVER & VEHICLE</Text>
                  <Text style={styles.driverValue} numberOfLines={1}>
                    {driverName} • {vehicleLabel}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.tiny, { color: tw.slate500, letterSpacing: 1.26, ...fo(600) }]}>FARE</Text>
                  <Text style={styles.driverValue}>₹{Number(rental ? rentalCurrentCharge : currentRide?.fare || 0).toFixed(0)}</Text>
                </View>
                <View style={styles.go}>
                  <ChevronRight size={16} color="#fff" strokeWidth={3} />
                </View>
              </View>
            </View>
          </Press>
        ) : null}

        {activeTab === 'Support' ? (
          <State icon={<Headset size={36} color="#FF6900" />} title="No support tickets" body="You haven't raised any support tickets yet." action="Contact Us" onAction={() => navigate(`${routePrefix}/support`)} />
        ) : loading ? (
          <State icon={<ActivityIndicator size="small" color="#FF6900" />} title="Loading your trips" />
        ) : error ? (
          <State icon={<AlertCircle size={24} color="#FF2056" strokeWidth={3} />} title={error} action="Retry" onAction={() => setReloadKey((current) => current + 1)} />
        ) : activities.length === 0 ? (
          <State icon={<Text style={{ fontSize: 22, color: tw.slate400, ...fo(900) }}>-</Text>} title={EMPTY_MESSAGES[String(activeTab || '').toLowerCase()] || 'Nothing here yet'} />
        ) : (
          <View style={{ gap: 12, paddingBottom: 8 }}>
            {activities.map((activity) => (
              <ActivityCard key={activity.id} {...activity} onPress={() => handleItemClick(activity)} />
            ))}
            {pagination.totalPages > 1 ? (
              <View style={styles.pagerWrap}>
                <View style={styles.pager}>
                  <Press scale={0.98} disabled={!pagination.hasPrevPage} onPress={() => setCurrentPage((page) => Math.max(1, page - 1))} accessibilityLabel="Previous page" style={[styles.pagerBtn, !pagination.hasPrevPage ? { opacity: 0.45 } : null]}>
                    <Text style={styles.pagerText}>Previous</Text>
                  </Press>
                  <View style={styles.pagerPage}>
                    <Text style={[styles.pagerText, { color: tw.slate500 }]}>
                      Page {pagination.page} / {pagination.totalPages}
                    </Text>
                  </View>
                  <Press scale={0.98} disabled={!pagination.hasNextPage} onPress={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))} accessibilityLabel="Next page" style={[styles.pagerBtn, styles.pagerNext, !pagination.hasNextPage ? { opacity: 0.45 } : null]}>
                    <Text style={[styles.pagerText, { color: '#fff' }]}>Next</Text>
                  </Press>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.slate200 },
  kicker: { fontSize: 10, lineHeight: 15, letterSpacing: 2, color: tw.slate400, ...fo(600) },
  title: { marginTop: 4, fontSize: 20, lineHeight: 28, letterSpacing: -0.5, color: tw.slate900, ...fo(800) },
  helper: { marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.slate900, opacity: 0.6, ...fo(400) },
  tabsBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.slate200, paddingHorizontal: 20, paddingVertical: 12 },
  tabs: { gap: 8, padding: 4, borderRadius: 999, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50 },
  tab: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  tabOn: { backgroundColor: '#FFC400', ...shadow('sm') },
  tabText: { fontSize: 11, lineHeight: 16, letterSpacing: 1.3, color: tw.slate500, ...fo(700) },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  active: { marginBottom: 16, borderRadius: 24, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', padding: 20, ...shadow('lg') },
  activeTag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, backgroundColor: EMERALD[50] },
  tiny: { fontSize: 9, lineHeight: 14, letterSpacing: 1.08, ...fo(900) },
  stage: { fontSize: 20, lineHeight: 22, letterSpacing: -0.5, color: tw.slate900, ...fo(900) },
  stageSub: { marginTop: 4, fontSize: 11, lineHeight: 16, color: tw.slate900, opacity: 0.6, ...fo(700) },
  rideIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: tw.slate100, borderWidth: 1, borderColor: tw.slate200, alignItems: 'center', justifyContent: 'center', marginBottom: 4, ...shadow('md') },
  place: { flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.75 },
  placeText: { flex: 1, fontSize: 11, lineHeight: 16, color: tw.slate900, ...fo(500) },
  chips: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 10, lineHeight: 15, ...fo(500) },
  driverRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50 },
  driverAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: EMERALD[50], borderWidth: 1, borderColor: EMERALD[100], alignItems: 'center', justifyContent: 'center' },
  driverValue: { marginTop: 2, fontSize: 12.5, lineHeight: 17, color: tw.slate900, ...fo(700) },
  go: { width: 28, height: 28, borderRadius: 10, backgroundColor: tw.slate900, alignItems: 'center', justifyContent: 'center' },

  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', padding: 14, ...shadow('sm') },
  thumb: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50 },
  driverThumb: { position: 'absolute', bottom: 6, right: 6, width: 28, height: 28, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: '#fff', backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  driverInitial: { fontSize: 11, color: '#000', ...fo(700) },
  cardTitle: { fontSize: 14, lineHeight: 17.5, color: tw.slate900, ...fo(600) },
  cardEyebrow: { marginTop: 4, fontSize: 10, lineHeight: 15, letterSpacing: 1.2, color: tw.slate400, ...fo(600) },
  cardAddress: { marginTop: 8, fontSize: 12, lineHeight: 16, color: tw.slate600, ...fo(400) },
  cardPrice: { paddingLeft: 4, fontSize: 13, lineHeight: 18, color: tw.slate900, ...fo(600) },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 10, lineHeight: 12, color: tw.slate400, ...fo(600) },
  status: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, lineHeight: 10, overflow: 'hidden', ...fo(600) },
  cardChevron: { marginTop: 4, width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },

  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  stateIcon: { minWidth: 56, minHeight: 56, padding: 14, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  stateTitle: { fontSize: 15, lineHeight: 22, color: tw.slate500, textAlign: 'center', ...fo(900) },
  stateBody: { fontSize: 13, lineHeight: 18, color: tw.slate500, textAlign: 'center', ...fo(700) },
  stateBtn: { marginTop: 8, backgroundColor: tw.slate900, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 999, ...shadow('0 16px 34px rgba(15,23,42,0.18)') },
  stateBtnText: { fontSize: 12, lineHeight: 16, letterSpacing: 2.1, color: '#fff', ...fo(900) },

  pagerWrap: { marginTop: 16, borderTopWidth: 1, borderTopColor: tw.slate200, paddingTop: 16 },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', padding: 12, ...shadow('sm') },
  pagerBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: tw.slate200, backgroundColor: tw.slate50, paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center' },
  pagerNext: { borderColor: tw.slate900, backgroundColor: tw.slate900 },
  pagerPage: { borderRadius: 12, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 12 },
  pagerText: { fontSize: 11, lineHeight: 16, letterSpacing: 1.3, color: tw.slate700, ...fo(700) },
});
