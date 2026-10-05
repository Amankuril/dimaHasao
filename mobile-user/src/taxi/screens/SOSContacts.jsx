import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, ArrowLeft, CheckCircle2, Phone, Plus, ShieldAlert, Trash2, User, X } from 'lucide-react-native';
import { BottomSheet, Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { shadow, tw } from '../../theme';
import { fo } from '../account/ui';
import { triggerUserSosAlert } from '../services/safetyAlertService';

const MAX_CONTACTS = 5;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMERGENCY_SERVICES = [
  { id: 'police', label: 'Police', phone: '100', bg: '#EFF6FF', border: '#DBEAFE', color: '#155DFC' },
  { id: 'ambulance', label: 'Ambulance', phone: '108', bg: '#ECFDF5', border: '#D0FAE5', color: '#009966' },
  { id: 'fire', label: 'Fire Brigade', phone: '101', bg: '#FFF7ED', border: '#FFEDD4', color: '#F54900' },
];
const call = (number) => Linking.openURL(`tel:${number}`).catch(() => {});

/**
 * Port of Taxi/modules/user/pages/safety/SOSContacts.jsx. As on the web, the
 * contact list is kept in this screen only (the web's save / delete calls are
 * placeholders). The web seeds it with two sample contacts; the app starts
 * empty so nobody dials a stranger's number.
 */
export default function SOSContacts() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [saving, setSaving] = useState(false);
  const [isTriggeringSos, setIsTriggeringSos] = useState(false);
  const timer = useRef(null);
  const phoneRef = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);

  const full = contacts.length >= MAX_CONTACTS;
  const handleAdd = async () => {
    if (saving) return;
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!PHONE_REGEX.test(phone)) e.phone = 'Enter a valid 10-digit mobile number';
    if (contacts.some((c) => c.phone === phone)) e.phone = 'This number is already added';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setContacts((prev) => [...prev, { id: Date.now().toString(), name: name.trim(), phone }]);
    setName('');
    setPhone('');
    setErrors({});
    setShowAddSheet(false);
    setSaving(false);
  };

  const triggerSOS = () => {
    if (isTriggeringSos) return;
    setSosActive(true);
    setCountdown(3);
    setIsTriggeringSos(true);
    let left = 3;
    timer.current = setInterval(() => {
      left -= 1;
      if (left > 0) {
        setCountdown(left);
        return;
      }
      clearInterval(timer.current);
      setSosActive(false);
      setCountdown(3);
      triggerUserSosAlert()
        .then(() => toast.success('SOS sent to safety center'))
        .catch((error) => toast.error(error?.message || 'Unable to send SOS right now'))
        .finally(() => setIsTriggeringSos(false));
    }, 1000);
  };

  return (
    <LinearGradient colors={['#F8FAFC', '#F3F4F6', '#EEF2F7']} locations={[0, 0.38, 1]} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
        <Press scale={0.95} onPress={() => navigate(-1)} accessibilityLabel="Go back" style={styles.back} hitSlop={6}>
          <ArrowLeft size={18} color={tw.slate900} strokeWidth={2.5} />
        </Press>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>SAFETY</Text>
          <Text style={styles.title} accessibilityRole="header">SOS Contacts</Text>
        </View>
        <Press scale={0.9} disabled={full} onPress={() => setShowAddSheet(true)} accessibilityLabel="Add emergency contact" style={[styles.add, full ? { backgroundColor: tw.slate100 } : null]}>
          <Plus size={13} color={full ? tw.slate400 : '#fff'} strokeWidth={3} />
          <Text style={[styles.addText, full ? { color: tw.slate400 } : null]}>ADD</Text>
        </Press>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 + insets.bottom, gap: 16 }}>
        <LinearGradient colors={[tw.red500, tw.red600]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sos}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <ShieldAlert size={22} color="#fff" strokeWidth={2} />
            <View>
              <Text style={styles.sosTitle}>Emergency SOS</Text>
              <Text style={styles.sosSub}>Alerts all your emergency contacts</Text>
            </View>
          </View>
          <Press scale={0.96} disabled={sosActive || isTriggeringSos} onPress={triggerSOS} accessibilityLabel={sosActive ? `Sending SOS in ${countdown}` : 'Trigger SOS'} accessibilityLiveRegion="polite" style={styles.sosBtn}>
            {sosActive ? <Text style={[styles.sosBtnText, { fontSize: 20 }]}>{countdown}</Text> : <AlertTriangle size={16} color={tw.red600} strokeWidth={2.5} />}
            <Text style={styles.sosBtnText}>{sosActive ? 'ALERTING CONTACTS...' : 'TRIGGER SOS'}</Text>
          </Press>
        </LinearGradient>

        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>EMERGENCY SERVICES</Text>
            <Text style={styles.sectionNote}>Quick call</Text>
          </View>
          <View style={{ gap: 10 }}>
            {EMERGENCY_SERVICES.map((service) => (
              <Press key={service.id} scale={0.98} onPress={() => call(service.phone)} accessibilityLabel={`Call ${service.label} on ${service.phone}`} style={styles.item}>
                <View style={[styles.itemIcon, { backgroundColor: service.bg, borderColor: service.border, borderWidth: 1 }]}>
                  <Phone size={15} color={service.color} strokeWidth={2.5} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.itemTitle}>{service.label}</Text>
                  <Text style={styles.itemSub}>Call {service.phone}</Text>
                </View>
                <Text style={styles.dial}>{service.phone}</Text>
              </Press>
            ))}
          </View>
        </View>

        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.section}>EMERGENCY CONTACTS</Text>
            <Text style={styles.sectionNote}>
              {contacts.length}/{MAX_CONTACTS}
            </Text>
          </View>
          {contacts.length === 0 ? (
            <View style={styles.empty}>
              <ShieldAlert size={32} color={tw.slate300} strokeWidth={1.5} />
              <Text style={styles.emptyText}>Add emergency contacts to stay safe</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {contacts.map((c) => (
                <View key={c.id} style={styles.item}>
                  <View style={[styles.itemIcon, { backgroundColor: tw.red50 }]}>
                    <Text style={styles.initial}>{c.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.itemSub}>+91 {c.phone}</Text>
                  </View>
                  <Press scale={0.9} onPress={() => call(`+91${c.phone}`)} accessibilityLabel={`Call ${c.name}`} style={[styles.round, { backgroundColor: '#ECFDF5', borderColor: '#D0FAE5' }]} hitSlop={8}>
                    <Phone size={13} color="#00BC7D" strokeWidth={2.5} />
                  </Press>
                  <Press scale={0.9} onPress={() => setDeleteTarget(c)} accessibilityLabel={`Remove ${c.name}`} style={[styles.round, { backgroundColor: tw.red50, borderColor: tw.red100 }]} hitSlop={8}>
                    <Trash2 size={13} color={tw.red400} strokeWidth={2} />
                  </Press>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} backdrop="rgba(0,0,0,0.5)" spring={{ stiffness: 320, damping: 26 }} panelStyle={[styles.sheet, { paddingBottom: 40 + insets.bottom }]}>
        <View style={styles.handle} />
        <View style={[styles.sectionRow, { marginBottom: 20 }]}>
          <Text style={styles.sheetTitle}>Add SOS Contact</Text>
          <Press scale={0.9} onPress={() => setShowAddSheet(false)} accessibilityLabel="Close" style={styles.sheetClose} hitSlop={8}>
            <X size={15} color={tw.slate500} strokeWidth={2.5} />
          </Press>
        </View>
        <View style={{ gap: 16 }}>
          <View>
            <Text style={styles.label}>NAME</Text>
            <View style={[styles.field, errors.name ? styles.fieldError : null]}>
              <User size={16} color={tw.slate400} strokeWidth={2} />
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setErrors((p) => ({ ...p, name: '' }));
                }}
                placeholder="Contact name"
                placeholderTextColor={tw.slate300}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                accessibilityLabel="Contact name"
                style={styles.input}
              />
            </View>
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>
          <View>
            <Text style={styles.label}>MOBILE NUMBER</Text>
            <View style={[styles.field, errors.phone ? styles.fieldError : null]}>
              <Phone size={16} color={tw.slate400} strokeWidth={2} />
              <TextInput
                ref={phoneRef}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text.replace(/\D/g, ''));
                  setErrors((p) => ({ ...p, phone: '' }));
                }}
                maxLength={10}
                placeholder="10-digit mobile number"
                placeholderTextColor={tw.slate300}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={handleAdd}
                accessibilityLabel="Mobile number"
                style={styles.input}
              />
              {PHONE_REGEX.test(phone) ? <CheckCircle2 size={16} color="#00BC7D" strokeWidth={2.5} /> : null}
            </View>
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
          </View>
          <Press scale={0.97} disabled={saving} onPress={handleAdd} accessibilityLabel="Save contact" accessibilityState={{ busy: saving }} style={styles.save}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>SAVE CONTACT</Text>}
          </Press>
        </View>
      </BottomSheet>

      <Dialog visible={!!deleteTarget} onClose={() => setDeleteTarget(null)} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}>
          <Trash2 size={24} color={tw.red400} strokeWidth={2} />
        </View>
        <Text style={styles.dialogTitle}>Remove contact?</Text>
        <Text style={styles.dialogBody}>{deleteTarget?.name} will be removed from your SOS list.</Text>
        <Press
          scale={0.97}
          accessibilityLabel="Remove"
          onPress={() => {
            setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id));
            setDeleteTarget(null);
          }}
          style={styles.dialogYes}
        >
          <Text style={styles.saveText}>REMOVE</Text>
        </Press>
        <Press scale={0.97} onPress={() => setDeleteTarget(null)} accessibilityLabel="Cancel" style={{ paddingVertical: 14, alignSelf: 'stretch' }}>
          <Text style={styles.dialogNo}>CANCEL</Text>
        </Press>
      </Dialog>
    </LinearGradient>
  );
}

