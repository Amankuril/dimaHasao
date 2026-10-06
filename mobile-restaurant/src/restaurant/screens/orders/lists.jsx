import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, ChevronRight, Clock, MessageSquare, Search, Users } from 'lucide-react-native';
import Img from '../../../components/Img';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';
import { useAllOrders } from '../../hooks/pages/orders/useAllOrders';
import { useCancelledOrders } from '../../hooks/pages/orders/useCancelledOrders';
import { useCompletedOrders } from '../../hooks/pages/orders/useCompletedOrders';
import { useOutForDeliveryOrders } from '../../hooks/pages/orders/useOutForDeliveryOrders';
import { usePreparingOrders } from '../../hooks/pages/orders/usePreparingOrders';
import { useReadyOrders } from '../../hooks/pages/orders/useReadyOrders';
import { useTableBookings } from '../../hooks/pages/orders/useTableBookings';
import { useTakeawayOrders } from '../../hooks/pages/orders/useTakeawayOrders';
import { RT, RT_GRADIENT } from '../../theme';
import { BRAND, OrderCard } from './parts';

/* The order lists of Food/pages/restaurant/OrdersMain.jsx, one per filter tab. Each owns its fetching through its generated hook. */

function ListFrame({ title, right, loading, empty, children }) {
  return (
    <View style={styles.frame}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {loading ? <ActivityIndicator size="small" color={tw.gray500} /> : right}
      </View>
      {loading ? <Text style={styles.emptyText}>Loading...</Text> : empty ? <Text style={styles.emptyText}>{empty}</Text> : children}
    </View>
  );
}

const count = (text) => <Text style={styles.count}>{text}</Text>;

const remainingEta = (order, currentTime) => {
  const remainingMinutes = Math.ceil((order.initialETA * 60000 - (currentTime - order.preparingTimestamp)) / 60000);
  return remainingMinutes <= 0 ? '0 mins' : `${remainingMinutes} mins`;
};

const dateLabel = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

