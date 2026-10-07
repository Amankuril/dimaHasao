import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, ArrowLeft, Check, ChevronDown, ChevronRight, Headset, Plus, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, shadow, tw } from '../../theme';
import { supportTicketService } from '../services/supportTicketService';

export const STATUS_STYLES = {
  pending: { bg: '#FFF7ED', fg: '#F54900', border: '#FFEDD4' },
  assigned: { bg: '#EFF6FF', fg: '#155DFC', border: '#DBEAFE' },
  closed: { bg: '#ECFDF5', fg: '#009966', border: '#D0FAE5' },
};
const TABS = ['All', 'Open', 'Resolved'];

/** Port of Taxi/modules/user/pages/support/SupportTickets.jsx (/taxi/driver/support/tickets). */
export default function SupportTickets() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const navigate = useNavigate();
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
        const [titlesResponse, ticketsResponse] = await Promise.all([supportTicketService.getTitles('driver'), supportTicketService.listMyTickets({ page: 1, limit: 100 })]);
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

  return (
    <LinearGradient colors={['#F8FAFC', '#F3F4F6', '#EEF2F7']} locations={[0, 0.38, 1]} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Press scale={0.95} onPress={() => navigate(-1)} accessibilityLabel="Go back" style={styles.back} hitSlop={6}>
            <ArrowLeft size={18} color={tw.slate900} strokeWidth={2.5} />
          </Press>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>HELP CENTER</Text>
            <Text style={styles.title} accessibilityRole="header">Support Tickets</Text>
          </View>
          <Press scale={0.9} onPress={() => setShowForm(true)} accessibilityLabel="New support ticket" style={[styles.back, { backgroundColor: tw.slate900, borderColor: tw.slate900 }]} hitSlop={6}>
            <Plus size={16} color="#fff" strokeWidth={3} />
          </Press>
        </View>
        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const on = activeTab === tab;
            return (
              <Press key={tab} scale={0.98} onPress={() => setActiveTab(tab)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tab} style={[styles.tab, on ? styles.tabOn : null]}>
                <Text style={[styles.tabText, on ? { color: tw.slate900 } : null]}>{tab.toUpperCase()}</Text>
              </Press>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 + insets.bottom, gap: 10 }}>
        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {loading ? (
          <View style={{ paddingVertical: 64, alignItems: 'center' }} accessibilityRole="progressbar" accessibilityLabel="Loading tickets">
            <ActivityIndicator size="small" color={tw.slate400} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Headset size={36} color={tw.slate300} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No tickets yet</Text>
            <Text style={styles.emptyBody}>Tap + to get help</Text>
          </View>
        ) : (
          filtered.map((t) => {
            const tone = STATUS_STYLES[t.status] || STATUS_STYLES.pending;
            return (
              <Press key={t.id || t.ticketCode} scale={0.98} onPress={() => navigate(`/taxi/driver/support/ticket/${t.ticketCode}`, { state: { ticket: t } })} accessibilityLabel={`${t.title}, ${t.status}`} style={styles.ticket}>
                <View style={styles.ticketIcon}>
                  <Headset size={16} color="#2B7FFF" strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <Text style={styles.ticketTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={[styles.status, { backgroundColor: tone.bg, color: tone.fg, borderColor: tone.border }]}>{t.status}</Text>
                  </View>
                  <Text style={styles.ticketMeta} numberOfLines={1}>
                    {t.supportType} · {new Date(t.updatedAt).toLocaleString('en-IN')}
                  </Text>
                </View>
                <ChevronRight size={15} color={tw.slate300} strokeWidth={2.5} style={{ marginTop: 4 }} />
              </Press>
            );
          })
        )}
      </ScrollView>

      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} backdrop="rgba(0,0,0,0.5)" spring={{ stiffness: 320, damping: 26 }} panelStyle={[styles.sheet, { maxHeight: height * 0.85, paddingBottom: 40 + insets.bottom }]}>
        <View style={styles.handle} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>New Ticket</Text>
          <Press scale={0.9} onPress={() => setShowForm(false)} accessibilityLabel="Close" style={styles.sheetClose} hitSlop={8}>
            <X size={15} color={tw.slate500} strokeWidth={2.5} />
          </Press>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
          <View>
            <Text style={styles.label}>TICKET TITLE</Text>
            <Press scale={1} onPress={() => setShowTitles((v) => !v)} accessibilityRole="combobox" accessibilityState={{ expanded: showTitles }} accessibilityLabel={`Ticket title, ${selectedTitle || 'not selected'}`} style={[styles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={[styles.fieldText, selectedTitle ? null : { color: tw.slate400 }]} numberOfLines={1}>{selectedTitle || 'Select title'}</Text>
              <ChevronDown size={16} color={tw.slate400} />
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
                      style={styles.option}
                    >
                      <Text style={[styles.optionText, option.id ? null : { color: tw.slate400 }]}>{option.title}</Text>
                      {on && option.id ? <Check size={14} color={tw.slate900} strokeWidth={3} /> : null}
                    </Press>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View>
            <Text style={styles.label}>OR CUSTOM TITLE</Text>
            <TextInput
              value={customTitle}
              onChangeText={(text) => {
                setCustomTitle(text);
                setErrors((p) => ({ ...p, title: '' }));
              }}
              placeholder="Write custom title if not listed"
              placeholderTextColor={tw.slate300}
              returnKeyType="next"
              accessibilityLabel="Custom title"
              style={[styles.field, styles.fieldText, errors.title ? styles.fieldError : null]}
            />
            {errors.title ? (
              <View style={styles.fieldErrorRow}>
                <AlertCircle size={11} color={tw.red500} strokeWidth={3} />
                <Text style={styles.fieldErrorText}>{errors.title}</Text>
              </View>
            ) : null}
          </View>

          <View>
            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput
              value={description}
              onChangeText={(text) => {
                setDesc(text);
                setErrors((p) => ({ ...p, description: '' }));
              }}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={tw.slate300}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Description"
              style={[styles.field, styles.fieldText, { minHeight: 104 }, errors.description ? styles.fieldError : null]}
            />
            {errors.description ? (
              <View style={styles.fieldErrorRow}>
                <AlertCircle size={11} color={tw.red500} strokeWidth={3} />
                <Text style={styles.fieldErrorText}>{errors.description}</Text>
              </View>
            ) : null}
          </View>

          <Press scale={0.97} disabled={submitting} onPress={handleSubmit} accessibilityLabel="Submit ticket" accessibilityState={{ busy: submitting }} style={styles.submit}>
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>SUBMIT TICKET</Text>}
          </Press>
        </ScrollView>
      </BottomSheet>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.8)', ...shadow('0 4px 20px rgba(15,23,42,0.05)') },
  back: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  kicker: { fontSize: 9, lineHeight: 14, letterSpacing: 2.3, color: tw.slate400, ...fo(900) },
  title: { fontSize: 19, lineHeight: 26, letterSpacing: -0.475, color: tw.slate900, ...fo(900) },
  tabs: { flexDirection: 'row', gap: 6, backgroundColor: '#FFFDF0', borderWidth: 1, borderColor: 'rgba(254,249,194,0.7)', padding: 4, borderRadius: 14 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  tabOn: { backgroundColor: '#fff', borderColor: 'rgba(241,245,249,0.8)', ...shadow('sm') },
  tabText: { fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: tw.slate500, ...fo(900) },
  error: { borderRadius: 14, borderWidth: 1, borderColor: tw.red100, backgroundColor: tw.red50, paddingHorizontal: 16, paddingVertical: 12 },
  errorText: { fontSize: 12, lineHeight: 16, color: tw.red600, ...fo(700) },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 4 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, lineHeight: 22, color: tw.slate700, ...fo(900) },
  emptyBody: { fontSize: 12, lineHeight: 16, color: tw.slate400, ...fo(700) },
  ticket: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', padding: 16, ...shadow('0 4px 14px rgba(15,23,42,0.06)') },
  ticketIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  ticketTitle: { flex: 1, fontSize: 14, lineHeight: 17.5, color: tw.slate900, ...fo(900) },
  status: { fontSize: 9, lineHeight: 14, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, overflow: 'hidden', ...fo(900) },
  ticketMeta: { fontSize: 11, lineHeight: 16, color: tw.slate400, marginTop: 4, ...fo(700) },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: tw.slate200, alignSelf: 'center', marginBottom: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...fo(900) },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: tw.slate400, marginLeft: 4, marginBottom: 4, ...fo(900) },
  field: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 2, borderColor: tw.slate100, backgroundColor: tw.slate50 },
  fieldText: { fontSize: 14, color: tw.slate900, ...fo(700) },
  fieldError: { borderColor: tw.red200, backgroundColor: tw.red50 },
  fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4, marginTop: 4 },
  fieldErrorText: { fontSize: 11, lineHeight: 16, color: tw.red500, ...fo(900) },
  options: { marginTop: 6, borderRadius: 14, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.slate50 },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.slate900, ...fo(700) },
  submit: { backgroundColor: tw.slate900, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  submitText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: '#fff', ...fo(900) },
});
