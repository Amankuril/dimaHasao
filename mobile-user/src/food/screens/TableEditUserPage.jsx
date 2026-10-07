import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, CheckCircle2, Phone, User } from 'lucide-react-native';
import { Button, Card, IconButton } from '../../components/ds';
import { navigateTo, useLocation } from '../../lib/webRouter';
import { color, radii, space, type } from '../../theme';
import { useNavClearance } from '../components/dining/TableShared';

function Field({ label, icon: Icon, focused, ...input }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused.on ? styles.inputFocus : null]}>
        <Icon size={20} color={focused.on ? color.primary : color.textMuted} />
        <TextInput
          {...input}
          accessibilityLabel={label}
          placeholderTextColor={color.textMuted}
          style={styles.input}
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
        <IconButton icon={ArrowLeft} label="Back" variant="soft" onPress={back} />
        <Text style={styles.title} accessibilityRole="header">
          Edit details
        </Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl + clearance, gap: space.xxl }}>
        <View style={{ alignItems: 'center', gap: space.xs, paddingTop: space.md }}>
          <View style={styles.avatar}>
            <User size={36} color={color.primary} />
          </View>
          <Text style={styles.h2}>Personalize booking</Text>
          <Text style={styles.sub}>Contact details for the restaurant</Text>
        </View>

        <Card style={{ gap: space.lg }}>
          <Field
            label="Full name"
            icon={User}
            focused={nameFocus}
            value={name}
            onChangeText={(v) => setName(v.replace(/[^a-zA-Z\s]/g, ''))}
            placeholder="Enter your full name"
            autoComplete="name"
            returnKeyType="next"
          />
          <Field
            label="Mobile number"
            icon={Phone}
            focused={phoneFocus}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter mobile number"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        </Card>

        <View style={{ gap: space.md }}>
          <Button
            title={saving ? 'Saving...' : 'Save changes'}
            icon={CheckCircle2}
            size="lg"
            onPress={handleSave}
            disabled={!active}
            loading={saving}
            accessibilityLabel="Save Changes"
          />
          <Button title="Cancel" variant="outline" size="lg" onPress={back} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: color.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  title: { flex: 1, ...type.heading, color: color.text },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: color.primarySoft, borderWidth: 2, borderColor: color.gold, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  h2: { ...type.heading, color: color.text },
  sub: { ...type.small, color: color.textMuted, textAlign: 'center' },
  label: { ...type.label, color: color.text },
  inputWrap: { height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md },
  inputFocus: { borderColor: color.primary, borderWidth: 1.5 },
  input: { flex: 1, minWidth: 0, height: '100%', paddingVertical: 0, ...type.body, color: color.text },
});
