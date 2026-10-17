/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/safety/SOSContacts.jsx.
 *
 * The SOS trigger itself is real — it calls triggerUserSosAlert, which posts
 * the rider's current ride and device location to /users/sos. The contacts
 * list is a UI mock on the web source too (MOCK_CONTACTS seed data, add/delete
 * are setTimeout placeholders with "// POST /api/v1/common/sos/store" left
 * as a comment, never an actual call) — carried over as-is, same as
 * PaymentSettingsScreen, rather than inventing a contacts-storage API this
 * backend doesn't expose yet.
 */
import React, {useRef, useState} from 'react';
import {ActivityIndicator, Linking, Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AlertTriangle, ArrowLeft, CheckCircle2, Phone, Plus, ShieldAlert, Trash2, User, X} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import {triggerUserSosAlert} from '../../services/taxi/safetyAlertService';

const MAX_CONTACTS = 5;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const MOCK_CONTACTS = [
  {id: '1', name: 'Rahul Verma', phone: '9876543210'},
  {id: '2', name: 'Priya Sharma', phone: '9123456789'},
];

const EMERGENCY_SERVICES = [
  {id: 'police', label: 'Police', phone: '100', color: '#2563eb', bg: '#eff6ff'},
  {id: 'ambulance', label: 'Ambulance', phone: '108', color: '#059669', bg: '#ecfdf5'},
  {id: 'fire', label: 'Fire Brigade', phone: '101', color: '#ea580c', bg: '#fff7ed'},
];

