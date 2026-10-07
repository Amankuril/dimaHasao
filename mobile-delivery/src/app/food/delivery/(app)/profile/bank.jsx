import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Edit2, Save } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { Button, Card, IconButton, ScreenHeader } from '../../../../../components/ds';
import { Spinner } from '../../../../../components/Loader';
import { ThemedInput } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { color, radii, space, touch, type } from '../../../../../theme';

// Web: pages/profile/ProfileBankV2.jsx. View mode lists the details; edit mode
// turns them into inputs with the save action pinned above the keyboard.

const FIELDS = [
  ['Account holder', 'accountHolderName'],
  ['Account number', 'accountNumber'],
  ['IFSC code', 'ifscCode'],
  ['Bank name', 'bankName'],
  ['PAN number', 'panNumber'],
];

export default function ProfileBankV2() {
  const goBack = useDeliveryBackNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', panNumber: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await deliveryAPI.getProfile();
        if (response?.data?.success) {
          const p = response.data.data.profile;
          const b = p?.documents?.bankDetails || {};
          setForm({
            accountHolderName: b.accountHolderName || '',
            accountNumber: b.accountNumber || '',
            ifscCode: b.ifscCode || '',
            bankName: b.bankName || '',
            panNumber: p?.documents?.pan?.number || '',
          });
        }
      } catch {
        toast.error('Failed to load details');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!form.accountNumber || !form.ifscCode) return toast.error('Missing mandatory fields');
    setIsSaving(true);
    try {
      const response = await deliveryAPI.updateProfileDetails({
        documents: {
          bankDetails: { accountHolderName: form.accountHolderName, accountNumber: form.accountNumber, ifscCode: form.ifscCode, bankName: form.bankName },
          pan: { number: form.panNumber },
        },
      });
      if (response?.data?.success) {
        toast.success('Bank details updated');
        setIsEditing(false);
      }
    } catch {
      toast.error('Update failed');
    } finally {
      setIsSaving(false);
    }
    return undefined;
  };

  if (loading) {
    return (
      <View style={styles.page}>
        <ScreenHeader title="Bank details" onBack={goBack} />
        <View style={styles.center} accessibilityLabel="Loading bank details">
          <Spinner size={32} color={color.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <ScreenHeader
        title="Bank details"
        onBack={goBack}
        right={!isEditing ? <IconButton icon={Edit2} label="Edit bank details" variant="primary" iconSize={18} onPress={() => setIsEditing(true)} /> : null}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.body, { paddingBottom: (isEditing ? space.xxl : space.xxxl + insets.bottom) }]}
        >
          {isEditing ? (
            <Card style={{ gap: space.lg }}>
              {FIELDS.map(([label, key]) => (
                <View key={key} style={{ gap: space.sm }}>
                  <Text style={styles.label}>{label}</Text>
                  <ThemedInput
                    value={form[key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    placeholder={`Enter ${label.replace(/^[A-Z][a-z]/, (m) => m.toLowerCase())}`}
                    placeholderTextColor={color.textDisabled}
                    radius={radii.md}
                    borderWidth={1.5}
                    style={styles.input}
                    accessibilityLabel={label}
                  />
                </View>
              ))}
            </Card>
          ) : (
            <Card padded={false}>
              {FIELDS.map(([label, key], i) => (
                <View key={key} style={[styles.row, i < FIELDS.length - 1 && styles.divider]}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={[styles.value, !form[key] && { color: color.textMuted }]} numberOfLines={2}>
                    {form[key] || 'Not provided'}
                  </Text>
                </View>
              ))}
            </Card>
          )}
        </ScrollView>
        {isEditing ? (
          <View style={[styles.footer, { paddingBottom: space.lg + insets.bottom }]}>
            <Button title="Save changes" size="lg" icon={Save} onPress={handleSave} disabled={isSaving} loading={isSaving} accessibilityLabel="Save Changes" />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  label: { ...type.label, color: color.text },
  input: { height: touch, paddingHorizontal: space.lg, ...type.body, color: color.text },
  row: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.xxs },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  rowLabel: { ...type.caption, color: color.textMuted },
  value: { ...type.bodyStrong, color: color.text },
  footer: { backgroundColor: color.surface, padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borderStrong },
});