/** The compact row the Completed and Cancelled tabs draw (not the OrderCard). */
function HistoryRow({ order, date, status, badge, reason, onSelectOrder }) {
  return (
    <Press
      scale={1}
      onPress={() =>
        onSelectOrder?.({ orderId: order.orderId, status, customerName: order.customerName, type: order.type, tableOrToken: order.tableOrToken, timePlaced: date, itemsSummary: order.itemsSummary, paymentMethod: order.paymentMethod })
      }
      accessibilityLabel={`Order ${order.orderId}, ${badge.label}`}
      style={styles.history}
    >
      <View style={styles.historyPhoto}>
        {order.photoUrl ? <Img source={{ uri: order.photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={styles.historyAlt}>{order.photoAlt}</Text>}
      </View>
      <View style={{ flex: 1, minHeight: 80, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.historyId}>Order #{order.orderId}</Text>
            <Text style={styles.historyCustomer}>{order.customerName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[styles.historyBadge, { borderColor: badge.border, backgroundColor: badge.bg }]}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: badge.dot }} />
              <Text style={[styles.historyBadgeText, { color: badge.fg }]}>{badge.label}</Text>
            </View>
            <Text style={styles.historyDate}>{date}</Text>
          </View>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={styles.historyItems} numberOfLines={1}>{order.itemsSummary}</Text>
          {reason ? <Text style={styles.historyReason} numberOfLines={1}>Reason: {reason}</Text> : null}
        </View>
        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <Text style={styles.historyMeta}>{order.type}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={styles.historyMeta}>Amount</Text>
            <Text style={styles.historyAmount}>₹{Number(order.amount || 0).toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </Press>
  );
}

export function CompletedOrders(props) {
  const { orders, loading } = useCompletedOrders(props);
  return (
    <ListFrame title="Completed orders" loading={loading} right={count(`${orders.length} total`)} empty={orders.length === 0 ? 'No completed orders yet' : null}>
      {orders.map((order) => (
        <HistoryRow
          key={order.orderId || order.mongoId}
          order={order}
          date={dateLabel(order.deliveredAt)}
          status="Delivered"
          badge={{ label: order.type === 'Takeaway' ? 'Picked Up' : 'Delivered', border: tw.emerald200, bg: tw.emerald50, fg: tw.emerald600, dot: tw.emerald500 }}
          onSelectOrder={props.onSelectOrder}
        />
      ))}
    </ListFrame>
  );
}

export function CancelledOrders(props) {
  const { orders, loading } = useCancelledOrders(props);
  return (
    <ListFrame title="Cancelled orders" loading={loading} right={count(`${orders.length} total`)} empty={orders.length === 0 ? 'No cancelled orders yet' : null}>
      {orders.map((order) => {
        const byUser = order.cancelledBy === 'user';
        return (
          <HistoryRow
            key={order.orderId || order.mongoId}
            order={order}
            date={dateLabel(order.cancelledAt)}
            status="Cancelled"
            reason={order.cancellationReason}
            badge={
              byUser
                ? // orange-* utilities are repainted by the restaurant theme
                  { label: 'Cancelled by User', border: RT.accentBorder, bg: RT.primarySoft, fg: RT.accent, dot: RT.accent }
                : { label: order.cancelledBy === 'restaurant' ? 'Cancelled by Restaurant' : 'Cancelled', border: tw.rose200, bg: tw.rose50, fg: tw.rose600, dot: tw.rose500 }
            }
            onSelectOrder={props.onSelectOrder}
          />
        );
      })}
    </ListFrame>
  );
}

const BOOKING_STATUS = {
  pending: { color: '#0A4D2B', backgroundColor: '#EEF5F0', borderColor: '#FBCFE8', text: 'APPROVAL REQ' },
  confirmed: { color: '#15803D', backgroundColor: '#DCFCE7', borderColor: '#BBF7D0', text: 'CONFIRMED' },
  'checked-in': { color: '#F97316', backgroundColor: '#FFF7ED', borderColor: '#FFEDD5', text: 'CHECKED-IN' },
  completed: { color: '#3B82F6', backgroundColor: '#EFF6FF', borderColor: '#DBEAFE', text: 'COMPLETED' },
  cancelled: { color: '#B91C1C', backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', text: 'CANCELLED' },
};

const bookingStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'accepted') return BOOKING_STATUS.confirmed;
  return BOOKING_STATUS[s] || BOOKING_STATUS.cancelled;
};

export function TableBookings() {
  const { bookings, loading, handleStatusUpdate, handleRefresh } = useTableBookings();
  if (loading) return <Text style={[styles.emptyText, { paddingVertical: 40, color: tw.gray400 }]}>Loading bookings...</Text>;
  return (
    <View style={[styles.frame, { paddingHorizontal: 4 }]}>
      <View style={[styles.head, { marginBottom: 16, paddingHorizontal: 4 }]}>
        <Text style={styles.title} accessibilityRole="header">Dining Bookings</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Press onPress={handleRefresh} hitSlop={10}>
            <Text style={styles.refresh}>REFRESH</Text>
          </Press>
          <Text style={[styles.count, poppins(500)]}>({bookings.length})</Text>
        </View>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.bookingEmpty}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray400, ...poppins(400) }}>No dining bookings yet</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {bookings.map((booking) => {
            const tone = bookingStatus(booking.status);
            return (
              <View key={booking._id} style={styles.booking}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingName}>{booking.user?.name}</Text>
                    <Text style={styles.bookingPhone}>{booking.user?.phone || 'No phone'}</Text>
                  </View>
                  <Text style={[styles.bookingBadge, { color: tone.color, backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>{tone.text}</Text>
                </View>

                <View style={styles.bookingFacts}>
                  <View style={styles.fact}>
                    <Calendar size={14} color={tw.gray400} />
                    <Text style={styles.factText}>{new Date(booking.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
                  </View>
                  <View style={styles.fact}>
                    <Clock size={14} color={tw.gray400} />
                    <Text style={styles.factText}>{booking.timeSlot}</Text>
                  </View>
                  <View style={styles.fact}>
                    <Users size={14} color={tw.gray400} />
                    <Text style={styles.factText}>{booking.guests} Guests</Text>
                  </View>
                </View>

                {booking.specialRequest ? (
                  <View style={styles.request}>
                    <MessageSquare size={12} color={tw.blue700} style={{ marginTop: 2 }} />
                    <Text style={styles.requestText} numberOfLines={2}>{booking.specialRequest}</Text>
                  </View>
                ) : null}

                {String(booking.status || '').toLowerCase() === 'pending' ? (
                  <View style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
                    <Press onPress={() => handleStatusUpdate(booking._id, 'accepted')} style={{ flex: 1 }}>
                      <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.accept}>
                        <Text style={styles.acceptText}>ACCEPT</Text>
                      </LinearGradient>
                    </Press>
                    <Press onPress={() => handleStatusUpdate(booking._id, 'cancelled')} style={styles.decline}>
                      <Text style={styles.declineText}>DECLINE</Text>
                    </Press>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** "All orders" and "Takeaway orders" share everything but the title, the empty text and the history link. */
function ActiveOrders({ state, title, emptyText, right, onSelectOrder, onCancel, onVerifyTakeaway }) {
  const { orders, loading, currentTime, markingReadyOrderIds, handleMarkReady } = state;
  return (
    <ListFrame
      title={
        <>
          {title} <Text style={styles.count}>({orders.length})</Text>
        </>
      }
      loading={loading}
      right={right}
      empty={orders.length === 0 ? emptyText : null}
    >
      {orders.map((order) => {
        const preparing = String(order.status || '').toLowerCase() === 'preparing';
        return (
          <OrderCard
            key={order.orderId || order.mongoId}
            {...order}
            eta={preparing && order.preparingTimestamp ? remainingEta(order, currentTime) : order.eta}
            onSelect={onSelectOrder}
            onCancel={preparing ? onCancel : undefined}
            onMarkReady={preparing ? handleMarkReady : undefined}
            isMarkingReady={Boolean(markingReadyOrderIds[order.mongoId || order.orderId])}
            onVerifyTakeaway={onVerifyTakeaway}
          />
        );
      })}
    </ListFrame>
  );
}

export function AllOrders(props) {
  const state = useAllOrders(props);
  return (
    <ActiveOrders
      {...props}
      state={state}
      title="All orders"
      emptyText="No orders found"
      right={
        <Press onPress={() => state.navigate('/food/restaurant/orders/all', { state: { from: '/food/restaurant' } })} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.history_link}>Full History</Text>
          <ChevronRight size={12} color={BRAND} strokeWidth={3} />
        </Press>
      }
    />
  );
}

export function TakeawayOrders(props) {
  const state = useTakeawayOrders(props);
  return <ActiveOrders {...props} state={state} title="Takeaway orders" emptyText="No takeaway orders found" right={null} />;
}

export function PreparingOrders(props) {
  const { orders, loading, currentTime, markingReadyOrderIds, handleMarkReady } = usePreparingOrders(props);
  return (
    <ListFrame title="Preparing orders" loading={loading} right={count(`${orders.length} active`)} empty={orders.length === 0 ? 'No orders in preparation' : null}>
      {orders.map((order) => (
        <OrderCard
          key={order.orderId || order.mongoId}
          orderId={order.orderId}
          mongoId={order.mongoId}
          status={order.status}
          customerName={order.customerName}
          type={order.type}
          tableOrToken={order.tableOrToken}
          timePlaced={order.timePlaced}
          eta={remainingEta(order, currentTime)}
          itemsSummary={order.itemsSummary}
          photoUrl={order.photoUrl}
          photoAlt={order.photoAlt}
          paymentMethod={order.paymentMethod}
          deliveryPartnerId={order.deliveryPartnerId}
          dispatchStatus={order.dispatchStatus}
          onSelect={props.onSelectOrder}
          onCancel={props.onCancel}
          onMarkReady={handleMarkReady}
          isMarkingReady={Boolean(markingReadyOrderIds[order.mongoId || order.orderId])}
        />
      ))}
    </ListFrame>
  );
}

export function ReadyOrders(props) {
  const { orders, loading } = useReadyOrders(props);
  return (
    <ListFrame title="Ready for pickup" loading={loading} right={count(`${orders.length} active`)} empty={orders.length === 0 ? 'No orders ready for pickup' : null}>
      {orders.map((order) => (
        <OrderCard key={order.orderId || order.mongoId} {...order} onSelect={props.onSelectOrder} onVerifyTakeaway={props.onVerifyTakeaway} />
      ))}
    </ListFrame>
  );
}

export function OutForDeliveryOrders(props) {
  const { orders, loading } = useOutForDeliveryOrders(props);
  return (
    <ListFrame title="Out for delivery" loading={loading} right={count(`${orders.length} active`)} empty={orders.length === 0 ? 'No orders out for delivery' : null}>
      {orders.map((order) => (
        <OrderCard key={order.orderId || order.mongoId} {...order} onSelect={props.onSelectOrder} />
      ))}
    </ListFrame>
  );
}

export function SearchResults({ query, results, isLoading, onSelectOrder, onVerifyTakeaway, transformOrderForList }) {
  if (isLoading) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <ActivityIndicator size="large" color={RT.accent} style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', ...poppins(400) }}>Searching for &quot;{query}&quot;...</Text>
      </View>
    );
  }
  const transformed = (results || []).map(transformOrderForList);
  return (
    <View style={styles.frame}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Text style={styles.title}>Search results for</Text>
        <Text style={styles.query}>&quot;{query}&quot;</Text>
        <Text style={[styles.count, poppins(500)]}>({transformed.length})</Text>
      </View>
      {transformed.length === 0 ? (
        <View style={styles.noResults}>
          <View style={styles.noResultsIcon}>
            <Search size={32} color={tw.gray300} />
          </View>
          <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 4, ...poppins(700) }}>No results found</Text>
          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, textAlign: 'center', ...poppins(400) }}>Try searching for a different order ID or customer name</Text>
        </View>
      ) : (
        transformed.map((order) => <OrderCard key={order.orderId || order.mongoId} {...order} onSelect={onSelectOrder} onVerifyTakeaway={onVerifyTakeaway} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { paddingTop: 16, paddingBottom: 24 },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 16, lineHeight: 24, color: '#000', ...poppins(600) },
  count: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  emptyText: { textAlign: 'center', paddingVertical: 32, fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  history_link: { fontSize: 12, lineHeight: 16, color: BRAND, ...poppins(700) },
  history: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  historyPhoto: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  historyAlt: { fontSize: 9, lineHeight: 11, color: tw.gray400, textAlign: 'center', paddingHorizontal: 4, ...poppins(500) },
  historyId: { fontSize: 13, lineHeight: 15, color: tw.slate900, ...poppins(700) },
  historyCustomer: { fontSize: 10, lineHeight: 15, color: tw.gray500, marginTop: 4, textTransform: 'capitalize', ...poppins(500) },
  historyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  historyBadgeText: { fontSize: 9, lineHeight: 14, ...poppins(700) },
  historyDate: { fontSize: 9, lineHeight: 14, color: tw.gray400, ...poppins(500) },
  historyItems: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  historyReason: { fontSize: 10, lineHeight: 15, color: BRAND, marginTop: 4, ...poppins(400) },
  historyMeta: { fontSize: 11, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  historyAmount: { fontSize: 12, lineHeight: 16, color: '#000', ...poppins(500) },
  refresh: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: RT.accent, ...poppins(800) },
  bookingEmpty: { alignItems: 'center', paddingVertical: 48, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.gray200 },
  booking: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.gray200, ...shadow('sm') },
  bookingName: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  bookingPhone: { fontSize: 11, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  bookingBadge: { fontSize: 10, lineHeight: 15, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, overflow: 'hidden', ...poppins(700) },
  bookingFacts: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: tw.gray50, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: tw.gray100 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factText: { fontSize: 11, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  request: { marginTop: 12, padding: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 4, backgroundColor: 'rgba(239,246,255,0.5)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(219,234,254,0.5)' },
  requestText: { flex: 1, fontSize: 10, lineHeight: 15, color: tw.blue700, fontStyle: 'italic', ...poppins(400) },
  accept: { paddingVertical: 8, borderRadius: 12, alignItems: 'center', ...shadow('sm') },
  acceptText: { fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: '#fff', ...poppins(800) },
  decline: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: tw.rose200 },
  declineText: { fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: tw.slate600, ...poppins(800) },
  query: { fontSize: 14, lineHeight: 20, color: tw.gray700, fontStyle: 'italic', backgroundColor: tw.gray200, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', ...poppins(400) },
  noResults: { backgroundColor: '#fff', borderRadius: 16, padding: 40, alignItems: 'center', ...shadow('sm') },
  noResultsIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});
