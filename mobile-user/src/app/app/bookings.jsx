import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Image from '../../components/Img';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { SectionHeader, StatusBadge } from '../../components/ds';
import { Header, PatternDivider } from '../../components/dh/Header';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { GreenButton, Panel, StateBlock, dhs } from '../../components/dh/ui';
import { useBooking } from '../../context/BookingContext';
import { groupPasses } from '../../api/dh/festivalApi';
import { openExternal } from '../../lib/links';
import { color, elevation, radii, space, type } from '../../theme';

// Web: DimaHasao/pages/MyBookingsScreen.jsx (/app/bookings?tab=)

const TAB_IDS = ['rides', 'hotels', 'food', 'tours', 'festivals'];

/** DESIGN_SYSTEM state → tone, matched on the status word the context hands over. */
const statusTone = (status) => {
  const v = String(status || '').toLowerCase();
  if (/cancel|fail|reject|expire|refused/.test(v)) return 'danger';
  if (/complete|deliver|paid|approve|refund|checked.?out|finish|success/.test(v)) return 'success';
  if (/pend|process|prepar|search|await|unpaid|hold/.test(v)) return 'warning';
  if (/book|confirm|placed|accept|ongoing|on the way|live|active|arriv|started|checked.?in|upcoming/.test(v)) return 'info';
  return 'neutral';
};

function Status({ children }) {
  return <StatusBadge label={String(children || '')} tone={statusTone(children)} />;
}

