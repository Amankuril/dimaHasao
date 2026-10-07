import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, CreditCard, Edit, Info, Landmark, Save, Trash2, User } from 'lucide-react-native';
import { Button, Card, StatusBadge } from '../../components/ds';
import HeritageHeader from '../../components/HeritageHeader';
import { confirm, toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { color, radii, space, type } from '../../theme';
import walletService from '../services/walletService';
import { Field, PageLoader, PinnedBar } from '../components/dashboard/partnerUi';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerBankDetails.jsx
 * (/hotel/partner/bank-details). window.confirm is the app's confirm dialog.
 */

const EMPTY = { accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '' };

function Row({ label, icon: Icon, isEditing, editor, view }) {
  if (isEditing) return editor;
  return (
    <View style={styles.readRow}>
      <View style={styles.readIcon}>
        <Icon size={18} color={color.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.label}>{label}</Text>
        {view}
      </View>
    </View>
  );
}

const PartnerBankDetails = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Bank Details State
  const [details, setDetails] = useState(EMPTY);

  const [existingDetails, setExistingDetails] = useState(null);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await walletService.getWallet({ viewAs: 'partner' });
      const bank = data.wallet?.bankDetails;

      if (bank && bank.accountNumber) {
        setExistingDetails(bank);
        setDetails({
          accountHolderName: bank.accountHolderName || '',
          accountNumber: bank.accountNumber || '',
          ifscCode: bank.ifscCode || '',
          bankName: bank.bankName || '',
        });
        setIsEditing(false); // Valid existing details -> view mode
      } else {
        setExistingDetails(null);
        setIsEditing(true); // No details -> edit mode
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load bank details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleSave = async () => {
    const { accountHolderName, accountNumber, ifscCode, bankName } = details;

    // 1. Basic Required Check
    if (!accountNumber || !ifscCode || !accountHolderName || !bankName) {
      toast.error('Please fill all fields');
      return;
    }

    // 2. Account Holder Name Check
    if (accountHolderName.trim().length < 3) {
      toast.error('Account holder name must be at least 3 characters');
      return;
    }

    // 3. Account Number Check (9 to 18 digits)
    const accRegex = /^[0-9]{9,18}$/;
    if (!accRegex.test(accountNumber)) {
      toast.error('Enter a valid account number (9-18 digits)');
      return;
    }

    // 4. IFSC Code Check (4 letters, 0, 6 characters)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode)) {
      toast.error('Enter a valid IFSC code (e.g. HDFC0001234)');
      return;
    }

    // 5. Bank Name Check
    if (bankName.trim().length < 2) {
      toast.error('Enter a valid bank name');
      return;
    }

    try {
      setSaving(true);
      await walletService.updateBankDetails(details);
      toast.success('Bank details saved successfully');
      fetchDetails(); // Refresh view
    } catch {
      toast.error('Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm(
      "Are you sure you want to remove these bank details? You won't be able to withdraw funds until you add them again.",
      '',
      { confirmText: 'Remove Account', destructive: true },
    );
    if (!ok) return;

    try {
      setSaving(true);
      await walletService.deleteBankDetails();
      toast.success('Bank details removed');

      // Reset state
      setExistingDetails(null);
      setDetails(EMPTY);
      setIsEditing(true);
    } catch {
      toast.error('Failed to remove details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <HeritageHeader title="Bank account" onBack={() => navigate(-1)} />
        <PageLoader />
      </View>
    );
  }

  const input = (key, label, placeholder, extra = {}) => (
    <Field
      label={label}
      placeholder={placeholder}
      value={details[key]}
      onChangeText={(v) => setDetails({ ...details, [key]: extra.upper ? v.toUpperCase() : v })}
      autoCapitalize={extra.upper ? 'characters' : 'none'}
      keyboardType={extra.keyboardType}
    />
  );
  const view = (text) => (
    <Text style={styles.value} numberOfLines={2}>
      {text}
    </Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <HeritageHeader title="Bank account" subtitle="Manage your payout account" onBack={() => navigate(-1)} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl + (isEditing ? 0 : insets.bottom) }} keyboardShouldPersistTaps="handled">
          <View style={{ maxWidth: 448, width: '100%', alignSelf: 'center', gap: space.lg }}>
            <Card style={{ gap: space.lg }}>
              {/* View Mode Header */}
              {!isEditing && existingDetails ? (
                <View style={styles.cardHead}>
                  <View style={styles.headIcon}>
                    <Landmark size={22} color={color.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardTitle}>Saved account</Text>
                    <StatusBadge label="Verified for payouts" tone="success" />
                  </View>
                  <Button title="Edit" icon={Edit} variant="secondary" size="sm" fullWidth={false} onPress={() => setIsEditing(true)} style={{ minHeight: 44 }} />
                </View>
              ) : null}

              {/* Edit Mode Header */}
              {isEditing ? (
                <View style={styles.cardHead}>
                  <View style={styles.headIcon}>
                    <Landmark size={22} color={color.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardTitle}>{existingDetails ? 'Edit account' : 'Add account'}</Text>
                    <Text style={styles.cardSub}>Enter your official bank details</Text>
                  </View>
                  {existingDetails ? <Button title="Cancel" variant="ghost" size="sm" fullWidth={false} onPress={() => setIsEditing(false)} style={{ minHeight: 44 }} /> : null}
                </View>
              ) : null}

              <View style={{ gap: space.lg }}>
                <Row label="Account holder" icon={User} isEditing={isEditing} editor={input('accountHolderName', 'Account holder', 'Name as per passbook')} view={view(details.accountHolderName)} />
                <Row label="Account number" icon={CreditCard} isEditing={isEditing} editor={input('accountNumber', 'Account number', 'Enter account number', { keyboardType: 'number-pad' })} view={view(`•••• •••• ${details.accountNumber.slice(-4)}`)} />
                <Row label="IFSC code" icon={Building2} isEditing={isEditing} editor={input('ifscCode', 'IFSC code', 'e.g. HDFC0001234', { upper: true })} view={view(details.ifscCode)} />
                <Row label="Bank name" icon={Landmark} isEditing={isEditing} editor={input('bankName', 'Bank name', 'e.g. HDFC Bank')} view={view(details.bankName)} />
              </View>

              {/* Actions */}
              {!isEditing ? <Button title="Remove account" icon={Trash2} variant="dangerSoft" onPress={handleDelete} loading={saving} disabled={saving} /> : null}
            </Card>

            <View style={styles.note}>
              <Info size={18} color={color.info} />
              <Text style={styles.noteText}>
                <Text style={type.bodyStrong}>Note:</Text> Ensuring these details are correct is crucial. Withdrawals will be processed directly to this account via IMPS.
              </Text>
            </View>
          </View>
        </ScrollView>

        {isEditing ? (
          <PinnedBar>
            <Button title="Save details" icon={Save} size="lg" onPress={handleSave} loading={saving} disabled={saving} />
          </PinnedBar>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  headIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...type.subheading, color: color.text, marginBottom: space.xxs },
  cardSub: { ...type.small, color: color.textMuted },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  readIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.caption, color: color.textMuted },
  value: { ...type.bodyStrong, color: color.text },
  note: { flexDirection: 'row', gap: space.sm, padding: space.lg, backgroundColor: color.infoSoft, borderRadius: radii.md },
  noteText: { flex: 1, ...type.small, color: color.text },
});

export default PartnerBankDetails;
