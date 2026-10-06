import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Edit2, Save } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { Spinner } from '../../../../../components/Loader';
import { Press, ThemedInput } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { toast } from '../../../../../lib/notify';
import { display, ff, shadow, tw } from '../../../../../theme';

// Web: pages/profile/ProfileBankV2.jsx. `font-poppins` -> Nunito; rounded-2xl -> #E5DDC3 + card shadow.

const FIELDS = [
  ['Account Holder', 'accountHolderName'],
  ['Account Number', 'accountNumber'],
  ['IFSC Code', 'ifscCode'],
  ['Bank Name', 'bankName'],
  ['PAN Number', 'panNumber'],
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
      <View style={styles.center}>
        <Spinner size={32} color={tw.primary} />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[styles.header, shadow('sm'), { paddingTop: 20 + insets.top }]}>
        <Press onPress={goBack} accessibilityLabel="Back" hitSlop={10}>
          <ArrowLeft size={24} color="#1F1F24" />
        </Press>
        <Text style={styles.title}>Bank Details</Text>
        {!isEditing ? (
          <Press onPress={() => setIsEditing(true)} accessibilityLabel="Edit bank details" style={styles.edit}>
            <Edit2 size={16} color={tw.primary} />
          </Press>
        ) : null}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.body, { paddingTop: 96 + insets.top }]}>
          <View style={{ gap: 16 }}>
            {FIELDS.map(([label, key]) => (
              <View key={key} style={[styles.card, shadow('card')]}>
                <Text style={styles.label}>{label}</Text>
                {isEditing ? (
                  <ThemedInput
                    value={form[key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    radius={12}
                    borderWidth={1}
                    style={styles.input}
                    accessibilityLabel={label}
                  />
                ) : (
                  <Text style={styles.value}>{form[key] || 'Not provided'}</Text>
                )}
              </View>
            ))}
          </View>
          {isEditing ? (
            <Press onPress={handleSave} disabled={isSaving} accessibilityLabel="Save Changes" style={[styles.save, shadow('card')]}>
              {isSaving ? <Spinner size={20} color="#fff" /> : <Save size={20} color="#fff" />}
              <Text style={styles.saveText}>Save Changes</Text>
            </Press>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.gray50 },
  page: { flex: 1, backgroundColor: tw.gray50 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { fontSize: 20, lineHeight: 28, color: '#1F1F24', ...display(900, 20) },
  edit: { marginLeft: 'auto', padding: 8, backgroundColor: tw.primarySoft, borderRadius: 12 },
  body: { paddingHorizontal: 16, paddingBottom: 40, gap: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5DDC3' },
  label: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.gray400, marginBottom: 8, ...display(900, 10) },
  input: { height: 46, paddingHorizontal: 16, fontSize: 14, ...ff(700) },
  value: { fontSize: 14, lineHeight: 20, color: tw.gray950, ...ff(700) },
  save: { width: '100%', backgroundColor: '#000', paddingVertical: 20, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { color: '#fff', fontSize: 14, lineHeight: 20, textTransform: 'uppercase', ...display(900, 14) },
});
