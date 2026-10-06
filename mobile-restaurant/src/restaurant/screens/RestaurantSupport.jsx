import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Send } from 'lucide-react-native';
import { SelectField } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { PrimaryButton } from '../components/ui';
import { useRestaurantSupport } from '../hooks/pages/useRestaurantSupport';

/* getStatusStyle() answers with class names; these are the same three looks. */
const STATUS = {
  resolved: { bg: tw.emerald100, fg: tw.emerald700, border: tw.emerald200 },
  'in-progress': { bg: tw.blue100, fg: tw.blue700, border: tw.blue200 },
  open: { bg: tw.amber100, fg: tw.amber700, border: tw.amber200 },
};

/** Port of Food/pages/restaurant/RestaurantSupport.jsx (/food/restaurant/help-centre/support). */
export default function RestaurantSupport() {
  const insets = useSafeAreaInsets();
  const { goBack, tickets, loading, submitting, statusFilter, setStatusFilter, form, setForm, stats, handleSubmit, CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } = useRestaurantSupport();
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const stat = (label, value, tone) => (
    <View style={[styles.stat, { borderColor: tone.border, backgroundColor: tone.bg }]}>
      <Text style={{ fontSize: 12, lineHeight: 16, color: tone.label, ...poppins(400) }}>{label}</Text>
      <Text style={{ fontSize: 18, lineHeight: 28, color: tone.value, ...poppins(700) }}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tw.slate50 }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press onPress={goBack} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 4 }}>
          <ChevronLeft size={24} color={tw.slate900} />
        </Press>
        <View>
          <Text style={{ fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(700) }} accessibilityRole="header">Support</Text>
          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.slate500, ...poppins(400) }}>Raise issue and track admin response</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 112, gap: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {stat('Total', stats.total, { border: tw.slate200, bg: '#fff', label: tw.slate500, value: tw.slate900 })}
            {stat('Open', stats.open, { border: tw.amber200, bg: tw.amber50, label: tw.amber700, value: tw.amber800 })}
            {stat('In progress', stats.inProgress, { border: tw.blue200, bg: tw.blue50, label: tw.blue700, value: tw.blue800 })}
            {stat('Resolved', stats.resolved, { border: tw.emerald200, bg: tw.emerald50, label: tw.emerald700, value: tw.emerald800 })}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Raise support ticket</Text>
            <SelectField value={form.category} options={CATEGORY_OPTIONS} onChange={set('category')} accessibilityLabel="Category" style={styles.select} textStyle={styles.selectText} />
            <SelectField value={form.priority} options={PRIORITY_OPTIONS} onChange={set('priority')} accessibilityLabel="Priority" style={styles.select} textStyle={styles.selectText} />
            <TextInput value={form.issueType} onChangeText={set('issueType')} placeholder="Issue type (required)" placeholderTextColor={tw.slate400} maxLength={120} style={styles.input} />
            <TextInput value={form.subject} onChangeText={set('subject')} placeholder="Short subject" placeholderTextColor={tw.slate400} maxLength={180} style={styles.input} />
            <TextInput value={form.orderRef} onChangeText={set('orderRef')} placeholder="Order ID (optional)" placeholderTextColor={tw.slate400} maxLength={80} style={styles.input} />
            <TextInput value={form.description} onChangeText={set('description')} placeholder="Describe your issue" placeholderTextColor={tw.slate400} maxLength={1000} multiline textAlignVertical="top" style={[styles.input, { minHeight: 96 }]} />
            <PrimaryButton
              title="Submit Ticket"
              onPress={() => handleSubmit({ preventDefault() {} })}
              loading={submitting}
              style={{ borderRadius: 12, overflow: 'hidden', ...shadow('lg') }}
              textStyle={poppins(700)}
            >
              {submitting ? null : <Send size={16} color="#fff" />}
            </PrimaryButton>
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text style={styles.cardTitle}>My tickets</Text>
              <SelectField
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={setStatusFilter}
                accessibilityLabel="Filter by status"
                style={[styles.select, { paddingHorizontal: 8, paddingVertical: 6, minWidth: 120 }]}
                textStyle={{ fontSize: 12, lineHeight: 16, color: tw.slate900, ...poppins(400) }}
              />
            </View>

            {loading ? (
              <View style={styles.state}>
                <ActivityIndicator size="small" color={tw.slate500} />
                <Text style={styles.stateText}>Loading tickets...</Text>
              </View>
            ) : tickets.length === 0 ? (
              <View style={styles.state}>
                <Text style={styles.stateText}>No support tickets found.</Text>
              </View>
            ) : (
              tickets.map((ticket) => {
                const tone = STATUS[ticket.status] || STATUS.open;
                return (
                  <View key={ticket._id} style={styles.ticket}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Text style={styles.ticketMeta}>#{String(ticket._id).slice(-6)} • {new Date(ticket.createdAt).toLocaleString()}</Text>
                      <Text style={[styles.ticketStatus, { backgroundColor: tone.bg, color: tone.fg, borderColor: tone.border }]}>{ticket.status}</Text>
                    </View>
                    <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(600) }}>{ticket.issueType}</Text>
                    {ticket.subject ? <Text style={styles.ticketLine}>Subject: {ticket.subject}</Text> : null}
                    {ticket.orderRef ? <Text style={styles.ticketLine}>Order: {ticket.orderRef}</Text> : null}
                    {ticket.description ? <Text style={{ fontSize: 14, lineHeight: 20, color: tw.slate700, marginTop: 8, ...poppins(400) }}>{ticket.description}</Text> : null}
                    {ticket.adminResponse ? (
                      <View style={styles.response}>
                        <Text style={{ fontSize: 11, lineHeight: 16, color: tw.blue700, ...poppins(600) }}>ADMIN RESPONSE</Text>
                        <Text style={{ fontSize: 14, lineHeight: 20, color: tw.blue900, marginTop: 4, ...poppins(400) }}>{ticket.adminResponse}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.slate200, paddingHorizontal: 16, paddingBottom: 12 },
  stat: { width: '48.8%', borderRadius: 12, borderWidth: 1, padding: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, padding: 16, gap: 12 },
  cardTitle: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(700) },
  select: { borderRadius: 8, borderWidth: 1, borderColor: tw.slate300, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  selectText: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(400) },
  input: { borderRadius: 8, borderWidth: 1, borderColor: tw.slate300, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: tw.slate900, ...poppins(400) },
  state: { paddingVertical: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stateText: { fontSize: 14, lineHeight: 20, color: tw.slate500, ...poppins(400) },
  ticket: { borderRadius: 12, borderWidth: 1, borderColor: tw.slate200, padding: 12 },
  ticketMeta: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.slate500, ...poppins(600) },
  ticketStatus: { fontSize: 11, lineHeight: 16, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, overflow: 'hidden', textTransform: 'capitalize', ...poppins(600) },
  ticketLine: { fontSize: 12, lineHeight: 16, color: tw.slate600, marginTop: 4, ...poppins(400) },
  response: { marginTop: 12, borderRadius: 8, borderWidth: 1, borderColor: tw.blue200, backgroundColor: tw.blue50, padding: 10 },
});
