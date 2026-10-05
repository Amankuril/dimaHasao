import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CheckCircle2, Phone, User } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Spinner } from '../../components/Loader';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import { F } from '../components/shell';
import { useNavClearance } from '../components/dining/TableShared';

function Field({ label, icon, focused, ...input }) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View>
        <View style={styles.fieldIcon} pointerEvents="none">{icon}</View>
        <TextInput
          {...input}
          placeholderTextColor={tw.slate300}
          style={[styles.input, focused.on ? styles.inputFocus : null]}
          onFocus={focused.onFocus}
          onBlur={focused.onBlur}
        />
      </View>
    </View>
  );
}

function useFocus() {
  const [on, setOn] = useState(false);
  return { on, onFocus: () => setOn(true), onBlur: () => setOn(false) };
}

export default function TableEditUserPage() {
  const location = useLocation();
  const clearance = useNavClearance();
  const { user, restaurant, guests, date, timeSlot, discount, specialRequest } = location.state || {};

  const initialName = user?.name || '';
  const initialPhone = user?.phone || '';
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);
  const nameFocus = useFocus();
  const phoneFocus = useFocus();

  useEffect(() => () => clearTimeout(timer.current), []);

  const hasChanged = name !== initialName || phone !== initialPhone;

  const handleSave = () => {
    if (saving || !hasChanged) return;
    setSaving(true);
    timer.current = setTimeout(() => {
      navigateTo('/food/user/dining/book-confirmation', {
        state: { restaurant, guests, date, timeSlot, discount, specialRequest, user: { ...user, name, phone } },
        replace: true,
      });
    }, 600);
  };

  const back = () => navigateTo(-1);
  const active = hasChanged && !saving;

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Press scale={0.9} onPress={back} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={24} color={tw.slate900} />
        </Press>
        <Text style={styles.title}>EDIT DETAILS</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 80 + clearance, gap: 32 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={styles.avatar}>
            <User size={40} color={tw.red500} />
          </View>
          <Text style={styles.h2}>Personalize Booking</Text>
          <Text style={styles.sub}>CONTACT DETAILS FOR THE RESTAURANT</Text>
        </View>

        <View style={{ gap: 24 }}>
          <Field
            label="Full Name"
            icon={<User size={20} color={tw.slate400} />}
            focused={nameFocus}
            value={name}
            onChangeText={(v) => setName(v.replace(/[^a-zA-Z\s]/g, ''))}
            placeholder="Enter your full name"
          />
          <Field
            label="Mobile Number"
            icon={<Phone size={20} color={tw.slate400} />}
            focused={phoneFocus}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter mobile number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={{ paddingTop: 40 }}>
          <Press scale={0.95} onPress={handleSave} disabled={!active} accessibilityLabel="Save Changes" style={[styles.btnWrap, active ? shadow('0 4px 16px rgba(220,38,38,0.4)') : null]}>
            {active ? (
              <LinearGradient colors={[F.green, '#7f1010']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                <CheckCircle2 size={20} color="#fff" />
                <Text style={[styles.btnText, { color: '#fff' }]}>SAVE CHANGES</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.btn, { backgroundColor: '#2a1a1a' }]}>
                {saving ? <Spinner size={20} color="#7a4040" /> : <CheckCircle2 size={20} color="#7a4040" />}
                <Text style={[styles.btnText, { color: '#7a4040' }]}>{saving ? 'SAVING...' : 'SAVE CHANGES'}</Text>
              </View>
            )}
          </Press>
          <Press scale={0.95} onPress={back} style={styles.cancel}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </Press>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderBottomWidth: 1, borderBottomColor: tw.slate100 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.slate50, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 28, letterSpacing: -0.5, color: tw.slate900, ...poppins(900) },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: tw.red50, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8, ...shadow('0 20px 25px -5px #FEE2E2, 0 8px 10px -6px #FEE2E2') },
  h2: { fontSize: 24, lineHeight: 32, color: tw.slate900, ...poppins(900) },
  sub: { fontSize: 12, lineHeight: 16, letterSpacing: 1.8, color: tw.slate400, textAlign: 'center', ...poppins(600) },
  label: { fontSize: 10, lineHeight: 15, letterSpacing: 2, color: tw.slate400, marginLeft: 8, ...poppins(900) },
  fieldIcon: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  input: { height: 56, paddingLeft: 48, paddingRight: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate100, borderRadius: 16, fontSize: 16, color: tw.slate900, ...poppins(700) },
  inputFocus: { borderColor: F.green, boxShadow: '0 0 0 4px rgba(239,68,68,0.1)' },
  btnWrap: { borderRadius: 16 },
  btn: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  btnText: { fontSize: 14, letterSpacing: 1.4, ...poppins(900) },
  cancel: { height: 56, marginTop: 16, borderRadius: 16, backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, letterSpacing: 1.4, color: tw.slate500, ...poppins(900) },
});
