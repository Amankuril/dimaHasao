import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, HelpCircle, LifeBuoy, Search, ShoppingBag } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { toast } from '../../../lib/notify';
import { readJson, sessionStore } from '../../../lib/storage';
import { navigateTo } from '../../../lib/webRouter';
import { authAPI, orderAPI, restaurantAPI, supportAPI } from '../../../api/food';
import { Button, Card, Chip, ListRow, SectionHeader, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { FormField, PageHeader } from '../../components/profile/ProfileChrome';
import { color, radii, space, type } from '../../../theme';

const ORDER_ISSUES = ['Item missing', 'Wrong item', 'Not delivered', 'Payment issue'];
const RESTAURANT_ISSUES = ['Bad service', 'Wrong info', 'Other'];

const statusTone = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'resolved' || s === 'closed') return 'success';
  if (s === 'open') return 'warning';
  return 'neutral';
};

const getOrderLabel = (order) => {
  const restaurantName = order?.restaurantName || order?.restaurantId?.restaurantName || order?.restaurant?.restaurantName || 'Restaurant';
  const dateValue = order?.createdAt || order?.date;
  const dateLabel = dateValue ? new Date(dateValue).toLocaleDateString() : 'No date';
  const amount = order?.pricing?.total ?? order?.total ?? 0;
  return `${restaurantName} • ${dateLabel} • ₹${amount}`;
};

const getRestaurantLabel = (restaurant) => {
  const name = restaurant?.restaurantName || restaurant?.name || 'Restaurant';
  const location = restaurant?.city || restaurant?.area || '';
  return `${name}${location ? ` • ${location}` : ''}`;
};

const PICKS = [
  { id: 'order', Icon: ShoppingBag, title: 'Order Issue', sub: 'Missing item, wrong item, delivery issue' },
  { id: 'restaurant', Icon: Building2, title: 'Restaurant Issue', sub: 'Service, listing info, behavior report' },
  { id: 'other', Icon: HelpCircle, title: 'Other Issue', sub: 'Account, app, payment or general query' },
];

function StepHead({ title, sub }) {
  return (
    <View style={styles.stepHead}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSub}>{sub}</Text>
    </View>
  );
}

