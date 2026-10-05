import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../components/Img';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { Header, PatternDivider } from '../../components/dh/Header';
import { GreenButton, Panel, StateBlock, dhs } from '../../components/dh/ui';
import { useBooking } from '../../context/BookingContext';
import { groupPasses } from '../../api/dh/festivalApi';
import { openExternal } from '../../lib/links';
import { dh, montserrat, poppins, shadow, tw } from '../../theme';

// Web: DimaHasao/pages/MyBookingsScreen.jsx (/app/bookings?tab=)

const TAB_IDS = ['rides', 'hotels', 'food', 'tours', 'festivals'];

function Status({ children }) {
  return <Text style={styles.status}>{children}</Text>;
}

/** The cream two-column facts grid inside each card. */
function Facts({ items }) {
  return (
    <View style={styles.facts}>
      {items.filter(Boolean).map(([label, value, opts]) => (
        <View key={label} style={{ width: opts?.wide ? '100%' : '50%', paddingRight: 8, marginBottom: 8 }}>
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
    <Text style={styles.totalLabel}>
      {label} <Text style={styles.totalValue}>₹{Number(amount || 0).toLocaleString('en-IN')}</Text>
    </Text>
  );
}

function SmallButton({ icon, title, onPress, disabled }) {
  return (
    <Press scale={0.96} onPress={onPress} disabled={disabled} style={[styles.smallBtn, disabled && { opacity: 0.4 }]} accessibilityLabel={title}>
      <Fa name={icon} size={10} color={tw.amber300} />
      <Text style={styles.smallBtnText}>{title}</Text>
    </Press>
  );
}

function Thumb({ uri }) {
  return <Image source={{ uri }} style={styles.thumb} />;
}

export default function MyBookingsScreen() {
  const params = useLocalSearchParams();
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

  return (
    <View style={dhs.page}>
      <Header title="MY BOOKINGS" subtitle="Manage rides, stays, food & festival passes" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <View style={{ paddingHorizontal: 12, paddingTop: 12 }}>
        <View style={styles.tabStrip}>
          <ScrollView ref={tabsRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, padding: 4 }}>
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
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Fa name={tab.icon} size={10} color={isActive ? dh.nav : tw.stone400} />
                  <Text style={[styles.tabText, isActive && { color: dh.nav, ...poppins(800) }]}>{tab.label}</Text>
                </Press>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 112 }}
        refreshControl={<RefreshControl refreshing={bookingsLoading} onRefresh={refreshAllBookings} colors={[dh.nav]} />}
      >
        {activeTab === 'rides' ? (
          bookings.length > 0 ? (
            bookings.map((b) => (
              <Press key={b.id} scale={0.99} onPress={() => openRide(b)} accessibilityLabel={`Ride to ${b.placeName}, ${b.status}`}>
                <Panel style={{ gap: 12 }}>
                  <View style={styles.cardHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.kicker}>
                        {b.date} • ID: {b.id}
                      </Text>
                      <Text style={styles.title}>{b.placeName}</Text>
                    </View>
                    <Status>{b.status}</Status>
                  </View>
                  <Facts
                    items={[
                      ['PICKUP:', b.pickup],
                      ['TRANSPORT:', `${b.transport} (${b.vehicleNo})`, { style: { color: tw.emerald800 } }],
                      ['DRIVER:', b.driverName, { style: { color: tw.gray800, ...poppins(500) } }],
                      ['RIDE OTP:', b.otp, { style: { color: tw.amber700, fontFamily: 'monospace', fontWeight: '700' } }],
                    ]}
                  />
                  <View style={[dhs.row, { justifyContent: 'space-between', paddingTop: 4 }]}>
                    <Text style={styles.totalLabel}>
                      TOTAL FARE: <Text style={styles.totalValue}>₹{b.fare}</Text>
                    </Text>
                    <View style={[dhs.row, { gap: 8 }]}>
                      {b.isLive ? (
                        <View style={[dhs.row, { gap: 4 }]}>
                          <Text style={styles.track}>Track ride</Text>
                          <Fa name="fa-solid fa-chevron-right" size={9} color={dh.nav} />
                        </View>
                      ) : null}
                      <SmallButton icon="fa-solid fa-phone" title="Call Driver" disabled={!b.driverPhone} onPress={() => (b.driverPhone ? openExternal(`tel:${b.driverPhone}`) : showToast('No driver assigned yet'))} />
                    </View>
                  </View>
                </Panel>
              </Press>
            ))
          ) : (
            <StateBlock
              style={{ paddingVertical: 56 }}
              icon="fa-solid fa-car-side"
              title="No Active Rides"
              text="You haven't booked any taxi or auto rides yet."
              actionLabel="Book a Taxi Now"
              onAction={() => router.navigate('/taxi/user')}
            />
          )
        ) : null}

        {activeTab === 'hotels' ? (
          hotelBookings.length > 0 ? (
            hotelBookings.map((hb) => (
              <Panel key={hb.id} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Thumb uri={hb.image} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={[dhs.row, { justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }]}>
                      <Text style={[styles.kicker, { flexShrink: 1 }]} numberOfLines={1}>ID: {hb.id}</Text>
                      <Status>{hb.status}</Status>
                    </View>
                    <Text style={[styles.title, { marginTop: 2 }]} numberOfLines={1}>{hb.hotelName}</Text>
                    <Text style={styles.sub}>{hb.roomName}</Text>
                  </View>
                </View>
                <Facts
                  items={[
                    ['CHECK-IN:', hb.checkIn],
                    ['CHECK-OUT:', hb.checkOut],
                    ['GUESTS:', hb.guests, { style: { color: tw.gray800, ...poppins(500) } }],
                    ['PAYMENT:', hb.paymentStatus, { style: { color: tw.emerald800 } }],
                  ]}
                />
                <View style={styles.cardFoot}>
                  <Total label="TOTAL AMOUNT:" amount={hb.totalAmount} />
                  <SmallButton icon="fa-solid fa-file-invoice" title="Invoice" onPress={() => showToast(`Digital Invoice for ${hb.id} sent to SMS/WhatsApp 📄`)} />
                </View>
              </Panel>
            ))
          ) : (
            <StateBlock
              style={{ paddingVertical: 56 }}
              icon="fa-solid fa-hotel"
              title="No Hotel Reservations"
              text="You haven't booked any hotel stays or homestays yet."
              actionLabel="Explore Stays in Haflong"
              onAction={() => router.navigate('/app/hotels')}
            />
          )
        ) : null}

        {activeTab === 'food' ? (
          foodOrders.length > 0 ? (
            foodOrders.map((fo) => (
              <Panel key={fo.id} style={{ gap: 12 }}>
                <View style={[styles.cardHead, { paddingBottom: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kicker}>
                      {fo.orderTime} • ID: {fo.id}
                    </Text>
                    <Text style={styles.title}>{fo.restaurantName}</Text>
                  </View>
                  <Status>{fo.status}</Status>
                </View>
                <View style={[styles.facts, { flexDirection: 'column', gap: 4, paddingBottom: 10 }]}>
                  {fo.items.map((it, idx) => (
                    <View key={idx} style={[dhs.row, { justifyContent: 'space-between', gap: 8 }]}>
                      <Text style={styles.item}>
                        {it.quantity} × {it.name}
                      </Text>
                      <Text style={[styles.item, { flex: 0, color: tw.gray900, ...poppins(600) }]}>₹{it.price * it.quantity}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.cardFoot}>
                  <Total label="TOTAL PAID:" amount={fo.totalAmount} />
                  <SmallButton icon="fa-solid fa-location-crosshairs" title="Track Order" onPress={() => router.push(`/food/user/orders/${fo.id}`)} />
                </View>
              </Panel>
            ))
          ) : (
            <StateBlock
              style={{ paddingVertical: 56 }}
              icon="fa-solid fa-utensils"
              title="No Food Orders Yet"
              text="Order traditional Dimasa food & bakes."
              actionLabel="Explore Restaurants"
              onAction={() => router.navigate('/food/user')}
            />
          )
        ) : null}

        {activeTab === 'festivals' && festivalBookings.length > 0 ? (
          <>
            <Text style={styles.groupTitle}>FESTIVAL &amp; EVENT PASSES</Text>
            {groupPasses(festivalBookings).map((group) => (
              <Panel key={group.key} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Thumb uri={group.image} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={[dhs.row, { justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }]}>
                      <Text style={[styles.kicker, { flexShrink: 1 }]} numberOfLines={1}>ID: {group.id}</Text>
                      <Status>{group.status}</Status>
                    </View>
                    <Text style={[styles.title, { marginTop: 2 }]} numberOfLines={1}>{group.festivalName}</Text>
                    <Text style={styles.sub}>{group.categoryLabel}</Text>
                  </View>
                </View>
                <Facts
                  items={[
                    ['DATES:', group.dates, { style: { color: tw.gray700 }, wrap: true }],
                    ['PASSES:', `${group.ticketCount} ${group.ticketCount === 1 ? 'Ticket' : 'Tickets'}`, { style: { color: tw.gray700 } }],
                  ]}
                />
                {/* One row per pass: each category is scanned on its own at the gate. */}
                <View style={{ gap: 6 }}>
                  {group.passes.map((pass) => (
                    <View key={pass.id} style={styles.pass}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        {group.passes.length > 1 ? (
                          <Text style={styles.passName} numberOfLines={1}>
                            {pass.ticketCount} × {pass.ticketCategory}
                          </Text>
                        ) : null}
                        <Text style={styles.passCode} numberOfLines={1}>{pass.qrCode || 'Awaiting payment'}</Text>
                      </View>
                      <SmallButton icon="fa-solid fa-qrcode" title="QR" disabled={!pass.qrCode} onPress={() => showToast(`QR Pass ${pass.qrCode} ready for entry gate scan! 🎟️`)} />
                    </View>
                  ))}
                </View>
                <View style={styles.cardFoot}>
                  <Total label="PAID:" amount={group.totalAmount} />
                  <Text style={styles.passTypes}>{group.passes.length > 1 ? `${group.passes.length} pass types · one payment` : ''}</Text>
                </View>
              </Panel>
            ))}
          </>
        ) : null}

        {activeTab === 'tours' && tourBookings.length > 0 ? (
          <>
            <Text style={styles.groupTitle}>GUIDED TOUR PACKAGES</Text>
            {tourBookings.map((tb) => (
              <Panel key={tb.id} style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Thumb uri={tb.image} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={[dhs.row, { justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }]}>
                      <Text style={[styles.kicker, { flexShrink: 1 }]} numberOfLines={1}>ID: {tb.id}</Text>
                      <Status>{tb.status}</Status>
                    </View>
                    <Text style={[styles.title, { marginTop: 2 }]} numberOfLines={1}>{tb.packageTitle}</Text>
                    <Text style={styles.sub}>{tb.duration}</Text>
                  </View>
                </View>
                <Facts
                  items={[
                    ['TRAVEL DATE:', tb.travelDate, { style: { color: tw.gray700 }, wrap: true }],
                    ['TRAVELERS:', tb.travelers, { style: { color: tw.gray700 }, wrap: true }],
                    ['YOUR OPERATOR:', tb.operatorName, { wide: true, style: { color: tw.emerald900 } }],
                    tb.pickupPoint ? ['PICKUP:', tb.pickupPoint, { wide: true, style: { color: tw.gray700 }, wrap: true }] : null,
                  ]}
                />
                <View style={styles.cardFoot}>
                  <View style={{ flex: 1 }}>
                    <Total label="PAID ONLINE:" amount={tb.paidOnline} />
                    {tb.collectedInPerson > 0 ? (
                      <Text style={[styles.due, { color: tw.emerald700 }]}>₹{tb.collectedInPerson.toLocaleString('en-IN')} paid to the operator</Text>
                    ) : tb.balanceDue > 0 ? (
                      <Text style={styles.due}>₹{tb.balanceDue.toLocaleString('en-IN')} due to the operator</Text>
                    ) : null}
                  </View>
                  <SmallButton
                    icon="fa-solid fa-phone"
                    title="Call Operator"
                    onPress={() => (tb.operatorPhone ? openExternal(`tel:${tb.operatorPhone}`) : showToast('No contact number on file for this operator'))}
                  />
                </View>
              </Panel>
            ))}
          </>
        ) : null}

        {(activeTab === 'tours' || activeTab === 'festivals') && (activeTab === 'festivals' ? festivalBookings : tourBookings).length === 0 ? (
          <View style={[dhs.stateCard, { paddingVertical: 56 }]}>
            <Fa name="fa-solid fa-ticket" size={36} color={tw.gray300} />
            <Text style={dhs.stateTitle}>{activeTab === 'festivals' ? 'No Festival Passes Yet' : 'No Tour Bookings Yet'}</Text>
            <Text style={dhs.stateText}>Explore Falcon Festival passes or guided hill treks.</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <GreenButton title="View Festivals" onPress={() => router.navigate('/app/festivals')} style={shadow('sm')} />
              <Press scale={0.96} onPress={() => router.navigate('/app/packages')} style={styles.whiteBtn}>
                <Text style={styles.whiteBtnText}>View Tour Packages</Text>
              </Press>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabStrip: { backgroundColor: '#EDE8DC', borderRadius: 16, borderWidth: 1, borderColor: '#DFD6C4', overflow: 'hidden', ...shadow('xs') },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  tabActive: { backgroundColor: '#fff', borderColor: 'rgba(223,214,196,0.8)', ...shadow('xs') },
  tabText: { fontSize: 11, lineHeight: 16.5, color: tw.stone600, ...poppins(600) },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, borderBottomWidth: 1, borderBottomColor: tw.gray100, paddingBottom: 10 },
  kicker: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: tw.gray400, textTransform: 'uppercase', ...poppins(700) },
  title: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  sub: { fontSize: 12, lineHeight: 16, color: tw.emerald800, ...poppins(600) },
  status: { fontSize: 10, lineHeight: 15, color: tw.emerald800, backgroundColor: tw.emerald100, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', ...poppins(700) },
  facts: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: dh.cream, padding: 10, paddingBottom: 2, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(229,221,195,0.6)' },
  factLabel: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(500) },
  factValue: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(600) },
  item: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(400) },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 },
  totalLabel: { fontSize: 10, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  totalValue: { fontSize: 14, color: tw.gray900, ...montserrat(700) },
  track: { fontSize: 11, lineHeight: 16.5, color: dh.nav, ...poppins(700) },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: dh.nav, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, ...shadow('xs') },
  smallBtnText: { fontSize: 12, lineHeight: 16, color: tw.amber300, ...poppins(600) },
  thumb: { width: 64, height: 64, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: tw.gray100 },
  groupTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray500, paddingHorizontal: 4, ...montserrat(700) },
  pass: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray100, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  passName: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(600) },
  passCode: { fontSize: 10, lineHeight: 15, color: tw.gray400, fontFamily: 'monospace' },
  passTypes: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(400) },
  due: { fontSize: 10, lineHeight: 15, color: tw.amber700, ...poppins(600) },
  whiteBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: dh.border, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, ...shadow('sm') },
  whiteBtnText: { fontSize: 12, lineHeight: 16.8, color: tw.gray800, ...poppins(700) },
});
