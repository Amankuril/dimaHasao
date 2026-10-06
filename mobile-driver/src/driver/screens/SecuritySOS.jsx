import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Phone, Plus, Smartphone, Trash2, User, X, Zap } from 'lucide-react-native';
import { BottomSheet, Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { openExternal } from '../../lib/links';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { useKeyboardHeight } from '../../lib/useKeyboard';
import { useNavigate } from '../../lib/webRouter';
import { outfit, shadow, tw } from '../../theme';
import { addDriverEmergencyContact, deleteDriverEmergencyContact, getDriverEmergencyContacts } from '../services/registrationService';
import { triggerDriverSosAlert } from '../services/driverSafetyAlertService';

const MAX_CONTACTS = 5;
const PHONE_REGEX = /^\d{10}$/;
const NAME_REGEX = /^[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;

const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(-10);
const normalizeName = (value) => String(value || '').replace(/[^A-Za-z .'-]/g, '').replace(/\s+/g, ' ');

// The web feature-detects navigator.contacts.select, which the Android wrapper never has: the picker button shows as unavailable.
const canUseContactPicker = false;

function PulseIcon({ children }) {
  const o = useAnimatedValue(1);
  useEffect(() => {
    const e = Easing.bezier(0.4, 0, 0.6, 1);
    const a = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 0.5, duration: 1000, easing: e, useNativeDriver: true }),
      Animated.timing(o, { toValue: 1, duration: 1000, easing: e, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [o]);
  return <Animated.View style={{ opacity: o }}>{children}</Animated.View>;
}

/** Port of Taxi/modules/driver/pages/settings/SecuritySOS.jsx (/taxi/driver/security). */
export default function SecuritySOS() {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const navigate = useNavigate();
  const routePrefix = '/taxi/driver';

  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const remainingSlots = useMemo(() => Math.max(0, MAX_CONTACTS - contacts.length), [contacts.length]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setErrors({});
  };

  const loadContacts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await getDriverEmergencyContacts();
      setContacts(response?.data?.results || []);
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load emergency contacts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (!showToast) {
      return undefined;
    }

    const timer = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(timer);
  }, [showToast]);

  const validateContact = (contactName, contactPhone) => {
    const nextErrors = {};
    const trimmedName = String(contactName || '').trim();
    const normalizedPhone = normalizePhone(contactPhone);

    if (!trimmedName) {
      nextErrors.name = 'Name is required';
    } else if (!NAME_REGEX.test(trimmedName)) {
      nextErrors.name = 'Use alphabets only for the contact name';
    }

    if (!PHONE_REGEX.test(normalizedPhone)) {
      nextErrors.phone = 'Enter a valid 10-digit mobile number';
    }

    if (contacts.some((contact) => normalizePhone(contact.phone) === normalizedPhone)) {
      nextErrors.phone = 'This number is already added';
    }

    setErrors(nextErrors);

    return {
      isValid: Object.keys(nextErrors).length === 0,
      name: trimmedName,
      phone: normalizedPhone,
    };
  };

  const handleAddContact = async ({ contactName, contactPhone, source = 'manual' }) => {
    const result = validateContact(contactName, contactPhone);

    if (!result.isValid) {
      return;
    }

    if (contacts.length >= MAX_CONTACTS) {
      setError(`You can add up to ${MAX_CONTACTS} emergency contacts`);
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await addDriverEmergencyContact({
        name: result.name,
        phone: result.phone,
        source,
      });

      setContacts((prev) => [...prev, response?.data || {}]);
      resetForm();
      setShowAddSheet(false);
    } catch (requestError) {
      setError(requestError?.message || 'Unable to add emergency contact');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deleteTarget?.id) {
      return;
    }

    setIsDeletingId(deleteTarget.id);
    setError('');

    try {
      await deleteDriverEmergencyContact(deleteTarget.id);
      setContacts((prev) => prev.filter((contact) => contact.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (requestError) {
      setError(requestError?.message || 'Unable to remove emergency contact');
    } finally {
      setIsDeletingId('');
    }
  };

  const handlePickFromDevice = async () => {
    if (!canUseContactPicker) {
      setError('Phone contact selection is not supported on this device/browser');
    }
  };

  const triggerSOS = () => {
    setShowToast(true);
    triggerDriverSosAlert()
      .catch((requestError) => {
        console.error('Failed to trigger driver SOS:', requestError);
        setError(requestError?.message || 'Unable to alert safety center');
      })
      .finally(() => {
        setTimeout(() => {
          openExternal('tel:112');
        }, 250);
      });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f9fb' }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: 40 + insets.top, paddingBottom: 128 + insets.bottom }}>
        <View style={styles.header}>
          <Press onPress={() => navigate(`${routePrefix}/profile`)} accessibilityLabel="Back" style={styles.back}>
            <ArrowLeft size={18} color={tw.slate900} />
          </Press>
          <Text style={styles.title} accessibilityRole="header">SOS</Text>
        </View>

        <View style={{ gap: 24 }}>
          <View style={styles.hero}>
            <View style={styles.glow} />
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ gap: 4 }}>
                  <Text style={styles.heroKicker}> SOS</Text>
                  <Text style={styles.heroTitle}>Emergency Contacts</Text>
                </View>
                <View style={styles.heroIcon}>
                  <Zap size={24} color="#fff" fill="#fff" strokeWidth={3} />
                </View>
              </View>
              <Text style={styles.heroBody}>
                Add trusted contacts manually or pick from your phone contacts. These contacts can be used for emergency driver safety actions.
              </Text>
              <Press scale={1} onPress={triggerSOS} accessibilityLabel="Trigger SOS" style={styles.heroBtn}>
                <Text style={styles.heroBtnText}>TRIGGER SOS</Text>
              </Press>
            </View>
          </View>

          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              <Text style={styles.section}>EMERGENCY LIST</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={styles.count}>{contacts.length}/{MAX_CONTACTS}</Text>
                <Press
                  scale={1}
                  onPress={() => {
                    resetForm();
                    setShowAddSheet(true);
                  }}
                  disabled={remainingSlots === 0}
                  accessibilityLabel="Add new contact"
                  style={[styles.addLink, { borderBottomColor: remainingSlots === 0 ? tw.slate200 : 'rgba(43,127,255,0.2)' }]}
                >
                  <Text style={[styles.addLinkText, remainingSlots === 0 ? { color: tw.slate300 } : null]}>+ ADD NEW</Text>
                </Press>
              </View>
            </View>

            {error ? (
              <View style={styles.error}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {isLoading ? (
              <View style={styles.note}>
                <Text style={styles.noteText}>Loading emergency contacts...</Text>
              </View>
            ) : null}

            {!isLoading && contacts.length === 0 ? (
              <View style={styles.note}>
                <Text style={styles.noteText}>No emergency contacts added yet.</Text>
              </View>
            ) : null}

            {!isLoading &&
              contacts.map((contact) => (
                <View key={contact.id} style={styles.contact}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                    <View style={styles.contactIcon}>
                      <Phone size={18} color={tw.slate400} />
                    </View>
                    <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactPhone}>+91 {contact.phone}</Text>
                      <Text style={styles.contactSource}>{contact.source === 'device' ? 'FROM PHONE CONTACTS' : 'ADDED MANUALLY'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Press scale={0.9} onPress={() => openExternal(`tel:+91${contact.phone}`)} accessibilityLabel={`Call ${contact.name}`} style={[styles.round, { backgroundColor: tw.emerald50, borderColor: tw.emerald100 }]}>
                      <Phone size={13} color={tw.emerald500} strokeWidth={2.5} />
                    </Press>
                    <Press scale={0.9} onPress={() => setDeleteTarget(contact)} accessibilityLabel={`Remove ${contact.name}`} style={[styles.round, { backgroundColor: tw.red50, borderColor: tw.red100 }]}>
                      <Trash2 size={13} color={tw.red400} strokeWidth={2} />
                    </Press>
                  </View>
                </View>
              ))}
          </View>
        </View>
      </ScrollView>

      {showToast ? (
        <View style={[styles.toast, { top: 40 + insets.top }]} accessibilityLiveRegion="polite">
          <PulseIcon>
            <Zap size={20} color="#fff" fill="#fff" strokeWidth={3} />
          </PulseIcon>
          <Text style={styles.toastText}>SOS TRIGGERED FOR SAVED CONTACTS</Text>
        </View>
      ) : null}

      <BottomSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} backdrop="rgba(0,0,0,0.5)" blur={8} spring={{ stiffness: 320, damping: 26 }} panelStyle={[styles.sheet, { paddingBottom: 40 + Math.max(keyboard, insets.bottom) }]}>
        <View style={styles.handle} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Add Emergency Contact</Text>
          <Press scale={0.9} onPress={() => setShowAddSheet(false)} accessibilityLabel="Close" style={styles.sheetClose}>
            <X size={15} color={tw.slate500} strokeWidth={2.5} />
          </Press>
        </View>

        <View style={{ gap: 16 }}>
          <Press
            scale={1}
            onPress={handlePickFromDevice}
            disabled={!canUseContactPicker || remainingSlots === 0 || isSaving}
            accessibilityLabel="Pick from phone contacts"
            style={[styles.pick, { opacity: 0.5 }]}
          >
            <Smartphone size={16} color={tw.slate700} strokeWidth={2.5} />
            <Text style={styles.pickText}>{canUseContactPicker ? 'PICK FROM PHONE CONTACTS' : 'PHONE CONTACT PICKER UNAVAILABLE'}</Text>
          </Press>

          <View>
            <Text style={styles.label}>NAME</Text>
            <View style={[styles.field, errors.name ? styles.fieldError : null]}>
              <User size={16} color={tw.slate400} strokeWidth={2} />
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(normalizeName(text));
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Contact name"
                placeholderTextColor={tw.slate300}
                accessibilityLabel="Contact name"
                style={styles.input}
              />
            </View>
            {errors.name ? <Text style={styles.errorLine}>{errors.name}</Text> : null}
          </View>

          <View>
            <Text style={styles.label}>MOBILE NUMBER</Text>
            <View style={[styles.field, errors.phone ? styles.fieldError : null]}>
              <Phone size={16} color={tw.slate400} strokeWidth={2} />
              <TextInput
                value={phone}
                onChangeText={(text) => {
                  setPhone(normalizePhone(text));
                  setErrors((prev) => ({ ...prev, phone: '' }));
                }}
                maxLength={10}
                keyboardType="phone-pad"
                placeholder="10-digit mobile number"
                placeholderTextColor={tw.slate300}
                accessibilityLabel="Mobile number"
                style={styles.input}
              />
              {PHONE_REGEX.test(phone) ? <CheckCircle2 size={16} color={tw.emerald500} strokeWidth={2.5} /> : null}
            </View>
            {errors.phone ? <Text style={styles.errorLine}>{errors.phone}</Text> : null}
          </View>

          <Press
            scale={0.97}
            onPress={() => handleAddContact({ contactName: name, contactPhone: phone, source: 'manual' })}
            disabled={isSaving || remainingSlots === 0}
            accessibilityLabel="Save contact"
            accessibilityState={{ busy: isSaving }}
            style={[styles.save, isSaving || remainingSlots === 0 ? { opacity: 0.6 } : null]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Plus size={15} color="#fff" strokeWidth={2.5} />
                <Text style={styles.saveText}>SAVE CONTACT</Text>
              </>
            )}
          </Press>
        </View>
      </BottomSheet>

      <Dialog visible={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} backdrop="rgba(0,0,0,0.5)" blur={8} panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}>
          <Trash2 size={24} color={tw.red400} strokeWidth={2} />
        </View>
        <Text style={styles.dialogTitle}>Remove contact?</Text>
        <Text style={styles.dialogBody}>{deleteTarget?.name} will be removed from your emergency list.</Text>
        <Press scale={0.97} onPress={handleDeleteContact} disabled={isDeletingId === deleteTarget?.id} accessibilityLabel="Remove" style={styles.dialogYes}>
          <Text style={styles.dialogYesText}>{isDeletingId === deleteTarget?.id ? 'REMOVING...' : 'REMOVE'}</Text>
        </Press>
        <Press scale={1} onPress={() => setDeleteTarget(null)} accessibilityLabel="Cancel" style={{ paddingVertical: 14, alignSelf: 'stretch' }}>
          <Text style={styles.dialogNo}>CANCEL</Text>
        </Press>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  back: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: tw.slate100, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  title: { fontSize: 18, lineHeight: 28, letterSpacing: -0.45, color: tw.slate900, ...outfit(900) },
  hero: { backgroundColor: tw.slate900, padding: 24, borderRadius: 32, overflow: 'hidden', ...shadow('2xl') },
  glow: { position: 'absolute', top: '-20%', right: '-10%', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,32,86,0.12)' },
  heroKicker: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: tw.rose500, ...outfit(900) },
  heroTitle: { fontSize: 20, lineHeight: 28, letterSpacing: -1, color: '#fff', ...outfit(900) },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: tw.rose500, alignItems: 'center', justifyContent: 'center', ...shadow('0 20px 25px -5px rgba(255,32,86,0.05), 0 8px 10px -6px rgba(255,32,86,0.05)') },
  heroBody: { fontSize: 11, lineHeight: 13.75, color: 'rgba(255,255,255,0.4)', ...outfit(700) },
  heroBtn: { height: 48, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  heroBtnText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: '#fff', ...outfit(900) },
  section: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate400, opacity: 0.6, ...outfit(900) },
  count: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.slate400, ...outfit(900) },
  addLink: { borderBottomWidth: 1, paddingBottom: 2 },
  addLinkText: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.blue500, ...outfit(900) },
  error: { backgroundColor: tw.rose50, borderWidth: 1, borderColor: tw.rose100, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  errorText: { fontSize: 11, lineHeight: 16.5, color: tw.rose600, ...outfit(700) },
  note: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, ...shadow('sm') },
  noteText: { textAlign: 'center', fontSize: 11, lineHeight: 16.5, color: tw.slate400, ...outfit(700) },
  contact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, ...shadow('sm') },
  contactIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  contactName: { fontSize: 14, lineHeight: 17.5, letterSpacing: -0.35, color: tw.slate900, ...outfit(900) },
  contactPhone: { fontSize: 10, lineHeight: 12.5, letterSpacing: 1, color: tw.slate400, opacity: 0.6, ...outfit(900) },
  contactSource: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, color: tw.slate300, ...outfit(900) },
  round: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: 24, right: 24, backgroundColor: tw.rose500, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow('0 25px 50px -12px rgba(255,32,86,0.2)') },
  toastText: { flex: 1, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: '#fff', ...outfit(900) },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: tw.slate200, alignSelf: 'center', marginBottom: 20 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 18, lineHeight: 28, color: tw.slate900, ...outfit(900) },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  pick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 1, borderColor: tw.slate100, backgroundColor: tw.slate50, paddingHorizontal: 16, paddingVertical: 12 },
  pickText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: tw.slate700, ...outfit(900) },
  label: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.1, color: tw.slate400, marginLeft: 4, marginBottom: 4, ...outfit(900) },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 2, borderColor: tw.slate100, backgroundColor: tw.slate50 },
  fieldError: { borderColor: tw.red200, backgroundColor: tw.red50 },
  input: { flex: 1, padding: 0, fontSize: 15, color: tw.slate900, ...outfit(700) },
  errorLine: { fontSize: 11, lineHeight: 16.5, color: tw.red500, marginLeft: 4, marginTop: 4, ...outfit(900) },
  save: { backgroundColor: tw.slate900, paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, ...shadow('sm') },
  saveText: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, color: '#fff', ...outfit(900) },
  dialog: { width: '82%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 28, padding: 28, alignItems: 'center', ...shadow('2xl') },
  dialogIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dialogTitle: { fontSize: 17, lineHeight: 25.5, color: tw.slate900, marginBottom: 4, ...outfit(900) },
  dialogBody: { fontSize: 13, lineHeight: 19.5, color: tw.slate400, marginBottom: 24, textAlign: 'center', ...outfit(700) },
  dialogYes: { alignSelf: 'stretch', backgroundColor: tw.red500, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  dialogYesText: { fontSize: 13, lineHeight: 18, letterSpacing: 1.3, color: '#fff', ...outfit(900) },
  dialogNo: { fontSize: 13, lineHeight: 18, letterSpacing: 1.3, color: tw.slate400, textAlign: 'center', ...outfit(900) },
});
