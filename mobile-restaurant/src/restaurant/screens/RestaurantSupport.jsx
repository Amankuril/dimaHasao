import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Clock4, Inbox, LifeBuoy, Loader as LoaderIcon, Send } from 'lucide-react-native';
import { Button, Card, EmptyState, SectionHeader, StatusBadge } from '../../components/ds';
import { SelectField } from '../../components/kit';
import { color, radii, space, type } from '../../theme';
import { useRestaurantSupport } from '../hooks/pages/useRestaurantSupport';
import { StatTile, sentenceCase } from './finance/financeUi';
import { Field, Input, Notice, ScreenHeader } from './inventory/partnerKit';

/* getStatusStyle() answers with class names; these are the same three states as tones. */
const STATUS_TONE = { resolved: 'success', 'in-progress': 'info', open: 'warning' };

/** Port of Food/pages/restaurant/RestaurantSupport.jsx (/food/restaurant/help-centre/support). */
export default function RestaurantSupport() {
  const insets = useSafeAreaInsets();
  const { goBack, tickets, loading, submitting, statusFilter, setStatusFilter, form, setForm, stats, handleSubmit, CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } = useRestaurantSupport();
  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <View style={styles.page}>
      <ScreenHeader title="Support" subtitle="Raise issue and track admin response" onBack={goBack} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, { paddingBottom: space.xxxl + insets.bottom }]}>
          <View style={{ gap: space.sm }}>
            <View style={styles.statRow}>
              <StatTile label="Total" value={stats.total} icon={LifeBuoy} />
              <StatTile label="Open" value={stats.open} tone="warning" icon={Clock4} />
            </View>
            <View style={styles.statRow}>
              <StatTile label="In progress" value={stats.inProgress} tone="info" icon={LoaderIcon} />
              <StatTile label="Resolved" value={stats.resolved} tone="success" icon={CheckCircle2} />
            </View>
          </View>

          <View>
            <SectionHeader title="Raise support ticket" />
            <Card style={{ gap: space.lg }}>
              <Field label="Category">
                <SelectField value={form.category} options={CATEGORY_OPTIONS} onChange={set('category')} accessibilityLabel="Category" style={styles.select} textStyle={styles.selectText} chevronColor={color.textMuted} />
              </Field>
              <Field label="Priority">
                <SelectField value={form.priority} options={PRIORITY_OPTIONS} onChange={set('priority')} accessibilityLabel="Priority" style={styles.select} textStyle={styles.selectText} chevronColor={color.textMuted} />
              </Field>
              <Field label="Issue type">
                <Input value={form.issueType} onChangeText={set('issueType')} placeholder="Issue type (required)" accessibilityLabel="Issue type" maxLength={120} />
              </Field>
              <Field label="Subject">
                <Input value={form.subject} onChangeText={set('subject')} placeholder="Short subject" accessibilityLabel="Subject" maxLength={180} />
              </Field>
              <Field label="Order ID" optional>
                <Input value={form.orderRef} onChangeText={set('orderRef')} placeholder="Order ID (optional)" accessibilityLabel="Order ID" maxLength={80} />
              </Field>
              <Field label="Description">
                <Input value={form.description} onChangeText={set('description')} placeholder="Describe your issue" accessibilityLabel="Description" maxLength={1000} multiline textAlignVertical="top" />
              </Field>
              <Button title="Submit ticket" icon={Send} size="lg" loading={submitting} disabled={submitting} onPress={() => handleSubmit({ preventDefault() {} })} />
            </Card>
          </View>

          <View>
            <View style={styles.ticketsHead}>
              <SectionHeader title="My tickets" style={{ marginBottom: 0, flex: 1 }} />
              <SelectField
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={setStatusFilter}
                accessibilityLabel="Filter by status"
                style={[styles.select, styles.filter]}
                textStyle={styles.filterText}
                chevronColor={color.textMuted}
              />
            </View>

            {loading ? (
              <Card style={styles.state}>
                <ActivityIndicator size="small" color={color.primary} />
                <Text style={styles.stateText}>Loading tickets...</Text>
              </Card>
            ) : tickets.length === 0 ? (
              <Card padded={false}>
                <EmptyState icon={Inbox} title="No support tickets found." />
              </Card>
            ) : (
              <View style={{ gap: space.md }}>
                {tickets.map((ticket) => (
                  <Card key={ticket._id} style={{ gap: space.xs }}>
                    <View style={styles.ticketTop}>
                      <Text style={styles.ticketMeta} numberOfLines={1}>#{String(ticket._id).slice(-6)} • {new Date(ticket.createdAt).toLocaleString()}</Text>
                      <StatusBadge label={sentenceCase(ticket.status)} tone={STATUS_TONE[ticket.status] || 'warning'} />
                    </View>
                    <Text style={[type.subheading, { color: color.text, marginTop: space.xs }]}>{ticket.issueType}</Text>
                    {ticket.subject ? <Text style={styles.ticketLine}>Subject: {ticket.subject}</Text> : null}
                    {ticket.orderRef ? <Text style={styles.ticketLine}>Order: {ticket.orderRef}</Text> : null}
                    {ticket.description ? <Text style={[type.body, { color: color.text, marginTop: space.xs }]}>{ticket.description}</Text> : null}
                    {ticket.adminResponse ? (
                      <Notice tone="info" title="Admin response" style={{ marginTop: space.sm }}>
                        {ticket.adminResponse}
                      </Notice>
                    ) : null}
                  </Card>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  scroll: { padding: space.lg, gap: space.xxl },
  statRow: { flexDirection: 'row', gap: space.sm },
  select: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.md, backgroundColor: color.surface, gap: space.sm },
  selectText: { ...type.body, color: color.text },
  ticketsHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  filter: { minHeight: 44, minWidth: 128 },
  filterText: { ...type.label, color: color.text },
  state: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.xxl },
  stateText: { ...type.body, color: color.textMuted },
  ticketTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  ticketMeta: { flex: 1, minWidth: 0, ...type.caption, color: color.textMuted },
  ticketLine: { ...type.small, color: color.textSecondary },
});
