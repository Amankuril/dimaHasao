import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, MapPin, PenLine, Search } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Button, Card, IconButton, SegmentedControl, StatusBadge } from '../../components/ds';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { useProfile } from '../context/ProfileContext';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { sessionStore } from '../../lib/storage';
import { toast } from '../../lib/notify';
import { color, radii, space, type } from '../../theme';
import { CtaBar, Field } from '../components/cart/parts';

const getAddressId = (address) => address?.id || address?._id || '';

const formatAddressLine = (address) => {
  if (!address) return '';
  return [address.additionalDetails, address.street, address.city, address.state, address.zipCode].filter(Boolean).join(', ');
};

const toBackendLabel = (label) => {
  const v = String(label || '').toLowerCase();
  if (v === 'work') return 'Office';
  if (v === 'home') return 'Home';
  return 'Other';
};

/** Port of pages/user/cart/SelectAddress.jsx. */
export default function SelectAddress() {
  const insets = useSafeAreaInsets();
  const location = useLocation();
  const { addresses = [], addAddress, setDefaultAddress, getDefaultAddress, isAuthenticated } = useProfile();

  const from = location?.state?.from || '/user/cart';
  const defaultAddress = getDefaultAddress?.() || null;

  const [label, setLabel] = useState(() => {
    const current = defaultAddress?.label || 'Home';
    return String(current).toLowerCase().includes('office') ? 'Work' : current;
  });
  const [query, setQuery] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState(() => getAddressId(defaultAddress));
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    additionalDetails: defaultAddress?.additionalDetails || '',
    street: defaultAddress?.street || '',
    city: defaultAddress?.city || '',
    state: defaultAddress?.state || '',
    zipCode: defaultAddress?.zipCode || '',
    phone: defaultAddress?.phone || '',
  }));

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Array.isArray(addresses) ? addresses : [];
    if (!q) return list.slice(0, 6);
    return list
      .map((a) => ({ a, text: `${a.label || ''} ${formatAddressLine(a)}`.trim().toLowerCase() }))
      .filter((x) => x.text.includes(q))
      .slice(0, 8)
      .map((x) => x.a);
  }, [addresses, query]);

  const showDropdown = (query.trim().length > 0 || suggestions.length > 0) && (addresses?.length || 0) > 0;

  const onPickSuggestion = (addr) => {
    setSelectedSuggestionId(getAddressId(addr));
    setQuery(formatAddressLine(addr));
    setForm({
      additionalDetails: addr?.additionalDetails || '',
      street: addr?.street || '',
      city: addr?.city || '',
      state: addr?.state || '',
      zipCode: addr?.zipCode || '',
      phone: addr?.phone || '',
    });
    const normalizedLabel = String(addr?.label || '');
    if (normalizedLabel.toLowerCase() === 'office') setLabel('Work');
    else if (normalizedLabel) setLabel(normalizedLabel);
  };

  const setField = (name) => (value) => setForm((prev) => ({ ...prev, [name]: value }));

  const onSave = async () => {
    const street = String(form.street || '').trim();
    const city = String(form.city || '').trim();
    const state = String(form.state || '').trim();
    if (!isAuthenticated) {
      toast.info('Please login to save an address');
      navigateTo('/login');
      return;
    }
    if (!street || !city || !state) {
      toast.error('Please fill Street, City and State');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        label: toBackendLabel(label),
        additionalDetails: String(form.additionalDetails || '').trim(),
        street,
        city,
        state,
        zipCode: String(form.zipCode || '').trim(),
        phone: String(form.phone || '').trim(),
      };
      const created = await addAddress(payload);
      const newId = getAddressId(created);
      if (newId) await setDefaultAddress(newId);
      sessionStore.setItem('manual_location_update', 'true');
      toast.success('Address saved');
      navigateTo(from, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to save address');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Back" onPress={() => navigateTo(from)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.heading, { color: color.text }]} numberOfLines={1} accessibilityRole="header">
            Select address
          </Text>
          <Text style={[type.small, { color: color.textMuted }]} numberOfLines={1}>
            Pick from saved addresses or add manually.
          </Text>
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Card>
          <CardTitle icon={MapPin} title="Save as" />
          <SegmentedControl options={['Home', 'Work', 'Other'].map((x) => ({ value: x, label: x }))} value={label} onChange={setLabel} />
          <Text style={styles.hint}>Work is stored as Office in backend.</Text>
        </Card>

        <Card>
          <CardTitle icon={Search} title="Search saved addresses" />
          <Field
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setSelectedSuggestionId('');
            }}
            placeholder="Start typing to search saved addresses…"
            accessibilityLabel="Search saved addresses"
          />
          {showDropdown ? (
            <View style={styles.dropdown} accessibilityRole="radiogroup">
              {suggestions.length === 0 ? (
                <Text style={[type.body, { padding: space.lg, color: color.textMuted }]}>No matches found.</Text>
              ) : (
                suggestions.map((addr, i) => {
                  const id = getAddressId(addr);
                  const selected = id && selectedSuggestionId === id;
                  return (
                    <Press
                      key={id || formatAddressLine(addr)}
                      scale={0.99}
                      onPress={() => onPickSuggestion(addr)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: !!selected }}
                      style={[styles.sug, selected ? { backgroundColor: color.primarySoft } : null, i < suggestions.length - 1 ? styles.sugDivider : null]}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                          <Text style={[type.bodyStrong, { color: color.text }]}>
                            {String(addr?.label || 'Saved').toLowerCase() === 'office' ? 'Work' : addr?.label || 'Saved'}
                          </Text>
                          {addr?.isDefault ? <StatusBadge label="Default" tone="primary" /> : null}
                        </View>
                        <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={2}>
                          {formatAddressLine(addr)}
                        </Text>
                      </View>
                      {selected ? <Check size={20} color={color.primary} /> : null}
                    </Press>
                  );
                })
              )}
            </View>
          ) : null}
          <Text style={styles.hint}>Selecting a suggestion will prefill the manual fields (you can still edit).</Text>
        </Card>

        <Card>
          <CardTitle icon={PenLine} title="Address details" />
          <View style={{ gap: space.lg }}>
            <Field label="Address details*" placeholder="E.g. Floor, House no." value={form.additionalDetails} onChangeText={setField('additionalDetails')} />
            <Field label="Street / Area *" placeholder="Street / Area" value={form.street} onChangeText={setField('street')} />
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Field label="City *" placeholder="City" value={form.city} onChangeText={setField('city')} style={{ flex: 1 }} />
              <Field label="State *" placeholder="State" value={form.state} onChangeText={setField('state')} style={{ flex: 1 }} />
            </View>
            <Field label="Pincode (optional)" placeholder="Pincode" value={form.zipCode} onChangeText={setField('zipCode')} keyboardType="number-pad" />
            <Field label="Phone (optional)" placeholder="Phone" value={form.phone} onChangeText={setField('phone')} keyboardType="phone-pad" />
          </View>
        </Card>
      </ScrollView>

      <CtaBar extraBottom={NAV_CLEARANCE + insets.bottom}>
        <Button title={isSaving ? 'Saving...' : 'Save address'} size="lg" loading={isSaving} disabled={isSaving} onPress={onSave} accessibilityLabel="Save address" />
      </CtaBar>
    </KeyboardAvoidingView>
  );
}

function CardTitle({ icon: Icon, title }) {
  return (
    <View style={styles.cardTitle}>
      <Icon size={20} color={color.primary} />
      <Text style={[type.subheading, { color: color.text, flex: 1 }]} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.xs, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  hint: { ...type.caption, marginTop: space.sm, color: color.textMuted },
  dropdown: { marginTop: space.sm, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, overflow: 'hidden' },
  sug: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 56 },
  sugDivider: { borderBottomWidth: 1, borderBottomColor: color.border },
});
