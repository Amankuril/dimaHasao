import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Building2, CreditCard, Edit, Landmark, Save, Trash2, User } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { confirm, toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import walletService from '../services/walletService';
import { HT } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerBankDetails.jsx
 * (/hotel/partner/bank-details). window.confirm is the app's confirm dialog.
 */

const EMPTY = { accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '' };

function Row({ label, icon: Icon, isEditing, editor, view, fieldStyle }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, isEditing ? styles.fieldEdit : styles.fieldView, fieldStyle]}>
        <Icon size={18} color={tw.gray400} />
        {isEditing ? editor : view}
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
  const [focused, setFocused] = useState('');

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
      <View style={{ flex: 1, backgroundColor: HT.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={HT.primary} />
      </View>
    );
  }

  const input = (key, placeholder, extra = {}) => (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={tw.gray300}
      value={details[key]}
      onChangeText={(v) => setDetails({ ...details, [key]: extra.upper ? v.toUpperCase() : v })}
      onFocus={() => setFocused(key)}
      onBlur={() => setFocused('')}
      autoCapitalize={extra.upper ? 'characters' : 'none'}
      style={styles.input}
    />
  );
  const view = (text) => <Text style={styles.value}>{text}</Text>;
  // focus-within: border primary + 2px ring at 10%
  const focus = (key) => (isEditing && focused === key ? { borderColor: HT.primary, boxShadow: '0 0 0 2px rgba(10,77,43,0.1)' } : null);

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 + insets.bottom }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={[styles.hero, { paddingTop: 32 + insets.top }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <Press onPress={() => navigate(-1)} accessibilityLabel="Back" style={styles.back}>
              <ArrowLeft size={20} color="#fff" />
            </Press>
            <Text style={styles.heroTitle}>Bank Account</Text>
          </View>
          <View style={{ alignItems: 'center', opacity: 0.9 }}>
            <View style={styles.heroIcon}>
              <Landmark size={32} color="#fff" />
            </View>
            <Text style={styles.heroSub}>Manage your payout account</Text>
          </View>
        </View>

        <View style={{ maxWidth: 448, width: '100%', alignSelf: 'center', paddingHorizontal: 16, marginTop: -40 }}>
          <View style={styles.card}>
            {/* View Mode Header */}
            {!isEditing && existingDetails ? (
              <View style={styles.cardHead}>
                <View>
                  <Text style={styles.cardTitle}>Saved Account</Text>
                  <Text style={styles.cardSub}>Verified for Payouts</Text>
                </View>
                <Press onPress={() => setIsEditing(true)} style={styles.editBtn}>
                  <Edit size={14} color={HT.primary} />
                  <Text style={styles.editText}>Edit</Text>
                </Press>
              </View>
            ) : null}

            {/* Edit Mode Header */}
            {isEditing ? (
              <View style={styles.cardHead}>
                <View>
                  <Text style={styles.cardTitle}>{existingDetails ? 'Edit Account' : 'Add Account'}</Text>
                  <Text style={styles.cardSub}>Enter your official bank details</Text>
                </View>
                {existingDetails ? (
                  <Press onPress={() => setIsEditing(false)}>
                    <Text style={styles.cancel}>Cancel</Text>
                  </Press>
                ) : null}
              </View>
            ) : null}

            <View style={{ gap: 16 }}>
              <Row label="Account Holder" icon={User} isEditing={isEditing} editor={input('accountHolderName', 'Name as per Passbook')} view={view(details.accountHolderName)} fieldStyle={focus('accountHolderName')} />
              <Row label="Account Number" icon={CreditCard} isEditing={isEditing} editor={input('accountNumber', 'Enter Account Number')} view={view(`•••• •••• ${details.accountNumber.slice(-4)}`)} fieldStyle={focus('accountNumber')} />
              <Row label="IFSC Code" icon={Building2} isEditing={isEditing} editor={input('ifscCode', 'IFSC', { upper: true })} view={view(details.ifscCode)} fieldStyle={focus('ifscCode')} />
              <Row label="Bank Name" icon={Landmark} isEditing={isEditing} editor={input('bankName', 'e.g. HDFC Bank')} view={view(details.bankName)} fieldStyle={focus('bankName')} />
            </View>

            {/* Actions */}
            <View style={{ marginTop: 32, gap: 12 }}>
              {isEditing ? (
                <Press onPress={handleSave} disabled={saving} style={[styles.save, shadow('0 10px 15px -3px rgba(10,77,43,0.2)')]}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" />}
                  <Text style={styles.saveText}>Save Details</Text>
                </Press>
              ) : (
                <Press onPress={handleDelete} disabled={saving} style={styles.remove}>
                  {saving ? <ActivityIndicator size="small" color={tw.red500} /> : <Trash2 size={18} color={tw.red500} />}
                  <Text style={styles.removeText}>Remove Account</Text>
                </Press>
              )}
            </View>

            <View style={styles.note}>
              <Text style={styles.noteText}>
                <Text style={{ ...poppins(700) }}>Note:</Text> Ensuring these details are correct is crucial. Withdrawals will be processed directly to this account via IMPS.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { backgroundColor: HT.primary, paddingBottom: 48, paddingHorizontal: 24, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, marginBottom: 24, ...shadow('lg') },
  back: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999 },
  heroTitle: { fontSize: 20, lineHeight: 28, color: '#fff', ...poppins(700) },
  heroIcon: { width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  heroSub: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: tw.gray100, ...shadow('0 20px 25px -5px rgba(229,231,235,0.5)') },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tw.gray50 },
  cardTitle: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(900) },
  cardSub: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: tw.gray50, borderRadius: 8 },
  editText: { fontSize: 12, lineHeight: 16, color: HT.primary, ...poppins(700) },
  cancel: { fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(700) },
  label: { fontSize: 10, lineHeight: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: tw.gray400, marginBottom: 6, ...poppins(900) },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  fieldEdit: { backgroundColor: tw.gray50, borderColor: tw.gray200 },
  fieldView: { backgroundColor: 'rgba(249,250,251,0.5)', borderColor: 'transparent' },
  input: { flex: 1, padding: 0, fontSize: 14, color: tw.slate900, ...poppins(700) },
  value: { fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(700) },
  save: { width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: HT.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
  remove: { width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  removeText: { fontSize: 14, lineHeight: 20, color: tw.red500, ...poppins(700) },
  note: { marginTop: 24, padding: 16, backgroundColor: tw.blue50, borderRadius: 12, borderWidth: 1, borderColor: tw.blue100 },
  noteText: { fontSize: 12, lineHeight: 19.5, color: tw.blue700, textAlign: 'center', ...poppins(500) },
});

export default PartnerBankDetails;