function Notice({ children }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

function SearchInput({ value, onChangeText, onFocus, onBlur, placeholder }) {
  return (
    <FormField
      value={value}
      onChangeText={onChangeText}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      accessibilityLabel={placeholder}
      left={<Search size={18} color={color.textMuted} />}
    />
  );
}

function Results({ items, labelOf, onPick, emptyText, keyOf }) {
  return (
    <View style={styles.results}>
      <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {items.map((it) => (
          <Press key={keyOf(it)} scale={1} onPress={() => onPick(it)} accessibilityLabel={labelOf(it)} style={styles.resultRow}>
            <Text style={styles.resultText} numberOfLines={2}>
              {labelOf(it)}
            </Text>
          </Press>
        ))}
        {items.length === 0 ? <Text style={styles.noMatch}>{emptyText}</Text> : null}
      </ScrollView>
    </View>
  );
}

function SubmitRow({ onSubmit, disabled, submitting, onCancel }) {
  return (
    <View style={{ gap: space.md, marginTop: space.sm }}>
      <Button title={submitting ? 'Submitting...' : 'Submit Ticket'} onPress={onSubmit} disabled={disabled} loading={submitting} accessibilityLabel="Submit Ticket" />
      <Button title="Cancel" variant="outline" onPress={onCancel} />
    </View>
  );
}

/** Port of pages/user/profile/Support.jsx. */
export default function Support() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(() => sessionStore.getItem('support_step') || 'pick');
  const [type, setType] = useState(() => sessionStore.getItem('support_type') || '');
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(() => readJson(sessionStore, 'support_selectedOrder', null));
  const [selectedRestaurant, setSelectedRestaurant] = useState(() => readJson(sessionStore, 'support_selectedRestaurant', null));
  const [issueType, setIssueType] = useState(() => sessionStore.getItem('support_issueType') || '');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [orderSearchFocused, setOrderSearchFocused] = useState(false);
  const [restaurantSearchFocused, setRestaurantSearchFocused] = useState(false);

  useEffect(() => {
    sessionStore.setItem('support_step', step);
    sessionStore.setItem('support_type', type);
    sessionStore.setItem('support_issueType', issueType);
    if (selectedOrder) sessionStore.setItem('support_selectedOrder', JSON.stringify(selectedOrder));
    else sessionStore.removeItem('support_selectedOrder');
    if (selectedRestaurant) sessionStore.setItem('support_selectedRestaurant', JSON.stringify(selectedRestaurant));
    else sessionStore.removeItem('support_selectedRestaurant');
  }, [step, type, issueType, selectedOrder, selectedRestaurant]);

  useEffect(() => {
    setLoadingTickets(true);
    authAPI
      .getCurrentUser()
      .catch(() => null)
      .finally(async () => {
        try {
          const res = await supportAPI.getMyTickets();
          setTickets(res?.data?.data?.tickets || res?.data?.tickets || []);
        } catch {
          // keep the empty list
        }
        setLoadingTickets(false);
      });
    // Restored state may need its lists for the current step.
    if (step === 'choose_order' || step === 'order_issue') fetchOrders();
    if (step === 'choose_restaurant' || step === 'restaurant_issue') fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await orderAPI.getOrders({ limit: 10, page: 1 });
      setOrders(res?.data?.data?.orders || res?.data?.orders || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchRestaurants = async () => {
    setLoadingRestaurants(true);
    try {
      const res = await restaurantAPI.getRestaurants({ limit: 20, page: 1 });
      setRestaurants(res?.data?.data?.restaurants || res?.data?.restaurants || []);
    } catch {
      toast.error('Failed to load restaurants');
    } finally {
      setLoadingRestaurants(false);
    }
  };

  const handlePick = (t) => {
    setType(t);
    setOrderSearch('');
    setRestaurantSearch('');
    if (t === 'order') {
      fetchOrders();
      setStep('choose_order');
    } else if (t === 'restaurant') {
      fetchRestaurants();
      setStep('choose_restaurant');
    } else {
      setStep('other_form');
    }
  };

  const submitTicket = async (payload) => {
    setSubmitting(true);
    try {
      const res = await supportAPI.createTicket(payload);
      const data = res?.data;
      if (!data?.success) throw new Error(data?.message || 'Failed');
      toast.success('Ticket created');
      setTickets((prev) => [data?.data?.ticket, ...prev]);
      setStep('pick');
      setType('');
      setSelectedOrder(null);
      setSelectedRestaurant(null);
      setIssueType('');
      setSubject('');
      setDescription('');
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return true;
    const restaurantName = (order?.restaurantName || order?.restaurant?.restaurantName || '').toLowerCase();
    const orderId = String(order?._id || order?.id || '').toLowerCase();
    return restaurantName.includes(q) || orderId.includes(q);
  });

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const q = restaurantSearch.trim().toLowerCase();
    if (!q) return true;
    const name = String(restaurant?.restaurantName || restaurant?.name || '').toLowerCase();
    const city = String(restaurant?.city || restaurant?.area || '').toLowerCase();
    const id = String(restaurant?._id || restaurant?.id || '').toLowerCase();
    return name.includes(q) || city.includes(q) || id.includes(q);
  });

  const handleTopBack = () => {
    if (step === 'pick') navigateTo(-1);
    else if (step === 'order_issue') setStep('choose_order');
    else if (step === 'restaurant_issue') setStep('choose_restaurant');
    else setStep('pick');
  };

  const issueButtons = (list) => (
    <View style={styles.issueGrid}>
      {list.map((it) => (
        <Chip key={it} label={it} selected={issueType === it} onPress={() => setIssueType(it)} style={{ height: 44 }} />
      ))}
    </View>
  );

  const goBackButton = (
    <View style={styles.goBackRow}>
      <Button title="Go Back" variant="outline" onPress={() => setStep('pick')} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageHeader title="Help & Support" onBack={handleTopBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <LifeBuoy size={22} color={color.goldOnDark} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.heroTitle}>How can we help you?</Text>
            <Text style={styles.heroSub}>Raise a support ticket and track updates seamlessly.</Text>
          </View>
        </View>

        {step === 'pick' ? (
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {PICKS.map(({ id, Icon, title, sub }, i) => (
              <ListRow key={id} icon={Icon} title={title} subtitle={sub} onPress={() => handlePick(id)} divider={i < PICKS.length - 1} />
            ))}
          </Card>
        ) : null}

        {step !== 'pick' ? (
          <Card style={{ gap: space.lg }}>
            {step === 'choose_order' ? (
              <View style={{ gap: space.md }}>
                <StepHead title="Order Issue" sub="Select an order below to report your issue" />
                {loadingOrders ? (
                  <Notice>Loading orders...</Notice>
                ) : orders.length > 0 ? (
                  <View style={{ gap: space.sm }}>
                    <SearchInput
                      value={orderSearch}
                      onChangeText={setOrderSearch}
                      onFocus={() => setOrderSearchFocused(true)}
                      onBlur={() => setTimeout(() => setOrderSearchFocused(false), 200)}
                      placeholder="Search order"
                    />
                    {orderSearchFocused && orderSearch.trim().length > 0 ? (
                      <Results
                        items={filteredOrders}
                        keyOf={(o) => o._id || o.id}
                        labelOf={getOrderLabel}
                        emptyText="No matching orders found"
                        onPick={(o) => {
                          setSelectedOrder(o);
                          setStep('order_issue');
                        }}
                      />
                    ) : null}
                  </View>
                ) : (
                  <Notice>No recent orders found</Notice>
                )}
                {goBackButton}
              </View>
            ) : null}

            {step === 'order_issue' && selectedOrder ? (
              <View style={{ gap: space.md }}>
                <StepHead title="Order Issue Details" sub="What went wrong with your order?" />
                {issueButtons(ORDER_ISSUES)}
                <FormField label="Details" placeholder="Describe the issue (optional)" value={description} onChangeText={setDescription} multiline />
                <SubmitRow
                  onSubmit={() => submitTicket({ type: 'order', orderId: selectedOrder._id || selectedOrder.id, issueType, description })}
                  disabled={!issueType || submitting}
                  submitting={submitting}
                  onCancel={() => setStep('pick')}
                />
              </View>
            ) : null}

            {step === 'choose_restaurant' ? (
              <View style={{ gap: space.md }}>
                <StepHead title="Restaurant Issue" sub="Select a restaurant below to report your issue" />
                {loadingRestaurants ? (
                  <Notice>Loading restaurants...</Notice>
                ) : restaurants.length > 0 ? (
                  <View style={{ gap: space.sm }}>
                    <SearchInput
                      value={restaurantSearch}
                      onChangeText={setRestaurantSearch}
                      onFocus={() => setRestaurantSearchFocused(true)}
                      onBlur={() => setTimeout(() => setRestaurantSearchFocused(false), 200)}
                      placeholder="Search restaurant"
                    />
                    {restaurantSearchFocused && restaurantSearch.trim().length > 0 ? (
                      <Results
                        items={filteredRestaurants}
                        keyOf={(r) => r._id || r.id}
                        labelOf={getRestaurantLabel}
                        emptyText="No matching restaurants found"
                        onPick={(r) => {
                          setSelectedRestaurant(r);
                          setStep('restaurant_issue');
                        }}
                      />
                    ) : null}
                  </View>
                ) : (
                  <Notice>No restaurants found</Notice>
                )}
                {goBackButton}
              </View>
            ) : null}

            {step === 'restaurant_issue' && selectedRestaurant ? (
              <View style={{ gap: space.md }}>
                <StepHead title="Restaurant Issue Details" sub="What went wrong with the restaurant?" />
                {issueButtons(RESTAURANT_ISSUES)}
                <FormField label="Details" placeholder="Describe the issue (optional)" value={description} onChangeText={setDescription} multiline />
                <SubmitRow
                  onSubmit={() => submitTicket({ type: 'restaurant', restaurantId: selectedRestaurant._id || selectedRestaurant.id, issueType, description })}
                  disabled={!issueType || submitting}
                  submitting={submitting}
                  onCancel={() => setStep('pick')}
                />
              </View>
            ) : null}

            {step === 'other_form' ? (
              <View style={{ gap: space.md }}>
                <Text style={styles.stepTitle}>Other Issue Details</Text>
                <FormField label="Subject" placeholder="Subject" value={subject} onChangeText={setSubject} />
                <FormField label="Description" placeholder="Describe your issue" value={description} onChangeText={setDescription} multiline inputStyle={{ minHeight: 120 }} />
                <SubmitRow
                  onSubmit={() => submitTicket({ type: 'other', issueType: subject || 'Other', description })}
                  disabled={!subject || submitting}
                  submitting={submitting}
                  onCancel={() => {
                    setSubject('');
                    setDescription('');
                    setStep('pick');
                  }}
                />
              </View>
            ) : null}
          </Card>
        ) : null}

        <View style={{ marginTop: space.md }}>
          <View style={styles.ticketHead}>
            <SectionHeader title="My Tickets" style={{ marginBottom: 0, flexShrink: 1 }} />
            <StatusBadge label={String(tickets.length)} tone="neutral" />
          </View>
          {loadingTickets ? (
            <Text style={styles.muted}>Loading tickets...</Text>
          ) : tickets.length === 0 ? (
            <Text style={styles.muted}>No tickets yet</Text>
          ) : (
            <View style={{ gap: space.sm }}>
              {tickets.map((t, i) => (
                <View key={t._id || t.id || i} style={styles.ticket}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.ticketLine}>{`#${String(t._id || t.id).slice(-6)} • ${t.type} • ${t.issueType}`}</Text>
                      <Text style={styles.ticketDate}>{new Date(t.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <StatusBadge label={String(t.status || '').replace(/^\w/, (c) => c.toUpperCase())} tone={statusTone(t.status)} />
                  </View>
                  {t.adminResponse ? <Text style={styles.reply}>Reply: {t.adminResponse}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radii.lg, backgroundColor: color.primaryDeep },
  heroIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { ...type.subheading, color: color.textInverse },
  heroSub: { ...type.small, color: color.textOnDarkMuted, marginTop: space.xxs },
  stepHead: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, paddingBottom: space.md },
  stepTitle: { ...type.heading, color: color.text },
  stepSub: { marginTop: space.xxs, ...type.small, color: color.textSecondary },
  notice: { backgroundColor: color.surfaceMuted, padding: space.lg, borderRadius: radii.md },
  noticeText: { ...type.body, color: color.textMuted, textAlign: 'center' },
  results: { borderWidth: 1, borderColor: color.border, borderRadius: radii.md, padding: space.xs, backgroundColor: color.surface },
  resultRow: { minHeight: 48, justifyContent: 'center', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radii.sm },
  resultText: { ...type.body, color: color.text },
  noMatch: { ...type.body, color: color.textMuted, padding: space.md, textAlign: 'center' },
  goBackRow: { paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  ticketHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginBottom: space.md },
  muted: { ...type.body, color: color.textMuted },
  ticket: { borderWidth: 1, borderColor: color.border, borderRadius: radii.lg, padding: space.md, backgroundColor: color.surface },
  ticketLine: { ...type.bodyStrong, color: color.text },
  ticketDate: { ...type.caption, color: color.textMuted, marginTop: space.xxs },
  reply: { ...type.small, color: color.textSecondary, marginTop: space.sm },
});