/** The two-column facts grid inside each card. */
function Facts({ items }) {
  return (
    <View style={styles.facts}>
      {items.filter(Boolean).map(([label, value, opts]) => (
        <View key={label} style={{ width: opts?.wide ? '100%' : '50%', paddingRight: space.sm, marginBottom: space.sm }}>
          <Text style={styles.factLabel}>{label}</Text>
          <Text style={[styles.factValue, opts?.style]} numberOfLines={opts?.wrap ? undefined : 1}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Total({ label, amount }) {
  return (
    <View style={{ flexShrink: 1 }}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>₹{Number(amount || 0).toLocaleString('en-IN')}</Text>
    </View>
  );
}

function SmallButton({ icon, title, onPress, disabled }) {
  return <GreenButton size="sm" variant="secondary" fullWidth={false} icon={icon} title={title} onPress={onPress} disabled={disabled} style={styles.smallBtn} />;
}

function Thumb({ uri }) {
  return <Image source={{ uri }} style={styles.thumb} />;
}

export default function MyBookingsScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { bookings, hotelBookings, foodOrders, tourBookings, festivalBookings, showToast, refreshAllBookings, bookingsLoading } = useBooking();
  const [activeTab, setActiveTab] = useState(() => (TAB_IDS.includes(params.tab) ? params.tab : 'rides'));
  const tabsRef = useRef(null);
  const tabX = useRef({});

  // Profile links straight at a module's bookings via ?tab=.
  useEffect(() => {
    if (TAB_IDS.includes(params.tab)) setActiveTab(params.tab);
  }, [params.tab]);

  // The lists belong to other modules too; refresh when this screen is shown.
  useFocusEffect(
    useCallback(() => {
      refreshAllBookings();
    }, [refreshAllBookings]),
  );

  // Keeps the chosen tab on screen when it sits off the edge of the strip.
  useEffect(() => {
    const x = tabX.current[activeTab];
    if (x != null) tabsRef.current?.scrollTo({ x: Math.max(0, x - 24), animated: true });
  }, [activeTab]);

  // A running ride goes back to live tracking; a finished one opens its receipt.
  const openRide = (booking) => {
    if (!booking?.id) return;
    if (booking.isLive) {
      router.push({ pathname: '/taxi/user/ride/tracking', params: { rideId: booking.id } });
      return;
    }
    router.push(`/taxi/user/ride/detail/${booking.id}`);
  };

  const bookingTabs = [
    { id: 'rides', label: `Rides (${bookings.length})`, icon: 'fa-solid fa-taxi' },
    { id: 'hotels', label: `Stays (${hotelBookings.length})`, icon: 'fa-solid fa-hotel' },
    { id: 'food', label: `Food (${foodOrders.length})`, icon: 'fa-solid fa-utensils' },
    { id: 'tours', label: `Tours (${tourBookings.length})`, icon: 'fa-solid fa-suitcase-rolling' },
    { id: 'festivals', label: `Passes (${festivalBookings.length})`, icon: 'fa-solid fa-ticket' },
  ];

  const renderRide = (b) => (
    <Panel key={b.id} pad={0} style={{ overflow: 'hidden' }}>
      <Press scale={0.99} onPress={() => openRide(b)} accessibilityLabel={`Ride to ${b.placeName}, ${b.status}${b.isLive ? '. Track ride' : '. View receipt'}`} style={styles.cardTap}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker} numberOfLines={1}>
              {b.date} • ID: {b.id}
            </Text>
            <Text style={styles.title} numberOfLines={2}>
              {b.placeName}
            </Text>
          </View>
          <Status>{b.status}</Status>
        </View>
        <Facts
          items={[
            ['Pickup', b.pickup],
            ['Transport', `${b.transport} (${b.vehicleNo})`, { style: { color: color.primary } }],
            ['Driver', b.driverName],
            ['Ride OTP', b.otp, { style: { ...type.bodyStrong, letterSpacing: 2, color: color.goldText } }],
          ]}
        />
      </Press>
      <View style={[styles.cardFoot, { marginHorizontal: space.lg, paddingBottom: space.lg }]}>
        <Total label="Total fare" amount={b.fare} />
        <View style={[dhs.row, { gap: space.sm }]}>
          {b.isLive ? (
            <Press onPress={() => openRide(b)} accessibilityLabel="Track ride" style={styles.track}>
              <Text style={styles.trackText}>Track ride</Text>
              <Fa name="fa-solid fa-chevron-right" size={12} color={color.primary} />
            </Press>
          ) : null}
          <SmallButton icon="fa-solid fa-phone" title="Call driver" disabled={!b.driverPhone} onPress={() => (b.driverPhone ? openExternal(`tel:${b.driverPhone}`) : showToast('No driver assigned yet'))} />
        </View>
      </View>
    </Panel>
  );

  const renderHotel = (hb) => (
    <Panel key={hb.id} style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Thumb uri={hb.image} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm, alignItems: 'flex-start' }]}>
            <Text style={[styles.kicker, { flexShrink: 1 }]} numberOfLines={1}>
              ID: {hb.id}
            </Text>
            <Status>{hb.status}</Status>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {hb.hotelName}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {hb.roomName}
          </Text>
        </View>
      </View>
      <Facts
        items={[
          ['Check-in', hb.checkIn],
          ['Check-out', hb.checkOut],
          ['Guests', hb.guests],
          ['Payment', hb.paymentStatus],
        ]}
      />
      <View style={styles.cardFoot}>
        <Total label="Total amount" amount={hb.totalAmount} />
        <SmallButton icon="fa-solid fa-file-invoice" title="Invoice" onPress={() => showToast(`Digital Invoice for ${hb.id} sent to SMS/WhatsApp 📄`)} />
      </View>
    </Panel>
  );

  const renderFood = (fo) => (
    <Panel key={fo.id} style={{ gap: space.md }}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker} numberOfLines={1}>
            {fo.orderTime} • ID: {fo.id}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {fo.restaurantName}
          </Text>
        </View>
        <Status>{fo.status}</Status>
      </View>
      <View style={[styles.facts, { flexDirection: 'column', gap: space.xs + 2, paddingBottom: space.md }]}>
        {fo.items.map((it, idx) => (
          <View key={idx} style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }]}>
            <Text style={styles.item}>
              {it.quantity} × {it.name}
            </Text>
            <Text style={[styles.item, { flex: 0, ...type.bodyStrong, color: color.text }]}>₹{it.price * it.quantity}</Text>
          </View>
        ))}
      </View>
      <View style={styles.cardFoot}>
        <Total label="Total paid" amount={fo.totalAmount} />
        <SmallButton icon="fa-solid fa-location-crosshairs" title="Track order" onPress={() => router.push(`/food/user/orders/${fo.id}`)} />
      </View>
    </Panel>
  );

  const renderPass = (group) => (
    <Panel key={group.key} style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Thumb uri={group.image} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm, alignItems: 'flex-start' }]}>
            <Text style={[styles.kicker, { flexShrink: 1 }]} numberOfLines={1}>
              ID: {group.id}
            </Text>
            <Status>{group.status}</Status>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {group.festivalName}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {group.categoryLabel}
          </Text>
        </View>
      </View>
      <Facts
        items={[
          ['Dates', group.dates, { wrap: true }],
          ['Passes', `${group.ticketCount} ${group.ticketCount === 1 ? 'ticket' : 'tickets'}`],
        ]}
      />
      {/* One row per pass: each category is scanned on its own at the gate. */}
      <View style={{ gap: space.sm }}>
        {group.passes.map((pass) => (
          <View key={pass.id} style={styles.pass}>
            <Fa name="fa-solid fa-qrcode" size={20} color={pass.qrCode ? color.text : color.textDisabled} />
            <View style={{ flex: 1, minWidth: 0 }}>
              {group.passes.length > 1 ? (
                <Text style={styles.passName} numberOfLines={1}>
                  {pass.ticketCount} × {pass.ticketCategory}
                </Text>
              ) : null}
              <Text style={styles.passCode} numberOfLines={1}>
                {pass.qrCode || 'Awaiting payment'}
              </Text>
            </View>
            <SmallButton icon="fa-solid fa-qrcode" title="QR" disabled={!pass.qrCode} onPress={() => showToast(`QR Pass ${pass.qrCode} ready for entry gate scan! 🎟️`)} />
          </View>
        ))}
      </View>
      <View style={styles.cardFoot}>
        <Total label="Paid" amount={group.totalAmount} />
        {group.passes.length > 1 ? <Text style={styles.passTypes}>{`${group.passes.length} pass types · one payment`}</Text> : null}
      </View>
    </Panel>
  );

  const renderTour = (tb) => (
    <Panel key={tb.id} style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Thumb uri={tb.image} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm, alignItems: 'flex-start' }]}>
            <Text style={[styles.kicker, { flexShrink: 1 }]} numberOfLines={1}>
              ID: {tb.id}
            </Text>
            <Status>{tb.status}</Status>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {tb.packageTitle}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {tb.duration}
          </Text>
        </View>
      </View>
      <Facts
        items={[
          ['Travel date', tb.travelDate, { wrap: true }],
          ['Travellers', tb.travelers, { wrap: true }],
          ['Your operator', tb.operatorName, { wide: true, style: { color: color.primary } }],
          tb.pickupPoint ? ['Pickup', tb.pickupPoint, { wide: true, wrap: true }] : null,
        ]}
      />
      <View style={styles.cardFoot}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Total label="Paid online" amount={tb.paidOnline} />
          {tb.collectedInPerson > 0 ? (
            <Text style={[styles.due, { color: color.success }]}>₹{tb.collectedInPerson.toLocaleString('en-IN')} paid to the operator</Text>
          ) : tb.balanceDue > 0 ? (
            <Text style={styles.due}>₹{tb.balanceDue.toLocaleString('en-IN')} due to the operator</Text>
          ) : null}
        </View>
        <SmallButton
          icon="fa-solid fa-phone"
          title="Call operator"
          onPress={() => (tb.operatorPhone ? openExternal(`tel:${tb.operatorPhone}`) : showToast('No contact number on file for this operator'))}
        />
      </View>
    </Panel>
  );

  const TAB_VIEW = {
    rides: {
      data: bookings,
      render: renderRide,
      key: (b) => b.id,
      empty: <StateBlock icon="fa-solid fa-car-side" title="No active rides" text="You haven't booked any taxi or auto rides yet." actionLabel="Book a taxi now" onAction={() => router.navigate('/taxi/user')} />,
    },
    hotels: {
      data: hotelBookings,
      render: renderHotel,
      key: (hb) => hb.id,
      empty: <StateBlock icon="fa-solid fa-hotel" title="No hotel reservations" text="You haven't booked any hotel stays or homestays yet." actionLabel="Explore stays in Haflong" onAction={() => router.navigate('/app/hotels')} />,
    },
    food: {
      data: foodOrders,
      render: renderFood,
      key: (fo) => fo.id,
      empty: <StateBlock icon="fa-solid fa-utensils" title="No food orders yet" text="Order traditional Dimasa food & bakes." actionLabel="Explore restaurants" onAction={() => router.navigate('/food/user')} />,
    },
    tours: { data: tourBookings, render: renderTour, key: (tb) => tb.id, title: 'Guided tour packages' },
    festivals: { data: festivalBookings.length > 0 ? groupPasses(festivalBookings) : [], render: renderPass, key: (g) => g.key, title: 'Festival & event passes' },
  };
  const view = TAB_VIEW[activeTab] || TAB_VIEW.rides;

  const toursOrPassesEmpty = (
    <View style={dhs.stateCard}>
      <View style={dhs.stateIcon}>
        <Fa name="fa-solid fa-ticket" size={26} color={color.primary} />
      </View>
      <Text style={dhs.stateTitle}>{activeTab === 'festivals' ? 'No festival passes yet' : 'No tour bookings yet'}</Text>
      <Text style={dhs.stateText}>Explore Falcon Festival passes or guided hill treks.</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm, flexWrap: 'wrap', marginTop: space.sm }}>
        <GreenButton title="View festivals" fullWidth={false} onPress={() => router.navigate('/app/festivals')} />
        <GreenButton title="View tour packages" tone="gray" fullWidth={false} onPress={() => router.navigate('/app/packages')} />
      </View>
    </View>
  );

  return (
    <View style={dhs.page}>
      <Header title="MY BOOKINGS" subtitle="Manage rides, stays, food & festival passes" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
        <View style={styles.tabStrip}>
          <ScrollView ref={tabsRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, padding: 4 }} accessibilityRole="tablist">
            {bookingTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Press
                  key={tab.id}
                  scale={1}
                  onPress={() => setActiveTab(tab.id)}
                  onLayout={(e) => {
                    tabX.current[tab.id] = e.nativeEvent.layout.x;
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={tab.label}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Fa name={tab.icon} size={14} color={isActive ? color.primary : color.textMuted} />
                  <Text style={[styles.tabText, isActive && { color: color.primary }]}>{tab.label}</Text>
                </Press>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <FlatList
        key={activeTab}
        data={view.data}
        keyExtractor={view.key}
        renderItem={({ item }) => view.render(item)}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={view.title && view.data.length > 0 ? <SectionHeader title={view.title} /> : null}
        ListEmptyComponent={view.empty || toursOrPassesEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: space.lg, paddingBottom: NAV_CLEARANCE + insets.bottom + space.lg }}
        refreshControl={<RefreshControl refreshing={bookingsLoading} onRefresh={refreshAllBookings} colors={[color.primary]} tintColor={color.primary} />}
      />
    </View>
  );
}

