/**
 * Ported from Frontend/src/modules/Food/pages/user/cart/SelectAddress.jsx
 * (369 lines), reachable from Cart/Checkout's "Change address" links.
 *
 * On web, tapping a saved-address suggestion only prefills the manual
 * form fields, and the single Save button always calls `addAddress`
 * (creating a new address row with the same data) before setting it
 * default — so picking an existing address re-saves a duplicate of it.
 * That's corrected here rather than carried over: picking a saved address
 * below calls `setDefaultAddress` directly and goes back; "Add new
 * address" is a separate, explicit action that calls `addAddress`.
 */
import React, {useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, Check, MapPin, Plus} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {useFoodProfile} from '../../context/FoodProfileContext';

const GREEN = '#0a4d2b';
const getAddressId = address => address?.id || address?._id || '';

const formatAddressLine = address => {
  if (!address) return '';
  return [address.additionalDetails, address.street, address.city, address.state, address.zipCode].filter(Boolean).join(', ');
};

const toBackendLabel = label => {
  const v = String(label || '').toLowerCase();
  if (v === 'work') return 'Office';
  if (v === 'home') return 'Home';
  return 'Other';
};

export default function FoodSelectAddressScreen() {
  const navigation = useNavigation();
  const {addresses = [], addAddress, setDefaultAddress, getDefaultAddress} = useFoodProfile();
  const defaultAddress = getDefaultAddress?.() || null;

  const [showForm, setShowForm] = useState(addresses.length === 0);
  const [label, setLabel] = useState('Home');
  const [form, setForm] = useState({additionalDetails: '', street: '', city: '', state: '', zipCode: '', phone: ''});
  const [selectingId, setSelectingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickSaved = async address => {
    const id = getAddressId(address);
    if (!id) return;
    setSelectingId(id);
    try {
      await setDefaultAddress(id);
      navigation.goBack();
    } catch {
      Toast.show({type: 'error', text1: 'Could not select this address'});
    } finally {
      setSelectingId(null);
    }
  };

  const handleSave = async () => {
    const street = form.street.trim();
    const city = form.city.trim();
    const state = form.state.trim();
    if (!street || !city || !state) {
      Toast.show({type: 'error', text1: 'Please fill Street, City and State'});
      return;
    }

    setIsSaving(true);
    try {
      const created = await addAddress({
        label: toBackendLabel(label),
        additionalDetails: form.additionalDetails.trim(),
        street,
        city,
        state,
        zipCode: form.zipCode.trim(),
        phone: form.phone.trim(),
      });
      const newId = getAddressId(created);
      if (newId) await setDefaultAddress(newId);
      Toast.show({type: 'success', text1: 'Address saved'});
      navigation.goBack();
    } catch (err) {
      Toast.show({type: 'error', text1: err?.response?.data?.error || err?.message || 'Failed to save address'});
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 items-center justify-center rounded-full border border-gray-100">
          <ArrowLeft size={18} color="#111827" />
        </Pressable>
        <View>
          <Text className="text-base font-bold text-gray-900">Select address</Text>
          <Text className="text-xs text-gray-500">Pick a saved address or add a new one</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 40}}>
        {addresses.length > 0 && (
          <View style={{gap: 10}}>
            {addresses.map(address => {
              const id = getAddressId(address);
              const isDefault = defaultAddress && getAddressId(defaultAddress) === id;
              return (
                <Pressable key={id || formatAddressLine(address)} onPress={() => handlePickSaved(address)} className={`border-2 rounded-xl p-3.5 flex-row items-start justify-between ${isDefault ? 'border-[#0a4d2b] bg-orange-50' : 'border-gray-200'}`}>
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-bold text-gray-900">{String(address?.label || 'Saved').toLowerCase() === 'office' ? 'Work' : address?.label || 'Saved'}</Text>
                      {isDefault && <Text className="text-[10px] font-bold text-[#0a4d2b] bg-orange-100 px-2 py-0.5 rounded-full">Default</Text>}
                    </View>
                    <Text className="text-sm text-gray-600 mt-1">{formatAddressLine(address)}</Text>
                  </View>
                  {selectingId === id ? <ActivityIndicator color={GREEN} size="small" /> : isDefault ? <Check size={18} color={GREEN} /> : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable onPress={() => setShowForm(v => !v)} className="flex-row items-center gap-2 mt-4 py-2">
          <Plus size={18} color={GREEN} />
          <Text className="text-sm font-bold text-[#0a4d2b]">Add new address</Text>
        </Pressable>

        {showForm && (
          <View className="mt-2 border border-gray-100 rounded-2xl p-4" style={{gap: 14}}>
            <View>
              <Text className="text-xs font-semibold text-gray-500 mb-2">Save as</Text>
              <View className="flex-row gap-2">
                {['Home', 'Work', 'Other'].map(x => (
                  <Pressable key={x} onPress={() => setLabel(x)} className={`flex-1 items-center py-2 rounded-xl border ${label === x ? 'border-[#0a4d2b] bg-[#0a4d2b]' : 'border-gray-200'}`}>
                    <Text className={`text-sm font-semibold ${label === x ? 'text-white' : 'text-gray-700'}`}>{x}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Field label="Address details (floor, house no.)" value={form.additionalDetails} onChangeText={t => setForm(f => ({...f, additionalDetails: t}))} />
            <Field label="Street / Area *" value={form.street} onChangeText={t => setForm(f => ({...f, street: t}))} />
            <View className="flex-row gap-3">
              <Field label="City *" value={form.city} onChangeText={t => setForm(f => ({...f, city: t}))} className="flex-1" />
              <Field label="State *" value={form.state} onChangeText={t => setForm(f => ({...f, state: t}))} className="flex-1" />
            </View>
            <View className="flex-row gap-3">
              <Field label="Pincode" value={form.zipCode} onChangeText={t => setForm(f => ({...f, zipCode: t}))} keyboardType="number-pad" className="flex-1" />
              <Field label="Phone" value={form.phone} onChangeText={t => setForm(f => ({...f, phone: t}))} keyboardType="phone-pad" className="flex-1" />
            </View>

            <Pressable onPress={handleSave} disabled={isSaving} className={`rounded-xl py-3 items-center mt-1 ${isSaving ? 'bg-gray-300' : 'bg-[#0a4d2b]'}`}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Save address</Text>}
            </Pressable>
          </View>
        )}

        {addresses.length === 0 && !showForm && (
          <View className="items-center py-10">
            <MapPin size={32} color="#9ca3af" />
            <Text className="text-sm text-gray-500 mt-2">No saved addresses yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Field({label, className = '', ...props}) {
  return (
    <View className={className}>
      <Text className="text-xs font-semibold text-gray-500 mb-1.5">{label}</Text>
      <TextInput {...props} placeholderTextColor="#9ca3af" className="border border-gray-200 rounded-xl px-3 h-11 text-sm text-gray-900" />
    </View>
  );
}
