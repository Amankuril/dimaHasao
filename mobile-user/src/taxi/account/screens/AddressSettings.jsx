import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Briefcase, Home, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { BottomSheet, Dialog } from '../../../components/kit';
import { localStore } from '../../../lib/storage';
import { tw } from '../../../theme';
import { BackBtn, Eyebrow, fo, useHeaderTop } from '../ui';

// Web: Taxi/modules/user/pages/profile/AddressSettings.jsx (/taxi/user/profile/addresses)

const STORAGE_KEY = 'Appzeto 24:savedAddresses';
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const defaultState = { home: { label: 'Home', address: '', landmark: '', notes: '' }, work: null, landmarks: [] };

const CARD = { backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', boxShadow: '0 14px 34px rgba(15,23,42,0.07)' };

function Field({ label, children }) {
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow style={{ letterSpacing: 2.6, fontSize: 10 }}>{label}</Eyebrow>
      {children}
    </View>
  );
}

const inputBase = { backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 16, paddingHorizontal: 16, fontSize: 14, color: tw.slate900, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', ...fo(700) };

function Btn({ children, onPress, primary }) {
  return (
    <Press onPress={onPress} style={[st.btn, primary ? { backgroundColor: tw.slate900, boxShadow: '0 16px 34px rgba(15,23,42,0.18)' } : { backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' }]}>
      {children}
    </Press>
  );
}

function AddressCard({ icon: Icon, title, subtitle, accent, onEdit, onDelete, isEmpty }) {
  return (
    <View style={[st.addrCard, CARD]}>
      <View style={[st.addrIcon]}><Icon size={22} color={accent} strokeWidth={2.6} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.addrTitle}>{title}</Text>
        <Text style={[st.addrSub, isEmpty && { color: tw.slate400, fontStyle: 'italic' }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Press onPress={onEdit} accessibilityLabel={`Edit ${title}`} style={st.round}><Pencil size={16} color={tw.slate500} strokeWidth={2.8} /></Press>
        {!isEmpty ? (
          <Press onPress={onDelete} accessibilityLabel={`Delete ${title}`} style={[st.round, { backgroundColor: tw.rose50, borderColor: tw.rose100 }]}>
            <Trash2 size={16} color={tw.rose500} strokeWidth={2.6} />
          </Press>
        ) : null}
      </View>
    </View>
  );
}

export default function AddressSettings() {
  const top = useHeaderTop();
  const [data, setData] = useState(() => {
    try {
      const saved = localStore.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed && typeof parsed === 'object' ? { ...defaultState, ...parsed } : defaultState;
    } catch {
      return defaultState;
    }
  });
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    try {
      localStore.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [data]);

  const draftDefaults = useMemo(() => {
    const mode = modal?.mode;
    if (!mode) return null;
    if (mode === 'home') return data.home || defaultState.home;
    if (mode === 'work') return data.work || { label: 'Work', address: '', landmark: '', notes: '' };
    const existing = data.landmarks.find((l) => l.id === modal.id);
    return existing || { id: createId(), label: '', address: '', landmark: '', notes: '' };
  }, [data, modal]);

  useEffect(() => { setDraft(draftDefaults); }, [draftDefaults]);

  const closeModal = () => setModal(null);

  const saveDraft = () => {
    if (!modal || !draft) return;
    if (modal.mode === 'home') {
      setData((p) => ({ ...p, home: { ...p.home, ...draft, label: 'Home' } }));
      closeModal();
    } else if (modal.mode === 'work') {
      setData((p) => ({ ...p, work: { ...draft, label: 'Work' } }));
      closeModal();
    } else if (modal.mode === 'landmark') {
      if (!draft.label.trim() || !draft.address.trim()) return;
      setData((p) => {
        const exists = p.landmarks.some((l) => l.id === draft.id);
        return { ...p, landmarks: exists ? p.landmarks.map((l) => (l.id === draft.id ? { ...draft } : l)) : [{ ...draft }, ...p.landmarks] };
      });
      closeModal();
    }
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.mode === 'home') setData((p) => ({ ...p, home: { ...p.home, address: '', landmark: '', notes: '' } }));
    else if (confirmDelete.mode === 'work') setData((p) => ({ ...p, work: null }));
    else setData((p) => ({ ...p, landmarks: p.landmarks.filter((l) => l.id !== confirmDelete.id) }));
    setConfirmDelete(null);
  };

  const homeSub = data.home?.address?.trim() ? data.home.address : 'Add your home address';
  const workSub = data.work?.address?.trim() ? data.work.address : 'Add your office address';
  const title = modal?.mode === 'home' ? 'Edit home' : modal?.mode === 'work' ? 'Edit work' : modal?.id ? 'Edit landmark' : 'Add landmark';
  const set = (k) => (v) => setDraft((p) => ({ ...p, [k]: v }));

  return (
    <LinearGradient colors={['#F8FAFC', '#F3F4F6', '#EEF2F7']} locations={[0, 0.38, 1]} style={st.flex}>
      <View style={[st.header, { paddingTop: top }]}>
        <BackBtn size={40} radius={20} style={{ borderWidth: 0, backgroundColor: 'transparent' }} strokeWidth={3} onPress={() => router.navigate('/taxi/user/profile')} />
        <View style={{ minWidth: 0 }}>
          <Eyebrow style={{ fontSize: 10, letterSpacing: 2.6 }}>Profile</Eyebrow>
          <Text style={st.title}>Addresses</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 112, gap: 20 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 12 }}>
          <AddressCard icon={Home} title="Home" subtitle={homeSub} accent={tw.orange600} isEmpty={!data.home?.address?.trim()} onEdit={() => setModal({ mode: 'home' })} onDelete={() => setConfirmDelete({ mode: 'home', title: 'Home address' })} />
          <AddressCard icon={Briefcase} title="Work" subtitle={workSub} accent={tw.indigo600} isEmpty={!data.work?.address?.trim()} onEdit={() => setModal({ mode: 'work' })} onDelete={() => setConfirmDelete({ mode: 'work', title: 'Work address' })} />
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <View>
              <Eyebrow style={{ fontSize: 10, letterSpacing: 2.6 }}>Landmarks</Eyebrow>
              <Text style={st.saved}>Saved places</Text>
            </View>
            <Press onPress={() => setModal({ mode: 'landmark' })} style={st.addPill}>
              <Plus size={14} color={tw.slate700} strokeWidth={3} />
              <Text style={st.addPillText}>Add</Text>
            </Press>
          </View>

          {data.landmarks.length > 0 ? (
            <View style={[{ borderRadius: 22, overflow: 'hidden' }, CARD]}>
              {data.landmarks.map((lm, i) => (
                <View key={lm.id} style={[st.lm, i > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.7)' }]}>
                  <View style={st.lmIcon}><MapPin size={18} color={tw.slate500} strokeWidth={2.6} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.lmTitle} numberOfLines={1}>{lm.label}</Text>
                    <Text style={st.lmSub} numberOfLines={1}>{lm.address}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Press onPress={() => setModal({ mode: 'landmark', id: lm.id })} accessibilityLabel={`Edit ${lm.label}`} style={st.round}><Pencil size={16} color={tw.slate500} strokeWidth={2.8} /></Press>
                    <Press onPress={() => setConfirmDelete({ mode: 'landmark', id: lm.id, title: lm.label })} accessibilityLabel={`Delete ${lm.label}`} style={[st.round, { backgroundColor: tw.rose50, borderColor: tw.rose100 }]}>
                      <Trash2 size={16} color={tw.rose500} strokeWidth={2.6} />
                    </Press>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[{ borderRadius: 22, padding: 20, alignItems: 'center' }, CARD]}>
              <View style={[st.lmIcon, { width: 48, height: 48 }]}><MapPin size={20} color={tw.slate400} strokeWidth={2.6} /></View>
              <Text style={[st.addrTitle, { marginTop: 12, fontSize: 14 }]}>No landmarks yet</Text>
              <Text style={[st.addrSub, { marginTop: 4, textAlign: 'center' }]}>Save places like “Gym”, “Mom’s house”, or “Office gate”.</Text>
              <View style={{ marginTop: 16, alignSelf: 'stretch' }}>
                <Btn onPress={() => setModal({ mode: 'landmark' })}>
                  <Plus size={14} color={tw.slate800} strokeWidth={3} />
                  <Text style={[st.btnText, { color: tw.slate800 }]}>Add landmark</Text>
                </Btn>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomSheet visible={Boolean(modal && draft)} onClose={closeModal} backdrop="rgba(0,0,0,0.55)" panelStyle={{ padding: 12 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={st.sheet}>
            <View style={st.sheetHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={st.sheetTitle}>{title}</Text>
                <Text style={st.sheetSub}>{modal?.mode === 'landmark' ? 'Save a place for quick access.' : 'Update your saved address.'}</Text>
              </View>
              <Press onPress={closeModal} accessibilityLabel="Close" style={st.close}><X size={18} color={tw.slate500} strokeWidth={2.8} /></Press>
            </View>
            {draft ? (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
                {modal?.mode === 'landmark' ? (
                  <Field label="Label">
                    <TextInput value={draft.label} onChangeText={set('label')} placeholder="e.g., Gym, Office gate" placeholderTextColor={tw.slate300} style={[inputBase, { height: 48 }]} />
                  </Field>
                ) : null}
                <Field label="Address">
                  <TextInput value={draft.address} onChangeText={set('address')} placeholder="Add full address" placeholderTextColor={tw.slate300} multiline numberOfLines={3} textAlignVertical="top" style={[inputBase, { height: 88, paddingTop: 12 }]} />
                </Field>
                <Field label="Landmark (Optional)">
                  <TextInput value={draft.landmark} onChangeText={set('landmark')} placeholder="Near…" placeholderTextColor={tw.slate300} style={[inputBase, { height: 48 }]} />
                </Field>
                <Field label="Notes (Optional)">
                  <TextInput value={draft.notes} onChangeText={set('notes')} placeholder="e.g., Ring bell, call on arrival" placeholderTextColor={tw.slate300} style={[inputBase, { height: 48 }]} />
                </Field>
                <View style={{ paddingTop: 8, gap: 10 }}>
                  <Btn primary onPress={saveDraft}><Text style={[st.btnText, { color: '#fff' }]}>{modal?.mode === 'landmark' ? 'Save landmark' : 'Save address'}</Text></Btn>
                  <Btn onPress={closeModal}><Text style={[st.btnText, { color: tw.slate800 }]}>Cancel</Text></Btn>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>

      <Dialog visible={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} backdrop="rgba(0,0,0,0.55)" panelStyle={st.dialog}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, color: tw.slate900, ...fo(900) }}>Delete</Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: tw.slate500, ...fo(700) }}>
              Remove <Text style={{ color: tw.slate900 }}>{confirmDelete?.title}</Text> from saved addresses?
            </Text>
          </View>
          <Press onPress={() => setConfirmDelete(null)} accessibilityLabel="Close" style={st.close}><X size={18} color={tw.slate500} strokeWidth={2.8} /></Press>
        </View>
        <View style={{ marginTop: 20, gap: 8 }}>
          <Press onPress={() => setConfirmDelete(null)} style={[st.dBtn, { backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' }]}>
            <Text style={[st.dText, { color: tw.slate700 }]}>Cancel</Text>
          </Press>
          <Press onPress={doDelete} style={[st.dBtn, { backgroundColor: tw.rose600, boxShadow: '0 16px 34px rgba(225,29,72,0.22)' }]}>
            <Text style={[st.dText, { color: '#fff' }]}>Delete</Text>
          </Press>
        </View>
      </Dialog>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  header: { backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.7)', boxShadow: '0 10px 20px rgba(15,23,42,0.05)' },
  title: { marginTop: 4, fontSize: 18, color: tw.slate900, letterSpacing: -0.3, ...fo(900) },
  addrCard: { borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  addrIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  addrTitle: { fontSize: 15, color: tw.slate900, lineHeight: 15, ...fo(900) },
  addrSub: { marginTop: 4, fontSize: 12, color: tw.slate500, ...fo(700) },
  round: { width: 36, height: 36, borderRadius: 18, backgroundColor: tw.slate50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  saved: { marginTop: 4, fontSize: 15, color: tw.slate900, letterSpacing: -0.2, ...fo(900) },
  addPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  addPillText: { fontSize: 11, color: tw.slate700, ...fo(900) },
  lm: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  lmIcon: { width: 40, height: 40, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  lmTitle: { fontSize: 14, color: tw.slate900, ...fo(900) },
  lmSub: { marginTop: 4, fontSize: 12, color: tw.slate500, ...fo(700) },
  sheet: { maxHeight: '100%', borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.97)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.6)' },
  sheetTitle: { fontSize: 16, color: tw.slate900, letterSpacing: -0.2, ...fo(900) },
  sheetSub: { marginTop: 4, fontSize: 12, color: tw.slate500, ...fo(700) },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  btnText: { fontSize: 12, letterSpacing: 2.2, textTransform: 'uppercase', ...fo(900) },
  dialog: { width: '100%', maxWidth: 384, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', padding: 20, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  dBtn: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  dText: { fontSize: 12, letterSpacing: 1.9, textTransform: 'uppercase', ...fo(900) },
});