const Separator = () => <View style={{ height: space.md }} />;

const styles = StyleSheet.create({
  tabStrip: { backgroundColor: color.surfaceMuted, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, overflow: 'hidden' },
  tab: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingHorizontal: space.md, borderRadius: radii.sm + 2 },
  tabActive: { backgroundColor: color.surface, ...elevation.card },
  tabText: { ...type.label, color: color.textSecondary },
  cardTap: { padding: space.lg, paddingBottom: space.md, gap: space.md },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, paddingBottom: space.md },
  kicker: { ...type.caption, color: color.textMuted },
  title: { ...type.subheading, color: color.text },
  sub: { ...type.label, color: color.primary },
  facts: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: color.surfaceMuted, padding: space.md, paddingBottom: space.xs, borderRadius: radii.md },
  factLabel: { ...type.caption, color: color.textMuted },
  factValue: { ...type.bodyStrong, color: color.text },
  item: { flex: 1, ...type.small, color: color.textSecondary },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  totalLabel: { ...type.caption, color: color.textMuted },
  totalValue: { ...type.price, fontSize: 16, lineHeight: 22, color: color.text },
  track: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.xs },
  trackText: { ...type.label, color: color.primary },
  smallBtn: { height: 40 },
  thumb: { width: 72, height: 72, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  pass: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, backgroundColor: color.surfaceMuted, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.sm },
  passName: { ...type.label, color: color.text },
  passCode: { ...type.caption, color: color.textSecondary, fontFamily: 'monospace' },
  passTypes: { ...type.caption, color: color.textMuted, flexShrink: 1, textAlign: 'right' },
  due: { ...type.caption, color: color.warning },
});
