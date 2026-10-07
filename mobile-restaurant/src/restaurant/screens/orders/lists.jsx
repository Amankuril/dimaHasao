import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Calendar, ChevronRight, Clock, Inbox, MessageSquare, RefreshCw, Search, Users, X } from 'lucide-react-native';
import Img from '../../../components/Img';
import { Press } from '../../../components/ui';
import { Button, EmptyState, StatusBadge, formatINR } from '../../../components/ds';
import { color, elevation, radii, space, type as t } from '../../../theme';
import { useAllOrders } from '../../hooks/pages/orders/useAllOrders';
import { useCancelledOrders } from '../../hooks/pages/orders/useCancelledOrders';
import { useCompletedOrders } from '../../hooks/pages/orders/useCompletedOrders';
import { useOutForDeliveryOrders } from '../../hooks/pages/orders/useOutForDeliveryOrders';
import { usePreparingOrders } from '../../hooks/pages/orders/usePreparingOrders';
import { useReadyOrders } from '../../hooks/pages/orders/useReadyOrders';
import { useTableBookings } from '../../hooks/pages/orders/useTableBookings';
import { useTakeawayOrders } from '../../hooks/pages/orders/useTakeawayOrders';
import { OrderCard, orderTypeMeta } from './parts';

/*
 * The order lists of Food/pages/restaurant/OrdersMain.jsx, one per filter tab. Each owns its fetching through its generated hook.
 * They render inside OrdersMain's ScrollView (which also carries the swipe-to-change-tab handlers), so they map rather than nest a FlatList.
 */

function ListFrame({ title, right, loading, empty, children }) {
  return (
    <View style={styles.frame}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {loading ? <ActivityIndicator size="small" color={color.primary} /> : right}
      </View>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={color.primary} />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      ) : empty ? (
        <EmptyState icon={Inbox} title={empty} style={styles.emptyCard} />
      ) : (
        children
      )}
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
  const typeMeta = orderTypeMeta(order.type);
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
        {order.photoUrl ? (
          <Img source={{ uri: order.photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={order.photoAlt} />
        ) : (
          <typeMeta.icon size={20} color={color.textDisabled} />
        )}
      </View>
      <View style={styles.historyBody}>
        <View style={styles.historyTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.historyId} numberOfLines={1}>
              Order #{order.orderId}
            </Text>
            <Text style={styles.historyCustomer} numberOfLines={1}>
              {order.customerName}
            </Text>
          </View>
          <StatusBadge label={badge.label} tone={badge.tone} />
        </View>
        <Text style={styles.historyItems} numberOfLines={2}>
          {order.itemsSummary}
        </Text>
        {reason ? (
          <Text style={styles.historyReason} numberOfLines={2}>
            Reason: {reason}
          </Text>
        ) : null}
        <View style={styles.historyFoot}>
          <Text style={styles.historyMeta} numberOfLines={1}>
            {typeMeta.label} · {date}
          </Text>
          <Text style={styles.historyAmount}>{formatINR(order.amount, { decimals: 2 })}</Text>
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
          badge={{ label: order.type === 'Takeaway' ? 'Picked up' : 'Delivered', tone: 'success' }}
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
            badge={{ label: byUser ? 'Cancelled by user' : order.cancelledBy === 'restaurant' ? 'Cancelled by restaurant' : 'Cancelled', tone: 'danger' }}
            onSelectOrder={props.onSelectOrder}
          />
        );
      })}
    </ListFrame>
  );
}

const BOOKING_STATUS = {
  pending: { tone: 'primary', text: 'Approval required' },
  confirmed: { tone: 'info', text: 'Confirmed' },
  'checked-in': { tone: 'info', text: 'Checked in' },
  completed: { tone: 'success', text: 'Completed' },
  cancelled: { tone: 'danger', text: 'Cancelled' },
};

const bookingStatus = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'accepted') return BOOKING_STATUS.confirmed;
  return BOOKING_STATUS[s] || BOOKING_STATUS.cancelled;
};

function Fact({ icon: Icon, children }) {
  return (
    <View style={styles.fact}>
      <Icon size={16} color={color.textMuted} />
      <Text style={styles.factText}>{children}</Text>
    </View>
  );
}