const soft = shadow('0 4px 14px rgba(15,23,42,0.05)');
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.95)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.8)', ...shadow('0 4px 20px rgba(15,23,42,0.05)') },
  back: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  kicker: { fontSize: 9, lineHeight: 14, letterSpacing: 2.3, color: tw.slate400, ...fo(900) },
  title: { fontSize: 19, lineHeight: 26, letterSpacing: -0.475, color: tw.slate900, ...fo(900) },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: tw.slate900 },
  addText: { fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: '#fff', ...fo(900) },
  sos: { borderRadius: 24, padding: 20, ...shadow('0 12px 32px rgba(239,68,68,0.25)') },
  sosTitle: { fontSize: 14, lineHeight: 17.5, color: '#fff', ...fo(900) },
  sosSub: { fontSize: 11, lineHeight: 16, color: tw.red100, ...fo(700) },
  sosBtn: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sosBtnText: { fontSize: 14, lineHeight: 22, letterSpacing: 1.4, color: tw.red600, ...fo(900) },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  section: { fontSize: 10, lineHeight: 15, letterSpacing: 2.6, color: tw.slate400, ...fo(900) },
  sectionNote: { fontSize: 10, lineHeight: 15, color: tw.slate400, ...fo(700) },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 14, ...soft },
  itemIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 14, lineHeight: 17.5, color: tw.slate900, ...fo(900) },
  itemSub: { fontSize: 11, lineHeight: 16, color: tw.slate400, marginTop: 2, ...fo(700) },
  dial: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, color: '#fff', backgroundColor: tw.slate900, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', ...fo(900) },
  initial: { fontSize: 14, color: tw.red500, ...fo(900) },
  round: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', padding: 32, alignItems: 'center', gap: 12, ...soft },
  emptyText: { fontSize: 13, lineHeight: 18, color: tw.slate500, textAlign: 'center', ...fo(900) },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: tw.slate200, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...fo(900) },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, lineHeight: 16, letterSpacing: 1.1, color: tw.slate400, marginLeft: 4, marginBottom: 4, ...fo(900) },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 4, minHeight: 52, borderWidth: 2, borderColor: tw.slate100, backgroundColor: tw.slate50 },
  fieldError: { borderColor: tw.red200, backgroundColor: tw.red50 },
  input: { flex: 1, paddingVertical: 8, fontSize: 15, color: tw.slate900, ...fo(700) },
  errorText: { fontSize: 11, lineHeight: 16, color: tw.red500, marginLeft: 4, marginTop: 4, ...fo(900) },
  save: { backgroundColor: tw.slate900, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  saveText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: '#fff', ...fo(900) },
  dialog: { width: '82%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 28, padding: 28, alignItems: 'center', ...shadow('2xl') },
  dialogIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dialogTitle: { fontSize: 17, lineHeight: 24, color: tw.slate900, marginBottom: 4, ...fo(900) },
  dialogBody: { fontSize: 13, lineHeight: 18, color: tw.slate400, marginBottom: 24, textAlign: 'center', ...fo(700) },
  dialogYes: { alignSelf: 'stretch', backgroundColor: tw.red500, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  dialogNo: { fontSize: 13, lineHeight: 18, letterSpacing: 1.3, color: tw.slate400, textAlign: 'center', ...fo(900) },
});
