import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, Phone, Plus, ShieldAlert, Trash2, User, X } from 'lucide-react-native';
import { BottomSheet, Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { Button, Card, EmptyState, IconButton, ListRow, SectionHeader } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { Field, PageTitle, useNavPad } from '../account/ui';
import { triggerUserSosAlert } from '../services/safetyAlertService';

const MAX_CONTACTS = 5;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMERGENCY_SERVICES = [
  { id: 'police', label: 'Police', phone: '100', tone: 'info' },
  { id: 'ambulance', label: 'Ambulance', phone: '108', tone: 'success' },
  { id: 'fire', label: 'Fire Brigade', phone: '101', tone: 'warning' },
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
  const bottomPad = useNavPad(space.xxl);
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
    <View style={styles.flex}>
      <PageTitle
        title="SOS contacts"
        subtitle="Safety"
        onBack={() => navigate(-1)}
        right={<Button title="Add" icon={Plus} variant="secondary" size="sm" fullWidth={false} disabled={full} onPress={() => setShowAddSheet(true)} accessibilityLabel="Add emergency contact" style={styles.addBtn} />}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}>
        <View style={styles.sos}>
          <View style={styles.sosHead}>
            <View style={styles.sosIcon}>
              <ShieldAlert size={24} color={color.textInverse} />
            </View>
            <View style={styles.grow}>
              <Text style={[type.heading, { color: color.textInverse }]}>Emergency SOS</Text>
              <Text style={[type.small, { color: color.textInverse }]}>Alerts the safety center and all your emergency contacts</Text>
            </View>
          </View>
          <Press
            scale={0.97}
            disabled={sosActive || isTriggeringSos}
            onPress={triggerSOS}
            accessibilityLabel={sosActive ? `Sending SOS in ${countdown}` : 'Trigger SOS'}
            accessibilityLiveRegion="polite"
            accessibilityState={{ disabled: sosActive || isTriggeringSos, busy: isTriggeringSos }}
            style={styles.sosBtn}
          >
            {sosActive ? <Text style={[type.priceLg, { color: color.danger }]}>{countdown}</Text> : isTriggeringSos ? <ActivityIndicator color={color.danger} /> : <AlertTriangle size={22} color={color.danger} />}
            <Text style={[type.button, { fontSize: 17, color: color.danger }]}>{sosActive ? 'Alerting contacts...' : 'Trigger SOS'}</Text>
          </Press>
          {sosActive ? <Text style={[type.caption, { color: color.textInverse, textAlign: 'center' }]}>Sending in {countdown} seconds</Text> : null}
        </View>

        <View>
          <SectionHeader title="Emergency services" />
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {EMERGENCY_SERVICES.map((service, i) => (
              <ListRow
                key={service.id}
                icon={Phone}
                iconTone={service.tone}
                title={service.label}
                subtitle={`Dial ${service.phone}`}
                divider={i < EMERGENCY_SERVICES.length - 1}
                right={
                  <Button title={`Call ${service.phone}`} icon={Phone} variant="dangerSoft" size="md" fullWidth={false} onPress={() => call(service.phone)} accessibilityLabel={`Call ${service.label} on ${service.phone}`} />
                }
              />
            ))}
          </Card>
        </View>

        <View>
          <SectionHeader title={`Emergency contacts · ${contacts.length}/${MAX_CONTACTS}`} />
          {contacts.length === 0 ? (
            <Card padded={false}>
              <EmptyState icon={ShieldAlert} title="No emergency contacts yet" message="Add emergency contacts to stay safe" actionLabel="Add contact" onAction={() => setShowAddSheet(true)} style={{ paddingVertical: space.xxl }} />
            </Card>
          ) : (
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {contacts.map((c, i) => (
                <View key={c.id} style={[styles.contact, i > 0 && styles.divider]}>
                  <View style={styles.initial}>
                    <Text style={[type.subheading, { color: color.danger }]}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.grow}>
                    <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>{c.name}</Text>
                    <Text style={[type.small, { color: color.textMuted }]}>+91 {c.phone}</Text>
                  </View>
                  <IconButton icon={Phone} label={`Call ${c.name}`} variant="primary" size={48} onPress={() => call(`+91${c.phone}`)} />
                  <IconButton icon={Trash2} label={`Remove ${c.name}`} variant="danger" size={48} iconSize={18} onPress={() => setDeleteTarget(c)} />
                </View>
              ))}
            </Card>
          )}
          {full ? <Text style={[type.caption, { color: color.textMuted, marginTop: space.sm }]}>You can save up to {MAX_CONTACTS} contacts. Remove one to add another.</Text> : null}
        </View>
      </ScrollView>

      <BottomSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} backdrop={color.overlay} spring={{ stiffness: 320, damping: 26 }} panelStyle={styles.sheet}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ paddingBottom: space.xxl + insets.bottom }}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <Text style={[type.heading, styles.grow, { color: color.text }]} accessibilityRole="header">Add SOS contact</Text>
            <IconButton icon={X} label="Close" variant="soft" onPress={() => setShowAddSheet(false)} />
          </View>
          <View style={{ gap: space.lg }}>
            <Field
              label="Name"
              icon={User}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setErrors((p) => ({ ...p, name: '' }));
              }}
              placeholder="Contact name"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              error={errors.name || undefined}
            />
            <Field
              ref={phoneRef}
              label="Mobile number"
              icon={Phone}
              value={phone}
              onChangeText={(text) => {
                setPhone(text.replace(/\D/g, ''));
                setErrors((p) => ({ ...p, phone: '' }));
              }}
              maxLength={10}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={handleAdd}
              right={PHONE_REGEX.test(phone) ? <CheckCircle2 size={18} color={color.success} accessibilityLabel="Valid number" /> : null}
              error={errors.phone || undefined}
            />
            <Button title="Save contact" size="lg" loading={saving} disabled={saving} onPress={handleAdd} />
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>

      <Dialog visible={!!deleteTarget} onClose={() => setDeleteTarget(null)} backdrop={color.overlay} panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}>
          <Trash2 size={24} color={color.danger} />
        </View>
        <Text style={[type.heading, { color: color.text, textAlign: 'center' }]} accessibilityRole="header">Remove contact?</Text>
        <Text style={[type.body, { color: color.textSecondary, textAlign: 'center', marginTop: space.xs }]}>{deleteTarget?.name} will be removed from your SOS list.</Text>
        <View style={styles.dialogActions}>
          <Button
            title="Remove"
            variant="danger"
            onPress={() => {
              setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id));
              setDeleteTarget(null);
            }}
          />
          <Button title="Cancel" variant="ghost" onPress={() => setDeleteTarget(null)} />
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.xl },
  addBtn: { height: 44 },
  sos: { borderRadius: radii.lg, padding: space.xl, gap: space.lg, backgroundColor: color.danger, ...elevation.card },
  sosHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sosIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  sosBtn: { minHeight: 60, backgroundColor: color.surface, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  contact: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  initial: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginRight: space.xs },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.xl, paddingTop: space.md, ...elevation.sheet },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, alignSelf: 'center', marginBottom: space.md },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  dialog: { width: '88%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.lg, padding: space.xxl, alignItems: 'center', ...elevation.float },
  dialogIcon: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  dialogActions: { alignSelf: 'stretch', gap: space.xs, marginTop: space.xl },
});
