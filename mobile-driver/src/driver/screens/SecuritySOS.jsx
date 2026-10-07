import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Phone, Plus, Smartphone, Trash2, User, X, Zap } from 'lucide-react-native';
import { BottomSheet, Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { openExternal } from '../../lib/links';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { useKeyboardHeight } from '../../lib/useKeyboard';
import { useNavigate } from '../../lib/webRouter';
import { outfit, playfair, shadow } from '../../theme';
import { addDriverEmergencyContact, deleteDriverEmergencyContact, getDriverEmergencyContacts } from '../services/registrationService';
import { triggerDriverSosAlert } from '../services/driverSafetyAlertService';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { Card, CtaButton, SectionLabel } from '../ui/Surface';

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
  const [focusedField, setFocusedField] = useState('');

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
    <View style={{ flex: 1, backgroundColor: DT.bg }}>
      <ScreenHeader title="SOS" subtitle="Emergency contacts and safety alert" onBack={() => navigate(`${routePrefix}/profile`)} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 32 + insets.bottom }}>
        <View style={{ gap: 20 }}>
          <View style={styles.hero}>
            <View style={{ gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
                  <Text style={styles.heroKicker}> SOS</Text>
                  <Text style={styles.heroTitle}>Emergency Contacts</Text>
                </View>
                <View style={styles.heroIcon}>
                  <Zap size={26} color={DT.onBrand} fill={DT.onBrand} strokeWidth={3} />
                </View>
              </View>
              <Text style={styles.heroBody}>
                Add trusted contacts manually or pick from your phone contacts. These contacts can be used for emergency driver safety actions.
              </Text>
              <CtaButton variant="danger" title="TRIGGER SOS" onPress={triggerSOS} accessibilityLabel="Trigger SOS" icon={<Zap size={20} color={DT.onBrand} fill={DT.onBrand} strokeWidth={3} />} style={styles.heroBtn} textStyle={styles.heroBtnText} />
            </View>
          </View>

          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, gap: 12 }}>
              <SectionLabel>Emergency list</SectionLabel>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.count}>{contacts.length}/{MAX_CONTACTS}</Text>
                <Press
                  scale={1}
                  onPress={() => {
                    resetForm();
                    setShowAddSheet(true);
                  }}
                  disabled={remainingSlots === 0}
                  accessibilityLabel="Add new contact"
                  style={[styles.addLink, remainingSlots === 0 ? { opacity: 0.5 } : null]}
                >
                  <Text style={styles.addLinkText}>+ ADD NEW</Text>
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
                <Card key={contact.id} style={styles.contact}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                    <View style={styles.contactIcon}>
                      <Phone size={18} color={DT.brand} />
                    </View>
                    <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      <Text style={styles.contactPhone}>+91 {contact.phone}</Text>
                      <Text style={styles.contactSource}>{contact.source === 'device' ? 'FROM PHONE CONTACTS' : 'ADDED MANUALLY'}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Press scale={0.9} onPress={() => openExternal(`tel:+91${contact.phone}`)} accessibilityLabel={`Call ${contact.name}`} style={[styles.round, { backgroundColor: DT.successSoft }]}>
                      <Phone size={16} color={DT.successInk} strokeWidth={2.5} />
                    </Press>
                    <Press scale={0.9} onPress={() => setDeleteTarget(contact)} accessibilityLabel={`Remove ${contact.name}`} style={[styles.round, { backgroundColor: DT.dangerSoft }]}>
                      <Trash2 size={16} color={DT.danger} strokeWidth={2} />
                    </Press>
                  </View>
                </Card>
              ))}
          </View>
        </View>
      </ScrollView>

      {showToast ? (
        <View style={[styles.toast, { top: 12 + insets.top }]} accessibilityLiveRegion="polite">
          <PulseIcon>
            <Zap size={20} color={DT.onBrand} fill={DT.onBrand} strokeWidth={3} />
          </PulseIcon>
          <Text style={styles.toastText}>SOS TRIGGERED FOR SAVED CONTACTS</Text>
        </View>
      ) : null}

      <BottomSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} backdrop="rgba(0,0,0,0.5)" blur={8} spring={{ stiffness: 320, damping: 26 }} panelStyle={[styles.sheet, { paddingBottom: 40 + Math.max(keyboard, insets.bottom) }]}>
        <View style={styles.handle} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Add Emergency Contact</Text>
          <Press scale={0.9} onPress={() => setShowAddSheet(false)} accessibilityLabel="Close" style={styles.sheetClose}>
            <X size={18} color={DT.muted} strokeWidth={2.5} />
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
            <Smartphone size={16} color={DT.inkSoft} strokeWidth={2.5} />
            <Text style={styles.pickText}>{canUseContactPicker ? 'PICK FROM PHONE CONTACTS' : 'PHONE CONTACT PICKER UNAVAILABLE'}</Text>
          </Press>

          <View>
            <Text style={styles.label}>NAME</Text>
            <View style={[styles.field, focusedField === 'name' ? styles.fieldFocus : null, errors.name ? styles.fieldError : null]}>
              <User size={16} color={DT.muted} strokeWidth={2} />
              <TextInput
                value={name}
                onChangeText={(text) => {
                  setName(normalizeName(text));
                  setErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder="Contact name"
                placeholderTextColor={DT.faint}
                accessibilityLabel="Contact name"
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField('')}
                style={styles.input}
              />
            </View>
            {errors.name ? <Text style={styles.errorLine}>{errors.name}</Text> : null}
          </View>

          <View>
            <Text style={styles.label}>MOBILE NUMBER</Text>
            <View style={[styles.field, focusedField === 'phone' ? styles.fieldFocus : null, errors.phone ? styles.fieldError : null]}>
              <Phone size={16} color={DT.muted} strokeWidth={2} />
              <TextInput
                value={phone}
                onChangeText={(text) => {
                  setPhone(normalizePhone(text));
                  setErrors((prev) => ({ ...prev, phone: '' }));
                }}
                maxLength={10}
                keyboardType="phone-pad"
                placeholder="10-digit mobile number"
                placeholderTextColor={DT.faint}
                accessibilityLabel="Mobile number"
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField('')}
                style={styles.input}
              />
              {PHONE_REGEX.test(phone) ? <CheckCircle2 size={16} color={DT.success} strokeWidth={2.5} /> : null}
            </View>
            {errors.phone ? <Text style={styles.errorLine}>{errors.phone}</Text> : null}
          </View>

          <CtaButton
            variant="brand"
            title="SAVE CONTACT"
            onPress={() => handleAddContact({ contactName: name, contactPhone: phone, source: 'manual' })}
            disabled={isSaving || remainingSlots === 0}
            loading={isSaving}
            accessibilityLabel="Save contact"
            icon={isSaving ? null : <Plus size={16} color={DT.onBrand} strokeWidth={2.5} />}
            style={styles.save}
          />
        </View>
      </BottomSheet>

      <Dialog visible={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} backdrop="rgba(0,0,0,0.5)" blur={8} panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}>
          <Trash2 size={24} color={DT.danger} strokeWidth={2} />
        </View>
        <Text style={styles.dialogTitle}>Remove contact?</Text>
        <Text style={styles.dialogBody}>{deleteTarget?.name} will be removed from your emergency list.</Text>
        <CtaButton
          variant="danger"
          title={isDeletingId === deleteTarget?.id ? 'REMOVING...' : 'REMOVE'}
          onPress={handleDeleteContact}
          disabled={isDeletingId === deleteTarget?.id}
          accessibilityLabel="Remove"
          style={{ alignSelf: 'stretch', marginBottom: 8 }}
        />
        <Press scale={1} onPress={() => setDeleteTarget(null)} accessibilityLabel="Cancel" style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'stretch' }}>
          <Text style={styles.dialogNo}>CANCEL</Text>
        </Press>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: DT.dangerSoft, padding: 22, borderRadius: DT.radius.xl, borderWidth: 1, borderColor: DT.danger, overflow: 'hidden', ...shadow('md') },
  heroKicker: { fontSize: 14, lineHeight: 20, letterSpacing: 1.4, minWidth: 60, color: DT.danger, ...outfit(900) },
  heroTitle: { fontSize: 22, lineHeight: 30, color: DT.dangerInk, ...playfair(700) },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: DT.danger, alignItems: 'center', justifyContent: 'center' },
  heroBody: { fontSize: 13, lineHeight: 19, color: DT.inkSoft, ...outfit(500) },
  heroBtn: { minHeight: 64, borderRadius: DT.radius.lg },
  heroBtnText: { fontSize: 17, lineHeight: 24, letterSpacing: 1.2, minWidth: 140 },
  count: { fontSize: 11, lineHeight: 16, letterSpacing: 1, minWidth: 30, color: DT.muted, ...outfit(800) },
  addLink: { minHeight: 44, paddingHorizontal: 14, borderRadius: DT.radius.pill, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  addLinkText: { fontSize: 11, lineHeight: 16, letterSpacing: 0.8, minWidth: 70, textAlign: 'center', color: DT.brand, ...outfit(800) },
  error: { backgroundColor: DT.dangerSoft, paddingHorizontal: 16, paddingVertical: 12, borderRadius: DT.radius.md },
  errorText: { fontSize: 12, lineHeight: 17, color: DT.dangerInk, ...outfit(700) },
  note: { backgroundColor: DT.card, padding: 20, borderRadius: DT.radius.lg, borderWidth: 1, borderColor: DT.borderSoft, ...shadow('sm') },
  noteText: { textAlign: 'center', fontSize: 13, lineHeight: 18, color: DT.muted, ...outfit(600) },
  contact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 16 },
  contactIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  contactName: { fontSize: 15, lineHeight: 20, color: DT.ink, ...outfit(700) },
  contactPhone: { fontSize: 12, lineHeight: 16, letterSpacing: 0.5, color: DT.inkSoft, ...outfit(600) },
  contactSource: { fontSize: 9, lineHeight: 13, letterSpacing: 0.8, minWidth: 100, color: DT.muted, ...outfit(700) },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: 16, right: 16, backgroundColor: DT.danger, padding: 16, borderRadius: DT.radius.lg, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow('lg') },
  toastText: { flex: 1, fontSize: 12, lineHeight: 16, letterSpacing: 1, color: DT.onBrand, ...outfit(800) },
  sheet: { backgroundColor: DT.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: DT.border, alignSelf: 'center', marginBottom: 20 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 20, lineHeight: 28, color: DT.brand, ...playfair(700) },
  sheetClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: DT.bgSoft, alignItems: 'center', justifyContent: 'center' },
  pick: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: DT.radius.md, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.bg, paddingHorizontal: 16, paddingVertical: 12 },
  pickText: { fontSize: 12, lineHeight: 16, letterSpacing: 0.8, color: DT.inkSoft, ...outfit(800) },
  label: { fontSize: 11, lineHeight: 16, letterSpacing: 1, minWidth: 60, color: DT.muted, marginLeft: 4, marginBottom: 6, ...outfit(800) },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: DT.radius.md, paddingHorizontal: 16, minHeight: 52, borderWidth: 1, borderColor: DT.border, backgroundColor: DT.card },
  fieldFocus: { borderColor: DT.brand },
  fieldError: { borderColor: DT.danger, backgroundColor: DT.dangerSoft },
  input: { flex: 1, padding: 0, minHeight: 24, fontSize: 15, color: DT.ink, ...outfit(700) },
  errorLine: { fontSize: 11, lineHeight: 16, color: DT.dangerInk, marginLeft: 4, marginTop: 4, ...outfit(800) },
  save: { marginTop: 8 },
  dialog: { width: '86%', maxWidth: 384, backgroundColor: DT.card, borderRadius: DT.radius.xl, padding: 24, alignItems: 'center', ...shadow('2xl') },
  dialogIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: DT.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dialogTitle: { fontSize: 18, lineHeight: 26, color: DT.ink, marginBottom: 4, ...outfit(800) },
  dialogBody: { fontSize: 13, lineHeight: 19, color: DT.muted, marginBottom: 20, textAlign: 'center', ...outfit(500) },
  dialogNo: { fontSize: 13, lineHeight: 18, letterSpacing: 1.3, minWidth: 70, color: DT.muted, textAlign: 'center', ...outfit(800) },
});
