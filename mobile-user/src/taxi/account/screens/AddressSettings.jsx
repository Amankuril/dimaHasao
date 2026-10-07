import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Briefcase, Home, MapPin, Pencil, Trash2, X } from 'lucide-react-native';
import { Button, Card, EmptyState, IconButton, SectionHeader } from '../../../components/ds';
import { BottomSheet, Dialog } from '../../../components/kit';
import { localStore } from '../../../lib/storage';
import { color, elevation, radii, space, tone, type } from '../../../theme';
import { Field, PageTitle, useNavPad } from '../ui';

// Web: Taxi/modules/user/pages/profile/AddressSettings.jsx (/taxi/user/profile/addresses)

const STORAGE_KEY = 'Appzeto 24:savedAddresses';
const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const defaultState = { home: { label: 'Home', address: '', landmark: '', notes: '' }, work: null, landmarks: [] };

function AddressCard({ icon: Icon, title, subtitle, iconTone, onEdit, onDelete, isEmpty }) {
  const t = tone[iconTone] || tone.primary;
  return (
    <Card style={st.addrCard}>
      <View style={[st.addrIcon, { backgroundColor: t.bg }]}>
        <Icon size={20} color={t.fg} />
      </View>
      <View style={st.grow}>
        <Text style={[type.subheading, { color: color.text }]}>{title}</Text>
        <Text style={[type.small, { color: isEmpty ? color.textMuted : color.textSecondary }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <View style={st.actions}>
        <IconButton icon={Pencil} label={`Edit ${title}`} variant="soft" iconSize={18} onPress={onEdit} />
        {!isEmpty ? <IconButton icon={Trash2} label={`Delete ${title}`} variant="danger" iconSize={18} onPress={onDelete} /> : null}
      </View>
    </Card>
  );
}

export default function AddressSettings() {
  const bottomPad = useNavPad(space.xxl);
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
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
    <View style={st.flex}>
      <PageTitle title="Addresses" subtitle="Home, work and saved places" onBack={() => router.navigate('/taxi/user/profile')} />

      <ScrollView contentContainerStyle={[st.content, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <View style={{ gap: space.md }}>
          <AddressCard icon={Home} title="Home" subtitle={homeSub} iconTone="primary" isEmpty={!data.home?.address?.trim()} onEdit={() => setModal({ mode: 'home' })} onDelete={() => setConfirmDelete({ mode: 'home', title: 'Home address' })} />
          <AddressCard icon={Briefcase} title="Work" subtitle={workSub} iconTone="info" isEmpty={!data.work?.address?.trim()} onEdit={() => setModal({ mode: 'work' })} onDelete={() => setConfirmDelete({ mode: 'work', title: 'Work address' })} />
        </View>

        <View>
          <SectionHeader title="Saved places" action="Add" onAction={() => setModal({ mode: 'landmark' })} />
          {data.landmarks.length > 0 ? (
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {data.landmarks.map((lm, i) => (
                <View key={lm.id} style={[st.lm, i > 0 && st.lmDivider]}>
                  <View style={[st.addrIcon, { backgroundColor: color.goldSoft }]}>
                    <MapPin size={18} color={color.goldText} />
                  </View>
                  <View style={st.grow}>
                    <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>{lm.label}</Text>
                    <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={2}>{lm.address}</Text>
                  </View>
                  <View style={st.actions}>
                    <IconButton icon={Pencil} label={`Edit ${lm.label}`} variant="soft" iconSize={18} onPress={() => setModal({ mode: 'landmark', id: lm.id })} />
                    <IconButton icon={Trash2} label={`Delete ${lm.label}`} variant="danger" iconSize={18} onPress={() => setConfirmDelete({ mode: 'landmark', id: lm.id, title: lm.label })} />
                  </View>
                </View>
              ))}
            </Card>
          ) : (
            <Card padded={false}>
              <EmptyState
                icon={MapPin}
                title="No landmarks yet"
                message={'Save places like \u201cGym\u201d, \u201cMom\u2019s house\u201d, or \u201cOffice gate\u201d.'}
                actionLabel="Add landmark"
                onAction={() => setModal({ mode: 'landmark' })}
                style={{ paddingVertical: space.xxl }}
              />
            </Card>
          )}
        </View>
      </ScrollView>

      <BottomSheet visible={Boolean(modal && draft)} onClose={closeModal} backdrop={color.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[st.sheet, { maxHeight: winH * 0.9 }]}>
            <View style={st.sheetHead}>
              <View style={st.grow}>
                <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">{title}</Text>
                <Text style={[type.small, { color: color.textMuted }]}>{modal?.mode === 'landmark' ? 'Save a place for quick access.' : 'Update your saved address.'}</Text>
              </View>
              <IconButton icon={X} label="Close" variant="soft" onPress={closeModal} />
            </View>
            {draft ? (
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[st.sheetBody, { paddingBottom: space.xxl + insets.bottom }]}>
                {modal?.mode === 'landmark' ? (
                  <Field label="Label" hint="Required" value={draft.label} onChangeText={set('label')} placeholder="e.g., Gym, Office gate" />
                ) : null}
                <Field
                  label="Address"
                  hint={modal?.mode === 'landmark' ? 'Required' : undefined}
                  value={draft.address}
                  onChangeText={set('address')}
                  placeholder="Add full address"
                  multiline
                  numberOfLines={3}
                />
                <Field label="Landmark (optional)" value={draft.landmark} onChangeText={set('landmark')} placeholder="Near…" />
                <Field label="Notes (optional)" value={draft.notes} onChangeText={set('notes')} placeholder="e.g., Ring bell, call on arrival" />
                <View style={{ paddingTop: space.sm, gap: space.sm }}>
                  <Button title={modal?.mode === 'landmark' ? 'Save landmark' : 'Save address'} onPress={saveDraft} />
                  <Button title="Cancel" variant="outline" onPress={closeModal} />
                </View>
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>

      <Dialog visible={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} backdrop={color.overlay} panelStyle={st.dialog}>
        <View style={st.sheetHead2}>
          <View style={st.dlgIcon}>
            <Trash2 size={20} color={color.danger} />
          </View>
          <View style={st.grow}>
            <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">Delete address?</Text>
            <Text style={[type.small, { color: color.textSecondary, marginTop: space.xs }]}>
              Remove <Text style={{ ...type.bodyStrong, fontSize: 13, color: color.text }}>{confirmDelete?.title}</Text> from saved addresses?
            </Text>
          </View>
        </View>
        <View style={st.dlgActions}>
          <Button title="Cancel" variant="outline" onPress={() => setConfirmDelete(null)} style={st.grow} />
          <Button title="Delete" variant="danger" onPress={doDelete} style={st.grow} />
        </View>
      </Dialog>
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.xxl },
  addrCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  addrIcon: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: space.xs },
  lm: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  lmDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  sheet: { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, backgroundColor: color.surface, overflow: 'hidden', ...elevation.sheet },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  sheetBody: { padding: space.xl, gap: space.lg },
  sheetHead2: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  dlgIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 384, borderRadius: radii.lg, backgroundColor: color.surface, padding: space.xl, ...elevation.float },
  dlgActions: { marginTop: space.xl, flexDirection: 'row', gap: space.sm },
});
