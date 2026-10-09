/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/profile/PaymentSettings.jsx.
 *
 * This screen is a UI mock on the web source too — "Add Method" is a
 * setTimeout that never calls a backend, and the added cards/UPI IDs live
 * only in component state (gone on next visit). That isn't a gap introduced
 * by this port; it's the current behavior of the file being ported, so it's
 * carried over as-is rather than inventing a save-payment-method API this
 * repo's backend doesn't expose yet.
 */
import React, {useState} from 'react';
import {ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ArrowLeft, Banknote, CreditCard, Plus, Smartphone, X} from 'lucide-react-native';

const PAYMENT_OPTIONS = [
  {id: 'upi', label: 'UPI', Icon: Smartphone, color: '#9333ea', bg: '#faf5ff'},
  {id: 'card', label: 'Credit / Debit Card', Icon: CreditCard, color: '#2563eb', bg: '#eff6ff'},
];

export default function PaymentSettingsScreen() {
  const navigation = useNavigation();
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [added, setAdded] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const canSubmit = selected === 'upi' ? upiId.trim() : cardNumber && cardName && cardExpiry;

  const handleAdd = () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      const label = selected === 'upi' ? upiId : `•••• ${cardNumber.slice(-4)}`;
      setTimeout(() => {
        setAdded(prev => [...prev, {id: Date.now(), type: selected, label}]);
        setIsSuccess(false);
        setShowModal(false);
        setSelected(null);
        setUpiId('');
        setCardNumber('');
        setCardName('');
        setCardExpiry('');
      }, 1800);
    }, 1500);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelected(null);
    setUpiId('');
    setCardNumber('');
    setCardName('');
    setCardExpiry('');
    setIsSuccess(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FDFDFD]">
      <View className="px-5 py-5 flex-row items-center gap-6 border-b border-gray-50">
        <Pressable onPress={() => navigation.navigate('TaxiProfile')} className="p-2">
          <ArrowLeft size={24} color="#0f172a" />
        </Pressable>
        <Text className="text-[18px] font-black text-slate-900">Payments</Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 20, gap: 16}}>
        <View className="bg-white p-6 rounded-[32px] border border-gray-50 flex-row items-center justify-between">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 bg-green-50 rounded-2xl items-center justify-center">
              <Banknote size={22} color="#16a34a" />
            </View>
            <View>
              <Text className="font-black text-slate-900">Cash</Text>
              <Text className="text-xs text-gray-400">Default</Text>
            </View>
          </View>
          <View className="w-6 h-6 bg-green-500 rounded-full items-center justify-center">
            <Plus size={14} color="#fff" style={{transform: [{rotate: '45deg'}]}} />
          </View>
        </View>

        {added.map(item => (
          <View key={item.id} className="bg-white p-6 rounded-[32px] border border-gray-50 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{backgroundColor: item.type === 'upi' ? '#faf5ff' : '#eff6ff'}}>
                {item.type === 'upi' ? <Smartphone size={20} color="#9333ea" /> : <CreditCard size={20} color="#2563eb" />}
              </View>
              <View>
                <Text className="font-black text-slate-900">{item.label}</Text>
                <Text className="text-xs text-gray-400">{item.type === 'upi' ? 'UPI' : 'Card'}</Text>
              </View>
            </View>
            <Pressable onPress={() => setAdded(prev => prev.filter(a => a.id !== item.id))} className="w-7 h-7 bg-red-50 rounded-full items-center justify-center">
              <X size={14} color="#f87171" />
            </Pressable>
          </View>
        ))}

        <Pressable onPress={() => setShowModal(true)} className="py-5 border-2 border-dashed border-gray-200 rounded-[32px] flex-row items-center justify-center gap-2">
          <Plus size={18} color="#94a3b8" />
          <Text className="text-gray-400 font-bold">Add New Payment Method</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={handleClose}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-[32px] p-8 pb-10" style={{gap: 24}}>
            <Pressable onPress={handleClose} className="absolute top-6 right-6 w-10 h-10 bg-gray-50 rounded-full items-center justify-center">
              <X size={18} color="#94a3b8" />
            </Pressable>

            <View className="items-center" style={{gap: 4}}>
              <Text className="text-xl font-black text-gray-900 uppercase">Add Payment Method</Text>
              <Text className="text-[11px] font-bold text-gray-400 uppercase">Choose a method to add</Text>
            </View>

            {isSuccess ? (
              <View className="items-center py-8 gap-4">
                <View className="w-20 h-20 bg-green-50 rounded-full items-center justify-center">
                  <Plus size={40} color="#22c55e" />
                </View>
                <Text className="text-lg font-black text-gray-900">Payment Method Added!</Text>
              </View>
            ) : (
              <>
                <View className="flex-row gap-3">
                  {PAYMENT_OPTIONS.map(option => (
                    <Pressable
                      key={option.id}
                      onPress={() => setSelected(option.id)}
                      className="flex-1 p-5 rounded-[24px] border-2 items-center gap-3"
                      style={{borderColor: selected === option.id ? option.color : '#f1f5f9', backgroundColor: selected === option.id ? option.bg : '#fff'}}>
                      <View className="w-12 h-12 rounded-2xl items-center justify-center" style={{backgroundColor: option.bg}}>
                        <option.Icon size={22} color={option.color} />
                      </View>
                      <Text className="text-[12px] font-black text-gray-700 text-center">{option.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {selected === 'upi' && (
                  <TextInput value={upiId} onChangeText={setUpiId} placeholder="Enter UPI ID (e.g. name@upi)" className="h-14 bg-gray-50 border-2 border-gray-100 rounded-[18px] px-5 text-[14px] font-bold text-gray-900" />
                )}

                {selected === 'card' && (
                  <View style={{gap: 12}}>
                    <TextInput
                      value={cardNumber}
                      onChangeText={text => setCardNumber(text.replace(/\D/g, '').slice(0, 16))}
                      placeholder="Card number"
                      keyboardType="numeric"
                      className="h-14 bg-gray-50 border-2 border-gray-100 rounded-[18px] px-5 text-[14px] font-bold text-gray-900"
                    />
                    <TextInput value={cardName} onChangeText={setCardName} placeholder="Name on card" className="h-14 bg-gray-50 border-2 border-gray-100 rounded-[18px] px-5 text-[14px] font-bold text-gray-900" />
                    <TextInput value={cardExpiry} onChangeText={setCardExpiry} placeholder="MM / YY" className="h-14 bg-gray-50 border-2 border-gray-100 rounded-[18px] px-5 text-[14px] font-bold text-gray-900" />
                  </View>
                )}

                {!!selected && (
                  <Pressable
                    onPress={handleAdd}
                    disabled={isSubmitting || !canSubmit}
                    className="h-14 rounded-[22px] items-center justify-center flex-row gap-2"
                    style={{backgroundColor: isSubmitting || !canSubmit ? '#f1f5f9' : '#0f172a'}}>
                    {isSubmitting ? (
                      <ActivityIndicator color="#94a3b8" />
                    ) : (
                      <>
                        <Plus size={18} color="#fff" />
                        <Text className="font-black text-[14px] uppercase text-white">Add Method</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
