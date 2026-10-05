import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, ChevronDown, MapPin, Search } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { useProfile } from '../context/ProfileContext';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { sessionStore } from '../../lib/storage';
import { toast } from '../../lib/notify';
import { poppins, tw } from '../../theme';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, UI } from '../components/cart/ui';

const ORANGE = '#0a4d2b';

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
    <LinearGradient colors={['rgba(255,247,237,0.3)', '#ffffff', 'rgba(255,247,237,0.2)']} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 24, paddingBottom: 24 + NAV_CLEARANCE + insets.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Button variant="ghost" icon onPress={() => navigateTo(from)} accessibilityLabel="Back" style={{ width: 36, height: 36, borderRadius: 18 }}>
            <ArrowLeft size={20} color={UI.foreground} />
          </Button>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.h1} numberOfLines={1}>Select address</Text>
            <Text style={styles.sub}>Pick from saved addresses or add manually.</Text>
          </View>
        </View>

        <Card>
          <CardHeader>
            <CardTitle row>
              <MapPin size={20} color={ORANGE} />
              <Text style={styles.cardTitleText}>Save as</Text>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['Home', 'Work', 'Other'].map((x) => {
                const active = label === x;
                return (
                  <Button
                    key={x}
                    variant={active ? 'default' : 'outline'}
                    onPress={() => setLabel(x)}
                    selected={active}
                    style={[{ flex: 1 }, active ? { backgroundColor: ORANGE } : null]}
                    textStyle={active ? { color: '#fff' } : null}
                  >
                    {x}
                  </Button>
                );
              })}
            </View>
            <Text style={styles.hint}>Work is stored as Office in backend.</Text>
          </CardContent>
        </Card>

        <Card style={{ zIndex: 5 }}>
          <CardHeader>
            <CardTitle row>
              <Search size={20} color={ORANGE} />
              <Text style={styles.cardTitleText}>Autocomplete</Text>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <View>
              <Input
                value={query}
                onChangeText={(text) => {
                  setQuery(text);
                  setSelectedSuggestionId('');
                }}
                placeholder="Start typing to search saved addresses…"
                style={{ paddingRight: 40 }}
              />
              <ChevronDown size={16} color={tw.gray400} style={{ position: 'absolute', right: 12, top: 10 }} />
            </View>
            {showDropdown ? (
              <View style={styles.dropdown}>
                {suggestions.length === 0 ? (
                  <Text style={{ padding: 16, fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) }}>No matches found.</Text>
                ) : (
                  suggestions.map((addr, i) => {
                    const id = getAddressId(addr);
                    const selected = id && selectedSuggestionId === id;
                    return (
                      <Press key={id || formatAddressLine(addr)} scale={0.99} onPress={() => onPickSuggestion(addr)} style={[styles.sug, i < suggestions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: tw.gray100 } : null]}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) }}>
                              {String(addr?.label || 'Saved').toLowerCase() === 'office' ? 'Work' : addr?.label || 'Saved'}
                            </Text>
                            {addr?.isDefault ? (
                              <Badge style={{ backgroundColor: tw.orange100 }} textStyle={{ color: tw.orange800 }}>
                                Default
                              </Badge>
                            ) : null}
                          </View>
                          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) }} numberOfLines={1}>
                            {formatAddressLine(addr)}
                          </Text>
                        </View>
                        {selected ? <Check size={20} color={ORANGE} style={{ paddingTop: 4 }} /> : null}
                      </Press>
                    );
                  })
                )}
              </View>
            ) : null}
            <Text style={styles.hint}>Selecting a suggestion will prefill the manual fields (you can still edit).</Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manual address fields</CardTitle>
          </CardHeader>
          <CardContent style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <Label>Address details*</Label>
              <Input placeholder="E.g. Floor, House no." value={form.additionalDetails} onChangeText={setField('additionalDetails')} />
            </View>
            <View style={{ gap: 8 }}>
              <Label>Street / Area *</Label>
              <Input placeholder="Street / Area" value={form.street} onChangeText={setField('street')} />
            </View>
            <View style={{ gap: 8 }}>
              <Label>City *</Label>
              <Input placeholder="City" value={form.city} onChangeText={setField('city')} />
            </View>
            <View style={{ gap: 8 }}>
              <Label>State *</Label>
              <Input placeholder="State" value={form.state} onChangeText={setField('state')} />
            </View>
            <View style={{ gap: 8 }}>
              <Label>Pincode (optional)</Label>
              <Input placeholder="Pincode" value={form.zipCode} onChangeText={setField('zipCode')} />
            </View>
            <View style={{ gap: 8 }}>
              <Label>Phone (optional)</Label>
              <Input placeholder="Phone" value={form.phone} onChangeText={setField('phone')} keyboardType="phone-pad" />
            </View>
          </CardContent>
        </Card>

        <View style={{ paddingTop: 8 }}>
          <Press scale={0.98} disabled={isSaving} onPress={onSave} accessibilityLabel="Save address" style={[styles.save, isSaving ? { opacity: 0.5 } : null]}>
            <Text style={{ fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(600) }}>{isSaving ? 'Saving...' : 'Save address'}</Text>
          </Press>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 18, lineHeight: 28, color: UI.foreground, ...poppins(700) },
  sub: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  cardTitleText: { fontSize: 16, lineHeight: 16, color: UI.foreground, ...poppins(600) },
  hint: { marginTop: 8, fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  dropdown: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', overflow: 'hidden', maxHeight: 288 },
  sug: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  save: { height: 48, borderRadius: 6, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
});