export function TableBookings() {
  const { bookings, loading, handleStatusUpdate, handleRefresh } = useTableBookings();
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={color.primary} />
        <Text style={styles.loadingText}>Loading bookings…</Text>
      </View>
    );
  }
  return (
    <View style={styles.frame}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          Dining bookings <Text style={styles.count}>({bookings.length})</Text>
        </Text>
        <Button title="Refresh" icon={RefreshCw} variant="ghost" size="sm" fullWidth={false} onPress={handleRefresh} style={{ height: 44 }} />
      </View>

      {bookings.length === 0 ? (
        <EmptyState icon={Calendar} title="No dining bookings yet" style={styles.emptyCard} />
      ) : (
        <View style={{ gap: space.md }}>
          {bookings.map((booking) => {
            const tone = bookingStatus(booking.status);
            return (
              <View key={booking._id} style={styles.booking}>
                <View style={styles.bookingTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.bookingName} numberOfLines={1}>
                      {booking.user?.name}
                    </Text>
                    <Text style={styles.bookingPhone}>{booking.user?.phone || 'No phone'}</Text>
                  </View>
                  <StatusBadge label={tone.text} tone={tone.tone} />
                </View>

                <View style={styles.bookingFacts}>
                  <Fact icon={Calendar}>{new Date(booking.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Fact>
                  <Fact icon={Clock}>{booking.timeSlot}</Fact>
                  <Fact icon={Users}>{booking.guests} guests</Fact>
                </View>

                {booking.specialRequest ? (
                  <View style={styles.request}>
                    <MessageSquare size={14} color={color.info} style={{ marginTop: 3 }} />
                    <Text style={styles.requestText} numberOfLines={2}>
                      {booking.specialRequest}
                    </Text>
                  </View>
                ) : null}

                {String(booking.status || '').toLowerCase() === 'pending' ? (
                  <View style={styles.bookingActions}>
                    <Button title="Decline" icon={X} variant="dangerSoft" onPress={() => handleStatusUpdate(booking._id, 'cancelled')} style={{ flex: 1 }} />
                    <Button title="Accept" onPress={() => handleStatusUpdate(booking._id, 'accepted')} style={{ flex: 1 }} />
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
        <Button
          title="Full history"
          iconRight={ChevronRight}
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => state.navigate('/food/restaurant/orders/all', { state: { from: '/food/restaurant' } })}
          style={{ height: 44, paddingHorizontal: space.sm }}
        />
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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={color.primary} />
        <Text style={styles.loadingText}>Searching for &quot;{query}&quot;…</Text>
      </View>
    );
  }
  const transformed = (results || []).map(transformOrderForList);
  return (
    <View style={styles.frame}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
          Results for &quot;{query}&quot; <Text style={styles.count}>({transformed.length})</Text>
        </Text>
      </View>
      {transformed.length === 0 ? (
        <EmptyState icon={Search} title="No results found" message="Try searching for a different order ID or customer name" style={styles.emptyCard} />
      ) : (
        transformed.map((order) => <OrderCard key={order.orderId || order.mongoId} {...order} onSelect={onSelectOrder} onVerifyTakeaway={onVerifyTakeaway} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { paddingTop: space.sm, paddingBottom: space.xxl },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, minHeight: 44, marginBottom: space.sm },
  title: { flex: 1, ...t.subheading, color: color.text },
  count: { ...t.small, color: color.textMuted },
  loading: { alignItems: 'center', gap: space.md, paddingVertical: space.xxxl + space.lg },
  loadingText: { ...t.body, color: color.textMuted, textAlign: 'center' },
  emptyCard: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, paddingVertical: space.xxxl },

  history: { flexDirection: 'row', gap: space.md, backgroundColor: color.surface, borderRadius: radii.lg, padding: space.md + 2, marginBottom: space.md, borderWidth: 1, borderColor: color.border, ...elevation.card },
  historyPhoto: { width: 56, height: 56, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  historyBody: { flex: 1, minWidth: 0, gap: space.xs },
  historyTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.sm },
  historyId: { ...t.bodyStrong, color: color.text },
  historyCustomer: { ...t.small, color: color.textSecondary },
  historyItems: { ...t.small, color: color.text },
  historyReason: { ...t.small, color: color.danger },
  historyFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginTop: space.xs },
  historyMeta: { flex: 1, ...t.caption, color: color.textMuted },
  historyAmount: { ...t.bodyStrong, color: color.text },

  booking: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: color.border, ...elevation.card },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  bookingName: { ...t.subheading, color: color.text },
  bookingPhone: { ...t.small, color: color.textMuted },
  bookingFacts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.lg, rowGap: space.sm, backgroundColor: color.surfaceMuted, padding: space.md, borderRadius: radii.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  factText: { ...t.label, color: color.text },
  request: { padding: space.sm + 2, flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, backgroundColor: color.infoSoft, borderRadius: radii.md },
  requestText: { flex: 1, ...t.small, color: color.info },
  bookingActions: { flexDirection: 'row', gap: space.sm },
});
