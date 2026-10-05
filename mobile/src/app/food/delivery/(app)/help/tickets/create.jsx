import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../../api/delivery';
import FixedHeader, { FIXED_HEADER_CONTENT_TOP } from '../../../../../../components/delivery/FixedHeader';
import { SelectField } from '../../../../../../components/kit';
import { Spinner } from '../../../../../../components/Loader';
import { Press, ThemedInput } from '../../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../../lib/notify';
import { display, ff, shadow, tw } from '../../../../../../theme';

/*
 * Web: pages/help/CreateSupportTicketV2.jsx (`font-poppins` -> Nunito Sans).
 * The fields are rounded-2xl, and that theme rule outranks the input rule:
 * border #E5DDC3 with the card shadow, white background.
 */

const CATEGORIES = [
  { value: 'payment', label: 'Payment' },
  { value: 'order', label: 'Order' },
  { value: 'account', label: 'Account' },
  { value: 'technical', label: 'Tech Issue' },
  { value: 'other', label: 'Other' },
];
const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function CreateSupportTicketV2() {
  const goBack = useDeliveryBackNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'other', priority: 'medium' });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (form.subject.length < 3) return toast.error('Subject too short');
    if (form.description.length < 10) return toast.error('Description too short');
    setLoading(true);
    try {
      const response = await deliveryAPI.createSupportTicket(form);
      if (response?.data?.success) {
        toast.success('Ticket raised successfully');
        goBack();
      }
    } catch {
      toast.error('Failed to create ticket');
    } finally {
      setLoading(false);
    }
    return undefined;
  };

  return (
    <View style={styles.page}>
      <FixedHeader title="Raise Ticket" uppercase onBack={goBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.body, { paddingTop: FIXED_HEADER_CONTENT_TOP + insets.top }]}>
          <View style={{ gap: 24 }}>
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Issue Topic</Text>
              <ThemedInput
                value={form.subject}
                onChangeText={set('subject')}
                placeholder="Main subject of your concern"
                radius={16}
                borderWidth={1}
                containerStyle={shadow('card')}
                style={[styles.field, { borderColor: '#E5DDC3' }]}
                accessibilityLabel="Issue Topic"
              />
            </View>
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Detail Description</Text>
              <ThemedInput
                value={form.description}
                onChangeText={set('description')}
                placeholder="Explain your issue here..."
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                radius={16}
                borderWidth={1}
                containerStyle={shadow('card')}
                style={[styles.field, styles.textarea, { borderColor: '#E5DDC3' }]}
                accessibilityLabel="Detail Description"
              />
            </View>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <Text style={styles.label}>Category</Text>
                <SelectField value={form.category} options={CATEGORIES} onChange={set('category')} accessibilityLabel="Category" style={[styles.select, shadow('card')]} textStyle={styles.selectText} chevronColor="#1F1F24" />
              </View>
              <View style={styles.cell}>
                <Text style={styles.label}>Priority</Text>
                <SelectField value={form.priority} options={PRIORITIES} onChange={set('priority')} accessibilityLabel="Priority" style={[styles.select, shadow('card')]} textStyle={styles.selectText} chevronColor="#1F1F24" />
              </View>
            </View>
          </View>
          <Press onPress={handleSubmit} disabled={loading} accessibilityLabel="Submit Ticket" style={[styles.submit, shadow('card'), loading && { opacity: 0.5 }]}>
            {loading ? <Spinner size={20} color="#fff" /> : <Send size={20} color="#fff" />}
            <Text style={styles.submitText}>Submit Ticket</Text>
          </Press>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 32 },
  // An inline <label>: its line box is the parent's 24 px strut.
  label: { marginLeft: 4, fontSize: 10, lineHeight: 24, textTransform: 'uppercase', color: tw.gray400, ...display(900, 10) },
  field: { paddingHorizontal: 20, height: 54, fontSize: 14, ...ff(700) },
  // rows=6 at 20 px + 32 px padding + border; the inline-block textarea leaves descender space below
  textarea: { height: 154, paddingTop: 16, paddingBottom: 16, marginBottom: 7 },
  grid: { flexDirection: 'row', gap: 16 },
  cell: { flex: 1, gap: 8 },
  select: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5DDC3', borderRadius: 16, paddingHorizontal: 20, height: 50 },
  selectText: { fontSize: 12, lineHeight: 16, color: '#1F1F24', textTransform: 'uppercase', ...display(900, 12) },
  submit: { width: '100%', backgroundColor: '#000', padding: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  submitText: { color: '#fff', fontSize: 14, lineHeight: 20, textTransform: 'uppercase', ...display(900, 14) },
});
