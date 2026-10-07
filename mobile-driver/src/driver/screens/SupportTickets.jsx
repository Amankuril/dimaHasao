import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, Check, ChevronDown, ChevronRight, Headset, Plus, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, playfair, shadow } from '../../theme';
import { supportTicketService } from '../services/supportTicketService';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { CtaButton } from '../ui/Surface';

// bg / fg / border per ticket status (pending = warning, assigned = info, closed = ok)
export const STATUS_STYLES = {
  pending: { bg: DT.warnSoft, fg: DT.warnInk, border: DT.warnSoft },
  assigned: { bg: DT.infoSoft, fg: DT.info, border: DT.infoSoft },
  closed: { bg: DT.successSoft, fg: DT.successInk, border: DT.successSoft },
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
  const [focused, setFocused] = useState('');

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
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <ScreenHeader
        title="Support Tickets"
        subtitle="Raise and track your issues"
        onBack={() => navigate(-1)}
        right={
          <Press scale={0.9} onPress={() => setShowForm(true)} accessibilityLabel="New support ticket" style={styles.plus} hitSlop={6}>
            <Plus size={20} color={DT.ctaInk} strokeWidth={3} />
          </Press>
        }
      >
        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const on = activeTab === tab;
            return (
              <Press key={tab} scale={0.98} onPress={() => setActiveTab(tab)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tab} style={[styles.tab, on ? styles.tabOn : null]}>
                <Text style={[styles.tabText, on ? { color: DT.brand } : null]}>{tab.toUpperCase()}</Text>
              </Press>
            );
          })}
        </View>
      </ScreenHeader>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 + insets.bottom, gap: 12 }}>
        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {loading ? (
          <View style={{ paddingVertical: 64, alignItems: 'center' }} accessibilityRole="progressbar" accessibilityLabel="Loading tickets">
            <ActivityIndicator size="small" color={DT.brand} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Headset size={36} color={DT.faint} strokeWidth={1.5} />
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
                  <Headset size={18} color={DT.brand} strokeWidth={2} />
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
                <ChevronRight size={18} color={DT.faint} strokeWidth={2.5} style={{ marginTop: 4 }} />
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
            <X size={18} color={DT.muted} strokeWidth={2.5} />
          </Press>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
          <View>
            <Text style={styles.label}>TICKET TITLE</Text>
            <Press scale={1} onPress={() => setShowTitles((v) => !v)} accessibilityRole="combobox" accessibilityState={{ expanded: showTitles }} accessibilityLabel={`Ticket title, ${selectedTitle || 'not selected'}`} style={[styles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={[styles.fieldText, selectedTitle ? null : { color: DT.faint }]} numberOfLines={1}>{selectedTitle || 'Select title'}</Text>
              <ChevronDown size={16} color={DT.muted} />
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
                      <Text style={[styles.optionText, option.id ? null : { color: DT.faint }]}>{option.title}</Text>
                      {on && option.id ? <Check size={16} color={DT.brand} strokeWidth={3} /> : null}
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
              placeholderTextColor={DT.faint}
              returnKeyType="next"
              accessibilityLabel="Custom title"
              onFocus={() => setFocused('title')}
              onBlur={() => setFocused('')}
              style={[styles.field, styles.fieldText, focused === 'title' ? styles.fieldFocus : null, errors.title ? styles.fieldError : null]}
            />
            {errors.title ? (
              <View style={styles.fieldErrorRow}>
                <AlertCircle size={12} color={DT.danger} strokeWidth={3} />
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
              placeholderTextColor={DT.faint}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Description"
              onFocus={() => setFocused('description')}
              onBlur={() => setFocused('')}
              style={[styles.field, styles.fieldText, { minHeight: 104 }, focused === 'description' ? styles.fieldFocus : null, errors.description ? styles.fieldError : null]}
            />
            {errors.description ? (
              <View style={styles.fieldErrorRow}>
                <AlertCircle size={12} color={DT.danger} strokeWidth={3} />
                <Text style={styles.fieldErrorText}>{errors.description}</Text>
              </View>
            ) : null}
          </View>

          <CtaButton variant="brand" title="SUBMIT TICKET" loading={submitting} onPress={handleSubmit} accessibilityLabel="Submit ticket" />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  plus: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.cta, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: 6, marginTop: 16, backgroundColor: 'rgba(255,255,255,0.12)', padding: 4, borderRadius: DT.radius.pill },
  tab: { flex: 1, minHeight: 44, borderRadius: DT.radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: DT.card },
  tabText: { fontSize: 11, lineHeight: 16, letterSpacing: 1, minWidth: 64, textAlign: 'center', color: DT.onBrand, ...fo(800) },
  error: { borderRadius: DT.radius.md, backgroundColor: DT.dangerSoft, paddingHorizontal: 16, paddingVertical: 12 },
  errorText: { fontSize: 13, lineHeight: 18, color: DT.dangerInk, ...fo(700) },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 4 },
  emptyIcon: { width: 80, height: 80, borderRadius: DT.radius.xl, backgroundColor: DT.card, borderWidth: 1, borderColor: DT.borderSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...shadow('sm') },
  emptyTitle: { fontSize: 16, lineHeight: 22, color: DT.ink, ...fo(800) },
  emptyBody: { fontSize: 13, lineHeight: 18, color: DT.muted, ...fo(500) },
  ticket: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, backgroundColor: DT.card, padding: 16, ...shadow('sm') },
  ticketIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  ticketTitle: { flex: 1, fontSize: 14, lineHeight: 20, color: DT.ink, ...fo(700) },
  status: { fontSize: 10, lineHeight: 14, minWidth: 54, textAlign: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: DT.radius.pill, overflow: 'hidden', ...fo(800) },
  ticketMeta: { fontSize: 11, lineHeight: 16, color: DT.muted, marginTop: 4, ...fo(500) },
  sheet: { backgroundColor: DT.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: DT.border, alignSelf: 'center', marginBottom: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 20, lineHeight: 28, color: DT.brand, ...playfair(700) },
  sheetClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.bgSoft, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 16, letterSpacing: 1, minWidth: 90, color: DT.muted, marginLeft: 4, marginBottom: 6, ...fo(800) },
  field: { minHeight: 52, borderRadius: DT.radius.md, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card },
  fieldText: { fontSize: 14, color: DT.ink, ...fo(600) },
  fieldFocus: { borderColor: DT.brand },
  fieldError: { borderColor: DT.danger, backgroundColor: DT.dangerSoft },
  fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4, marginTop: 4 },
  fieldErrorText: { fontSize: 11, lineHeight: 16, color: DT.dangerInk, ...fo(800) },
  options: { marginTop: 6, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card, overflow: 'hidden' },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: DT.borderSoft },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20, color: DT.ink, ...fo(600) },
});
