/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/profile/AddressSettings.jsx.
 * Purely local (no backend calls on the web either) — localStorage becomes
 * AsyncStorage, same storage key.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ArrowLeft, Briefcase, Home, MapPin, Pencil, Plus, Trash2, X} from 'lucide-react-native';

const STORAGE_KEY = 'Appzeto 24:savedAddresses';
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_STATE = {home: {label: 'Home', address: '', landmark: '', notes: ''}, work: null, landmarks: []};

function AddressCard({Icon, title, subtitle, color, onEdit, onDelete, isEmpty}) {
  return (
    <View className="bg-white rounded-[22px] border border-slate-100 p-4 flex-row items-start gap-4">
      <View className="w-12 h-12 rounded-2xl border border-slate-100 bg-slate-50 items-center justify-center">
        <Icon size={22} color={color} />
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 min-w-0">
            <Text className="text-[15px] font-black text-slate-900">{title}</Text>
            <Text className={`mt-1 text-[12px] font-bold ${isEmpty ? 'text-slate-400' : 'text-slate-500'}`} numberOfLines={1}>{subtitle}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable onPress={onEdit} className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 items-center justify-center">
              <Pencil size={16} color="#64748b" />
            </Pressable>
            {!isEmpty && (
              <Pressable onPress={onDelete} className="w-9 h-9 rounded-full bg-rose-50 border border-rose-100 items-center justify-center">
                <Trash2 size={16} color="#f43f5e" />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AddressSettingsScreen() {
  const navigation = useNavigation();
  const [data, setData] = useState(DEFAULT_STATE);
  const [modal, setModal] = useState(null); // {mode: 'home'|'work'|'landmark', id?}
  const [draft, setDraft] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') setData({...DEFAULT_STATE, ...parsed});
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  const draftDefaults = useMemo(() => {
    const mode = modal?.mode;
    if (!mode) return null;
    if (mode === 'home') return data.home || DEFAULT_STATE.home;
    if (mode === 'work') return data.work || {label: 'Work', address: '', landmark: '', notes: ''};
    if (mode === 'landmark') {
      const existing = data.landmarks.find(l => l.id === modal.id);
      return existing || {id: createId(), label: '', address: '', landmark: '', notes: ''};
    }
    return null;
  }, [data, modal]);

  useEffect(() => {
    setDraft(draftDefaults);
  }, [draftDefaults]);

  const closeModal = () => setModal(null);
  const openEdit = (mode, id) => setModal({mode, id});

  const saveDraft = () => {
    if (!modal || !draft) return;

    if (modal.mode === 'home') {
      setData(prev => ({...prev, home: {...prev.home, ...draft, label: 'Home'}}));
      closeModal();
      return;
    }
    if (modal.mode === 'work') {
      setData(prev => ({...prev, work: {...draft, label: 'Work'}}));
      closeModal();
      return;
    }
    if (modal.mode === 'landmark') {
      if (!draft.label.trim() || !draft.address.trim()) return;
      setData(prev => {
        const exists = prev.landmarks.some(l => l.id === draft.id);
        const nextLandmarks = exists ? prev.landmarks.map(l => (l.id === draft.id ? {...draft} : l)) : [{...draft}, ...prev.landmarks];
        return {...prev, landmarks: nextLandmarks};
      });
      closeModal();
    }
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.mode === 'home') setData(prev => ({...prev, home: {...prev.home, address: '', landmark: '', notes: ''}}));
    else if (confirmDelete.mode === 'work') setData(prev => ({...prev, work: null}));
    else if (confirmDelete.mode === 'landmark') setData(prev => ({...prev, landmarks: prev.landmarks.filter(l => l.id !== confirmDelete.id)}));
    setConfirmDelete(null);
  };

  const homeSubtitle = data.home?.address?.trim() ? data.home.address : 'Add your home address';
  const workSubtitle = data.work?.address?.trim() ? data.work.address : 'Add your office address';
  const hasLandmarks = data.landmarks.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <View className="px-5 py-4 border-b border-slate-100 bg-white">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.navigate('TaxiProfile')} className="p-2 -ml-2">
            <ArrowLeft size={22} color="#0f172a" />
          </Pressable>
          <View>
            <Text className="text-[10px] font-black uppercase text-slate-400">Profile</Text>
            <Text className="mt-1 text-[18px] font-black text-slate-900">Addresses</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 20, gap: 20}}>
        <View style={{gap: 12}}>
          <AddressCard Icon={Home} title="Home" subtitle={homeSubtitle} color="#ea580c" isEmpty={!data.home?.address?.trim()} onEdit={() => openEdit('home')} onDelete={() => setConfirmDelete({mode: 'home', title: 'Home address'})} />
          <AddressCard Icon={Briefcase} title="Work" subtitle={workSubtitle} color="#4f46e5" isEmpty={!data.work?.address?.trim()} onEdit={() => openEdit('work')} onDelete={() => setConfirmDelete({mode: 'work', title: 'Work address'})} />
        </View>

        <View style={{gap: 12}}>
          <View className="flex-row items-end justify-between px-1">
            <View>
              <Text className="text-[10px] font-black uppercase text-slate-400">Landmarks</Text>
              <Text className="mt-1 text-[15px] font-black text-slate-900">Saved places</Text>
            </View>
            <Pressable onPress={() => openEdit('landmark')} className="flex-row items-center gap-2 rounded-full bg-white border border-slate-100 px-3 py-2">
              <Plus size={14} color="#334155" />
              <Text className="text-[11px] font-black text-slate-700">Add</Text>
            </Pressable>
          </View>

          {hasLandmarks ? (
            <View className="bg-white rounded-[22px] border border-slate-100 overflow-hidden">
              {data.landmarks.map((lm, index) => (
                <View key={lm.id} className="flex-row items-start gap-3 px-4 py-3" style={index > 0 ? {borderTopWidth: 1, borderTopColor: '#f8fafc'} : null}>
                  <View className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 items-center justify-center">
                    <MapPin size={18} color="#64748b" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-[14px] font-black text-slate-900" numberOfLines={1}>{lm.label}</Text>
                    <Text className="mt-1 text-[12px] font-bold text-slate-500" numberOfLines={1}>{lm.address}</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable onPress={() => openEdit('landmark', lm.id)} className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 items-center justify-center">
                      <Pencil size={16} color="#64748b" />
                    </Pressable>
                    <Pressable onPress={() => setConfirmDelete({mode: 'landmark', id: lm.id, title: lm.label})} className="w-9 h-9 rounded-full bg-rose-50 border border-rose-100 items-center justify-center">
                      <Trash2 size={16} color="#f43f5e" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-white rounded-[22px] border border-slate-100 p-5 items-center">
              <View className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 items-center justify-center">
                <MapPin size={20} color="#94a3b8" />
              </View>
              <Text className="mt-3 text-[14px] font-black text-slate-900">No landmarks yet</Text>
              <Text className="mt-1 text-[12px] font-bold text-slate-500 text-center">Save places like "Gym", "Mom's house", or "Office gate".</Text>
              <Pressable onPress={() => openEdit('landmark')} className="mt-4 flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Plus size={14} color="#334155" />
                <Text className="text-[12px] font-black text-slate-700 uppercase">Add landmark</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={!!(modal && draft)} transparent animationType="slide" onRequestClose={closeModal}>
        <View className="flex-1 bg-black/55 justify-end">
          <View className="bg-white rounded-t-[28px] max-h-[85%]">
            <View className="px-5 pt-5 pb-4 border-b border-slate-100 flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-[16px] font-black text-slate-900">
                  {modal?.mode === 'home' ? 'Edit home' : modal?.mode === 'work' ? 'Edit work' : modal?.id ? 'Edit landmark' : 'Add landmark'}
                </Text>
                <Text className="mt-1 text-[12px] font-bold text-slate-500">{modal?.mode === 'landmark' ? 'Save a place for quick access.' : 'Update your saved address.'}</Text>
              </View>
              <Pressable onPress={closeModal} className="w-10 h-10 rounded-full bg-white border border-slate-100 items-center justify-center">
                <X size={18} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{padding: 20, gap: 16}} keyboardShouldPersistTaps="handled">
              {modal?.mode === 'landmark' && (
                <View style={{gap: 6}}>
                  <Text className="text-[10px] font-black uppercase text-slate-400">Label</Text>
                  <TextInput value={draft?.label} onChangeText={text => setDraft(prev => ({...prev, label: text}))} placeholder="e.g., Gym, Office gate" className="h-12 rounded-2xl bg-white border border-slate-100 px-4 text-[14px] font-bold text-slate-900" />
                </View>
              )}
              <View style={{gap: 6}}>
                <Text className="text-[10px] font-black uppercase text-slate-400">Address</Text>
                <TextInput value={draft?.address} onChangeText={text => setDraft(prev => ({...prev, address: text}))} placeholder="Add full address" multiline numberOfLines={3} className="rounded-2xl bg-white border border-slate-100 px-4 py-3 text-[14px] font-bold text-slate-900" />
              </View>
              <View style={{gap: 6}}>
                <Text className="text-[10px] font-black uppercase text-slate-400">Landmark (Optional)</Text>
                <TextInput value={draft?.landmark} onChangeText={text => setDraft(prev => ({...prev, landmark: text}))} placeholder="Near..." className="h-12 rounded-2xl bg-white border border-slate-100 px-4 text-[14px] font-bold text-slate-900" />
              </View>
              <View style={{gap: 6}}>
                <Text className="text-[10px] font-black uppercase text-slate-400">Notes (Optional)</Text>
                <TextInput value={draft?.notes} onChangeText={text => setDraft(prev => ({...prev, notes: text}))} placeholder="e.g., Ring bell, call on arrival" className="h-12 rounded-2xl bg-white border border-slate-100 px-4 text-[14px] font-bold text-slate-900" />
              </View>

              <View style={{gap: 10}} className="pt-2">
                <Pressable onPress={saveDraft} className="rounded-2xl bg-slate-900 px-4 py-3 items-center">
                  <Text className="text-[12px] font-black uppercase text-white">{modal?.mode === 'landmark' ? 'Save landmark' : 'Save address'}</Text>
                </Pressable>
                <Pressable onPress={closeModal} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 items-center">
                  <Text className="text-[12px] font-black uppercase text-slate-700">Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
        <View className="flex-1 bg-black/55 items-center justify-center px-4">
          <View className="w-full max-w-sm rounded-[26px] bg-white border border-slate-100 p-5">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-[15px] font-black text-slate-900">Delete</Text>
                <Text className="mt-1 text-[12px] font-bold text-slate-500">Remove {confirmDelete?.title} from saved addresses?</Text>
              </View>
              <Pressable onPress={() => setConfirmDelete(null)} className="w-10 h-10 rounded-full bg-white border border-slate-100 items-center justify-center">
                <X size={18} color="#64748b" />
              </Pressable>
            </View>
            <View className="mt-5 flex-row gap-2">
              <Pressable onPress={() => setConfirmDelete(null)} className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 items-center">
                <Text className="text-[12px] font-black uppercase text-slate-700">Cancel</Text>
              </Pressable>
              <Pressable onPress={doDelete} className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 items-center">
                <Text className="text-[12px] font-black uppercase text-white">Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
