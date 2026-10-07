import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../../api/delivery';
import { Button, Card, ScreenHeader } from '../../../../../../components/ds';
import { SelectField } from '../../../../../../components/kit';
import { ThemedInput } from '../../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../../lib/notify';
import { color, radii, space, touch, type } from '../../../../../../theme';

/*
 * Web: pages/help/CreateSupportTicketV2.jsx. Labels above inputs; the submit
 * button is pinned under the form inside the KeyboardAvoidingView so it stays
 * above the keyboard.
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
      <ScreenHeader title="Raise a ticket" onBack={goBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.body}>
          <Card style={{ gap: space.xl }}>
            <View style={styles.field}>
              <Text style={styles.label}>Subject</Text>
              <ThemedInput
                value={form.subject}
                onChangeText={set('subject')}
                placeholder="Main subject of your concern"
                placeholderTextColor={color.textDisabled}
                radius={radii.md}
                borderWidth={1.5}
                style={styles.input}
                accessibilityLabel="Issue Topic"
              />
              <Text style={styles.hint}>At least 3 characters</Text>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <ThemedInput
                value={form.description}
                onChangeText={set('description')}
                placeholder="Explain your issue here..."
                placeholderTextColor={color.textDisabled}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                radius={radii.md}
                borderWidth={1.5}
                style={[styles.input, styles.textarea]}
                accessibilityLabel="Detail Description"
              />
              <Text style={styles.hint}>At least 10 characters</Text>
            </View>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <Text style={styles.label}>Category</Text>
                <SelectField value={form.category} options={CATEGORIES} onChange={set('category')} accessibilityLabel="Category" style={styles.select} textStyle={styles.selectText} chevronColor={color.textSecondary} />
              </View>
              <View style={styles.cell}>
                <Text style={styles.label}>Priority</Text>
                <SelectField value={form.priority} options={PRIORITIES} onChange={set('priority')} accessibilityLabel="Priority" style={styles.select} textStyle={styles.selectText} chevronColor={color.textSecondary} />
              </View>
            </View>
          </Card>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
          <Button title="Submit ticket" size="lg" icon={Send} onPress={handleSubmit} disabled={loading} loading={loading} accessibilityLabel="Submit Ticket" />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl },
  field: { gap: space.sm },
  label: { ...type.label, color: color.text },
  hint: { ...type.caption, color: color.textMuted },
  input: { height: touch, paddingHorizontal: space.lg, ...type.body, color: color.text },
  textarea: { height: 148, paddingTop: space.md, paddingBottom: space.md },
  grid: { flexDirection: 'row', gap: space.md },
  cell: { flex: 1, minWidth: 0, gap: space.sm },
  select: { backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.borderStrong, borderRadius: radii.md, paddingHorizontal: space.md, height: touch, gap: space.xs },
  selectText: { ...type.body, color: color.text },
  footer: { backgroundColor: color.surface, padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borderStrong },
});
