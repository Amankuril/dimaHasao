import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Building2, ChevronRight, HelpCircle, ShoppingBag } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { toast } from '../../../lib/notify';
import { readJson, sessionStore } from '../../../lib/storage';
import { navigateTo } from '../../../lib/webRouter';
import { authAPI, orderAPI, restaurantAPI, supportAPI } from '../../../api/food';
import { Button, Card, CardContent, Input, Textarea } from '../../components/cart/ui';
import { F } from '../../components/shell';
import { poppins, shadow, tw } from '../../../theme';

const ORDER_ISSUES = ['Item missing', 'Wrong item', 'Not delivered', 'Payment issue'];
const RESTAURANT_ISSUES = ['Bad service', 'Wrong info', 'Other'];

const statusColors = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'resolved' || s === 'closed') return [tw.green100, tw.green700];
  if (s === 'open') return [tw.amber100, tw.amber700];
  return [tw.slate100, tw.slate700];
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
  return <Input value={value} onChangeText={onChangeText} onFocus={onFocus} onBlur={onBlur} placeholder={placeholder} placeholderTextColor={tw.slate400} style={styles.search} />;
}

function Results({ items, labelOf, onPick, emptyText, keyOf }) {
  return (
    <View style={styles.results}>
      <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          {items.map((it) => (
            <Press key={keyOf(it)} scale={1} onPress={() => onPick(it)} accessibilityLabel={labelOf(it)} style={styles.resultRow}>
              <Text style={styles.resultText}>{labelOf(it)}</Text>
            </Press>
          ))}
          {items.length === 0 ? <Text style={styles.noMatch}>{emptyText}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function SubmitRow({ onSubmit, disabled, submitting, onCancel }) {
  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      <Press
        onPress={onSubmit}
        disabled={disabled}
        scale={0.98}
        accessibilityLabel="Submit Ticket"
        style={[styles.submit, shadow('0 4px 14px rgba(220,38,38,0.25)'), disabled ? { opacity: 0.5 } : null]}
      >
        <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Ticket'}</Text>
      </Press>
      <Button variant="outline" onPress={onCancel} style={styles.cancelBtn}>Cancel</Button>
    </View>
  );
}

/** Port of pages/user/profile/Support.jsx. */
export default function Support() {
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
        <View key={it} style={{ width: '48.5%' }}>
          <Button variant={issueType === it ? 'default' : 'outline'} onPress={() => setIssueType(it)} style={{ width: '100%' }}>{it}</Button>
        </View>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#faf6ed' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Press onPress={handleTopBack} accessibilityLabel="Back" style={[styles.back, shadow('0 2px 10px rgba(0,0,0,0.05)')]}>
            <ArrowLeft size={20} color={tw.slate800} />
          </Press>
          <Text style={styles.h1}>Help & Support</Text>
        </View>

        <Card style={[styles.heroCard, shadow('sm')]}>
          <LinearGradient colors={['rgba(10,77,43,0.05)', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <CardContent style={{ padding: 20 }}>
            <View style={styles.blob} pointerEvents="none" />
            <Text style={styles.heroTitle}>How can we help you?</Text>
            <Text style={styles.heroSub}>Raise a support ticket and track updates seamlessly.</Text>
          </CardContent>
        </Card>

        <Card style={[styles.whiteCard, shadow('sm'), { marginBottom: 12 }]}>
          <CardContent style={{ padding: 16, gap: 16 }}>
            {step === 'pick' ? (
              <View style={{ gap: 12 }}>
                {PICKS.map(({ id, Icon, title, sub }) => (
                  <Press key={id} scale={1} onPress={() => handlePick(id)} accessibilityLabel={title} style={styles.pick}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={styles.pickIcon}>
                        <Icon size={20} color={tw.slate700} />
                      </View>
                      <ChevronRight size={20} color={tw.slate300} />
                    </View>
                    <Text style={styles.pickTitle}>{title}</Text>
                    <Text style={styles.pickSub}>{sub}</Text>
                  </Press>
                ))}
              </View>
            ) : null}

            {step === 'choose_order' ? (
              <View style={{ gap: 16 }}>
                <StepHead title="Order Issue" sub="Select an order below to report your issue" />
                {loadingOrders ? (
                  <Notice>Loading orders...</Notice>
                ) : orders.length > 0 ? (
                  <View style={{ gap: 8 }}>
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
                <View style={styles.goBackRow}>
                  <Button variant="outline" onPress={() => setStep('pick')} style={styles.goBack} textStyle={{ color: tw.slate700, ...poppins(600) }}>Go Back</Button>
                </View>
              </View>
            ) : null}

            {step === 'order_issue' && selectedOrder ? (
              <View style={{ gap: 16 }}>
                <StepHead title="Order Issue Details" sub="What went wrong with your order?" />
                {issueButtons(ORDER_ISSUES)}
                <Textarea placeholder="Describe the issue (optional)" value={description} onChangeText={setDescription} placeholderTextColor={tw.slate400} style={styles.area100} />
                <SubmitRow
                  onSubmit={() => submitTicket({ type: 'order', orderId: selectedOrder._id || selectedOrder.id, issueType, description })}
                  disabled={!issueType || submitting}
                  submitting={submitting}
                  onCancel={() => setStep('pick')}
                />
              </View>
            ) : null}

            {step === 'choose_restaurant' ? (
              <View style={{ gap: 16 }}>
                <StepHead title="Restaurant Issue" sub="Select a restaurant below to report your issue" />
                {loadingRestaurants ? (
                  <Notice>Loading restaurants...</Notice>
                ) : restaurants.length > 0 ? (
                  <View style={{ gap: 8 }}>
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
                <View style={styles.goBackRow}>
                  <Button variant="outline" onPress={() => setStep('pick')} style={styles.goBack} textStyle={{ color: tw.slate700, ...poppins(600) }}>Go Back</Button>
                </View>
              </View>
            ) : null}

            {step === 'restaurant_issue' && selectedRestaurant ? (
              <View style={{ gap: 16 }}>
                <StepHead title="Restaurant Issue Details" sub="What went wrong with the restaurant?" />
                {issueButtons(RESTAURANT_ISSUES)}
                <Textarea placeholder="Describe the issue (optional)" value={description} onChangeText={setDescription} placeholderTextColor={tw.slate400} style={styles.area100} />
                <SubmitRow
                  onSubmit={() => submitTicket({ type: 'restaurant', restaurantId: selectedRestaurant._id || selectedRestaurant.id, issueType, description })}
                  disabled={!issueType || submitting}
                  submitting={submitting}
                  onCancel={() => setStep('pick')}
                />
              </View>
            ) : null}

            {step === 'other_form' ? (
              <View style={{ gap: 16 }}>
                <Text style={styles.otherTitle}>Other Issue Details</Text>
                <Input placeholder="Subject" placeholderTextColor={tw.slate400} value={subject} onChangeText={setSubject} style={styles.search} />
                <Textarea placeholder="Describe your issue" placeholderTextColor={tw.slate400} value={description} onChangeText={setDescription} style={[styles.area100, { minHeight: 120 }]} />
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
          </CardContent>
        </Card>

        <Card style={[styles.whiteCard, shadow('sm')]}>
          <CardContent style={{ padding: 16 }}>
            <View style={styles.ticketHead}>
              <Text style={styles.ticketTitle}>My Tickets</Text>
              <Text style={styles.count}>{tickets.length}</Text>
            </View>
            {loadingTickets ? (
              <Text style={styles.muted}>Loading tickets...</Text>
            ) : tickets.length === 0 ? (
              <Text style={styles.muted}>No tickets yet</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {tickets.map((t, i) => {
                  const [bg, color] = statusColors(t.status);
                  return (
                    <View key={t._id || t.id || i} style={styles.ticket}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ticketLine}>{`#${String(t._id || t.id).slice(-6)} • ${t.type} • ${t.issueType}`}</Text>
                          <Text style={styles.ticketDate}>{new Date(t.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: bg }]}>
                          <Text style={[styles.statusText, { color }]}>{t.status}</Text>
                        </View>
                      </View>
                      {t.adminResponse ? <Text style={styles.reply}>Reply: {t.adminResponse}</Text> : null}
                    </View>
                  );
                })}
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  back: { height: 40, width: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tw.slate100 },
  h1: { marginLeft: 16, fontSize: 20, lineHeight: 28, color: tw.slate900, ...poppins(700) },
  heroCard: { borderRadius: 16, borderColor: 'rgba(10,77,43,0.1)', overflow: 'hidden', marginBottom: 20, backgroundColor: '#fff' },
  blob: { position: 'absolute', top: -40, right: -40, width: 128, height: 128, borderRadius: 64, backgroundColor: F.green, opacity: 0.06 },
  heroTitle: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(700) },
  heroSub: { fontSize: 14, lineHeight: 20, color: tw.slate600, marginTop: 6, ...poppins(400) },
  whiteCard: { backgroundColor: '#fff', borderRadius: 12, borderColor: tw.slate200 },
  pick: { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, borderRadius: 16, padding: 20 },
  pickIcon: { backgroundColor: tw.slate50, borderRadius: 999, padding: 12 },
  pickTitle: { marginTop: 16, fontSize: 16, lineHeight: 24, color: tw.slate900, ...poppins(700) },
  pickSub: { marginTop: 6, fontSize: 14, lineHeight: 22.75, color: tw.slate500, ...poppins(400) },
  stepHead: { borderBottomWidth: 1, borderBottomColor: tw.slate100, paddingBottom: 12, marginBottom: 16 },
  stepTitle: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(700) },
  stepSub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: tw.slate500, ...poppins(400) },
  notice: { backgroundColor: tw.slate50, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100 },
  noticeText: { fontSize: 14, lineHeight: 20, color: tw.slate500, textAlign: 'center', ...poppins(400) },
  search: { height: 48, backgroundColor: tw.slate50, borderColor: tw.slate200, borderRadius: 12, fontSize: 16, color: tw.slate900, marginBottom: 12 },
  results: { borderWidth: 1, borderColor: tw.slate200, borderRadius: 8, padding: 6, backgroundColor: tw.slate50 },
  resultRow: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  resultText: { fontSize: 14, lineHeight: 20, color: tw.slate700, ...poppins(400) },
  noMatch: { fontSize: 14, lineHeight: 20, color: tw.slate500, padding: 12, textAlign: 'center', ...poppins(400) },
  goBackRow: { paddingTop: 16, marginTop: 8, borderTopWidth: 1, borderTopColor: tw.slate100 },
  goBack: { width: '100%', height: 48, borderRadius: 12, borderColor: tw.slate200 },
  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  area100: { minHeight: 100, backgroundColor: tw.slate50, borderColor: tw.slate200, borderRadius: 12, fontSize: 16, lineHeight: 24, padding: 16, color: tw.slate900 },
  submit: { height: 48, borderRadius: 12, backgroundColor: F.green, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) },
  cancelBtn: { height: 48, borderRadius: 12, borderColor: tw.slate200, width: '100%' },
  otherTitle: { fontSize: 16, lineHeight: 24, color: tw.slate900, ...poppins(600) },
  ticketHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  ticketTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) },
  count: { fontSize: 12, lineHeight: 16, color: tw.slate600, backgroundColor: tw.slate100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, overflow: 'hidden', ...poppins(500) },
  muted: { fontSize: 14, lineHeight: 20, color: tw.slate500, ...poppins(400) },
  ticket: { borderWidth: 1, borderColor: tw.slate200, borderRadius: 8, padding: 12, backgroundColor: '#fff' },
  ticketLine: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(600) },
  ticketDate: { fontSize: 12, lineHeight: 16, color: tw.slate500, marginTop: 4, ...poppins(400) },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, lineHeight: 16.5, ...poppins(600) },
  reply: { fontSize: 12, lineHeight: 16, color: tw.slate600, marginTop: 8, ...poppins(400) },
});