export default function SOSContactsScreen() {
  const navigation = useNavigation();
  const [contacts, setContacts] = useState(MOCK_CONTACTS);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [saving, setSaving] = useState(false);
  const [isTriggeringSos, setIsTriggeringSos] = useState(false);
  const intervalRef = useRef(null);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!PHONE_REGEX.test(phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (contacts.some(c => c.phone === phone)) e.phone = 'This number is already added';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 500)); // POST /api/v1/common/sos/store
    setContacts(prev => [...prev, {id: Date.now().toString(), name: name.trim(), phone}]);
    setName('');
    setPhone('');
    setErrors({});
    setShowAddSheet(false);
    setSaving(false);
  };

  const handleDelete = async id => {
    await new Promise(r => setTimeout(r, 300)); // POST /api/v1/common/sos/delete/:id
    setContacts(prev => prev.filter(c => c.id !== id));
    setDeleteTarget(null);
  };

  const triggerSOS = () => {
    if (isTriggeringSos) return;
    setSosActive(true);
    setCountdown(3);
    setIsTriggeringSos(true);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setSosActive(false);
          setCountdown(3);
          triggerUserSosAlert()
            .then(() => Toast.show({type: 'success', text1: 'SOS sent to safety center'}))
            .catch(error => Toast.show({type: 'error', text1: error?.message || 'Unable to send SOS right now'}))
            .finally(() => setIsTriggeringSos(false));
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <View className="px-5 pt-4 pb-4 border-b border-white/80 bg-white">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 rounded-xl border border-white/80 bg-white items-center justify-center">
            <ArrowLeft size={18} color="#0f172a" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[9px] font-black uppercase text-slate-400">Safety</Text>
            <Text className="text-[19px] font-black text-slate-900">SOS Contacts</Text>
          </View>
          <Pressable
            onPress={() => setShowAddSheet(true)}
            disabled={contacts.length >= MAX_CONTACTS}
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl"
            style={{backgroundColor: contacts.length >= MAX_CONTACTS ? '#f1f5f9' : '#0f172a'}}>
            <Plus size={13} color={contacts.length >= MAX_CONTACTS ? '#94a3b8' : '#fff'} />
            <Text className="text-[11px] font-black uppercase" style={{color: contacts.length >= MAX_CONTACTS ? '#94a3b8' : '#fff'}}>Add</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 20, gap: 16}}>
        <View className="rounded-[24px] p-5 bg-red-500">
          <View className="flex-row items-center gap-3 mb-4">
            <ShieldAlert size={22} color="#fff" />
            <View>
              <Text className="text-[14px] font-black text-white">Emergency SOS</Text>
              <Text className="text-[11px] font-bold text-red-100">Alerts all your emergency contacts</Text>
            </View>
          </View>
          <Pressable onPress={triggerSOS} disabled={sosActive} className="bg-white py-3.5 rounded-[14px] flex-row items-center justify-center gap-2">
            {sosActive ? (
              <>
                <Text className="text-[20px] font-black text-red-600">{countdown}</Text>
                <Text className="text-[14px] font-black uppercase text-red-600">Alerting contacts...</Text>
              </>
            ) : (
              <>
                <AlertTriangle size={16} color="#dc2626" />
                <Text className="text-[14px] font-black uppercase text-red-600">Trigger SOS</Text>
              </>
            )}
          </Pressable>
        </View>

        <View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[10px] font-black uppercase text-slate-400">Emergency Services</Text>
            <Text className="text-[10px] font-bold text-slate-400">Quick call</Text>
          </View>
          <View style={{gap: 10}}>
            {EMERGENCY_SERVICES.map(service => (
              <Pressable key={service.id} onPress={() => Linking.openURL(`tel:${service.phone}`)} className="rounded-[18px] border border-white/80 bg-white px-4 py-3.5">
                <View className="flex-row items-center gap-3">
                  <View className="h-10 w-10 rounded-full items-center justify-center" style={{backgroundColor: service.bg}}>
                    <Phone size={15} color={service.color} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-black text-slate-900">{service.label}</Text>
                    <Text className="text-[11px] font-bold text-slate-400 mt-0.5">Call {service.phone}</Text>
                  </View>
                  <View className="rounded-full bg-slate-900 px-3 py-1.5">
                    <Text className="text-[10px] font-black uppercase text-white">{service.phone}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-[10px] font-black uppercase text-slate-400">Emergency Contacts</Text>
            <Text className="text-[10px] font-bold text-slate-400">{contacts.length}/{MAX_CONTACTS}</Text>
          </View>

          {contacts.length === 0 && (
            <View className="rounded-[20px] border border-white/80 bg-white p-8 items-center gap-3">
              <ShieldAlert size={32} color="#cbd5e1" />
              <Text className="text-[13px] font-black text-slate-500">Add emergency contacts to stay safe</Text>
            </View>
          )}

          <View style={{gap: 8}}>
            {contacts.map(c => (
              <View key={c.id} className="rounded-[18px] border border-white/80 bg-white px-4 py-3.5 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
                  <Text className="text-[14px] font-black text-red-500">{c.name.charAt(0)}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-[14px] font-black text-slate-900" numberOfLines={1}>{c.name}</Text>
                  <Text className="text-[11px] font-bold text-slate-400 mt-0.5">+91 {c.phone}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable onPress={() => Linking.openURL(`tel:+91${c.phone}`)} className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center">
                    <Phone size={13} color="#10b981" />
                  </Pressable>
                  <Pressable onPress={() => setDeleteTarget(c)} className="w-8 h-8 rounded-full bg-red-50 border border-red-100 items-center justify-center">
                    <Trash2 size={13} color="#f87171" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showAddSheet} transparent animationType="slide" onRequestClose={() => setShowAddSheet(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-[28px] px-5 pt-4 pb-10">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-[18px] font-black text-slate-900">Add SOS Contact</Text>
              <Pressable onPress={() => setShowAddSheet(false)} className="w-8 h-8 rounded-full bg-slate-50 items-center justify-center">
                <X size={15} color="#64748b" />
              </Pressable>
            </View>
            <View style={{gap: 16}}>
              <View>
                <Text className="text-[11px] font-black text-slate-400 uppercase mb-1 ml-1">Name</Text>
                <View className="flex-row items-center gap-3 rounded-[14px] px-4 py-3 border-2" style={{borderColor: errors.name ? '#fecaca' : '#f1f5f9', backgroundColor: errors.name ? '#fef2f2' : '#f8fafc'}}>
                  <User size={16} color="#94a3b8" />
                  <TextInput
                    value={name}
                    onChangeText={text => {
                      setName(text);
                      setErrors(p => ({...p, name: ''}));
                    }}
                    placeholder="Contact name"
                    className="flex-1 text-[15px] font-bold text-slate-900"
                  />
                </View>
                {!!errors.name && <Text className="text-[11px] font-black text-red-500 ml-1 mt-1">{errors.name}</Text>}
              </View>
              <View>
                <Text className="text-[11px] font-black text-slate-400 uppercase mb-1 ml-1">Mobile Number</Text>
                <View className="flex-row items-center gap-3 rounded-[14px] px-4 py-3 border-2" style={{borderColor: errors.phone ? '#fecaca' : '#f1f5f9', backgroundColor: errors.phone ? '#fef2f2' : '#f8fafc'}}>
                  <Phone size={16} color="#94a3b8" />
                  <TextInput
                    value={phone}
                    onChangeText={text => {
                      setPhone(text.replace(/\D/g, '').slice(0, 10));
                      setErrors(p => ({...p, phone: ''}));
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    className="flex-1 text-[15px] font-bold text-slate-900"
                  />
                  {PHONE_REGEX.test(phone) && <CheckCircle2 size={16} color="#10b981" />}
                </View>
                {!!errors.phone && <Text className="text-[11px] font-black text-red-500 ml-1 mt-1">{errors.phone}</Text>}
              </View>
              <Pressable onPress={handleAdd} disabled={saving} className="bg-slate-900 py-4 rounded-[16px] items-center">
                {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-[14px] font-black uppercase">Save Contact</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="w-full max-w-sm bg-white rounded-[28px] p-7 items-center">
            <View className="w-14 h-14 bg-red-50 rounded-[18px] items-center justify-center mb-4">
              <Trash2 size={24} color="#f87171" />
            </View>
            <Text className="text-[17px] font-black text-slate-900 mb-1 text-center">Remove contact?</Text>
            <Text className="text-[13px] font-bold text-slate-400 mb-6 text-center">{deleteTarget?.name} will be removed from your SOS list.</Text>
            <View style={{gap: 10}} className="w-full">
              <Pressable onPress={() => handleDelete(deleteTarget.id)} className="bg-red-500 py-3.5 rounded-[16px] items-center">
                <Text className="text-white text-[13px] font-black uppercase">Remove</Text>
              </Pressable>
              <Pressable onPress={() => setDeleteTarget(null)} className="py-3.5 items-center">
                <Text className="text-[13px] font-black text-slate-400 uppercase">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
