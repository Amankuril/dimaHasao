import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Check, ChevronDown, ChevronRight, Headset, Plus, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { Button, Card, EmptyState, IconButton, SegmentedControl, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { Field, LoadingState, PageTitle, sentence, useNavPad } from '../account/ui';
import { supportTicketService } from '../services/supportTicketService';

/** Ticket status → DESIGN_SYSTEM tone (pending = warning, assigned = info, closed = success). */
export const STATUS_STYLES = {
  pending: { tone: 'warning', label: 'Pending' },
  assigned: { tone: 'info', label: 'Assigned' },
  closed: { tone: 'success', label: 'Closed' },
};
const TABS = ['All', 'Open', 'Resolved'];

/** Port of Taxi/modules/user/pages/support/SupportTickets.jsx (/taxi/user/support/tickets). */
export default function SupportTickets() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const navigate = useNavigate();
  const bottomPad = useNavPad(space.xxl);
  const [tickets, setTickets] = useState([]);
  const [titleOptions, setTitleOptions] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [showTitles, setShowTitles] = useState(false);
  const [titleId, setTitleId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDesc] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [titlesResponse, ticketsResponse] = await Promise.all([supportTicketService.getTitles('user'), supportTicketService.listMyTickets({ page: 1, limit: 100 })]);
        if (!active) return;
        setTitleOptions(titlesResponse?.data?.results || []);
        setTickets(ticketsResponse?.data?.results || []);
      } catch (apiError) {
        if (active) setError(apiError?.message || 'Unable to load support data');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () => tickets.filter((ticket) => (activeTab === 'All' ? true : activeTab === 'Open' ? ['pending', 'assigned'].includes(ticket.status) : ticket.status === 'closed')),
    [tickets, activeTab],
  );

  const handleSubmit = async () => {
    if (submitting) return;
    const e = {};
    if (!titleId && !customTitle.trim()) e.title = 'Select title or write custom title';
    if (!description.trim()) e.description = 'Description is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    setError('');
    try {
      const created = await supportTicketService.createTicket({ titleId: titleId || undefined, title: customTitle || undefined, description, message: description });
      const newTicket = created?.data;
      if (newTicket) setTickets((prev) => [newTicket, ...prev]);
      setTitleId('');
      setCustomTitle('');
      setDesc('');
      setErrors({});
      setShowForm(false);
    } catch (apiError) {
      setError(apiError?.message || 'Unable to raise support ticket');
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };
  const selectedTitle = titleOptions.find((o) => String(o.id) === String(titleId))?.title;

  const renderTicket = ({ item: t }) => {
    const st = STATUS_STYLES[t.status] || STATUS_STYLES.pending;
    return (
      <Card onPress={() => navigate(`/taxi/user/support/ticket/${t.ticketCode}`, { state: { ticket: t } })} accessibilityLabel={`${t.title}, ${t.status}`} style={styles.ticket}>
        <View style={styles.ticketIcon}>
          <Headset size={18} color={color.primary} />
        </View>
        <View style={styles.grow}>
          <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={2}>{t.title}</Text>
          <Text style={[type.caption, { color: color.textMuted }]} numberOfLines={1}>
            {sentence(t.supportType)} · {new Date(t.updatedAt).toLocaleString('en-IN')}
          </Text>
          <StatusBadge label={STATUS_STYLES[t.status] ? st.label : sentence(t.status || 'pending')} tone={st.tone} style={{ marginTop: space.xs }} />
        </View>
        <ChevronRight size={20} color={color.textDisabled} />
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <PageTitle
        title="Support tickets"
        subtitle="Help center"
        onBack={() => navigate(-1)}
        right={<IconButton icon={Plus} label="New support ticket" variant="solid" onPress={() => setShowForm(true)} />}
      />
      <View style={styles.tabs}>
        <SegmentedControl options={TABS.map((tab) => ({ value: tab, label: tab }))} value={activeTab} onChange={setActiveTab} />
      </View>

      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(t, i) => String(t.id || t.ticketCode || i)}
        renderItem={renderTicket}
        ListHeaderComponent={
          error ? (
            <View style={styles.error} accessibilityRole="alert">
              <AlertCircle size={18} color={color.danger} />
              <Text style={[type.small, styles.grow, { color: color.danger }]}>{error}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading tickets" />
          ) : (
            <EmptyState icon={Headset} title="No tickets yet" message="Raise a ticket and our team will get back to you." actionLabel="New ticket" onAction={() => setShowForm(true)} />
          )
        }
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      />

      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} backdrop={color.overlay} spring={{ stiffness: 320, damping: 26 }} panelStyle={[styles.sheet, { maxHeight: height * 0.9 }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <Text style={[type.heading, styles.grow, { color: color.text }]} accessibilityRole="header">New ticket</Text>
            <IconButton icon={X} label="Close" variant="soft" onPress={() => setShowForm(false)} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.form, { paddingBottom: space.xxl + insets.bottom }]}>
            <View style={{ gap: space.xs + 2 }}>
              <Text style={[type.label, { color: color.text }]}>Ticket title</Text>
              <Press scale={1} onPress={() => setShowTitles((v) => !v)} accessibilityRole="combobox" accessibilityState={{ expanded: showTitles }} accessibilityLabel={`Ticket title, ${selectedTitle || 'not selected'}`} style={[styles.select, showTitles && { borderColor: color.primary }]}>
                <Text style={[type.body, styles.grow, { color: selectedTitle ? color.text : color.textDisabled }]} numberOfLines={1}>{selectedTitle || 'Select title'}</Text>
                <ChevronDown size={18} color={color.textMuted} />
              </Press>
              {showTitles ? (
                <View style={styles.options}>
                  {[{ id: '', title: 'Select title' }, ...titleOptions].map((option) => {
                    const on = String(option.id) === String(titleId);
                    return (
                      <Press
                        key={option.id || 'none'}
                        scale={1}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        onPress={() => {
                          setTitleId(option.id);
                          setErrors((prev) => ({ ...prev, title: '' }));
                          setShowTitles(false);
                        }}
                        style={[styles.option, on && option.id ? { backgroundColor: color.primarySoft } : null]}
                      >
                        <Text style={[type.body, styles.grow, { color: option.id ? color.text : color.textMuted }]}>{option.title}</Text>
                        {on && option.id ? <Check size={16} color={color.primary} strokeWidth={3} /> : null}
                      </Press>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <Field
              label="Or custom title"
              value={customTitle}
              onChangeText={(text) => {
                setCustomTitle(text);
                setErrors((p) => ({ ...p, title: '' }));
              }}
              placeholder="Write custom title if not listed"
              returnKeyType="next"
              error={errors.title || undefined}
            />

            <Field
              label="Description"
              value={description}
              onChangeText={(text) => {
                setDesc(text);
                setErrors((p) => ({ ...p, description: '' }));
              }}
              placeholder="Describe your issue in detail..."
              multiline
              error={errors.description || undefined}
            />

            <Button title="Submit ticket" size="lg" loading={submitting} disabled={submitting} onPress={handleSubmit} />
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  tabs: { paddingHorizontal: space.lg, paddingBottom: space.md },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.md },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radii.md, backgroundColor: color.dangerSoft, padding: space.md },
  ticket: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  ticketIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.xl, paddingTop: space.md, ...elevation.sheet },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, alignSelf: 'center', marginBottom: space.md },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  form: { gap: space.lg },
  select: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  options: { borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, overflow: 'hidden' },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
});
